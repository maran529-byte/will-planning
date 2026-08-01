#!/usr/bin/env bash
# ============================================================
# aiwill-planner 自运营 邮件告警
# ------------------------------------------------------------
# 用途: 被 L1/L2/L3 调用, 通过 QQ SMTP 发邮件到 maran529@icloud.com
# 用法: aiwill-alert.sh "<主题>" "<正文>"
# ============================================================

set -u

SUBJECT="${1:-aiwill 告警}"
BODY="${2:-无详情}"

SMTP_HOST="smtp.qq.com"
SMTP_PORT="465"
FROM_ADDR="330320991@qq.com"
SMTP_PASS="yckdosokmoykcaaj"   # 从 /root/aiwill-self-ops/email.json 同步
TO_ADDR="maran529@icloud.com"

python3 - "$SUBJECT" "$BODY" <<'PYEOF'
import smtplib, ssl, sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid

subject, body = sys.argv[1], sys.argv[2]
host, port = "smtp.qq.com", 465
user, pw, to = "330320991@qq.com", "yckdosokmoykcaaj", "maran529@icloud.com"

msg = MIMEMultipart()
msg["From"] = user
msg["To"] = to
msg["Subject"] = subject
msg["Date"] = formatdate(localtime=True)
msg["Message-ID"] = make_msgid()
msg.attach(MIMEText(body, "plain", "utf-8"))

try:
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(host, port, context=ctx, timeout=10) as s:
        s.login(user, pw)
        s.sendmail(user, [to], msg.as_string())
    print(f"alert sent: {subject}", file=sys.stderr)
except Exception as e:
    # 写到哨兵日志 + stderr, 让 cron 看得见
    with open("/var/log/aiwill-keeper/alert_errors.log", "a") as f:
        import datetime
        f.write(f"[{datetime.datetime.now()}] FAILED: {subject}: {e}\n")
    print(f"alert failed: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
