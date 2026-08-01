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
# 0.5 同步代码 + 重新构建 Next.js (改版 v12, 2026-08-01)
#   - 修复"代码改了但大陆服务器还在跑老 build"问题
#   - 流程: rsync 代码 (排除 .next / node_modules) → npm ci → npm run build → restart next start
# ----------------------------------------------------------------
echo ""
echo "==== 0.5 同步代码 + 重新构建 Next.js ===="
SSH_BASE="ssh -i ${SSH_KEY}"
RSYNC_RSH="ssh -i ${SSH_KEY}"

# 1) rsync 源码 (排除 .next, node_modules, .git, 含新增静态文件 等)
${RSYNC_RSH} "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_WWW}"
rsync -az --delete \
    --exclude='.next' --exclude='node_modules' --exclude='.git' \
    --exclude='含新增静态文件' --exclude='t1-*' --exclude='t2-*' \
    --exclude='t4-*' --exclude='t5-*' --exclude='t6-*' --exclude='t7-*' \
    --exclude='t8-*' --exclude='t10-*' --exclude='test-results' \
    --exclude='tsconfig.tsbuildinfo' --exclude='.DS_Store' \
    -e "${RSYNC_RSH}" \
    "${REPO_ROOT}/" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_WWW}/" \
    && echo "✅ 代码已同步" || { echo "❌ rsync 失败"; exit 1; }

# 1b) 修复权限 — 旧目录 700 ubuntu ubuntu 导致 root 无法 scandir / 读 .env.local
#     解决: 全目录 755, .env.local 644, 这样 root 和 ubuntu 都能读写
${SSH_BASE} "${REMOTE_USER}@${REMOTE_HOST}" \
    "chmod -R u+rwX,go+rX /var/www/aiwill-planner/ 2>/dev/null; \
     chmod 644 /var/www/aiwill-planner/.env.local 2>/dev/null; \
     echo '✅ 权限已修正 (755/644)'"

# 2) 远程 npm ci + npm run build (用 .next 当前 owner, 避免 root / ubuntu 权限错位)
echo ""
echo "==== 0.6 远程 npm ci + npm run build ===="
${SSH_BASE} "${REMOTE_USER}@${REMOTE_HOST}" "bash -s" <<'REMOTE_BUILD'
set -e
cd /var/www/aiwill-planner
OWNER=$(stat -c '%U' .next 2>/dev/null || stat -f '%Su' .next 2>/dev/null || echo "root")

# 切换到非 root 用户执行 build (保持 .next / node_modules 所有权一致)
if [ "$OWNER" != "root" ] && id "$OWNER" >/dev/null 2>&1; then
    echo "  → 以 $OWNER 身份执行 npm ci + build"
    sudo -u "$OWNER" bash -c '
        cd /var/www/aiwill-planner
        echo "  → npm ci"
        npm ci --no-audit --no-fund --prefer-offline 2>&1 | tail -5
        echo "  → npm run build"
        NODE_ENV=production npm run build 2>&1 | tail -10
    '
else
    echo "  → 以 root 身份执行 npm ci + build"
    echo "  → npm ci"
    npm ci --no-audit --no-fund --prefer-offline 2>&1 | tail -5
    echo "  → npm run build"
    NODE_ENV=production npm run build 2>&1 | tail -10
fi
REMOTE_BUILD
echo "✅ 远程 build 完成"

# 3) 重启 Next.js (kill 旧进程 + systemd 重启, 或 fallback 到 nohup)
echo ""
echo "==== 0.7 重启 Next.js 服务 ===="
${SSH_BASE} "${REMOTE_USER}@${REMOTE_HOST}" "bash -s" <<'REMOTE_RESTART'
set +e

# 尝试 systemctl (如果有 systemd unit)
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -qE 'next.*service|aiwill.*service'; then
    systemctl restart nextjs.service 2>/dev/null \
      || systemctl restart aiwill-nextjs.service 2>/dev/null \
      || systemctl restart aiwill-planner.service 2>/dev/null
    echo "  → systemd restart 完成"
else
    # Fallback: kill 旧 next-server (在 3001), 用 start_next_node.js 重新拉起
    echo "  → fallback: kill 旧进程 + nohup 重启"
    # 杀掉占用 3001 端口的进程
    PID_3001=$(ss -tlnp 2>/dev/null | grep ':3001 ' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
    if [ -z "$PID_3001" ]; then
        PID_3001=$(lsof -ti:3001 2>/dev/null | head -1)
    fi
    if [ -n "$PID_3001" ]; then
        # 先把 3001 的 owner 进程的孙子进程 (next-server) 也杀掉
        CHILDREN=$(pgrep -P "$PID_3001" 2>/dev/null || true)
        kill -TERM "$PID_3001" 2>/dev/null
        for c in $CHILDREN; do kill -TERM "$c" 2>/dev/null; done
        sleep 2
        kill -KILL "$PID_3001" 2>/dev/null || true
        for c in $CHILDREN; do kill -KILL "$c" 2>/dev/null || true; done
        echo "    killed pid=$PID_3001 (children: $CHILDREN)"
    fi

    # 决定用哪个用户拉起: 如果 .next 目录存在且属于 ubuntu, 用 ubuntu
    cd /var/www/aiwill-planner
    OWNER=$(stat -c '%U' .next 2>/dev/null || stat -f '%Su' .next 2>/dev/null)
    START_AS_USER="${OWNER:-root}"

    if id "$START_AS_USER" >/dev/null 2>&1; then
        if [ "$START_AS_USER" = "root" ]; then
            setsid nohup node /tmp/start_next_node.js \
                > /var/log/aiwill-nextjs.log 2>&1 < /dev/null &
            NEW_PID=$!
        else
            setsid nohup sudo -u "$START_AS_USER" node /tmp/start_next_node.js \
                > /var/log/aiwill-nextjs.log 2>&1 < /dev/null &
            NEW_PID=$!
        fi
        disown 2>/dev/null
        sleep 3
        # 验证新进程
        if ss -tln 2>/dev/null | grep -q ':3001 '; then
            echo "    new pid=$NEW_PID listening on :3001 (as $START_AS_USER)"
        else
            echo "    ⚠️  :3001 未监听, 查看 /var/log/aiwill-nextjs.log"
            tail -20 /var/log/aiwill-nextjs.log
        fi
    else
        echo "    ⚠️  用户 $START_AS_USER 不存在, 跳过重启"
    fi
fi

# 4) 验证: HTTP 200 from localhost:3001
sleep 2
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/ 2>/dev/null)
echo "  → 本机 :3001 健康检查 = $HEALTH"
REMOTE_RESTART
echo "✅ Next.js 重启完成"

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

# 清理远端可能的同名目录 (robots.txt 历史遗留 — Next.js app/robots.txt/route 编译产物)
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" \
    "cd ${REMOTE_WWW} && rm -rf robots.txt sitemap.xml llms.txt googleca0c92e68f0ca67c.html MP_verify_ZfvMTOA5IvTKBOHF.txt wechat-mp-qr.png index.html 2>/dev/null; true"

scp -i "${SSH_KEY}" \
    "${REPO_ROOT}/deployment/mainland-server/sitemap.xml" \
    "${REPO_ROOT}/deployment/mainland-server/robots.txt" \
    "${REPO_ROOT}/deployment/mainland-server/llms.txt" \
    "${REPO_ROOT}/deployment/mainland-server/googleca0c92e68f0ca67c.html" \
    "${REPO_ROOT}/deployment/mainland-server/MP_verify_ZfvMTOA5IvTKBOHF.txt" \
    "${REPO_ROOT}/public/wechat-mp-qr.png" \
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

# SEO 文件健康 (搜索引擎收录前置)
for seo in /robots.txt /sitemap.xml /llms.txt /googleca0c92e68f0ca67c.html /MP_verify_ZfvMTOA5IvTKBOHF.txt; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://aiwill-planner.cn${seo}" 2>/dev/null)
    if [[ "$code" == "200" ]]; then
        echo "  ✅ ${seo} → 200"
    else
        echo "  ❌ ${seo} → ${code}"
    fi
done

echo ""
echo "=========================================="
echo "✅ 大陆节点部署完成"
echo "=========================================="
