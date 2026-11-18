-- Bloomdoku friends on Supabase (used by js/cloud.js): profiles, friend requests, messages and reports.
--
-- Accounts and the sync between devices already work in the project the other apps use: Bloomdoku signs in as
-- bloom.<username>@users.fitquest.app and keeps its progress in its own row of public.saves
-- (fitai-app/tools/supabase.sql). Friends need the tables below.
--
-- One-time setup: Supabase > SQL Editor > New query: paste this whole file and Run. It can be run again safely.
-- Until then the app works as before and the Friends tab says that friends are not switched on yet.
-- tests/sql.sh runs this file and tests/sql-check.sql against a local PostgreSQL.

-- What friends see of a player: a username, a friend code and a summary (level, stars, the best of each level,
-- today's bouquet). Nothing typed, no settings, no gardens in progress.
create table if not exists public.bloom_profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  code text unique not null check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  public jsonb not null default '{}' check (pg_column_size(public) < 4000),
  updated_at timestamptz not null default now()
);

-- A row (me, them) is my request; both rows mean we are friends.
create table if not exists public.bloom_friends (
  user_id uuid not null references public.bloom_profiles (id) on delete cascade,
  friend_id uuid not null references public.bloom_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists bloom_friends_friend on public.bloom_friends (friend_id);

-- Messages between two friends. kind: 'text', 'sticker' (a flower or critter: "flowers-3") or 'garden' (a challenge:
-- {"key":"4-2","garden":16,"stars":3,"slips":0,"time":200}).
create table if not exists public.bloom_messages (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.bloom_profiles (id) on delete cascade,
  to_id uuid not null references public.bloom_profiles (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'sticker', 'garden')),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (from_id <> to_id)
);
create index if not exists bloom_messages_to on public.bloom_messages (to_id, id);
create index if not exists bloom_messages_from on public.bloom_messages (from_id, id);

-- A player reports a message or a player; only the project owner reads these (Table Editor).
create table if not exists public.bloom_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.bloom_profiles (id) on delete cascade,
  about uuid not null references public.bloom_profiles (id) on delete cascade,
  message_id bigint,
  body text check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table public.bloom_profiles enable row level security;
alter table public.bloom_friends enable row level security;
alter table public.bloom_messages enable row level security;
alter table public.bloom_reports enable row level security;

-- Friend requests: each player sees and can remove the rows about them (so a request reaches the other player and
-- either one can end the friendship), but only adds their own.
drop policy if exists "bloom: players see rows about them" on public.bloom_friends;
create policy "bloom: players see rows about them" on public.bloom_friends for select to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists "bloom: players add their own rows" on public.bloom_friends;
create policy "bloom: players add their own rows" on public.bloom_friends for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "bloom: players remove rows about them" on public.bloom_friends;
create policy "bloom: players remove rows about them" on public.bloom_friends for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- A profile is visible to its owner and to players with a friend row in either direction (friends, and whoever
-- sent or received a request). Nobody can list every player; finding someone needs their code (bloom_find below).
drop policy if exists "bloom: profiles are visible to friends" on public.bloom_profiles;
create policy "bloom: profiles are visible to friends" on public.bloom_profiles for select to authenticated
  using (auth.uid() = id or exists (
    select 1 from public.bloom_friends f
    where (f.user_id = auth.uid() and f.friend_id = bloom_profiles.id) or (f.friend_id = auth.uid() and f.user_id = bloom_profiles.id)));
drop policy if exists "bloom: players create their profile" on public.bloom_profiles;
create policy "bloom: players create their profile" on public.bloom_profiles for insert to authenticated
  with check (auth.uid() = id);
drop policy if exists "bloom: players update their profile" on public.bloom_profiles;
create policy "bloom: players update their profile" on public.bloom_profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Messages: both players read their conversation; only friends (both rows) can write to each other, and only as
-- themselves; the receiver marks a message as read and nothing else can change (column privilege below); the sender
-- can take a message back.
drop policy if exists "bloom: players read their messages" on public.bloom_messages;
create policy "bloom: players read their messages" on public.bloom_messages for select to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);
drop policy if exists "bloom: friends write to each other" on public.bloom_messages;
create policy "bloom: friends write to each other" on public.bloom_messages for insert to authenticated
  with check (auth.uid() = from_id and read_at is null
    and exists (select 1 from public.bloom_friends a where a.user_id = from_id and a.friend_id = to_id)
    and exists (select 1 from public.bloom_friends b where b.user_id = to_id and b.friend_id = from_id));
drop policy if exists "bloom: the receiver marks as read" on public.bloom_messages;
create policy "bloom: the receiver marks as read" on public.bloom_messages for update to authenticated
  using (auth.uid() = to_id) with check (auth.uid() = to_id);
drop policy if exists "bloom: the sender takes a message back" on public.bloom_messages;
create policy "bloom: the sender takes a message back" on public.bloom_messages for delete to authenticated
  using (auth.uid() = from_id);
revoke update on public.bloom_messages from authenticated;
grant update (read_at) on public.bloom_messages to authenticated;

drop policy if exists "bloom: players send reports" on public.bloom_reports;
create policy "bloom: players send reports" on public.bloom_reports for insert to authenticated
  with check (auth.uid() = reporter);

grant select, insert, update on public.bloom_profiles to authenticated;
grant select, insert, delete on public.bloom_friends to authenticated;
grant select, insert, delete on public.bloom_messages to authenticated;
grant insert on public.bloom_reports to authenticated;

-- Finds a player by their friend code. The only way to reach a player who is not a friend yet.
create or replace function public.bloom_find(friend_code text) returns table (id uuid, username text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username from public.bloom_profiles p where p.code = upper(friend_code) limit 1;
$$;
revoke all on function public.bloom_find(text) from public, anon;
grant execute on function public.bloom_find(text) to authenticated;

-- No flooding: at most 30 messages a minute from one player.
create or replace function public.bloom_message_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.bloom_messages m where m.from_id = new.from_id and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Too many messages. Wait a minute.';
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists bloom_message_limit on public.bloom_messages;
create trigger bloom_message_limit before insert on public.bloom_messages for each row execute function public.bloom_message_limit();

-- Ending a friendship removes both rows at once, whoever asks.
create or replace function public.bloom_unfriend(other uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.bloom_friends
  where auth.uid() is not null and ((user_id = auth.uid() and friend_id = other) or (user_id = other and friend_id = auth.uid()));
$$;
revoke all on function public.bloom_unfriend(uuid) from public, anon;
grant execute on function public.bloom_unfriend(uuid) to authenticated;

-- Deleting the account: the auth user goes, and with it (on delete cascade) the profile, friends, messages, reports
-- and the save. The same function FitQuest uses (fitai-app/tools/supabase-play.sql); created here too so this file
-- is enough on its own.
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
