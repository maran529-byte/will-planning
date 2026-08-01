#!/usr/bin/env bash
# ============================================================
# aiwill-planner 自运营 L2 任务调度器 (Layer 2)
# ------------------------------------------------------------
# 目的: 每 5 分钟 (cron) 检查今天 5 个 optimizer 是否都已运行:
#   - issue_watcher          (每日 09:00 期望)
#   - site_optimizer         (每日 10:00 期望)
#   - feedback_optimizer     (每日 10:30 期望)
#   - health_optimizer       (每日 11:00 期望)
#   - content_scheduler      (每日 12:00 期望)
#   - orchestrator           (每日 13:00 期望)
#   - wechat publisher       (每日 09:00 期望)
#   - website publisher      (每日 08/12/20 期望)
#   - compliance_check       (每日 09/15 期望)
# 逻辑: 读到 expected_hour+1 小时仍未运行 → 主动跑一次 + 邮件告知
# 退出码:
#   0 = 一切正常
#   1 = 有 1+ 个任务超期, 已补跑
# ============================================================

set -uo pipefail

BASE="/root/aiwill-self-ops"
LOG_DIR="/var/log/aiwill-keeper"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/driver.log"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
NOW_H=$(date +%H)
NOW_M=$(date +%M)
NOW_HM=$((10#$NOW_H * 60 + 10#$NOW_M))   # 一天内分钟数
TODAY=$(date +%Y-%m-%d)

# 函数: 检查心跳是否存在且今天
check_ran() {
  local name="$1"
  local hb_file="$2"
  if [[ ! -f "$hb_file" ]]; then
    echo "missing"
    return 1
  fi
  local hb_date=$(stat -c %y "$hb_file" 2>/dev/null | cut -d' ' -f1)
  if [[ "$hb_date" == "$TODAY" ]]; then
    echo "ran"
    return 0
  fi
  echo "stale:$hb_date"
  return 1
}

# 函数: 主动跑一个 optimizer (模拟 cron)
run_one() {
  local cmd="$1"
  local logf="$2"
  printf "%s [L2] running: %s\n" "$(ts)" "$cmd" >> "$LOG_FILE"
  bash -c "$cmd" >> "$logf" 2>&1
  local rc=$?
  printf "%s [L2] exit=%d\n" "$(ts)" "$rc" >> "$LOG_FILE"
  return $rc
}

declare -a MISSED_TASKS

# 1) issue_watcher (期望 9:00, 11h 后触发补跑)
if (( NOW_HM >= 10*60 + 30 )); then
  STATUS=$(check_ran "issue_watcher" "$BASE/logs/issue_watcher/heartbeat.json")
  if [[ "$STATUS" != "ran" ]]; then
    if run_one "cd $BASE && set -a && . ./.env && set +a && /usr/bin/python3 $BASE/issue_watcher.py" "$BASE/logs/issue_watcher/cron.log"; then
      :
    fi
    MISSED_TASKS+=("issue_watcher($STATUS)")
  fi
fi

# 2) site_optimizer (期望 10:00)
if (( NOW_HM >= 11*60 + 30 )); then
  STATUS=$(check_ran "site" "$BASE/logs/optimizer/heartbeat.json")
  if [[ "$STATUS" != "ran" ]] && ! grep -q "\"site_optimizer\".*\"today_ok\"" "$BASE/logs/optimizer/heartbeat.json" 2>/dev/null; then
    run_one "cd $BASE && set -a && . ./.env && set +a && /usr/bin/python3 $BASE/optimizers/site_optimizer.py" "$BASE/logs/optimizer/cron.log"
    MISSED_TASKS+=("site_optimizer($STATUS)")
  fi
fi

# 3) feedback_optimizer (期望 10:30)
if (( NOW_HM >= 12*60 )); then
  STATUS=$(check_ran "feedback" "$BASE/logs/optimizer/heartbeat.json")
  if [[ "$STATUS" != "ran" ]] && ! grep -q "\"feedback_optimizer\".*\"today_ok\"" "$BASE/logs/optimizer/heartbeat.json" 2>/dev/null; then
    run_one "cd $BASE && set -a && . ./.env && set +a && /usr/bin/python3 $BASE/optimizers/feedback_optimizer.py" "$BASE/logs/optimizer/cron.log"
    MISSED_TASKS+=("feedback_optimizer($STATUS)")
  fi
fi

# 4) health_optimizer (期望 11:00)
if (( NOW_HM >= 12*60 + 30 )); then
  STATUS=$(check_ran "health" "$BASE/logs/optimizer/heartbeat.json")
  if [[ "$STATUS" != "ran" ]] && ! grep -q "\"health_optimizer\".*\"today_ok\"" "$BASE/logs/optimizer/heartbeat.json" 2>/dev/null; then
    run_one "cd $BASE && set -a && . ./.env && set +a && /usr/bin/python3 $BASE/optimizers/health_optimizer.py" "$BASE/logs/optimizer/cron.log"
    MISSED_TASKS+=("health_optimizer($STATUS)")
  fi
fi

# 5) content_scheduler (期望 12:00)
if (( NOW_HM >= 13*60 + 30 )); then
  STATUS=$(check_ran "content" "$BASE/logs/optimizer/heartbeat.json")
  if [[ "$STATUS" != "ran" ]] && ! grep -q "\"content_scheduler\".*\"today_ok\"" "$BASE/logs/optimizer/heartbeat.json" 2>/dev/null; then
    run_one "cd $BASE && set -a && . ./.env && set +a && /usr/bin/python3 $BASE/optimizers/content_scheduler.py" "$BASE/logs/optimizer/cron.log"
    MISSED_TASKS+=("content_scheduler($STATUS)")
  fi
fi

# 6) orchestrator (期望 13:00)
if (( NOW_HM >= 14*60 + 30 )); then
  STATUS=$(check_ran "orchestrator" "$BASE/logs/optimizer/heartbeat.json")
  if [[ "$STATUS" != "ran" ]] && ! grep -q "\"orchestrator\".*\"today_ok\"" "$BASE/logs/optimizer/heartbeat.json" 2>/dev/null; then
    run_one "cd $BASE && set -a && . ./.env && set +a && /usr/bin/python3 $BASE/optimizers/orchestrator.py" "$BASE/logs/optimizer/cron.log"
    MISSED_TASKS+=("orchestrator($STATUS)")
  fi
fi

# 7) wechat publisher (期望 09:00)
if (( NOW_HM >= 10*60 + 30 )); then
  if [[ ! -f "/opt/aiwill-wechat-publisher/heartbeat.json" ]] || ! grep -q "\"$(date +%Y-%m-%d)\"" "/opt/aiwill-wechat-publisher/heartbeat.json" 2>/dev/null; then
    run_one "cd /opt/aiwill-wechat-publisher && set -a && . $BASE/.env && set +a && /usr/bin/python3 /opt/aiwill-wechat-publisher/publisher.py" "/opt/aiwill-wechat-publisher/cron.log"
    MISSED_TASKS+=("wechat_publisher(stale)")
  fi
fi

# 8) compliance_check (期望 09:00 + 15:00, 触发补跑 if 没有今日 OK)
if (( NOW_HM >= 16*60 )); then
  if ! grep -q "合规检查通过\\|全部合规" "$BASE/logs/compliance/cron.log" 2>/dev/null; then
    run_one "cd $BASE && /usr/bin/python3 $BASE/compliance_check.py" "$BASE/logs/compliance/cron.log"
    MISSED_TASKS+=("compliance_check(missing_ok)")
  fi
fi

# 输出结果
if [ "${#MISSED_TASKS[@]}" -gt 0 ]; then
  printf "%s [L2] 补跑了 %d 个错过的任务: %s\n" "$(ts)" "${#MISSED_TASKS[@]}" "$(IFS=,; echo "${MISSED_TASKS[*]}")" >> "$LOG_FILE"
  /usr/local/bin/aiwill-alert.sh "aiwill L2 告警: 补跑 ${#MISSED_TASKS[@]} 个任务" "缺失的任务:\n$(IFS=$'\n'; echo "${MISSED_TASKS[*]}")\n\n已主动补跑, 请查 cron.log 验证输出。" &
  exit 1
fi

printf "%s [L2] 今日所有自运营任务正常, 无需补跑\n" "$(ts)" >> "$LOG_FILE"
exit 0
