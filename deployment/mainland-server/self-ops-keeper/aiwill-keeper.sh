#!/usr/bin/env bash
# ============================================================
# aiwill-planner 自运营 进程守护 (Process Keeper)
# ------------------------------------------------------------
# 以 systemd service 形式常驻, 每 30 秒检查:
#   1. aiwill.service active (Next.js 3001)
#   2. nginx master alive
#   3. supabase-db container running
#   4. crond active (cron 调度)
# 异常 → 重启对应组件 + 写日志
# ============================================================

set -u

LOG_DIR="/var/log/aiwill-keeper"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/keeper.log"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { printf "%s [keeper] %s\n" "$(ts)" "$1" >> "$LOG_FILE"; }

restart_aiwill() {
  log "主动重启 aiwill.service"
  sudo systemctl restart aiwill.service 2>&1 >> "$LOG_FILE"
}

restart_nginx() {
  log "尝试 nginx reload/start"
  if sudo nginx -t 2>/dev/null; then
    if sudo nginx -s reload 2>&1 >> "$LOG_FILE"; then
      return 0
    fi
  fi
  # 检查端口占用
  PORT_HOLDERS=$(ss -tlnp 2>/dev/null | awk '/:(80|443) / {print $0}' || true)
  log "端口占用情况: ${PORT_HOLDERS:-无}"
  # 尝试重启
  sudo nginx -s stop 2>&1 >> "$LOG_FILE" || true
  sleep 2
  sudo nginx 2>&1 >> "$LOG_FILE" || {
    log "nginx 重启失败, 尝试 systemctl"
    sudo systemctl reset-failed nginx 2>&1 >> "$LOG_FILE"
    sudo systemctl restart nginx 2>&1 >> "$LOG_FILE"
  }
  sleep 1
  if ss -tln 2>/dev/null | awk '{print $4}' | grep -qE ":(80|443)$"; then
    log "nginx 端口已恢复"
  else
    log "⚠ nginx 端口仍未绑定, 需手工排查"
  fi
}

restart_supabase_db() {
  log "restart supabase-db container"
  sudo docker restart supabase-db 2>&1 >> "$LOG_FILE"
}

restart_cron() {
  log "ensure cron is active"
  sudo systemctl enable cron 2>&1 >> "$LOG_FILE"
  sudo systemctl start cron 2>&1 >> "$LOG_FILE"
}

while true; do
  LOOP_TS=$(date +%s)
  TICK_FILE="$LOG_DIR/last-tick.json"
  STATUS_OK=1
  STATUS_DETAILS=()

  # L1: Next.js
  if ! curl -s --max-time 3 http://127.0.0.1:3001/ -o /dev/null -w "%{http_code}" | grep -qE "^(200|404|500|503)$"; then
    if ! systemctl is-active --quiet aiwill.service; then
      log "aiwill.service NOT active, restarting"
      restart_aiwill
      STATUS_OK=0
      STATUS_DETAILS+=("aiwill:restarted")
    fi
  else
    STATUS_DETAILS+=("aiwill:up")
  fi

  # L2: Nginx master + 80/443 端口必须监听
  NGINX_OK=0
  if pgrep -x nginx >/dev/null || pgrep -x openresty >/dev/null; then
    # 进一步: 确认 80/443 至少有一个端口在监听
    if ss -tln 2>/dev/null | awk '{print $4}' | grep -qE ":(80|443)$"; then
      NGINX_OK=1
    fi
  fi
  if [[ $NGINX_OK -eq 0 ]]; then
    log "nginx 端口 80/443 未监听, 尝试重启"
    restart_nginx
    STATUS_OK=0
    STATUS_DETAILS+=("nginx:reloaded")
  else
    STATUS_DETAILS+=("nginx:up")
  fi

  # L3: Supabase DB container
  if ! sudo docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^supabase-db$'; then
    log "supabase-db container DOWN, restarting"
    restart_supabase_db
    STATUS_OK=0
    STATUS_DETAILS+=("supabase_db:restarted")
  else
    STATUS_DETAILS+=("supabase_db:up")
  fi

  # L4: cron daemon
  if ! pgrep -x cron >/dev/null && ! pgrep crond >/dev/null; then
    log "cron NOT running, starting"
    restart_cron
    STATUS_OK=0
    STATUS_DETAILS+=("cron:started")
  else
    STATUS_DETAILS+=("cron:up")
  fi

  # L5: disk space check
  DISK_USED=$(df -P / | awk 'NR==2 {print $5}' | tr -d '%')
  if [[ "${DISK_USED:-0}" -gt 90 ]]; then
    log "⚠️ 磁盘使用率 ${DISK_USED}%, 自动清理 7+ 天前日志"
    sudo find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null
    sudo find /var/www -path "*.next/cache*" -size +500M -mtime +1 -exec rm -rf {} + 2>/dev/null
    STATUS_DETAILS+=("disk:pruned")
  fi

  # Heartbeat (供 watchdog_v2 检查)
  cat > "$TICK_FILE" <<EOF
{
  "ts": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "epoch": ${LOOP_TS},
  "ok": ${STATUS_OK},
  "details": "$(IFS=,; echo "${STATUS_DETAILS[*]}")"
}
EOF
  chmod 0666 "$TICK_FILE" 2>/dev/null

  sleep 30
done
