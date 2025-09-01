#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER uptime_user WITH PASSWORD 'password';
    CREATE DATABASE uptime_checker;
    GRANT ALL PRIVILEGES ON DATABASE uptime_checker TO uptime_user;
EOSQL