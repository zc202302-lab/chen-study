#!/usr/bin/env bash
set -Eeuo pipefail
[[ -f /opt/chen-study/scripts/backup.sh ]]
cat > /etc/systemd/system/chen-study-backup.service <<'UNIT'
[Unit]
Description=Chen Study database backup
Requires=docker.service
After=docker.service
[Service]
Type=oneshot
WorkingDirectory=/opt/chen-study
ExecStart=/bin/bash /opt/chen-study/scripts/backup.sh
UMask=0077
UNIT
cat > /etc/systemd/system/chen-study-backup.timer <<'UNIT'
[Unit]
Description=Daily Chen Study backup (Asia/Shanghai)
[Timer]
OnCalendar=*-*-* 03:30:00 Asia/Shanghai
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now chen-study-backup.timer
bash /opt/chen-study/scripts/backup.sh
