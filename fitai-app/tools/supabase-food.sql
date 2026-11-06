-- FitQuest: photos of meals rated by AI (Edge Function food-photo, tools/food-photo.ts). Additive: new tables and
-- functions only. Run once in Supabase (SQL Editor > New query > Run).
-- Each player can have 5 photos rated a day (Spain's calendar day). The photos themselves are never stored.

create table if not exists public.food_scans (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists food_scans_user_day on public.food_scans (user_id, created_at);
alter table public.food_scans enable row level security;

create or replace function public.food_scans_today() returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.food_scans
  where user_id = auth.uid() and created_at >= (date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')
$$;
revoke all on function public.food_scans_today() from public, anon, authenticated;

create or replace function public.food_scans_left() returns int language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return greatest(0, 5 - public.food_scans_today());
end $$;
revoke all on function public.food_scans_left() from public, anon;
grant execute on function public.food_scans_left() to authenticated;

create or replace function public.food_scan_take() returns int language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.food_scans (user_id) values (auth.uid());
  return greatest(0, 5 - public.food_scans_today());
end $$;
revoke all on function public.food_scan_take() from public, anon;
grant execute on function public.food_scan_take() to authenticated;

-- "Report this answer": players flag a wrong or inappropriate AI answer (Google Play's AI-generated content policy).
-- Read them in Table Editor > food_reports.
create table if not exists public.food_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  dish text not null default '' check (char_length(dish) <= 120),
  answer text not null default '' check (char_length(answer) <= 3000),
  reason text not null default 'other' check (char_length(reason) <= 40),
  created_at timestamptz not null default now()
);
alter table public.food_reports enable row level security;
drop policy if exists "players report answers" on public.food_reports;
create policy "players report answers" on public.food_reports for insert to authenticated with check (user_id = auth.uid());
