#!/bin/bash
# ============================================================
# AI Will Planner — 大陆节点一键部署脚本（合规收紧版）
# 目标 ：124.222.215.107 (aiwill-planner.cn)
# 用法 ：bash deploy_mainland.sh
# 前提 ：本机已配置 SSH 到 root@124.222.215.107 的免密
# ============================================================

set -e

REMOTE_HOST="${REMOTE_HOST:-124.222.215.107}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_WWW="/var/www/aiwill-planner"
REMOTE_NGINX_CONF="/etc/nginx/nginx.conf"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/tencent_will}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
echo "本地仓库根目录：${REPO_ROOT}"

# ----------------------------------------------------------------
# 0. 预检：SSH 通不通
# ----------------------------------------------------------------
echo ""
echo "==== 0. SSH 连通性预检 ===="
if ! ssh -i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=10 \
        -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
        "echo OK && uname -a" 2>/dev/null; then
    echo "❌ SSH 无法连接到 ${REMOTE_HOST}"
    echo "   请确认："
    echo "   1. ${SSH_KEY} 的公钥已加入服务器 ~/.ssh/authorized_keys"
    echo "   2. 服务器 22 端口安全组放行本机出口 IP"
    exit 1
fi
echo "✅ SSH OK"

# ----------------------------------------------------------------
# 1. 备份现有 nginx.conf（合规：留痕）
# ----------------------------------------------------------------
echo ""
echo "==== 1. 远程备份 nginx.conf ===="
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" \
    "cp -a ${REMOTE_NGINX_CONF} ${REMOTE_NGINX_CONF}.bak.\$(date +%Y%m%d_%H%M%S)" \
    && echo "✅ 备份完成"

# ----------------------------------------------------------------
# 2. 上传新 nginx.conf
# ----------------------------------------------------------------
echo ""
echo "==== 2. 上传合规收紧版 nginx.conf ===="
scp -i "${SSH_KEY}" \
    "${REPO_ROOT}/deployment/mainland-server/nginx.conf" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_NGINX_CONF}"
echo "✅ nginx.conf 已上传"

# ----------------------------------------------------------------
# 3. 上传静态资源
# ----------------------------------------------------------------
echo ""
echo "==== 3. 上传静态资源 ===="
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" \
    "mkdir -p ${REMOTE_WWW}/static-content"

scp -i "${SSH_KEY}" \
    "${REPO_ROOT}/index.html" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_WWW}/index.html"

scp -i "${SSH_KEY}" \
    "${REPO_ROOT}/static-content/"*.html \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_WWW}/static-content/"

scp -i "${SSH_KEY}" \
    "${REPO_ROOT}/deployment/mainland-server/sitemap.xml" \
    "${REPO_ROOT}/deployment/mainland-server/robots.txt" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_WWW}/"

echo "✅ 静态资源已上传"

# ----------------------------------------------------------------
# 4. nginx -t 测试 & reload
# ----------------------------------------------------------------
echo ""
echo "==== 4. nginx 语法检查 + reload ===="
if ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" "nginx -t"; then
    ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" "nginx -s reload"
    echo "✅ nginx reload 成功"
else
    echo "❌ nginx 配置语法错误，已自动回滚"
    ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" \
        "cp -a \$(ls -t ${REMOTE_NGINX_CONF}.bak.* | head -1) ${REMOTE_NGINX_CONF} && nginx -s reload"
    exit 1
fi

# ----------------------------------------------------------------
# 5. 合规自查
# ----------------------------------------------------------------
echo ""
echo "==== 5. 远端触发合规自查 ===="
scp -i "${SSH_KEY}" \
    "${REPO_ROOT}/deployment/mainland-server/compliance_check.sh" \
    "${REMOTE_USER}@${REMOTE_HOST}:/usr/local/bin/compliance_check.sh"
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" \
    "chmod +x /usr/local/bin/compliance_check.sh && bash /usr/local/bin/compliance_check.sh" \
    || echo "⚠️  合规自查存在 FAIL 项，请逐条修正"

# ----------------------------------------------------------------
# 6. 本地烟囱测试
# ----------------------------------------------------------------
echo ""
echo "==== 6. 本地烟囱测试（5 个静态路径）===="
for path in "" "/faq" "/tutorial" "/compare" "/tool"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://aiwill-planner.cn${path}" 2>/dev/null)
    if [[ "$code" == "200" ]]; then
        echo "  ✅ /${path:-index}  → ${code}"
    else
        echo "  ❌ /${path:-index}  → ${code}"
    fi
done

# 验证 /api/* 被切断
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://aiwill-planner.cn/api/v1/health" 2>/dev/null)
if [[ "$code" == "200" ]]; then
    echo "  ❌ /api/v1/health 仍返回 200（不合规，请人工排查）"
else
    echo "  ✅ /api/* 已切断（${code}）"
fi

echo ""
echo "=========================================="
echo "✅ 大陆节点部署完成"
echo "=========================================="
