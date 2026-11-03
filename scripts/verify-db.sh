#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
docker compose exec -T db psql -U study -d study -v ON_ERROR_STOP=1 -c 'SELECT * FROM work_probe;' -c 'SELECT * FROM probe_runs ORDER BY created_at DESC LIMIT 12;'
