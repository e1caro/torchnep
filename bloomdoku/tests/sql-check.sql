-- Checks tools/supabase.sql in a plain PostgreSQL: who can read and write what. Run by tests/sql.sh, which first
-- creates the few things Supabase provides (the auth schema, auth.uid() and the "authenticated" role).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create or replace function pg_temp.act(who uuid) returns void language plpgsql as $$
begin
  perform set_config('role', case when who is null then 'postgres' else 'authenticated' end, false);
  perform set_config('request.jwt.claim.sub', coalesce(who::text, ''), false);
end $$;
-- Runs a statement as a player and returns how many rows it touched or returned, or -1 if the database refused it.
create or replace function pg_temp.run(who uuid, stmt text) returns int language plpgsql as $$
declare n int;
begin
  perform pg_temp.act(who);
  begin
    if stmt ~* '^\s*select' then execute 'select count(*) from (' || stmt || ') q' into n;
    else execute stmt; get diagnostics n = row_count; end if;
  exception when others then n := -1; end;
  perform pg_temp.act(null);
  return n;
end $$;
create or replace function pg_temp.expect(what text, got int, want int) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL  %: got %, expected %', what, got, want; end if;
  raise notice '  ok  %', what;
end $$;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''

-- profiles
select pg_temp.expect('a player creates their own profile', pg_temp.run(:A, $$insert into bloom_profiles (id, username, code, public) values ('00000000-0000-0000-0000-00000000000a', 'ana', 'ANA234', '{"lvl":3}')$$), 1);
select pg_temp.expect('and nobody else''s', pg_temp.run(:A, $$insert into bloom_profiles (id, username, code) values ('00000000-0000-0000-0000-00000000000b', 'fake', 'FAKE22')$$), -1);
select pg_temp.expect('usernames are lower case letters, digits and _', pg_temp.run(:B, $$insert into bloom_profiles (id, username, code) values ('00000000-0000-0000-0000-00000000000b', 'Bad Name', 'BEN234')$$), -1);
select pg_temp.expect('codes have no 0, 1, I or O', pg_temp.run(:B, $$insert into bloom_profiles (id, username, code) values ('00000000-0000-0000-0000-00000000000b', 'ben', 'BEN011')$$), -1);
select pg_temp.expect('a second player joins', pg_temp.run(:B, $$insert into bloom_profiles (id, username, code) values ('00000000-0000-0000-0000-00000000000b', 'ben', 'BEN234')$$), 1);
select pg_temp.expect('a username is taken once', pg_temp.run(:C, $$insert into bloom_profiles (id, username, code) values ('00000000-0000-0000-0000-00000000000c', 'ana', 'CAT234')$$), -1);
select pg_temp.expect('a third player joins', pg_temp.run(:C, $$insert into bloom_profiles (id, username, code) values ('00000000-0000-0000-0000-00000000000c', 'cat', 'CAT234')$$), 1);
select pg_temp.expect('a player sees only their own profile at first', pg_temp.run(:A, 'select * from bloom_profiles'), 1);
select pg_temp.expect('nobody can list every player', pg_temp.run(:C, 'select * from bloom_profiles'), 1);
select pg_temp.expect('a code finds its player', pg_temp.run(:A, $$select * from bloom_find('ben234')$$), 1);
select pg_temp.expect('a wrong code finds nobody', pg_temp.run(:A, $$select * from bloom_find('ZZZZZZ')$$), 0);
select pg_temp.expect('a player updates their own profile', pg_temp.run(:A, $$update bloom_profiles set public = '{"lvl":4}' where id = '00000000-0000-0000-0000-00000000000a'$$), 1);
select pg_temp.expect('and not another one', pg_temp.run(:A, $$update bloom_profiles set public = '{"lvl":99}' where id = '00000000-0000-0000-0000-00000000000b'$$), 0);
select pg_temp.expect('a profile cannot be huge', pg_temp.run(:A, $$update bloom_profiles set public = jsonb_build_object('x', (select string_agg(md5(i::text), '') from generate_series(1, 400) i)) where id = '00000000-0000-0000-0000-00000000000a'$$), -1);
select pg_temp.expect('someone who is not signed in can read none of the tables and find nobody',
  (select count(*)::int from unnest(array['bloom_profiles', 'bloom_friends', 'bloom_messages', 'bloom_reports']) t where has_table_privilege('anon', 'public.' || t, 'select'))
  + has_function_privilege('anon', 'public.bloom_find(text)', 'execute')::int + has_function_privilege('anon', 'public.bloom_unfriend(uuid)', 'execute')::int, 0);

-- requests and friendship
select pg_temp.expect('ana asks ben to be friends', pg_temp.run(:A, $$insert into bloom_friends (user_id, friend_id) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')$$), 1);
select pg_temp.expect('nobody can ask in someone else''s name', pg_temp.run(:C, $$insert into bloom_friends (user_id, friend_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')$$), -1);
select pg_temp.expect('nobody befriends themselves', pg_temp.run(:A, $$insert into bloom_friends (user_id, friend_id) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a')$$), -1);
select pg_temp.expect('ben sees the request', pg_temp.run(:B, 'select * from bloom_friends'), 1);
select pg_temp.expect('and now sees ana''s profile', pg_temp.run(:B, 'select * from bloom_profiles'), 2);
select pg_temp.expect('cat sees neither', pg_temp.run(:C, 'select * from bloom_friends'), 0);
select pg_temp.expect('a request alone does not allow messages', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'hi')$$), -1);
select pg_temp.expect('ben accepts', pg_temp.run(:B, $$insert into bloom_friends (user_id, friend_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a')$$), 1);

-- messages
select pg_temp.expect('friends write to each other', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'hi ben')$$), 1);
select pg_temp.expect('a challenge is a message too', pg_temp.run(:B, $$insert into bloom_messages (from_id, to_id, kind, body) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'garden', '{"key":"4-2","garden":16}')$$), 1);
select pg_temp.expect('nobody writes in a friend''s name', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'forged')$$), -1);
select pg_temp.expect('nobody writes to a stranger', pg_temp.run(:C, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'spam')$$), -1);
select pg_temp.expect('a message has at most 500 characters', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', repeat('x', 501))$$), -1);
select pg_temp.expect('an empty message is refused', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '')$$), -1);
select pg_temp.expect('an unknown kind is refused', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, kind, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'html', 'x')$$), -1);
select pg_temp.expect('a message cannot arrive already read', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body, read_at) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'x', now())$$), -1);
select pg_temp.expect('both read the conversation', pg_temp.run(:A, 'select * from bloom_messages') + pg_temp.run(:B, 'select * from bloom_messages'), 4);
select pg_temp.expect('a third player reads none of it', pg_temp.run(:C, 'select * from bloom_messages'), 0);
select pg_temp.expect('the receiver marks it as read', pg_temp.run(:B, $$update bloom_messages set read_at = now() where to_id = '00000000-0000-0000-0000-00000000000b' and read_at is null$$), 1);
select pg_temp.expect('the sender cannot mark it as read', pg_temp.run(:B, $$update bloom_messages set read_at = now() where from_id = '00000000-0000-0000-0000-00000000000b'$$), 0);
select pg_temp.expect('nobody rewrites a message', pg_temp.run(:B, $$update bloom_messages set body = 'changed' where to_id = '00000000-0000-0000-0000-00000000000b'$$), -1);
select pg_temp.expect('the time of a message is the server''s', (select count(*)::int from bloom_messages where created_at > now() - interval '1 minute'), 2);
select pg_temp.expect('the receiver cannot delete what a friend wrote', pg_temp.run(:B, $$delete from bloom_messages where from_id = '00000000-0000-0000-0000-00000000000a'$$), 0);
select pg_temp.expect('the sender takes a message back', pg_temp.run(:B, $$delete from bloom_messages where from_id = '00000000-0000-0000-0000-00000000000b'$$), 1);

-- flooding
select pg_temp.expect('29 more messages in a minute pass', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) select '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'm' || i from generate_series(1, 29) i$$), 29);
select pg_temp.expect('the 31st is refused', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'one too many')$$), -1);

-- reports
select pg_temp.expect('a player reports a friend', pg_temp.run(:B, $$insert into bloom_reports (reporter, about, body) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'rude')$$), 1);
select pg_temp.expect('not in someone else''s name', pg_temp.run(:B, $$insert into bloom_reports (reporter, about) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a')$$), -1);
select pg_temp.expect('players cannot read reports', pg_temp.run(:A, 'select * from bloom_reports'), -1);

-- ending a friendship
select pg_temp.run(:C, $$select bloom_unfriend('00000000-0000-0000-0000-00000000000a')$$);
select pg_temp.expect('cat cannot end the friendship of others', (select count(*)::int from bloom_friends), 2);
select pg_temp.run(:B, $$select bloom_unfriend('00000000-0000-0000-0000-00000000000a')$$);
select pg_temp.expect('ben ends it: both rows go', (select count(*)::int from bloom_friends), 0);
select pg_temp.expect('and messages stop', pg_temp.run(:A, $$insert into bloom_messages (from_id, to_id, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'still there?')$$), -1);
select pg_temp.expect('and ben no longer sees ana''s profile', pg_temp.run(:B, 'select * from bloom_profiles'), 1);

-- deleting an account
select pg_temp.expect('before: ana has a profile, messages and a report about her', (select least(1, count(*))::int from bloom_profiles where username = 'ana') + (select least(1, count(*))::int from bloom_messages) + (select count(*)::int from bloom_reports), 3);
select pg_temp.run(:A, 'select delete_my_account()');
select pg_temp.expect('deleting the account removes the profile, the messages and the reports with it',
  (select count(*)::int from bloom_profiles where username = 'ana') + (select count(*)::int from bloom_messages) + (select count(*)::int from bloom_reports), 0);
select pg_temp.expect('the other players stay', (select count(*)::int from bloom_profiles), 2);

\echo 'sql: all checks passed'
