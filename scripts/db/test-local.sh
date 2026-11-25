#!/usr/bin/env bash
# Spustí migrácie + pgTAP testy na dočasnom lokálnom Postgres klastri (bez Dockeru).
# S Dockerom používaj radšej: npx supabase start && npx supabase test db
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DATA"
  RUN_AS=(sudo -u postgres)
  [ -x "$(command -v sudo)" ] || RUN_AS=(su postgres -c)
fi

run() {
  if [ "${RUN_AS[0]:-}" = "su" ]; then su postgres -c "$*"; else "${RUN_AS[@]}" "$@"; fi
}

cleanup() { run "$PG_BIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

run "$PG_BIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" start -w >/dev/null

PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -c "create database yorky_test"
"${PSQL[@]}" -c "alter database yorky_test set search_path = \"\$user\", public, extensions"
"${PSQL[@]}" -d yorky_test -f "$ROOT/scripts/db/supabase-shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"
  "${PSQL[@]}" -d yorky_test -f "$f"
done
"${PSQL[@]}" -d yorky_test -c "create extension if not exists pgtap with schema extensions"

pg_prove -h /tmp -p "$PORT" -U postgres -d yorky_test --ext .sql "$ROOT"/supabase/tests/*.test.sql
