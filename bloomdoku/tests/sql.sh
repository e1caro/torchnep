#!/usr/bin/env bash
# Runs tools/supabase.sql and tests/sql-check.sql in a throwaway local PostgreSQL (needs initdb, pg_ctl and psql,
# version 14 or later):   bash tests/sql.sh
# It first creates the few things Supabase provides: the auth schema with auth.users and auth.uid(), and the
# "authenticated" and "anon" roles. Nothing outside the temporary folder is touched.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(dirname "$(command -v initdb || ls -d /usr/lib/postgresql/*/bin/initdb | sort -V | tail -1)")"
dir="$(mktemp -d)"
port=54329
trap '"$bin/pg_ctl" -D "$dir/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$dir"' EXIT
run() { if [ "$(id -u)" = 0 ]; then chown -R postgres "$dir"; runuser -u postgres -- "$@"; else "$@"; fi; }   # PostgreSQL refuses to run as root
cp "$here/../tools/supabase.sql" "$here/sql-check.sql" "$dir/"
chmod -R a+rX "$dir"
run "$bin/initdb" -D "$dir/db" -U postgres -A trust >/dev/null
run "$bin/pg_ctl" -D "$dir/db" -o "-p $port -c listen_addresses='' -k $dir" -w start >/dev/null
q() { run psql -h "$dir" -p "$port" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
q -c "create schema auth; create table auth.users (id uuid primary key);
      create role authenticated nologin; create role anon nologin;
      create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;
      grant usage on schema public, auth to authenticated, anon;"
PGOPTIONS="-c client_min_messages=warning" q -f "$dir/supabase.sql"
PGOPTIONS="-c client_min_messages=warning" q -f "$dir/supabase.sql"   # running it twice must be safe
q -f "$dir/sql-check.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'
