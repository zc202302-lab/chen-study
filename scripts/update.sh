#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/chen-study
exec 8>/opt/chen-study/.update.lock
flock -n 8 || exit 0
[[ -f .env ]] || { echo '请先完成首次安装'; exit 1; }
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then echo '代码有未提交改动，停止更新'; exit 1; fi
old=$(docker compose exec -T app printenv APP_REVISION 2>/dev/null || true)
[[ "$old" =~ ^[a-f0-9]{40}$ ]] || old=$(git rev-parse HEAD)
git fetch origin main
new=$(git rev-parse origin/main)
# 备份数据库，不触碰现有其他项目或共享入口。
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T db pg_dump -U study -d study -Fc > "backups/study-before-$stamp.dump"
[[ -s "backups/study-before-$stamp.dump" ]] || { echo '备份为空，停止更新'; exit 1; }
git merge --ff-only "$new"
# 本阶段保持轻量Node服务；不重新运行Caddy接入脚本。
if ! docker compose build --build-arg APP_REVISION="$new" app || ! docker compose up -d --wait --wait-timeout 180; then
 echo '应用更新失败，恢复旧程序；数据库保留新增兼容表。'
 git -c advice.detachedHead=false checkout --detach "$old"
 docker compose build --build-arg APP_REVISION="$old" app
 docker compose up -d --wait --wait-timeout 180
 exit 1
fi
running=$(docker compose exec -T app printenv APP_REVISION)
[[ "$running" == "$new" ]] || { echo '运行镜像版本不匹配，未确认部署成功'; exit 1; }
curl --fail --show-error --connect-timeout 10 --max-time 20 https://study.ziboxiaozhushou.cn/healthz
printf '\n版本：%s\n' "$new"
echo 'Chen Study 更新成功；未修改Caddy或其他项目。'
