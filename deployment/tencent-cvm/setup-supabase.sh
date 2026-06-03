#!/usr/bin/env bash
# =============================================================================
# AI Will Planner · 腾讯云 CVM Supabase 一键部署脚本
# 用途: 在刚升级的 S5 2C4G 锐驰实例上 (或新购) 部署 Supabase OSS
# 依赖: Ubuntu 22.04 LTS, 4G+ RAM, 公网 EIP
# 安全: 全程不接触 AppSecret, 不写敏感信息到 /tmp
# =============================================================================

set -euo pipefail

# ---------- 颜色 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $*"; }
err() { echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $*" >&2; }
section() { echo -e "\n${BLUE}========== $* ==========${NC}\n"; }

# ---------- 前置检查 ----------
section "前置检查"

# 1. 必须是 root
if [[ $EUID -ne 0 ]]; then
  err "请用 root 运行: sudo bash $0"
  exit 1
fi

# 2. 内存检查 (至少 3.5G 可用, 推荐 4G+)
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_MEM_GB=$((TOTAL_MEM_KB / 1024 / 1024))
log "物理内存: ${TOTAL_MEM_GB}G"
if (( TOTAL_MEM_GB < 3 )); then
  err "内存不足 3G, Supabase 跑不动. 请升级到 4G+"
  exit 1
fi

# 3. 磁盘检查 (至少 30G 可用)
AVAIL_DISK_GB=$(df -BG / | tail -1 | awk '{print $4}' | tr -d 'G')
log "可用磁盘: ${AVAIL_DISK_GB}G"
if (( AVAIL_DISK_GB < 30 )); then
  err "磁盘不足 30G, 至少需要 50G"
  exit 1
fi

# 4. 操作系统 (非交互: 警告但继续, Ubuntu 24.04 也兼容)
if ! grep -q "Ubuntu 22" /etc/os-release 2>/dev/null; then
  warn "推荐 Ubuntu 22.04 LTS, 当前: $(cat /etc/os-release | grep PRETTY_NAME | head -1) — 继续"
fi

# 5. 公网 IP
PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
if [[ -z "$PUBLIC_IP" ]]; then
  PUBLIC_IP=$(hostname -I | awk '{print $1}')
fi
log "公网 IP: ${PUBLIC_IP}"
echo "${PUBLIC_IP}" > /tmp/aiwill_public_ip.txt

# ---------- Step 1: Docker 安装 ----------
section "Step 1/8: 安装 Docker + Docker Compose"

if command -v docker &>/dev/null; then
  log "Docker 已安装: $(docker --version)"
else
  log "安装 Docker..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  systemctl enable docker
  systemctl start docker
  log "Docker 安装完成: $(docker --version)"
fi

if ! docker compose version &>/dev/null; then
  log "安装 docker-compose-plugin..."
  apt-get install -y docker-compose-plugin 2>/dev/null || \
    (mkdir -p /usr/local/lib/docker/cli-plugins && \
     curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
       -o /usr/local/lib/docker/cli-plugins/docker-compose && \
     chmod +x /usr/local/lib/docker/cli-plugins/docker-compose)
fi
log "Docker Compose: $(docker compose version)"

# ---------- Step 2: 创建工作目录 ----------
section "Step 2/8: 创建工作目录"

INSTALL_DIR="/opt/aiwill-supabase"
mkdir -p "${INSTALL_DIR}"/{docker,backups,logs,init}
cd "${INSTALL_DIR}"
log "工作目录: ${INSTALL_DIR}"

# ---------- Step 3: 克隆 Supabase OSS ----------
section "Step 3/8: 克隆 Supabase 开源版"

if [[ -d "${INSTALL_DIR}/supabase" ]]; then
  log "已存在 Supabase 源码, 跳过克隆"
  cd "${INSTALL_DIR}/supabase/docker"
elif [[ -f "/tmp/supabase-docker.tar.gz" ]]; then
  # 优先用本地预下载的 docker/ tarball (Mac scp 上传)
  log "检测到本地 /tmp/supabase-docker.tar.gz, 直接解压..."
  mkdir -p "${INSTALL_DIR}/supabase"
  tar -xzf /tmp/supabase-docker.tar.gz -C "${INSTALL_DIR}/supabase"
  cd "${INSTALL_DIR}/supabase/docker"
  log "本地 tarball 解压完成"
else
  log "下载 supabase 源码 (tarball, 国内 CVM 走慢速 GitHub 不可靠)..."
  TARBALL="/tmp/supabase.tar.gz"
  # 优先 codeload, 失败 fallback gitee
  if ! curl -fSL --max-time 600 -o "${TARBALL}" \
      https://codeload.github.com/supabase/supabase/tar.gz/refs/heads/master; then
    warn "codeload 失败, 改用 gitee 镜像"
    if ! curl -fSL --max-time 600 -o "${TARBALL}" \
        https://gitee.com/mirrors/supabase/repository/archive/master.tar.gz; then
      err "源码下载失败, 请检查 CVM 出境网络"
      exit 1
    fi
  fi
  log "下载完成 $(du -h ${TARBALL} | cut -f1)"
  mkdir -p "${INSTALL_DIR}/supabase"
  tar -xzf "${TARBALL}" --strip-components=1 -C "${INSTALL_DIR}/supabase"
  rm -f "${TARBALL}"
  cd "${INSTALL_DIR}/supabase/docker"
  log "解压完成"
fi

# ---------- Step 4: 生成密钥 ----------
section "Step 4/8: 生成 JWT 密钥"

if [[ -f "${INSTALL_DIR}/.env" ]] && grep -q "JWT_SECRET" "${INSTALL_DIR}/.env" 2>/dev/null; then
  log ".env 已存在, 复用"
  set -a
  # shellcheck disable=SC1091
  source "${INSTALL_DIR}/.env"
  set +a
else
  log "生成新的 JWT 密钥..."

  POSTGRES_PASSWORD=$(openssl rand -hex 24)
  JWT_SECRET=$(openssl rand -hex 32)
  DASHBOARD_PASSWORD=$(openssl rand -hex 12)

  # 生成 ANON_KEY 和 SERVICE_ROLE_KEY (基于 JWT_SECRET)
  ANON_KEY=$(docker run --rm -e JWT_SECRET="${JWT_SECRET}" supabase/utils:latest \
    python3 -c "
import json, sys
payload = {
  'role': 'anon',
  'iss': 'supabase',
  'iat': int(sys.argv[1]),
  'exp': int(sys.argv[1]) + 31536000,
}
print(json.dumps(payload))
" "$(date +%s)" 2>/dev/null || echo "")

  # 用 supabase 官方工具生成
  if [[ -z "${ANON_KEY}" ]]; then
    warn "Docker 方式生成 JWT 失败, 用 openssl + python 手动构造"
    ANON_KEY=$(python3 -c "
import hmac, hashlib, base64, json, time
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
header = b64(json.dumps({'alg':'HS256','typ':'JWT'}).encode())
payload = b64(json.dumps({
  'role':'anon','iss':'supabase',
  'iat':int(time.time()),'exp':int(time.time())+31536000
}).encode())
sig = b64(hmac.new('${JWT_SECRET}'.encode(), f'{header}.{payload}'.encode(), hashlib.sha256).digest())
print(f'{header}.{payload}.{sig}')
")
    SERVICE_ROLE_KEY=$(python3 -c "
import hmac, hashlib, base64, json, time
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
header = b64(json.dumps({'alg':'HS256','typ':'JWT'}).encode())
payload = b64(json.dumps({
  'role':'service_role','iss':'supabase',
  'iat':int(time.time()),'exp':int(time.time())+31536000
}).encode())
sig = b64(hmac.new('${JWT_SECRET}'.encode(), f'{header}.{payload}'.encode(), hashlib.sha256).digest())
print(f'{header}.{payload}.{sig}')
")
  else
    SERVICE_ROLE_KEY=$(docker run --rm -e JWT_SECRET="${JWT_SECRET}" supabase/utils:latest \
      python3 -c "
import json, sys
payload = {
  'role': 'service_role',
  'iss': 'supabase',
  'iat': int(sys.argv[1]),
  'exp': int(sys.argv[1]) + 31536000,
}
print(json.dumps(payload))
" "$(date +%s)" 2>/dev/null)
  fi

  # 复制 .env 模板
  cp .env.example .env
  # 写 .env (到 docker 目录外, 方便挂载)
  cat > "${INSTALL_DIR}/.env" <<EOF
# === AI Will Planner Supabase (腾讯云 CVM) ===
# Generated: $(date -Iseconds)
# ⚠️ DO NOT COMMIT THIS FILE

# Postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=postgres

# JWT
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}

# Site URL (公众号 / H5 调用的源)
SITE_URL=https://h5.aiwill-planner.cn
API_EXTERNAL_URL=http://${PUBLIC_IP}:8000
SUPABASE_PUBLIC_URL=http://${PUBLIC_IP}:8000

# Studio
STUDIO_DEFAULT_ORGANIZATION=aiwill-planner
STUDIO_DEFAULT_PROJECT=aiwill-planner

# Storage
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800  # 50MB
EOF

  # 同步关键变量到 docker/.env (Supabase 容器读)
  grep -E "POSTGRES_PASSWORD|JWT_SECRET|ANON_KEY|SERVICE_ROLE_KEY|DASHBOARD_USERNAME|DASHBOARD_PASSWORD|SITE_URL|API_EXTERNAL_URL|SUPABASE_PUBLIC_URL|STUDIO_DEFAULT_ORGANIZATION|STUDIO_DEFAULT_PROJECT" .env.example > .env.keys
  cat .env.keys "${INSTALL_DIR}/.env" > .env.tmp && mv .env.tmp .env

  chmod 600 "${INSTALL_DIR}/.env"
  log "密钥生成完成, 已写入 ${INSTALL_DIR}/.env (权限 600)"
fi

# ---------- Step 5: 拉起 Supabase 容器 ----------
section "Step 5/8: 拉起 Supabase 容器 (Docker Compose)"

log "docker compose pull (可能 2-5 分钟)..."
docker compose pull 2>&1 | tail -5

log "docker compose up -d..."
docker compose up -d 2>&1 | tail -20

# ---------- Step 6: 等待服务就绪 ----------
section "Step 6/8: 等待服务就绪"

log "等待 PostgreSQL 就绪..."
for i in {1..30}; do
  if docker exec supabase-db pg_isready -U postgres &>/dev/null; then
    log "✓ PostgreSQL 就绪 (${i}s)"
    break
  fi
  sleep 1
done

log "等待 PostgREST 就绪..."
for i in {1..30}; do
  if curl -sf http://localhost:8000/rest/v1/ &>/dev/null; then
    log "✓ PostgREST 就绪 (${i}s)"
    break
  fi
  sleep 1
done

log "等待 GoTrue 就绪..."
for i in {1..30}; do
  if curl -sf http://localhost:9999/health &>/dev/null; then
    log "✓ GoTrue 就绪 (${i}s)"
    break
  fi
  sleep 1
done

# ---------- Step 7: 执行数据库迁移 ----------
section "Step 7/8: 执行数据库迁移"

if [[ -f "${INSTALL_DIR}/init/0001_init.sql" ]]; then
  log "发现 ${INSTALL_DIR}/init/0001_init.sql, 准备执行..."
else
  warn "未发现 init SQL, 自动从 git 仓拉取"
  INIT_SQL_SRC="/opt/aiwill-planner/supabase/migrations/0001_init.sql"
  if [[ -f "${INIT_SQL_SRC}" ]]; then
    cp "${INIT_SQL_SRC}" "${INSTALL_DIR}/init/0001_init.sql"
  else
    err "找不到 init SQL: ${INIT_SQL_SRC}"
    err "请手动放到 ${INSTALL_DIR}/init/0001_init.sql 后重跑此步骤"
    exit 1
  fi
fi

log "执行 0001_init.sql..."
docker exec -i supabase-db psql -U postgres -d postgres < "${INSTALL_DIR}/init/0001_init.sql" 2>&1 | tail -10
log "✓ 迁移完成"

# ---------- Step 8: 配置防火墙 + 输出信息 ----------
section "Step 8/8: 配置 + 输出"

# UFW 防火墙 (如果存在)
if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
  log "配置 UFW 防火墙..."
  ufw allow 22/tcp comment "SSH"
  ufw allow 80/tcp comment "HTTP"
  ufw allow 443/tcp comment "HTTPS"
  ufw allow 8000/tcp comment "Supabase REST"
  ufw allow 3001/tcp comment "Supabase Studio"
  ufw reload
  log "UFW 已配置"
fi

# 健康检查
log "==== 全部就绪 ===="
echo
echo "  公网 IP:        ${PUBLIC_IP}"
echo "  PostgreSQL:     ${PUBLIC_IP}:5432 (内网)"
echo "  PostgREST:      http://${PUBLIC_IP}:8000"
echo "  GoTrue:         http://${PUBLIC_IP}:9999"
echo "  Storage:        http://${PUBLIC_IP}:5000"
echo "  Studio:         http://${PUBLIC_IP}:3001 (admin / 密码见 .env)"
echo
echo "  ANON_KEY:       $(grep ANON_KEY "${INSTALL_DIR}/.env" | cut -d= -f2 | head -c 40)..."
echo "  SERVICE_ROLE:   $(grep SERVICE_ROLE_KEY "${INSTALL_DIR}/.env" | cut -d= -f2 | head -c 40)..."
echo

# 提示
warn "==== 下一步必做 ===="
echo
echo "  1. 配置腾讯云安全组 (控制台 → CVM → 安全组):"
echo "     入站 22   你的 SSH IP"
echo "     入站 80   0.0.0.0/0"
echo "     入站 443  0.0.0.0/0"
echo "     入站 8000 HK Vercel Egress IP 段 (限流)"
echo "     入站 3001 你的运维 IP (Studio)"
echo
echo "  2. 在 HK Vercel 配置环境变量:"
echo "     SUPABASE_URL=http://${PUBLIC_IP}:8000"
echo "     SUPABASE_ANON_KEY=<从 ${INSTALL_DIR}/.env 读>"
echo "     SUPABASE_SERVICE_ROLE_KEY=<从 ${INSTALL_DIR}/.env 读>"
echo
echo "  3. 启动 Caddy 反向代理 (HTTPS 终结):"
echo "     cd ${INSTALL_DIR} && bash setup-caddy.sh"
echo
echo "  4. 验证:"
echo "     curl http://${PUBLIC_IP}:8000/rest/v1/  # 应返回空数组或错误"
echo

log "✓ 部署完成! 密钥: ${INSTALL_DIR}/.env"
