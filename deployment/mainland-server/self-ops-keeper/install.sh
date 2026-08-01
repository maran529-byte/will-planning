#!/usr/bin/env bash
# ============================================================
# aiwill-planner 自运营守护: 一键部署脚本
# ------------------------------------------------------------
# 在腾讯云 CVM 124.222.215.107 上执行:
#   bash install.sh
#
# 部署内容:
#   - /usr/local/bin/aiwill-keeper.sh        (进程守护常驻)
#   - /usr/local/bin/aiwill-driver.sh        (任务调度器)
#   - /usr/local/bin/aiwill-alert.sh         (邮件告警)
#   - /usr/local/bin/aiwill-healthcheck.sh   (端点巡检)
#   - /root/aiwill-self-ops/watchdog_v2.py   (主监控)
#   - /etc/systemd/system/aiwill-keeper.service
#   - cron 任务 (5min / 15min)
# ============================================================

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET=/usr/local/bin
SELF_OPS=/root/aiwill-self-ops

echo "==> 1/6 拷贝脚本到 ${TARGET}"
sudo install -m 0755 "$SRC_DIR/aiwill-keeper.sh"    "$TARGET/aiwill-keeper.sh"
sudo install -m 0755 "$SRC_DIR/driver.sh"          "$TARGET/aiwill-driver.sh"
sudo install -m 0755 "$SRC_DIR/aiwill-alert.sh"     "$TARGET/aiwill-alert.sh"
sudo install -m 0755 "$SRC_DIR/healthcheck.sh"     "$TARGET/aiwill-healthcheck.sh"

echo "==> 2/6 拷贝 watchdog_v2.py 到 ${SELF_OPS}"
sudo install -m 0755 "$SRC_DIR/watchdog_v2.py"      "$SELF_OPS/watchdog_v2.py"

echo "==> 3/6 部署 systemd unit"
sudo install -m 0644 "$SRC_DIR/aiwill-keeper.service" /etc/systemd/system/aiwill-keeper.service
sudo systemctl daemon-reload
sudo systemctl enable --now aiwill-keeper.service

echo "==> 4/6 配置 cron 任务"
# 检查并补入新行 (不覆盖已有 cron)
( sudo -n crontab -l 2>/dev/null || true ) > /tmp/current-cron
cat > /tmp/new-cron-blocks <<'EOF'
# ===== aiwill 自运营守护 (2026-07-24 部署 · 三层防护) =====
# L1: 端点巡检 (5min)
*/5 * * * * /usr/local/bin/aiwill-healthcheck.sh >> /var/log/aiwill-keeper/healthcheck.log 2>&1
# L2: 任务调度器 (5min, 补跑超期 optimizer)
*/5 * * * * /usr/local/bin/aiwill-driver.sh >> /var/log/aiwill-keeper/driver.log 2>&1
# L3: 主监控 (15min, 心跳+cron 错误+nginx 5xx+Supabase RLS)
*/15 * * * * /usr/bin/python3 /root/aiwill-self-ops/watchdog_v2.py >> /var/log/aiwill-keeper/watchdog_v2.log 2>&1
EOF
if ! grep -q "aiwill 自运营守护" /tmp/current-cron; then
  cat /tmp/new-cron-blocks >> /tmp/current-cron
  sudo -n crontab /tmp/current-cron
  echo "  ✓ cron 已更新"
else
  echo "  ✓ cron 块已存在, 跳过"
fi

echo "==> 5/6 启动并验证 aiwill-keeper.service"
sleep 2
if sudo systemctl is-active --quiet aiwill-keeper.service; then
  echo "  ✓ aiwill-keeper.service active"
else
  echo "  ✗ aiwill-keeper 未启动, 请检查: sudo journalctl -u aiwill-keeper.service"
  exit 1
fi

echo "==> 6/6 验证 healthcheck 立即可跑"
sudo /usr/local/bin/aiwill-healthcheck.sh && echo "  ✓ L1 通过" || echo "  ⚠ L1 有失败, 详见 /var/log/aiwill-keeper/healthcheck.log"

echo ""
echo "============================================================"
echo "部署完成 ✓"
echo "------------------------------------------------------------"
echo "三层防护状态:"
echo "  L1 端点巡检:  每  5 分钟 → /var/log/aiwill-keeper/healthcheck.log"
echo "  L2 任务调度:  每  5 分钟 → /var/log/aiwill-keeper/driver.log"
echo "  L3 心跳监控:  每 15 分钟 → /var/log/aiwill-keeper/watchdog_v2.log"
echo "  进程守护:     systemd    → /var/log/aiwill-keeper/keeper.log"
echo ""
echo "查询命令:"
echo "  sudo systemctl status aiwill-keeper.service"
echo "  sudo journalctl -u aiwill-keeper.service -f"
echo "  tail -f /var/log/aiwill-keeper/*.log"
echo ""
echo "手动测试告警:"
echo "  /usr/local/bin/aiwill-alert.sh '测试告警' '2026-07-24 自运营守护上线'"
echo "============================================================"
