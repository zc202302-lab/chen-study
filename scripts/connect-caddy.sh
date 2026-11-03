#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
exec 9>/opt/sms-relay/.chen-study-caddy.lock
flock -n 9 || { echo '其他Study配置操作正在进行'; exit 1; }
config=/opt/sms-relay/Caddyfile
container=sms-relay-caddy-1
[[ -f "$config" && ! -L "$config" ]] || { echo 'Caddy配置类型与预期不符'; exit 1; }
# 检查挂载内容确实一致，不依赖过去的截图。
local_hash=$(sha256sum "$config" | cut -d' ' -f1)
remote_hash=$(docker exec "$container" sha256sum /etc/caddy/Caddyfile | cut -d' ' -f1)
[[ "$local_hash" == "$remote_hash" ]] || { echo '宿主机与容器配置不一致，停止'; exit 1; }
# 先从现有Caddy容器验证应用可达。
docker exec "$container" wget -qO- http://chen-study-probe:3000/healthz
if grep -qF 'study.ziboxiaozhushou.cn' "$config"; then
  echo 'Study域名已存在，不自动修改；检查现有路由。'
  exit 0
fi
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$PWD/backups/Caddyfile.$stamp"
candidate=$(mktemp)
trap 'rm -f "$candidate"' EXIT
cp -p "$config" "$backup"
cat "$config" > "$candidate"
cat >> "$candidate" <<'CADDY'

# Chen Study phase1
study.ziboxiaozhushou.cn {
    encode zstd gzip
    header X-Robots-Tag "noindex, nofollow"
    reverse_proxy chen-study-probe:3000
}
CADDY
docker cp "$candidate" "$container:/tmp/chen-study-Caddyfile"
docker exec "$container" caddy validate --config /tmp/chen-study-Caddyfile --adapter caddyfile
[[ "$(sha256sum "$config" | cut -d' ' -f1)" == "$local_hash" ]] || { echo '配置被其他操作修改，停止'; exit 1; }
restore() {
  cat "$backup" > "$config"
  docker exec "$container" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || true
  echo "路由变更失败，已恢复配置：$backup"
}
# 单文件bind挂载必须保留inode，禁止mv替换。
if ! cat "$candidate" > "$config"; then restore; exit 1; fi
if [[ "$(sha256sum "$config" | cut -d' ' -f1)" != "$(docker exec "$container" sha256sum /etc/caddy/Caddyfile | cut -d' ' -f1)" ]]; then restore; exit 1; fi
if ! docker exec "$container" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then restore; exit 1; fi
echo "Caddy已平滑加载；原配置备份：$backup"
