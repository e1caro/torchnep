-- FitQuest: the Guild (community exercises) with moderation, and account deletion. Additive: only new tables and
-- functions; existing tables and data are untouched. Run once in Supabase (SQL Editor > New query > Run).
-- Make yourself an admin afterwards (to delete or restore Guild exercises):
--   insert into public.admins (user_id) select id from public.profiles where username = '<your username>';

-- ---------- admins ----------
create table if not exists public.admins (user_id uuid primary key references auth.users on delete cascade);
alter table public.admins enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
grant execute on function public.is_admin() to authenticated;

-- ---------- bad words (names and descriptions) ----------
create or replace function public.clean_text(t text) returns boolean language sql immutable as $$
  select coalesce(lower(t), '') !~ '(^|[^a-zñ])(puta|puto|mierda|cabron|cabrón|gilipollas|coño|joder|polla|zorra|maricon|maricón|subnormal|retrasado|hijoputa|follar|fuck|shit|bitch|cunt|dick|pussy|whore|slut|fag|nigger|nigga|retard|rape|nazi|porn)([^a-zñ]|$)'
$$;

-- ---------- the Guild ----------
create table if not exists public.community_ex (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references auth.users on delete cascade,
  author_name text not null default '',
  data jsonb not null,
  uses int not null default 0,
  reports int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_ex_name check (char_length(data->>'n') between 3 and 50 and public.clean_text(data->>'n') and public.clean_text(data->>'d') and public.clean_text(author_name)),
  constraint community_ex_muscles check (jsonb_typeof(data->'m') = 'array' and jsonb_array_length(data->'m') >= 1)
);
alter table public.community_ex enable row level security;
drop policy if exists "players see the guild" on public.community_ex;
create policy "players see the guild" on public.community_ex for select to authenticated using (not hidden or author = auth.uid() or public.is_admin());
drop policy if exists "players share" on public.community_ex;
create policy "players share" on public.community_ex for insert to authenticated with check (author = auth.uid());
drop policy if exists "authors edit theirs" on public.community_ex;
create policy "authors edit theirs" on public.community_ex for update to authenticated using (author = auth.uid()) with check (author = auth.uid());
drop policy if exists "authors and admins delete" on public.community_ex;
create policy "authors and admins delete" on public.community_ex for delete to authenticated using (author = auth.uid() or public.is_admin());
-- players may only change what they wrote, never the counters or the hidden flag
revoke update on public.community_ex from authenticated, anon;
grant update (data, author_name, updated_at) on public.community_ex to authenticated;

-- reports: one per player and exercise; at 3 the exercise is hidden until an admin restores it
create table if not exists public.community_reports (
  ex_id uuid not null references public.community_ex on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  reason text not null default 'other',
  created_at timestamptz not null default now(),
  primary key (ex_id, user_id)
);
alter table public.community_reports enable row level security;
drop policy if exists "players report" on public.community_reports;
create policy "players report" on public.community_reports for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admins read reports" on public.community_reports;
create policy "admins read reports" on public.community_reports for select to authenticated using (public.is_admin() or user_id = auth.uid());

create or replace function public.community_count_reports() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.community_reports where ex_id = new.ex_id;
  update public.community_ex set reports = n, hidden = hidden or n >= 3 where id = new.ex_id;
  return new;
end $$;
drop trigger if exists community_reports_count on public.community_reports;
create trigger community_reports_count after insert on public.community_reports for each row execute function public.community_count_reports();

-- an admin brings back a hidden exercise (its reports are cleared)
create or replace function public.community_restore(ex uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  delete from public.community_reports where ex_id = ex;
  update public.community_ex set hidden = false, reports = 0 where id = ex;
end $$;
grant execute on function public.community_restore(uuid) to authenticated;

-- "Lo uso": one per player and exercise
create table if not exists public.community_uses (
  ex_id uuid not null references public.community_ex on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ex_id, user_id)
);
alter table public.community_uses enable row level security;
drop policy if exists "players use" on public.community_uses;
create policy "players use" on public.community_uses for insert to authenticated with check (user_id = auth.uid());
create or replace function public.community_count_uses() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_ex set uses = (select count(*) from public.community_uses where ex_id = new.ex_id) where id = new.ex_id;
  return new;
end $$;
drop trigger if exists community_uses_count on public.community_uses;
create trigger community_uses_count after insert on public.community_uses for each row execute function public.community_count_uses();

-- ---------- account deletion (in the app and on the web page delete-account.html) ----------
-- Deleting the auth user removes, through "on delete cascade", the profile, the save, friends, e-mail reminder data,
-- shared exercises, reports and uses.
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
