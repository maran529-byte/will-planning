#!/bin/bash
# alert_handler.sh — 服务器本地 wrapper (改版 v1, 2026-09-01)
#
# cron 每 10 分钟跑一次, 调用 Python alert_handler
# 注意: 服务器本地不需要 SSH (直接读本地 /var/log/aiwill-keeper/)
#
# 收件箱: maran529@icloud.com
# 发件箱: 330320991@qq.com (QQ SMTP)

set -uo pipefail

LOG_DIR="/tmp/aiwill-hermes"
mkdir -p "$LOG_DIR"

# QQ SMTP env (cron 环境无 export, 这里注入)
export QQ_SMTP_AUTHCODE="yckdosokmoykcaaj"

# 跑
RESULT=$(python3 /opt/aiwill-hermes/modules/alert_handler.py 2>&1)
RC=$?

# 写日志
echo "[$(date -Iseconds)] rc=$RC output=$RESULT" >> "$LOG_DIR/alert_handler.log"

# 失败时报警 (走 QQ SMTP, 不要走 aiwill-alert.sh, 因为那个是 keeper 用的)
if [[ $RC -ne 0 ]]; then
  echo "[FATAL] alert_handler crashed: $RESULT" >&2
fi

exit $RC