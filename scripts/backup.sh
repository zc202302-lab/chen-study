#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/chen-study
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="backups/study-$stamp.dump"
docker compose exec -T db pg_dump -U study -d study -Fc > "$target.tmp"
[[ -s "$target.tmp" ]]
mv "$target.tmp" "$target"
# 核对备份目录可读；完整恢复仍需隔离演练。
docker compose exec -T db pg_restore --list < "$target" >/dev/null
echo "备份并校验目录成功：$target"
