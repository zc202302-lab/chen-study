#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/chen-study
# 公共仓库无需令牌。每5分钟只读检查，只有最新提交CI通过才部署。
git fetch origin main --quiet
sha=$(git rev-parse origin/main)
[[ "$(git rev-parse HEAD)" != "$sha" ]] || exit 0
payload=$(mktemp)
trap 'rm -f "$payload"' EXIT
curl --fail --silent --show-error --connect-timeout 10 --max-time 25 "https://api.github.com/repos/zc202302-lab/chen-study/actions/runs?head_sha=$sha&per_page=30" > "$payload"
if python3 - "$payload" "$sha" <<'PY'
import json,sys
runs=json.load(open(sys.argv[1])).get('workflow_runs',[])
checks=[r for r in runs if r['name']=='Phase1 checks' and r['head_sha']==sys.argv[2] and r['event']=='push']
latest=max(checks,key=lambda r:r['run_number']) if checks else None
sys.exit(0 if latest and latest.get('conclusion')=='success' else 1)
PY
then
 bash scripts/update.sh
else
 echo "提交 $sha 尚未通过GitHub Actions检查，未部署。"
fi
