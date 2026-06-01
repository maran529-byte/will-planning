#!/bin/bash
# ============================================================
# AI Will Planner - 香港云服务器部署脚本
# 部署目标: 43.129.207.154
# ============================================================

set -e

# 配置
REMOTE_HOST="43.129.207.154"
REMOTE_USER="root"
REMOTE_DIR="/opt/aiwill-planner"
SSH_PORT="22"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 SSH 密钥
check_ssh_key() {
    if [[ ! -f "$SSH_KEY" ]]; then
        log_warn "SSH key not found at $SSH_KEY, trying to use ssh-copy-id or password auth"
    fi
}

# 预检查远程服务器
preflight_check() {
    log_info "Performing preflight checks on $REMOTE_HOST..."
    
    # 检查 SSH 连接
    if ! ssh -p $SSH_PORT -i "$SSH_KEY" -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "echo 'SSH OK'" 2>/dev/null; then
        log_error "Cannot connect to $REMOTE_HOST via SSH"
        exit 1
    fi
    
    # 检查 Docker
    if ! ssh -p $SSH_PORT -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST "docker --version" 2>/dev/null; then
        log_error "Docker is not installed on $REMOTE_HOST"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! ssh -p $SSH_PORT -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST "docker compose version" 2>/dev/null; then
        log_error "Docker Compose is not installed on $REMOTE_HOST"
        exit 1
    fi
    
    log_info "Preflight checks passed"
}

# 创建远程目录结构
create_remote_dirs() {
    log_info "Creating remote directory structure..."
    ssh -p $SSH_PORT -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'EOF'
        mkdir -p /opt/aiwill-planner
        mkdir -p /opt/aiwill-planner/deployment/hk-server/data
        mkdir -p /opt/aiwill-planner/deployment/hk-server/data/t1-compliance-engine/{rules,logs}
        mkdir -p /opt/aiwill-planner/deployment/hk-server/data/t4-contract-generator/{templates,rules,output,logs}
        mkdir -p /opt/aiwill-planner/deployment/hk-server/data/t7-document-renderer/{templates,output,logs}
        mkdir -p /opt/aiwill-planner/deployment/hk-server/data/t8-miniprogram/data
        mkdir -p /opt/aiwill-planner/deployment/hk-server/logs/nginx
        mkdir -p /opt/aiwill-planner/deployment/hk-server/ssl
        chmod -R 755 /opt/aiwill-planner
EOF
    log_info "Remote directories created"
}

# 复制部署文件到远程服务器
copy_files() {
    log_info "Copying deployment files to $REMOTE_HOST..."
    
    # 创建临时本地打包
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    # 复制部署目录
    cp -r /Users/maran/aiwill-planner/deployment/hk-server "$TEMP_DIR/"
    
    # 复制 dockerfiles
    mkdir -p "$TEMP_DIR/dockerfiles"
    cp /Users/maran/aiwill-planner/deployment/dockerfiles/* "$TEMP_DIR/dockerfiles/"
    
    # 复制源代码目录 (排除不必要的内容)
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='vendor' \
        /Users/maran/aiwill-planner/ \
        -e "ssh -p $SSH_PORT -i $SSH_KEY" \
        "$REMOTE_USER@$REMOTE_HOST:/opt/aiwill-planner/" \
        --include='t1-compliance-engine/' \
        --include='t2-api-gateway/' \
        --include='t4-contract-generator/' \
        --include='t5-membership/' \
        --include='t6-affiliate/' \
        --include='t7-document-renderer/' \
        --include='t8-miniprogram/' \
        --include='deployment/' \
        --exclude='*'
    
    log_info "Files copied successfully"
}

# 配置 SSL 证书占位符
setup_ssl() {
    log_info "Setting up SSL certificates..."
    ssh -p $SSH_PORT -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'EOF'
        # 创建自签名证书作为占位符 (生产环境需要替换为真实证书)
        if [ ! -f /opt/aiwill-planner/deployment/hk-server/ssl/api.aiwill-planner.cn.crt ]; then
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout /opt/aiwill-planner/deployment/hk-server/ssl/api.aiwill-planner.cn.key \
                -out /opt/aiwill-planner/deployment/hk-server/ssl/api.aiwill-planner.cn.crt \
                -subj "/C=HK/ST=Hong Kong/L=Hong Kong/O=AI Will Planner/CN=api.aiwill-planner.cn"
            chmod 600 /opt/aiwill-planner/deployment/hk-server/ssl/api.aiwill-planner.cn.key
            chmod 644 /opt/aiwill-planner/deployment/hk-server/ssl/api.aiwill-planner.cn.crt
            echo "Self-signed SSL certificate created as placeholder"
        fi
EOF
    log_info "SSL setup complete"
}

# 部署服务
deploy_services() {
    log_info "Deploying services..."
    ssh -p $SSH_PORT -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'EOF'
        cd /opt/aiwill-planner/deployment/hk-server
        
        # 复制 .env.example 为 .env (如果 .env 不存在)
        if [ ! -f .env ]; then
            cp .env.example .env
            echo "Created .env from .env.example - please edit with real values"
        fi
        
        # 拉取最新的 Docker 镜像
        docker compose pull
        
        # 构建并启动服务
        docker compose up -d --build
        
        # 等待服务启动
        sleep 10
        
        # 检查服务状态
        docker compose ps
EOF
    log_info "Services deployed"
}

# 配置 Nginx 自动重启
setup_nginx_auto_restart() {
    log_info "Setting up Nginx auto-restart..."
    ssh -p $SSH_PORT -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'EOF'
        # 确保 Nginx 监控脚本存在 (可选的后备方案)
        cat > /opt/aiwill-planner/deployment/hk-server/monitor.sh << 'MONITOR'
#!/bin/bash
# Nginx 监控脚本 - 如果 Nginx 停止则自动重启
while true; do
    if ! docker exec aiwill-nginx nginx -t 2>/dev/null; then
        echo "Nginx crashed, restarting..."
        cd /opt/aiwill-planner/deployment/hk-server
        docker compose restart nginx
    fi
    sleep 30
done
MONITOR
        chmod +x /opt/aiwill-planner/deployment/hk-server/monitor.sh
EOF
    log_info "Nginx auto-restart configured"
}

# 验证部署
verify_deployment() {
    log_info "Verifying deployment..."
    
    # 检查所有容器是否运行
    ssh -p $SSH_PORT -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'EOF'
        cd /opt/aiwill-planner/deployment/hk-server
        echo "=== Container Status ==="
        docker compose ps
        
        echo ""
        echo "=== Health Checks ==="
        for container in aiwill-gateway aiwill-compliance aiwill-contract-gen aiwill-membership aiwill-affiliate aiwill-doc-renderer aiwill-miniprogram; do
            echo -n "$container: "
            if docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null | grep -q "healthy"; then
                echo "healthy"
            else
                echo "starting or unhealthy"
            fi
        done
EOF
    
    log_info "Verification complete"
}

# 主函数
main() {
    log_info "============================================"
    log_info "AI Will Planner - Hong Kong Server Deployment"
    log_info "Target: $REMOTE_HOST"
    log_info "============================================"
    
    check_ssh_key
    preflight_check
    create_remote_dirs
    copy_files
    setup_ssl
    deploy_services
    setup_nginx_auto_restart
    verify_deployment
    
    log_info "============================================"
    log_info "Deployment complete!"
    log_info "API endpoint: https://api.aiwill-planner.cn"
    log_info "============================================"
}

# 运行
main "$@"