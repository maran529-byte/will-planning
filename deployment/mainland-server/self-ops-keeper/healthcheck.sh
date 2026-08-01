#!/usr/bin/env bash
# ============================================================
# aiwill-planner 自运营 L1 端点巡检 (Layer 1)
# ------------------------------------------------------------
# 目的: 每 5 分钟 (cron) 检查网站/H5/API 是否在线, 发现异常:
#   1. 写日志 + 重启 aiwill.service (nginx 通常由 systemd 兜底)
#   2. 如 3 次连续失败 → 触发邮件告警
# 退出码:
#   0 = 全部正常
#   1 = 有失败 (但还没到告警阈值)
#   2 = 连续 3+ 次失败, 已发告警邮件
# ============================================================

set -uo pipefail

LOG_DIR="/var/log/aiwill-keeper"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/healthcheck.log"
STATE_FILE="$LOG_DIR/consecutive_failures"

# 配置 (域名 + 端点)
PROBES=(
  "AIWILL_PC_HOME|https://aiwill-planner.cn/|200"
  "AIWILL_H5_HOME|https://h5.aiwill-planner.cn/|200"
  "AIWILL_PC_HEALTH|https://aiwill-planner.cn/api/health|200"
  "AIWILL_H5_HEALTH|https://h5.aiwill-planner.cn/api/health|200"
  "AIWILL_PC_SITEMAP|https://aiwill-planner.cn/sitemap.xml|200"
  "AIWILL_H5_SITEMAP|https://h5.aiwill-planner.cn/sitemap.xml|200"
  "AIWILL_PC_DASHBOARD|https://h5.aiwill-planner.cn/dashboard|200"
  "AIWILL_PC_WALLET|https://h5.aiwill-planner.cn/wallet-policy|200"
)

# 读取当前失败计数 (默认 0)
CONSEC_FAIL=${CONSEC_FAIL:-0}
if [[ -f "$STATE_FILE" ]]; then
  CONSEC_FAIL=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
fi

ts() { date "+%Y-%m-%d %H:%M:%S"; }

FAILS=0
declare -a FAIL_LIST

for entry in "${PROBES[@]}"; do
  IFS='|' read -r name url expected <<< "$entry"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 -A "aiwill-keeper/1.0" "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "$expected" ]]; then
    printf "%s [L1] %-25s %-50s %s OK\n" "$(ts)" "$name" "$url" "$code" >> "$LOG_FILE"
  else
    printf "%s [L1] %-25s %-50s %s FAIL (expected %s)\n" "$(ts)" "$name" "$url" "$code" "$expected" >> "$LOG_FILE"
    FAIL_LIST+=("$name=$code")
    FAILS=$((FAILS+1))
  fi
done

# 全部通过: 重置计数
if [[ $FAILS -eq 0 ]]; then
  if [[ "$CONSEC_FAIL" -gt 0 ]]; then
    echo "0" > "$STATE_FILE"
    printf "%s [L1] 恢复: 所有端点回归正常\n" "$(ts)" >> "$LOG_FILE"
  fi
  exit 0
fi

# 部分失败: 计数 +1
NEW_FAIL=$((CONSEC_FAIL + 1))
echo "$NEW_FAIL" > "$STATE_FILE"
printf "%s [L1] 失败: %d/%d 端点异常 (累计 %d 次连续)\n" "$(ts)" "$FAILS" "${#PROBES[@]}" "$NEW_FAIL" >> "$LOG_FILE"

# 累计 < 3 次: 仅记日志, 不发邮件, 不重启 (避免抖动)
if [[ $NEW_FAIL -lt 3 ]]; then
  exit 1
fi

# 累计 ≥ 3 次: 重启服务 + 告警
printf "%s [L1] 重启 aiwill.service (连续 3+ 次失败)\n" "$(ts)" >> "$LOG_FILE"
systemctl restart aiwill.service 2>&1 | tee -a "$LOG_FILE"
sleep 5

# 重新探测 1 次
RECOVERED=0
for entry in "${PROBES[@]}"; do
  IFS='|' read -r name url expected <<< "$entry"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  if [[ "$code" != "$expected" ]]; then
    RECOVERED=$((RECOVERED+1))
  fi
done

if [[ $RECOVERED -gt 0 ]]; then
  printf "%s [L1] 重启后仍有 %d 端点异常, 发邮件告警\n" "$(ts)" "$RECOVERED" >> "$LOG_FILE"
  /usr/local/bin/aiwill-alert.sh "aiwill L1 告警: ${RECOVERED} 端点异常" "$(printf '失败端点:\n%s\n\n重启后仍有 %d 异常\n请尽快 SSH 检查\n%s' "$(IFS=$'\n'; echo "${FAIL_LIST[*]}")" "$RECOVERED" "https://aiwill-planner.cn/api/health")"
fi

exit 2
