#!/bin/sh
# Runs automatically on first Postgres container start (docker-entrypoint-initdb.d).
# Creates a least-privilege role for the running app, separate from the
# POSTGRES_USER (POSTGRES_USER/POSTGRES_PASSWORD) role Prisma migrations use.
set -e

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set (see .env)}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO
  \$do\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'medikiosk_app') THEN
      CREATE ROLE medikiosk_app WITH LOGIN PASSWORD '${APP_DB_PASSWORD}';
    END IF;
  END
  \$do\$;

  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO medikiosk_app;
  GRANT USAGE ON SCHEMA public TO medikiosk_app;

  -- Prisma migrations run as POSTGRES_USER and create tables owned by it;
  -- grant the app role DML on everything that exists now and anything
  -- created later so `prisma migrate deploy` doesn't need to be re-run
  -- with grants each time.
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medikiosk_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medikiosk_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO medikiosk_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO medikiosk_app;
EOSQL
