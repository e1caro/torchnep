-- FitQuest e-mail reminders (additive: new table and functions only; nothing existing changes).
-- Who gets them: players who gave an e-mail and agreed to reminders, who have never used the Android app (the app has
-- its own notifications), after 3 days without training; at most one e-mail every 3 days, never more than one a day.
-- Each e-mail has a one-click unsubscribe link, and replying "no me mandes más correos" also works (you switch them off).
-- Sending runs inside Supabase: pg_cron (schedule) + pg_net (HTTP) + Brevo's free e-mail API. No server of your own.
--
-- Setup, once (SQL Editor > New query):
--   1. Run this whole file.
--   2. Save the secrets in Supabase Vault (Project Settings > Vault, or with SQL, values only in the editor, never in git):
--        select vault.create_secret('<BREVO API KEY>', 'brevo_api_key');
--        select vault.create_secret('<the sender e-mail you verified in Brevo>', 'brevo_sender');
--        select vault.create_secret('<your test e-mail>', 'reminder_test_email');
--   3. Test: select public.send_test_reminder();   -- sends ONLY to reminder_test_email
--   4. When you are happy, switch the daily job on:  update public.reminder_config set live = true;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.contact (
  user_id uuid primary key references auth.users on delete cascade,
  email text,
  opt_in boolean not null default false,
  lang text not null default 'es',
  unsub_token uuid not null default gen_random_uuid(),
  app_installed boolean not null default false,
  last_app_login timestamptz,
  last_workout timestamptz,
  last_email timestamptz,
  emails_sent int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.contact enable row level security;
drop policy if exists "players see their contact" on public.contact;
create policy "players see their contact" on public.contact for select to authenticated using (auth.uid() = user_id);
drop policy if exists "players add their contact" on public.contact;
create policy "players add their contact" on public.contact for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "players update their contact" on public.contact;
create policy "players update their contact" on public.contact for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- the token and the counters are not the player's to change
revoke update on public.contact from authenticated, anon;
grant update (email, opt_in, lang, app_installed, last_app_login, last_workout, updated_at) on public.contact to authenticated;

create table if not exists public.reminder_config (
  id int primary key default 1 check (id = 1),
  live boolean not null default false,          -- the daily job sends nothing until this is true
  idle_days int not null default 3,             -- days without training before an e-mail
  gap_days int not null default 3,              -- days between two e-mails to the same player
  download_url text not null default 'https://github.com/e1caro/torchnep/releases',
  unsub_url text not null default 'https://e1caro.github.io/torchnep/fitcoach/unsubscribe.html'
);
insert into public.reminder_config (id) values (1) on conflict do nothing;
alter table public.reminder_config enable row level security;

-- one-click unsubscribe, from the link in every e-mail (works without signing in)
create or replace function public.unsubscribe(token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.contact set opt_in = false, updated_at = now() where unsub_token = token;
  return found;
end $$;
revoke all on function public.unsubscribe(uuid) from public;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

create or replace function public.reminder_secret(n text) returns text
language sql security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = n limit 1
$$;
revoke all on function public.reminder_secret(text) from public, anon, authenticated;

-- the e-mail itself (Spanish or English)
create or replace function public.reminder_mail(to_email text, player text, lang text, token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c public.reminder_config;
  sender text := public.reminder_secret('brevo_sender');
  unsub text;
  es boolean := coalesce(lang, 'es') <> 'en';
  hi text := coalesce(nullif(player, ''), case when es then 'héroe' else 'hero' end);
begin
  select * into c from public.reminder_config where id = 1;
  unsub := c.unsub_url || '?t=' || token::text;
  return jsonb_build_object(
    'sender', jsonb_build_object('name', 'FitQuest', 'email', sender),
    'replyTo', jsonb_build_object('email', sender),
    'to', jsonb_build_array(jsonb_build_object('email', to_email)),
    'subject', case when es then '¿Seguimos, ' || hi || '? Tu racha te espera' else 'Shall we, ' || hi || '? Your streak is waiting' end,
    'headers', jsonb_build_object('List-Unsubscribe', '<' || unsub || '>, <mailto:' || sender || '?subject=unsubscribe>'),
    'htmlContent',
      case when es then
        '<p>¡Hola, ' || hi || '!</p><p>Llevas unos días sin entrenar en FitQuest. Un entrenamiento corto hoy mantiene viva tu racha y te acerca al siguiente nivel.</p>'
        || '<p>Con la app de Android te avisamos en el móvil y ya no te escribiremos por correo: <a href="' || c.download_url || '">descargar FitQuest</a>.</p>'
        || '<p style="color:#777;font-size:13px">¿No quieres más correos? <a href="' || unsub || '">Darme de baja</a> con un clic, o responde a este correo con «no me mandes más correos».</p>'
      else
        '<p>Hi, ' || hi || '!</p><p>You haven''t trained in FitQuest for a few days. A short workout today keeps your streak alive and gets you closer to the next level.</p>'
        || '<p>With the Android app we remind you on your phone and stop e-mailing you: <a href="' || c.download_url || '">download FitQuest</a>.</p>'
        || '<p style="color:#777;font-size:13px">No more e-mails? <a href="' || unsub || '">Unsubscribe</a> in one click, or reply to this e-mail with "no more e-mails".</p>'
      end);
end $$;
revoke all on function public.reminder_mail(text, text, text, uuid) from public, anon, authenticated;

create or replace function public.reminder_send(payload jsonb) returns bigint
language sql security definer set search_path = public, net as $$
  select net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    body := payload,
    headers := jsonb_build_object('api-key', public.reminder_secret('brevo_api_key'), 'content-type', 'application/json', 'accept', 'application/json'));
$$;
revoke all on function public.reminder_send(jsonb) from public, anon, authenticated;

-- the daily job
create or replace function public.send_inactive_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  c public.reminder_config;
  r record;
  n int := 0;
begin
  select * into c from public.reminder_config where id = 1;
  if not c.live then return 0; end if;
  for r in
    select k.*, p.public->>'name' as player from public.contact k left join public.profiles p on p.id = k.user_id
    where k.opt_in and k.email is not null and not k.app_installed
      and k.last_workout is not null and k.last_workout < now() - make_interval(days => c.idle_days)
      and (k.last_email is null or k.last_email < now() - make_interval(days => c.gap_days))
    limit 250                                        -- Brevo free plan: 300 a day
  loop
    perform public.reminder_send(public.reminder_mail(r.email, r.player, r.lang, r.unsub_token));
    update public.contact set last_email = now(), emails_sent = emails_sent + 1 where user_id = r.user_id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.send_inactive_reminders() from public, anon, authenticated;

-- test: sends one reminder ONLY to the reminder_test_email secret, whatever is in the table
create or replace function public.send_test_reminder(lang text default 'es') returns bigint
language plpgsql security definer set search_path = public as $$
declare
  to_email text := public.reminder_secret('reminder_test_email');
  tok uuid;
begin
  if to_email is null then raise exception 'Save your test e-mail first: select vault.create_secret(''you@example.com'', ''reminder_test_email'');'; end if;
  -- a real token, so the unsubscribe link in the test e-mail works (it switches off the row for that address, if any)
  select unsub_token into tok from public.contact where lower(email) = lower(to_email) limit 1;
  tok := coalesce(tok, gen_random_uuid());
  return public.reminder_send(public.reminder_mail(to_email, 'tester', lang, tok));
end $$;
revoke all on function public.send_test_reminder(text) from public, anon, authenticated;

-- every day at 17:00 UTC (18:00/19:00 in Spain); it does nothing while reminder_config.live is false
select cron.unschedule('fitquest-reminders') where exists (select 1 from cron.job where jobname = 'fitquest-reminders');
select cron.schedule('fitquest-reminders', '0 17 * * *', $$select public.send_inactive_reminders()$$);

-- to see what Brevo answered to the last sends:
--   select id, status_code, content from net._http_response order by id desc limit 5;
