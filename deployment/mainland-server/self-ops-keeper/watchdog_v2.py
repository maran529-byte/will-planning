#!/usr/bin/env python3
"""
aiwill-self-ops 看门狗 v2 (Layer 3 主监控)
  - 每 15 分钟 (cron) 运行
  - 1. 心跳过期: optimizer/issue_watcher/website/wechat 心跳超 26h → 告警
  - 2. cron 失败: 今天 cron.log 内有 Traceback / Error 关键词 → 告警
  - 3. Nginx 5xx: 当日 access.log 内 50x 累计 > 10 → 告警
  - 4. Supabase RLS: 任何 API 调用返回 401/403/RLS 报错 → 记录 + 告警
  异常时通过 QQ SMTP (maran529@icloud.com) 双通道告警.
  告警有 6h 冷却, 防止风暴.
"""

import json
import os
import re
import smtplib
import ssl
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

BASE = Path(os.environ.get("AIWILL_BASE_DIR") or Path("/root/aiwill-self-ops"))
LOG_BASE = BASE / "logs"
NOW = datetime.now(timezone.utc)
TODAY = NOW.strftime("%Y-%m-%d")
ALERT_COOLDOWN_HOURS = 6
STALE_HOURS = 26

# 心跳文件
HEARTBEATS = [
    ("issue_watcher", LOG_BASE / "issue_watcher" / "heartbeat.json", "用户反馈巡检"),
    ("optimizer",     LOG_BASE / "optimizer"     / "heartbeat.json", "5 优化器+orchestrator"),
    ("wechat",        Path("/opt/aiwill-wechat-publisher/heartbeat.json"), "公众号每日推送"),
    ("website",       Path("/opt/aiwill-website-articles/heartbeat.json"), "网站热点发布"),
    ("keeper",        Path("/var/log/aiwill-keeper/last-tick.json"), "进程守护 aiwill-keeper (30s 心跳)"),
]
KEEPER_TICK_MAX_AGE_MINUTES = 5   # keeper 心跳 5 分钟没更新即告警
ALERT_LOG = Path("/var/log/aiwill-keeper") / "alert-state.json"
ALERT_LOG.parent.mkdir(parents=True, exist_ok=True)
WATCHDOG_LOG = LOG_BASE / "optimizer" / "watchdog_v2.log"
WATCHDOG_LOG.parent.mkdir(parents=True, exist_ok=True)

REPORT_TO = "maran529@icloud.com"
EMAIL_CFG = BASE / "email.json"


def _log(msg: str) -> None:
    line = f"[{NOW.isoformat()}] [L3] {msg}"
    print(line, flush=True)
    with WATCHDOG_LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_alert_state() -> dict:
    if ALERT_LOG.exists():
        try:
            return json.loads(ALERT_LOG.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_alert_state(state: dict) -> None:
    ALERT_LOG.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def in_cooldown(state: dict, key: str) -> bool:
    last = state.get(key)
    if not last:
        return False
    try:
        t = datetime.fromisoformat(last)
    except Exception:
        return False
    return (NOW - t) < timedelta(hours=ALERT_COOLDOWN_HOURS)


def mark_alerted(state: dict, key: str) -> None:
    state[key] = NOW.isoformat()


def send_email(subject: str, body: str) -> None:
    if not EMAIL_CFG.exists():
        _log(f"missing email config {EMAIL_CFG}")
        return
    cfg = json.loads(EMAIL_CFG.read_text(encoding="utf-8"))
    msg = MIMEMultipart()
    msg["From"] = cfg["from_addr"]
    msg["To"] = cfg["to_addr"]
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))
    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(cfg["smtp_host"], cfg["smtp_port"], context=ctx, timeout=15) as s:
            s.login(cfg["from_addr"], cfg["password"])
            s.sendmail(cfg["from_addr"], [cfg["to_addr"]], msg.as_string())
        _log(f"alert sent: {subject}")
    except Exception as e:
        _log(f"alert send failed: {e}")


# ========== 检查 1: 心跳过期 ==========
def check_heartbeat() -> list:
    fails = []
    for name, path, label in HEARTBEATS:
        if not path.exists():
            fails.append(f"[心跳缺失] {name} ({label}): {path} 不存在")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            ts = data.get("ts") or data.get("updated_at") or data.get("last_run") or data.get("last_run_at")
            # 嵌套结构 (如 optimizer/heartbeat.json 含 site/feedback/health/orchestrator 子段),
            # 取所有子段 last_run_at 的最大值
            if not ts and isinstance(data, dict):
                candidates = []
                for v in data.values():
                    if isinstance(v, dict):
                        sub = v.get("last_run_at")
                        if sub:
                            candidates.append(sub)
                if candidates:
                    ts = max(candidates)
            if not ts:
                fails.append(f"[心跳无 ts] {name} ({label})")
                continue
            t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            age_h = (NOW - t).total_seconds() / 3600
            # keeper 心跳更密集, 用分钟阈值
            max_age_h = STALE_HOURS
            if name == "keeper":
                max_age_h = KEEPER_TICK_MAX_AGE_MINUTES / 60.0
            if age_h > max_age_h:
                fails.append(f"[心跳过期 {age_h:.1f}h] {name} ({label})")
        except Exception as e:
            fails.append(f"[心跳解析失败] {name}: {e}")
    return fails


# ========== 检查 2: cron 日志 Error/Traceback 关键词 ==========
def check_cron_logs() -> list:
    fails = []
    pattern = re.compile(r"(Traceback|ERROR|FAIL|Exception|DB_ERROR|RPC_ERROR|401 Unauthorized|5\d\d\s+\d+)", re.IGNORECASE)
    for log_file in [
        LOG_BASE / "optimizer" / "cron.log",
        LOG_BASE / "optimizer" / "watchdog.log",
        LOG_BASE / "issue_watcher" / "cron.log",
        Path("/opt/aiwill-wechat-publisher") / "cron.log",
    ]:
        if not log_file.exists():
            continue
        try:
            content = log_file.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        # 只看今天的
        today_lines = [ln for ln in content.splitlines() if TODAY in ln[:20]]
        errors = [ln for ln in today_lines if pattern.search(ln)]
        if errors:
            snippet = "\n".join(errors[-5:])[:2000]
            fails.append(f"[cron 错误] {log_file.name}: {len(errors)} 条\n{snippet}")
    return fails


# ========== 检查 3: nginx 5xx ==========
def check_nginx_5xx() -> list:
    access = Path("/var/log/nginx/access.log")
    if not access.exists():
        return []
    try:
        # 简单 grep + 计数
        out = subprocess.run(
            ["grep", TODAY, str(access)],
            capture_output=True, text=True, errors="replace", timeout=15,
        )
        lines = (out.stdout or "").splitlines()
        n5xx = sum(1 for ln in lines if re.search(r'"\s+5\d\d\s', ln))
        n4xx = sum(1 for ln in lines if re.search(r'"\s+4\d\d\s', ln))
        if n5xx > 10:
            return [f"[nginx 5xx] 今日 5xx = {n5xx} 条, 4xx = {n4xx} 条 (阈值 10)"]
    except Exception as e:
        return [f"[nginx 日志读取失败] {e}"]
    return []


# ========== 检查 4: Supabase RLS / 401 ==========
def check_supabase_rls() -> list:
    # 当日 nginx error.log
    err = Path("/var/log/nginx/error.log")
    if not err.exists():
        return []
    try:
        out = subprocess.run(
            ["grep", TODAY, str(err)],
            capture_output=True, text=True, errors="replace", timeout=10,
        )
        lines = [ln for ln in (out.stdout or "").splitlines() if "RLS" in ln or "401" in ln]
        if len(lines) > 5:
            return [f"[nginx RLS/401] 今日 {len(lines)} 条\n" + "\n".join(lines[-3:])[:500]]
    except Exception:
        pass
    return []


def main() -> int:
    state = load_alert_state()
    _log(f"watchdog v2 启动, 阈值 stale={STALE_HOURS}h cooldown={ALERT_COOLDOWN_HOURS}h")
    all_fails = (
        check_heartbeat()
        + check_cron_logs()
        + check_nginx_5xx()
        + check_supabase_rls()
    )
    if not all_fails:
        _log("全部检查通过 ✓")
        # 即使无失败, 也清除过时的 alert 状态 (避免长期 cooldown 误判)
        save_alert_state({k: v for k, v in state.items() if _within_24h(v)})
        return 0

    _log(f"发现 {len(all_fails)} 类异常")
    # 按 key 做冷却
    new_fails = []
    keys = ["heartbeat", "cron_error", "nginx_5xx", "rls"]
    for key, body in zip(keys, all_fails):
        if not in_cooldown(state, key):
            new_fails.append((key, body))
            mark_alerted(state, key)
    save_alert_state(state)

    if not new_fails:
        _log("所有告警都在冷却期, 本轮不发邮件")
        return 1

    subject = f"[aiwill 自运营告警] {len(new_fails)} 类异常需关注"
    body = "\n\n=============\n\n".join(f"{k}\n{b}" for k, b in new_fails)
    body += (
        f"\n\n--\n"
        f"查看完整日志:\n"
        f"  tail -f /var/log/aiwill-keeper/{{healthcheck,driver,keeper,watchdog_v2}}.log\n"
        f"\n"
        f"SSH 排查: ssh aiwill-server\n"
        f"手动触发补跑: /usr/local/bin/aiwill-driver.sh"
    )
    send_email(subject, body)
    return 1


def _within_24h(iso_ts: str) -> bool:
    try:
        t = datetime.fromisoformat(iso_ts)
        return (NOW - t) < timedelta(hours=24)
    except Exception:
        return False


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        _log(f"watchdog v2 自爆: {e}")
        sys.exit(2)
