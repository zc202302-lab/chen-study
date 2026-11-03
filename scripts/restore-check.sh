#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/chen-study
# 在现有Study数据库容器内创建临时数据库；不写入正式study库。
file=${1:?请指定备份文件路径}
[[ -s "$file" ]]
check_db="study_restore_check_$(date +%s)_$$"
cleanup(){ docker compose exec -T db dropdb -U study --if-exists "$check_db"; }
trap cleanup EXIT
docker compose exec -T db createdb -U study "$check_db"
docker compose exec -T db pg_restore -U study -d "$check_db" --exit-on-error < "$file"
docker compose exec -T db psql -U study -d "$check_db" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS courses FROM courses;' -c 'SELECT count(*) AS submissions FROM submissions;'
echo '隔离数据库恢复演练通过；临时数据库将清理。'
