# AI Will Planner - 香港云服务器部署

## 概述

本目录包含在香港云服务器 (43.129.207.154) 部署 AI Will Planner 全部后端服务的配置文件。

## 服务架构

```
                    [api.aiwill-planner.cn]
                           |
                        [Nginx]
                           |
              ┌────────────┼────────────┐
              │            │            │
      [API Gateway]  [Compliance]  [Contract]
         8080           Engine         Generator
                         8086           8081
              │            │            │
              │            │            │
      [Membership]   [Affiliate]  [Renderer]
         8082          8083           8084
              │            │            │
              └────────────┼────────────┘
                           │
                      [Databases]
                    PostgreSQL 3306
                    MySQL      5432
```

## 服务端口

| 服务 | 容器端口 | 说明 |
|------|----------|------|
| API Gateway | 8080 | 主入口 |
| Contract Generator | 8081 | 契约生成 |
| Membership | 8082 | 会员系统 |
| Affiliate | 8083 | 联盟系统 |
| Document Renderer | 8084 | 文档渲染 |
| Miniprogram | 8085 | 小程序后端 |
| Compliance Engine | 8086 | 合规引擎 |

## 目录结构

```
hk-server/
├── .env.example      # 环境变量模板
├── docker-compose.yml # 容器编排
├── nginx.conf        # Nginx 配置
├── deploy.sh         # 部署脚本
└── ssl/              # SSL 证书目录
```

## 部署步骤

### 1. SSH 密钥配置

确保本机有 SSH 密钥可登录远程服务器：

```bash
ssh-copy-id root@43.129.207.154
# 或手动添加 SSH key 到远程服务器
```

### 2. 配置环境变量

```bash
cd /Users/maran/aiwill-planner/deployment/hk-server
cp .env.example .env
# 编辑 .env 填入真实值
```

必须配置的项目：
- `DB_PASSWORD` - PostgreSQL 密码
- `MYSQL_ROOT_PASSWORD` - MySQL root 密码
- `JWT_SECRET` - JWT 密钥 (至少32字符)
- `OPENAI_API_KEY` - OpenAI API Key (境外)
- `ANTHROPIC_API_KEY` - Claude API Key (境外)
- `STRIPE_KEY` - Stripe 密钥 (境外支付)

### 3. 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. 验证部署

```bash
# SSH 到服务器检查状态
ssh root@43.129.207.154 "docker -C /opt/aiwill-planner/deployment/hk-server ps"

# 检查 API 是否可用
curl https://api.aiwill-planner.cn/health
```

## 合规要点

- **所有 AI 生成算力在境外**：通过 OpenAI/Claude API 调用（美国）
- **所有数据存储在境外**：PostgreSQL 和 MySQL 都在香港服务器
- **支付使用境外服务**：Stripe/PayPal
- **网信备案**：架构上不存在向境内公众提供生成式 AI

## SSL 证书

当前使用自签名证书作为占位符。生产环境请替换为真实证书：

```bash
# 在服务器上替换证书文件
scp your-cert.crt root@43.129.207.154:/opt/aiwill-planner/deployment/hk-server/ssl/api.aiwill-planner.cn.crt
scp your-cert.key root@43.129.207.154:/opt/aiwill-planner/deployment/hk-server/ssl/api.aiwill-planner.cn.key
docker restart aiwill-nginx
```

## 常用命令

```bash
# 查看服务状态
ssh root@43.129.207.154 "cd /opt/aiwill-planner/deployment/hk-server && docker compose ps"

# 重启所有服务
ssh root@43.129.207.154 "cd /opt/aiwill-planner/deployment/hk-server && docker compose restart"

# 查看日志
ssh root@43.129.207.154 "docker logs -f aiwill-gateway"
ssh root@43.129.207.154 "docker logs -f aiwill-nginx"

# 更新部署
ssh root@43.129.207.154 "cd /opt/aiwill-planner/deployment/hk-server && git pull && docker compose up -d --build"
```