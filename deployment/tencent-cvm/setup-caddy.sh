#!/usr/bin/env bash
# =============================================================================
# AI Will Planner · Caddy 反向代理一键安装
# 用途: 在 Supabase 前挂 Caddy 做 TLS 终结 + 自动 HTTPS (Let's Encrypt)
# 依赖: 必须有公网域名 (api-cn.aiwill-planner.cn) 已解析到本机公网 IP
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $*"; }
err() { echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "请用 root 运行: sudo bash $0"
  exit 1
fi

# ---------- 输入域名 ----------
read -p "请输入 Supabase 域名 (例如 api-cn.aiwill-planner.cn): " SUPABASE_DOMAIN
if [[ -z "${SUPABASE_DOMAIN}" ]]; then
  err "域名不能为空"
  exit 1
fi

# 验证域名解析
log "验证域名 ${SUPABASE_DOMAIN} 是否解析到本机..."
RESOLVED_IP=$(dig +short "${SUPABASE_DOMAIN}" @8.8.8.8 | head -1)
PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org)
if [[ -z "${RESOLVED_IP}" ]]; then
  err "域名 ${SUPABASE_DOMAIN} 未解析, 请先在 Cloudflare 加 A 记录"
  exit 1
fi
log "  ${SUPABASE_DOMAIN} → ${RESOLVED_IP}"
log "  本机公网 IP: ${PUBLIC_IP}"
if [[ "${RESOLVED_IP}" != "${PUBLIC_IP}" ]]; then
  warn "域名解析 IP 与本机不一致, Let's Encrypt 签证书可能失败"
  read -p "继续? (y/N) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# ---------- 安装 Caddy ----------
if command -v caddy &>/dev/null; then
  log "Caddy 已安装: $(caddy version)"
else
  log "安装 Caddy (官方仓库)..."
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
  log "Caddy 安装完成: $(caddy version)"
fi

# ---------- 写 Caddyfile ----------
CADDY_DIR="/etc/caddy"
mkdir -p "${CADDY_DIR}"
cat > "${CADDY_DIR}/Caddyfile" <<EOF
# AI Will Planner · Supabase 反向代理
# 域名: ${SUPABASE_DOMAIN}
# 后端: localhost:8000 (PostgREST), 9999 (GoTrue), 5000 (Storage), 4000 (Realtime)

${SUPABASE_DOMAIN} {
    # TLS 由 Caddy 自动申请 (Let's Encrypt / ZeroSSL)
    encode zstd gzip

    # Supabase 各组件代理
    handle /auth/* {
        reverse_proxy localhost:9999
    }
    handle /rest/* {
        reverse_proxy localhost:8000
    }
    handle /storage/* {
        reverse_proxy localhost:5000
    }
    handle /realtime/* {
        reverse_proxy localhost:4000
    }
    handle /functions/* {
        reverse_proxy localhost:9000
    }

    # 健康检查
    handle /health {
        respond "OK" 200
    }

    # 限速 (防滥用)
    reverse_proxy localhost:8000 {
        rate_limit 100r/s
    }

    # 日志
    log {
        output file /var/log/caddy/aiwill-supabase.log {
            roll_size 100mb
            roll_keep 5
        }
    }
}

# Studio 子路径 (用子域名隔离)
studio.${SUPABASE_DOMAIN} {
    basicauth {
        admin \${ADMIN_PASSWORD_HASH}
    }
    reverse_proxy localhost:3001
}
EOF

# 生成 admin 密码 hash
ADMIN_PASSWORD=$(grep "^DASHBOARD_PASSWORD" /opt/aiwill-supabase/.env | cut -d= -f2)
if [[ -n "${ADMIN_PASSWORD}" ]]; then
  HASH=$(caddy hash-password --plaintext "${ADMIN_PASSWORD}")
  # 替换 Caddyfile 中的占位符
  sed -i "s|\\\${ADMIN_PASSWORD_HASH}|${HASH}|g" "${CADDY_DIR}/Caddyfile"
  log "Studio Basic Auth 密码已配置 (admin / ${ADMIN_PASSWORD})"
else
  warn "未在 .env 找到 DASHBOARD_PASSWORD, Studio 暂时无密码保护"
  sed -i "s|\\\${ADMIN_PASSWORD_HASH}|JDJhJDE0JDY5VVB4a1hyUlpRWU9RWjY0cnBYdlBjLzlKMG4wVm14c2JaTHh0Y2EvZTdRLkRnY01XdnVv|g" "${CADDY_DIR}/Caddyfile" || true
  # 上面是占位 hash, 实际部署务必替换
fi

# ---------- 启动 Caddy ----------
log "启动 Caddy..."
systemctl enable caddy
systemctl restart caddy

sleep 3
if systemctl is-active caddy &>/dev/null; then
  log "✓ Caddy 已启动"
else
  err "Caddy 启动失败, 查看: journalctl -u caddy -n 20"
  exit 1
fi

# ---------- 验证 ----------
log "==== 验证 ===="
echo
echo "  https://${SUPABASE_DOMAIN}/health    → 应返回 OK"
echo "  https://${SUPABASE_DOMAIN}/rest/v1/  → 应返回 [] 或错误 (需要 Authorization 头)"
echo "  https://studio.${SUPABASE_DOMAIN}/   → Studio (admin + 密码)"
echo
echo "  Let's Encrypt 证书申请需要 1-3 分钟, 期间可能短暂不可用"
echo

# 健康检查
sleep 5
if curl -sf "https://${SUPABASE_DOMAIN}/health" 2>/dev/null | grep -q "OK"; then
  log "✓ HTTPS 健康检查通过"
else
  warn "HTTPS 健康检查失败, 等待 60s 让 Let's Encrypt 完成..."
  sleep 60
  if curl -sf "https://${SUPABASE_DOMAIN}/health" 2>/dev/null | grep -q "OK"; then
    log "✓ 重试通过"
  else
    err "仍失败, 查看: tail -30 /var/log/caddy/aiwill-supabase.log"
  fi
fi

log "✓ 全部完成"
