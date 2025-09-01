#!/bin/sh

# Start PostgreSQL
su - postgres -c "pg_ctl start -D /var/lib/postgresql/data"

# Start nginx
nginx -g 'daemon off;' &

# Start node server
cd /app/server
npm start