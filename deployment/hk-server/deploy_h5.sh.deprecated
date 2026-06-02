#!/bin/bash
# ============================================================
# AI Will Planner — 香港节点 H5 一键重建脚本
# 目标 ：43.129.207.154
# 用途 ：清除卡死的旧 NextJS 容器、重新构建本地干净源码、:80 端口启动
# 前提 ：本机已配置 SSH 到 root@43.129.207.154 的免密
# ============================================================

set -e

REMOTE_HOST="${REMOTE_HOST:-43.129.207.154}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="/opt/aiwill-planner"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/tencent_will}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "本地仓库根目录：${REPO_ROOT}"

# ----------------------------------------------------------------
# 0. SSH 预检
# ----------------------------------------------------------------
echo ""
echo "==== 0. SSH 连通性预检 ===="
if ! ssh -i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=10 \
        -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
        "echo OK && uname -a" 2>/dev/null; then
    echo "❌ SSH 无法连接到 ${REMOTE_HOST}"
    exit 1
fi
echo "✅ SSH OK"

# ----------------------------------------------------------------
# 1. 停掉旧的死容器
# ----------------------------------------------------------------
echo ""
echo "==== 1. 停掉 / 移除旧 NextJS 容器 ===="
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" bash -s << 'REMOTE_EOF'
set +e
docker stop will-planning-nextjs-1 2>/dev/null
docker rm   will-planning-nextjs-1 2>/dev/null
echo "✅ 旧容器已清理"
REMOTE_EOF

# ----------------------------------------------------------------
# 2. 同步本地 t9-h5-frontend 源码（不含 node_modules）
# ----------------------------------------------------------------
echo ""
echo "==== 2. 同步 t9-h5-frontend 源码 ===="
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    "${REPO_ROOT}/t9-h5-frontend/" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/t9-h5-frontend/"

echo "✅ 源码同步完成"

# ----------------------------------------------------------------
# 3. 远端构建 + 启动（裸跑，禁用 Turbopack）
# ----------------------------------------------------------------
echo ""
echo "==== 3. 远端构建 NextJS（禁用 Turbopack） ===="
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" bash -s << 'REMOTE_EOF'
set -e
cd /opt/aiwill-planner/t9-h5-frontend

# Node 版本
node -v || { echo "❌ 服务器无 node，请先安装 node 20"; exit 1; }

# 干净安装
rm -rf node_modules .next
npm ci --omit=dev=false  # 全量装，包括 dev 依赖（next build 需要）

# 构建（不使用 turbopack）
NEXT_DISABLE_TURBOPACK=1 npm run build

# 用 pm2 / 或 systemd / 或裸跑
pkill -f "next-server" 2>/dev/null || true

# 启动 :80
nohup env PORT=80 HOSTNAME=0.0.0.0 npm start > /var/log/h5-nextjs.log 2>&1 &
sleep 5

# 健康验证
if curl -fsS http://127.0.0.1/ | head -c 200; then
    echo ""
    echo "✅ NextJS 已在 :80 启动"
else
    echo "❌ NextJS 启动失败，查看 /var/log/h5-nextjs.log"
    tail -50 /var/log/h5-nextjs.log
    exit 1
fi
REMOTE_EOF

# ----------------------------------------------------------------
# 4. 外网烟囱测试
# ----------------------------------------------------------------
echo ""
echo "==== 4. h5.aiwill-planner.cn 外网烟囱测试 ===="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://h5.aiwill-planner.cn/" 2>/dev/null)
echo "  / → ${code}"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://h5.aiwill-planner.cn/login" 2>/dev/null)
echo "  /login → ${code}"

echo ""
echo "=========================================="
echo "✅ HK H5 节点部署完成"
echo "=========================================="
