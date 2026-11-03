#!/usr/bin/env bash
set -Eeuo pipefail
command -v python3 >/dev/null
cat > /etc/systemd/system/chen-study-update.service <<'UNIT'
[Unit]
Description=Deploy Chen Study after GitHub Actions checks
Requires=docker.service
After=docker.service network-online.target
[Service]
Type=oneshot
WorkingDirectory=/opt/chen-study
ExecStart=/bin/bash /opt/chen-study/scripts/auto-update.sh
UMask=0077
TimeoutStartSec=900
UNIT
cat > /etc/systemd/system/chen-study-update.timer <<'UNIT'
[Unit]
Description=Check approved Chen Study updates every five minutes
[Timer]
OnBootSec=3min
OnUnitInactiveSec=5min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now chen-study-update.timer
