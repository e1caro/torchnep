-- FitQuest accounts and friends on Supabase (used by cloud.js).
-- One-time setup:
--   1. Create a free project at supabase.com.
--   2. SQL Editor > New query: paste this whole file and Run.
--   3. Authentication > Sign In / Providers > Email: turn OFF "Confirm email" (usernames sign in as an e-mail nobody receives).
--   4. Project Settings > API: copy the Project URL and the "anon public" key into SB_URL and SB_KEY in cloud.js.

-- What friends can see: username, friend code and a profile summary (no body data, no history).
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  code text unique not null,
  public jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Each player's whole save, readable and writable only by that player.
create table if not exists public.saves (
  id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Who added whom.
create table if not exists public.friends (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.friends enable row level security;

drop policy if exists "profiles are visible to players" on public.profiles;
create policy "profiles are visible to players" on public.profiles for select to authenticated using (true);
drop policy if exists "players create their profile" on public.profiles;
create policy "players create their profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "players update their profile" on public.profiles;
create policy "players update their profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "players own their save" on public.saves;
create policy "players own their save" on public.saves for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Friend requests: a row (me, them) is my request; both rows means friends. Each player sees and can remove the rows
-- about them (so requests reach the other player and either one can end the friendship), but only adds their own.
drop policy if exists "players own their friend list" on public.friends;
drop policy if exists "players see rows about them" on public.friends;
create policy "players see rows about them" on public.friends for select to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists "players add their own rows" on public.friends;
create policy "players add their own rows" on public.friends for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "players remove rows about them" on public.friends;
create policy "players remove rows about them" on public.friends for delete to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);
