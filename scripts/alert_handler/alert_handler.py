"""
alert_handler.py — iCloud / 服务器告警读取 + 分级自动修复
改版 v1 (2026-09-01)

不依赖 iCloud IMAP (需要 app-specific password), 改读服务器本地:
1. /var/log/aiwill-keeper/alert-state.json — 心跳 + 3 类告警时间戳
2. /var/log/aiwill-keeper/healthcheck.log — L1 端点巡检明细
3. /var/log/aiwill-keeper/watchdog_v2.log — L3 cron/5xx 告警上下文
4. /var/log/nginx/error.log — nginx 错误细节

数据流:
ssh aiwill-server → cat alert-state.json + tail log
→ 匹配 alert_router.yaml 的路由表
→ 触发对应 fix_steps (ssh 过去跑)
→ 回测
→ 邮件 (如自动修失败, 转人工)

设计原则:
- 任何 "rm -rf /" / "DROP TABLE" / 改支付链路 / 删生产数据 的动作**永远不自动做**
- 每个 fix_steps 有 cooldown_minutes, 防止循环告警反复 restart
- 未命中路由 → log_only + 下次人工 review
"""
import json
import subprocess
import re
import time
from datetime import datetime
from pathlib import Path

import yaml

ROOT = Path.home() / ".aiwill/hermes"
ROUTER_FILE = ROOT / "alert_router.yaml"
STATE_FILE = ROOT / "state/alert_handler_state.json"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

SSH = "aiwill-server"
REMOTE_BASE = "sudo bash -c"
QQ_SMTP_AUTHCODE = "yckdosokmoykcaaj"
EMAIL_TO = "maran529@icloud.com"
EMAIL_FROM = "330320991@qq.com"


def _ssh(cmd: str, timeout: int = 30) -> tuple[str, str, int]:
    """ssh 到服务器跑命令, 返 (stdout, stderr, exit_code)"""
    r = subprocess.run(
        ["ssh", "-o", "StrictHostKeyChecking=no", SSH, cmd],
        capture_output=True, text=True, timeout=timeout,
    )
    return (r.stdout or "", r.stderr or "", r.returncode)


def _send_email(subject: str, body: str) -> bool:
    """QQ SMTP 发邮件到 iCloud"""
    import smtplib, ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.utils import formataddr

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = formataddr(("Hermes 自运营", EMAIL_FROM))
    msg["To"] = EMAIL_TO
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        ctx = ssl.create_default_context()
        try:
            ctx.load_default_certs()
        except Exception:
            pass
        if not ctx.get_ca_certs():
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        with smtplib.SMTP_SSL("smtp.qq.com", 465, context=ctx, timeout=15) as s:
            s.login(EMAIL_FROM, QQ_SMTP_AUTHCODE)
            s.sendmail(EMAIL_FROM, [EMAIL_TO], msg.as_string())
        return True
    except Exception as e:
        print(f"[email] 发送失败: {e}")
        return False


def _load_router() -> dict:
    return yaml.safe_load(ROUTER_FILE.read_text(encoding="utf-8"))


def _load_state() -> dict:
    """持久化: 记录每个 alert_type 上次自动修复时间, 用于 cooldown"""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_state(state: dict):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _within_cooldown(state: dict, alert_type: str, cooldown_minutes: int) -> bool:
    """检查是否在冷却期"""
    last = state.get("last_seen", {}).get(alert_type)
    if not last:
        return False
    last_ts = datetime.fromisoformat(last)
    elapsed_min = (datetime.now() - last_ts).total_seconds() / 60
    return elapsed_min < cooldown_minutes


def _mark_seen(state: dict, alert_type: str):
    """记录该告警类型上次处理时间 (email_only / auto_fix 都调)"""
    state.setdefault("last_seen", {})[alert_type] = datetime.now().isoformat()


def _save_full(state: dict):
    """统一保存: last_seen + history"""
    _save_state(state)


def _mark_fixed(state: dict, alert_type: str):
    _mark_seen(state, alert_type)
    state.setdefault("history", []).append({
        "alert": alert_type,
        "ts": datetime.now().isoformat(),
        "result": "fixed",
    })
    # 保留最近 50 条历史
    state["history"] = state["history"][-50:]
    _save_state(state)


def _mark_skipped(state: dict, alert_type: str, reason: str):
    _mark_seen(state, alert_type)
    state.setdefault("history", []).append({
        "alert": alert_type,
        "ts": datetime.now().isoformat(),
        "result": "skipped",
        "reason": reason,
    })
    state["history"] = state["history"][-50:]
    _save_state(state)


# ============================================================
# 1. 读取服务器告警状态
# ============================================================

def fetch_alert_state() -> dict:
    """读 /var/log/aiwill-keeper/alert-state.json (服务器本地直接读, Mac 通过 SSH)"""
    # 服务器路径 (keeper 写在这里)
    local_paths = [
        Path("/var/log/aiwill-keeper/alert-state.json"),
    ]
    for p in local_paths:
        if p.exists() and p.is_file():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"[parse] {p} 解析失败: {e}")
                continue

    # Mac 端回退: 通过 SSH 拉
    out, err, code = _ssh(
        "cat /var/log/aiwill-keeper/alert-state.json 2>/dev/null"
    )
    if code != 0 or not out.strip():
        return {}
    try:
        return json.loads(out)
    except Exception as e:
        print(f"[parse] ssh alert-state.json 解析失败: {e}")
        return {}


def fetch_healthcheck_failures() -> list:
    """tail healthcheck.log, 找 FAIL 行 (服务器本地读 / Mac SSH)"""
    # 服务器本地
    local_path = Path("/var/log/aiwill-keeper/healthcheck.log")
    if local_path.exists():
        out = _tail_file(local_path, 200)
    else:
        # Mac 通过 SSH
        out, _, _ = _ssh("tail -200 /var/log/aiwill-keeper/healthcheck.log")
    fails = []
    for line in out.splitlines():
        if "FAIL" in line:
            m = re.search(
                r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*\[L1\]\s+(\S+)\s+(\S+)\s+(\d+)\s+FAIL", line
            )
            if m:
                ts, name, url, code = m.groups()
                fails.append({"ts": ts, "name": name, "url": url, "code": code})
    return fails


def fetch_nginx_errors() -> list:
    """tail nginx error.log, 找最近 5xx / invalid PID (服务器本地读 / Mac SSH)"""
    local_path = Path("/var/log/nginx/error.log")
    if local_path.exists():
        try:
            # nginx error.log 经常是 root:adm 权限, 用 sudo tail
            out = subprocess.run(
                ["sudo", "tail", "-200", str(local_path)],
                capture_output=True, text=True, timeout=10,
            ).stdout
        except Exception:
            out = ""
    else:
        out, _, _ = _ssh("sudo tail -200 /var/log/nginx/error.log 2>/dev/null")
    errors = []
    for line in out.splitlines():
        if any(kw in line for kw in [" 502 ", " 503 ", " 504 ", " 500 ", "invalid PID"]):
            errors.append(line.strip()[:200])
    return errors


def _tail_file(path: Path, n: int = 100) -> str:
    """简单本地 tail"""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        return "".join(lines[-n:])
    except Exception as e:
        print(f"[tail] {path} 读失败: {e}")
        return ""


# ============================================================
# 2. 路由 + 修复动作
# ============================================================

def execute_fix_steps(fix_steps: list) -> dict:
    """ssh 跑一系列步骤, 返回结果"""
    results = []
    for step in fix_steps:
        name = step.get("name", "?")
        cmd = step.get("cmd", "")
        condition = step.get("condition")

        skip = False
        if condition:
            # 简单的条件: cmd 跑个检查
            check_out, _, check_code = _ssh(f"{condition}", timeout=10)
            # condition 是 negative 语义: "is_active != active" 时不跑 cmd
            # 但我们这里简化: condition 是 "run when X" 的判断
            skip = False  # TODO: 真正支持 condition 逻辑

        if skip:
            results.append({"step": name, "result": "skipped", "reason": "condition not met"})
            continue

        out, err, code = _ssh(cmd, timeout=30)
        results.append({
            "step": name,
            "result": "ok" if code == 0 else f"fail(code={code})",
            "stdout": (out or "")[:200],
            "stderr": (err or "")[:200],
        })

        # 任何一步失败, 立刻停下
        if code != 0:
            results.append({"step": "(后续步骤)", "result": "aborted due to previous fail"})
            return {"success": False, "steps": results}

    return {"success": True, "steps": results}


def handle_alert(alert_type: str, context: dict = None, dryrun: bool = False) -> dict:
    """根据告警类型路由修复"""
    router = _load_router()
    routes = router.get("alerts", {})
    default = router.get("default", {})
    state = _load_state()

    route = routes.get(alert_type, default)

    severity = route.get("severity", "info")
    auto_fix = route.get("auto_fix", False)
    fix_steps = route.get("fix_steps", [])

    # cooldown 检查 (auto_fix=true 和 email_only 都要)
    cooldown = route.get("cooldown_minutes", 30)
    if (auto_fix or route.get("action") == "email_only") and _within_cooldown(state, alert_type, cooldown):
        msg = f"在 cooldown ({cooldown}min) 内, 跳过"
        _mark_skipped(state, alert_type, msg)
        return {"alert": alert_type, "action": "skipped", "reason": msg}

    result = {
        "alert": alert_type,
        "severity": severity,
        "auto_fix": auto_fix,
        "dryrun": dryrun,
        "ts": datetime.now().isoformat(),
    }

    if not auto_fix:
        # 不自动修 → 发邮件 + 记录
        if "email_only" == route.get("action"):
            email_subject_tpl = route.get("email_subject", "aiwill 告警")
            # 安全替换 {error_keyword} 占位符, 避免 format 报重复 key
            email_subject = email_subject_tpl.replace("{error_keyword}", str(context.get("error_keyword", alert_type) if context else alert_type))
            email_body = (route.get("email_body_template", "") + "\n\n上下文:\n" +
                          json.dumps(context or {}, ensure_ascii=False, indent=2))
            if not dryrun:
                _send_email(email_subject, email_body)
            result["action"] = "email_only"
            result["email_sent"] = not dryrun
        else:
            result["action"] = "log_only"
        _mark_skipped(state, alert_type, "auto_fix=false")
        return result

    # 自动修复
    if dryrun:
        result["action"] = "would_execute"
        result["would_run"] = [s.get("name") for s in fix_steps]
        # 即使 dryrun 也写 last_seen + 落档, 让 cooldown 能在测试中生效
        _mark_seen(state, alert_type)
        _save_state(state)
        return result

    print(f"[handler] {alert_type} auto-fix 触发 (severity={severity})")
    exec_result = execute_fix_steps(fix_steps)
    result["execution"] = exec_result

    if exec_result["success"]:
        _mark_fixed(state, alert_type)
        result["action"] = "fixed"

        # 修完后发邮件确认
        _send_email(
            f"aiwill 自运营已自动修复: {alert_type}",
            f"告警: {alert_type}\n时间: {datetime.now()}\n\n修复步骤:\n" +
            "\n".join([f"  - {s['step']}: {s['result']}" for s in exec_result["steps"]]),
        )
    else:
        # 修失败 → 升级到人工
        _mark_skipped(state, alert_type, "auto_fix_failed")
        result["action"] = "fix_failed"
        email_subject = f"🔴 aiwill 自动修复失败, 需要人工: {alert_type}"
        email_body = (
            f"自动修复失败, 需要 SSH 人工处理:\n"
            f"告警: {alert_type}\n"
            f"时间: {datetime.now()}\n\n"
            f"失败的步骤:\n" +
            "\n".join([f"  - {s['step']}: {s.get('result','')} {s.get('stderr','')}" for s in exec_result["steps"]])
        )
        _send_email(email_subject, email_body)

    return result


# ============================================================
# 3. 主入口: 定期跑 (cron 每 10 分钟)
# ============================================================

def run_once(dryrun: bool = False) -> dict:
    """读告警状态 → 路由修复 → 返结果"""
    result = {
        "ts": datetime.now().isoformat(),
        "dryrun": dryrun,
        "actions": [],
    }

    # 读 alert-state.json
    alert_state = fetch_alert_state()
    if not alert_state:
        result["actions"].append({"alert": "fetch_alert_state", "result": "no_state_file"})
        return result

    now = datetime.now()
    from datetime import timezone
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # 每类告警的阈值 (分钟): 该字段多久没更新算异常
    STALE_THRESHOLDS = {
        "heartbeat": 10,      # heartbeat 10 分钟没更新 → keeper 死了
        "cron_error": 60,     # cron_error 1 小时没更新 → 算稳定
        "nginx_5xx": 60,      # nginx_5xx 1 小时没更新 → 算稳定
    }

    for alert_type, last_ts_str in alert_state.items():
        if alert_type not in STALE_THRESHOLDS:
            continue  # 未知字段, 跳过
        try:
            last_ts = datetime.fromisoformat(last_ts_str.replace("Z", "+00:00"))
            last_ts_utc = last_ts.astimezone(timezone.utc).replace(tzinfo=None)
            age_min = (now_utc - last_ts_utc).total_seconds() / 60
        except Exception as e:
            print(f"[parse] {alert_type} 时间戳解析失败: {e}")
            continue

        threshold = STALE_THRESHOLDS[alert_type]
        if age_min < threshold:
            # 字段在阈值内, 说明最近被 keeper 写过, 不算 stale
            continue

        # === 字段 stale → 进入路由 ===
        if alert_type == "heartbeat":
            # heartbeat stale → 检查是否真有失败
            failures = fetch_healthcheck_failures()
            if len(failures) >= 3:
                action_result = handle_alert("healthcheck.fail.multi", {
                    "failure_count": len(failures),
                    "failures": failures[:5],
                }, dryrun=dryrun)
                result["actions"].append(action_result)
            elif len(failures) > 0:
                # 单点失败
                action_result = handle_alert("healthcheck.fail.single", {
                    "failures": failures[:3],
                }, dryrun=dryrun)
                result["actions"].append(action_result)

        elif alert_type == "cron_error":
            errors = fetch_nginx_errors()
            ctx = {
                "error_keyword": "nginx_pid" if any("invalid PID" in e for e in errors) else "cron",
                "last_10_log_lines": "\n".join(errors[:10]),
            }
            action_result = handle_alert("cron_error", ctx, dryrun=dryrun)
            result["actions"].append(action_result)

        elif alert_type == "nginx_5xx":
            errors = fetch_nginx_errors()
            five_xx_count = sum(1 for e in errors if any(c in e for c in [" 502 ", " 503 ", " 504 ", " 500 "]))
            if five_xx_count > 10:
                ctx = {"five_xx_count_last_hour": five_xx_count}
                action_result = handle_alert("nginx_5xx.spike", ctx, dryrun=dryrun)
                result["actions"].append(action_result)
            if any("invalid PID" in e for e in errors):
                action_result = handle_alert("nginx_pid_missing", {
                    "errors": errors[:5],
                }, dryrun=dryrun)
                result["actions"].append(action_result)

    return result


if __name__ == "__main__":
    import sys
    dryrun = "--dryrun" in sys.argv
    result = run_once(dryrun=dryrun)
    print(json.dumps(result, ensure_ascii=False, indent=2))