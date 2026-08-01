# aiwill-planner 自运营守护 (Three-Layer Keeper)

> 部署日期: 2026-07-24
> 目标: 服务器被改 / 崩溃 / 流量异常时, 系统自动恢复 + 邮件告警。
> 部署方式: 一次性 `bash install.sh` 在腾讯云 CVM 执行。

## 三层防护

| Layer | 触发频率 | 监控对象 | 恢复策略 |
|---|---|---|---|
| **L1 进程守护** | systemd service, 30s 循环 | nginx / Next.js / supabase-db / cron / 磁盘 | systemd restart + docker restart |
| **L2 端点巡检** | cron `*/5 min` | 8 个 HTTPS 关键路由 | 连续 3 次失败 → restart Next.js + 邮件 |
| **L3 任务调度** | cron `*/5 min` | 5 优化器 + 公众号 + 网站 + 合规的今日心跳 | 超期 → 主动脚本补跑 |
| **L4 主监控** | cron `*/15 min` | 心跳过期 + cron 错误关键词 + 5xx 累计 + RLS/401 | 邮件告警到 maran529@icloud.com (6h 冷却) |

## 文件清单

```
self-ops-keeper/
├── README.md                 # 本文档
├── install.sh                # 一键部署脚本 (服务器执行)
├── aiwill-keeper.service     # systemd unit
├── aiwill-keeper.sh          # 进程守护主循环 (systemd 启动)
├── healthcheck.sh            # L2 端点巡检 (cron)
├── driver.sh                 # L3 任务调度器 (cron)
├── aiwill-alert.sh           # 邮件告警 (被各层调用)
└── watchdog_v2.py            # L4 主监控 (cron)
```

## 部署位置

服务器上:
```
/usr/local/bin/aiwill-keeper.sh        # 进程守护
/usr/local/bin/aiwill-healthcheck.sh   # L2 端点
/usr/local/bin/aiwill-driver.sh        # L3 调度
/usr/local/bin/aiwill-alert.sh         # 邮件
/root/aiwill-self-ops/watchdog_v2.py   # L4 主监控
/etc/systemd/system/aiwill-keeper.service
/var/log/aiwill-keeper/                 # 全部日志
/var/log/aiwill-keeper/last-tick.json  # 30s 心跳
/var/log/aiwill-keeper/alert-state.json # 告警冷却
```

## 与原 cron 共存

未修改原 cron 任务。新的三层仅是叠加, 不冲突:
- 原 5 优化器 cron (0 10/0 11...) 仍然按时间表触发
- L3 `driver.sh` 只在 optimizers 超期 1.5h+ 才补跑
- L4 `watchdog_v2.py` 与原 `watchdog.py` 独立, 双保险

## 告警冷却

`/var/log/aiwill-keeper/alert-state.json` 记录 4 类告警的最后发送时间:
- `heartbeat` — 心跳过期告警
- `cron_error` — cron 日志 ERROR/Traceback
- `nginx_5xx` — nginx 5xx 累计 > 10
- `rls` — Supabase RLS/401 异常

冷却 6h, 防止每次 cron 触发都发邮件。

## 验证

```bash
# 在服务器上跑一遍
ssh aiwill-server
sudo /usr/local/bin/aiwill-healthcheck.sh        # L2 立即跑
sudo /usr/local/bin/aiwill-driver.sh              # L3 立即跑
sudo /usr/bin/python3 /root/aiwill-self-ops/watchdog_v2.py  # L4 立即跑
/usr/local/bin/aiwill-alert.sh "test" "subject"  # 测试邮件

# 看守护状态
sudo systemctl status aiwill-keeper.service      # L1 进程
sudo journalctl -u aiwill-keeper.service -f
```

## 通知邮箱

默认: `maran529@icloud.com`
QQ SMTP: `330320991@qq.com` (授权码 `yckdosokmoykcaaj`)
