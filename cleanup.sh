#!/bin/bash
echo "Connecting to the database and clearing ping_logs table..."
docker-compose exec db psql -U uptime_user -d uptime_checker -c "TRUNCATE TABLE ping_logs;"
echo "Table ping_logs has been cleared."