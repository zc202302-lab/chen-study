#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$PWD" == /opt/chen-study ]] || { echo '请在 /opt/chen-study 中运行'; exit 1; }
command -v openssl >/dev/null
command -v curl >/dev/null
docker network inspect sms-relay_default >/dev/null
docker inspect sms-relay-caddy-1 >/dev/null
if [[ ! -f .env ]]; then
  read -rsp '设置测试管理密码（至少16位，仅在服务器输入）: ' study_admin
  echo
  [[ ${#study_admin} -ge 16 && "$study_admin" =~ ^[a-zA-Z0-9._@%+-]+$ ]] || { echo '请使用至少16位字母、数字或 . _ @ % + -'; exit 1; }
  umask 077
  { printf 'ADMIN_PASSWORD=%s\n' "$study_admin"; printf 'DB_PASSWORD=%s\n' "$(openssl rand -hex 24)"; printf 'SESSION_SECRET=%s\n' "$(openssl rand -hex 32)"; } > .env
  unset study_admin
fi
docker compose config --quiet
# 阶段1仅安装pg驱动，没有Next.js编译。后续使用CI预构建镜像。
docker compose build --pull app
docker compose up -d --wait --wait-timeout 150
bash scripts/connect-caddy.sh
echo '应用已启动并加载路由；以下为HTTPS实际检查：'
curl --fail --show-error --retry 5 --retry-delay 3 --max-time 20 https://study.ziboxiaozhushou.cn/healthz
echo
bash scripts/verify-db.sh
echo '请打开 https://study.ziboxiaozhushou.cn/work-test 并使用刚设置的管理密码登录。'
echo '尚未完成Work浏览器或定时运行验收。'
