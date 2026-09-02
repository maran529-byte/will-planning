# aiwill 自运营告警处理系统

改版 v1 (2026-09-02)

## 作用

读服务器 `/var/log/aiwill-keeper/alert-state.json` 里的 3 类告警
(heartbeat / cron_error / nginx_5xx)，按路由表自动修复或发邮件。

## 文件

| 文件 | 用途 |
|---|---|
| `alert_handler.py` | 核心引擎：读告警 + 路由 + 自动修复 + cooldown |
| `alert_router.yaml` | 告警类型 → 修复动作路由表（5 类告警 + 默认 fallback）|
| `alert_handler.sh` | 服务器 wrapper（注入 QQ SMTP env）|

## 服务器部署

- `~/.aiwill/hermes/` Mac 端：开发 + hermes_loop 集成调用
- `/opt/aiwill-hermes/` 服务器端：cron 每 10 分钟独立跑
- `/usr/local/bin/alert_handler.sh` 服务器：cron 包装

## 5 类告警路由

| 告警类型 | severity | 自动动作 | cooldown |
|---|---|---|---|
| `healthcheck.fail.single` | warning | 仅记录 | — |
| `healthcheck.fail.multi` | critical | ✅ ssh restart aiwill + 回测 | 30min |
| `cron_error` | warning | 仅邮件 | 30min |
| `nginx_5xx.spike` | critical | ✅ nginx -t + reload | 60min |
| `nginx_pid_missing` | critical | ✅ sudo nginx | 60min |
| `default` | info | log_only | — |

## 不接 iCloud IMAP 的原因

用户偏好：iCloud 收件用电脑端邮件 App 自读，不暴露 app-specific password。
所以从服务器本地 `/var/log/aiwill-keeper/` 读，不需要 IMAP。

## 安全护栏

- ❌ 永不自动 `rm -rf` / `DROP TABLE` / 删生产数据 / 改支付链路
- ✅ 每个 fix_step 有 cooldown：避免循环告警反复 restart
- ✅ 自动修后必须回测：失败 → 立即发邮件升级人工
- ✅ 所有"删除 / 修改"类动作需要 `auto_fix: true` 显式列出

## 验证历史

- 2026-09-02 v1 落地
  - 5 类 dryrun 路由命中
  - cron_error → 真发邮件 (sent: true)
  - cooldown 30min 内第 2 次 skipped
  - 服务器 cron `*/10 * * * *` 跑通 (rc=0)
  - hermes_loop 主循环集成 alert_handler.py