# AI Will Planner · 腾讯云 CVM Supabase 部署 Runbook

> **目标**：在腾讯云大陆节点部署自托管 Supabase（用户/订单数据驻留大陆，PIPL 合规）
> **服务对象**：HK Vercel H5（业务前端）+ 个人微信公众号（账号绑定/客服）
> **适用机型**：S5 2C4G / S5 4C8G / 锐驰升级版
> **预计时间**：2-3 小时（含域名解析、备案变更、证书申请）

---

## 0. 部署前清单

| 项 | 状态 | 备注 |
|---|---|---|
| 腾讯云账号已实名 | ☐ | 个人认证 1 天, 企业 3 天 |
| CVM 已升级到 4G+ 内存 | ☐ | 见"升级步骤" |
| 域名 `api-cn.aiwill-planner.cn` 已购买 | ☐ | 在腾讯云 DNSPod 或 Cloudflare |
| A 记录 `api-cn.aiwill-planner.cn` → CVM 公网 IP | ☐ | 提前 1 小时解析生效 |
| ICP 备案包含此子域名 | ☐ | 子域名继承主域备案, 通常无需单独备案 |
| 公安备案已提交/已通过 | ☐ | 30 天内必须, 否则会被封网 |
| HK Vercel 已有 env 占位 | ☐ | 准备注入 `SUPABASE_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` |

---

## 1. 升级锐驰 2C1G → S5 2C4G（仅锐驰需要）

锐驰是腾讯云旧共享型实例，不能直接"调整配置"到 S5，需要**新购 + 迁移**：

### 1.1 制作镜像（备份锐驰现状）

```
腾讯云控制台 → ECS → 实例列表 → 选锐驰实例 → 更多 → 实例设置 → 制作自定义镜像
镜像名称: aiwill-2026-06-XX-backup
```

### 1.2 记录锐驰配置

```bash
# 在锐驰上执行
cat /etc/nginx/nginx.conf > /tmp/nginx-backup.conf
cat /var/www/aiwill-planner/.env 2>/dev/null > /tmp/env-backup
ls /var/www/aiwill-planner/ > /tmp/files-backup.txt
ip a | grep "inet " > /tmp/network-backup.txt
scp /tmp/*-backup user@local:~/
```

### 1.3 退还锐驰

```
ECS → 实例 → 销毁/退还 → 退还实例
按使用时长扣费, 剩余金额原路退回 (通常 0-30 元)
```

### 1.4 新购 S5.SMALL4 (2C4G)

```
腾讯云控制台 → 购买 → 云服务器 → 标准型 S5 → S5.SMALL4 (2C4G)
- 镜像: 自定义镜像 → aiwill-2026-06-XX-backup
- 系统盘: 50G 高性能云硬盘
- 公网带宽: 5M 按量计费
- 计费: 包年包月 (推荐) 或按量
- 区域: 与锐驰相同 (例如广州五区)
- 安全组: 选 default 或新建
- 公网 IP: 选 "分配公网 IP"
- 主机名: aiwill-supabase
```

### 1.5 绑定原公网 IP（如果旧锐驰是包年包月固定 IP）

```
控制台 → 弹性公网 IP → 选原 IP → 绑定 → 实例: 新购的 S5
```

⚠️ **如果新购拿到的 IP 不同**：
- 更新 Cloudflare A 记录：`aiwill-planner.cn` / `www.aiwill-planner.cn` → 新 IP
- 等待 1-5 分钟生效
- ICP 备案不影响（按域名备案，不按 IP）
- **公安备案** 需重新接入（24-48h 完成）

### 1.6 验证新 S5

```bash
ssh root@<新公网IP>
df -h          # 应看到 50G 系统盘
free -h        # 应看到 4G 内存
systemctl status nginx    # 应 active
curl http://localhost/   # 应返回静态页
```

---

## 2. DNS 准备

在 Cloudflare 或 DNSPod 添加：

| 记录 | 类型 | 值 | 代理 |
|---|---|---|---|
| `api-cn.aiwill-planner.cn` | A | `<S5 公网 IP>` | DNS only |

等待 1-5 分钟生效，验证：

```bash
dig +short api-cn.aiwill-planner.cn @8.8.8.8
# 应返回 S5 公网 IP
```

---

## 3. 部署 Supabase

### 3.1 上传仓库到 S5

```bash
# 在 Mac 本地
cd /Users/maran/aiwill-planner
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  -e "ssh -i ~/.ssh/tencent_will" \
  ./ root@<S5 公网 IP>:/opt/aiwill-planner/
```

或用 git：

```bash
ssh root@<S5 公网 IP>
cd /opt
git clone https://ghp_xxx@github.com/maran529-byte/will-planning.git aiwill-planner
```

### 3.2 一键部署 Supabase

```bash
ssh root@<S5 公网 IP>
cd /opt/aiwill-planner
chmod +x deployment/tencent-cvm/setup-supabase.sh
bash deployment/tencent-cvm/setup-supabase.sh
```

**执行时间**：10-15 分钟（拉 Docker 镜像 5-8 分钟，启动 + 迁移 2-5 分钟）

**输出关键信息**：

```
公网 IP:        124.222.xxx.xxx
PostgREST:      http://124.222.xxx.xxx:8000
Studio:         http://124.222.xxx.xxx:3001
ANON_KEY:       eyJ...
SERVICE_ROLE:   eyJ...
```

⚠️ **立即把这些值复制到 1Password 或加密备忘录**（后面 Vercel env 要用）

### 3.3 配置 Caddy 反向代理（HTTPS）

```bash
bash deployment/tencent-cvm/setup-caddy.sh
# 输入域名: api-cn.aiwill-planner.cn
# 自动申请 Let's Encrypt 证书
```

**完成后**：
- `https://api-cn.aiwill-planner.cn/rest/v1/` → Supabase REST
- `https://api-cn.aiwill-planner.cn/auth/v1/` → GoTrue
- `https://api-cn.aiwill-planner.cn/storage/v1/` → Storage
- `https://studio.api-cn.aiwill-planner.cn/` → Studio (Basic Auth 保护)

---

## 4. 配置 HK Vercel 环境变量

在 Vercel → aiwill-planner 项目 → Settings → Environment Variables：

| 变量 | 值 | 环境 |
|---|---|---|
| `SUPABASE_URL` | `https://api-cn.aiwill-planner.cn` | Production |
| `SUPABASE_ANON_KEY` | (从 .env 复制) | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | (从 .env 复制) | Production |
| `WECHAT_APP_ID` | `wx30fe5cd917eb2e7a` | All |
| `WECHAT_APP_SECRET` | **(重置后的新值)** | Production |
| `WECHAT_MP_TOKEN` | 32 位随机串 | Production |
| `WECHAT_MP_AES_KEY` | 43 位随机串 | Production |

**触发 Vercel 重新部署**：Deployments → 最新 → Redeploy。

---

## 5. 验证端到端

### 5.1 Supabase 直连

```bash
# 在 S5 上
curl https://api-cn.aiwill-planner.cn/rest/v1/ \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
# 应返回 [] 或 {"message":"..."}
```

### 5.2 HK Vercel → Supabase

打开 `https://h5.aiwill-planner.cn/test-supabase`（需先在 H5 加个测试页），应能看到数据库连接成功。

### 5.3 公众号绑定流程

1. 微信扫码关注公众号
2. 点菜单"账号绑定" → H5 → 点"微信登录" → 同意授权
3. 跳转回 H5，H5 显示绑定成功
4. 查 Supabase `public.users` 表，应有新行（openid 已填）

---

## 6. 运维

### 6.1 每日备份

```bash
cat > /etc/cron.daily/aiwill-backup <<'EOF'
#!/bin/bash
BACKUP_DIR=/opt/aiwill-supabase/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec supabase-db pg_dumpall -U postgres > "$BACKUP_DIR/db_${TIMESTAMP}.sql"
gzip "$BACKUP_DIR/db_${TIMESTAMP}.sql"

# 保留 30 天
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

# 同步到腾讯云 COS (需要先装 coscli 并配置)
# coscli cp "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz" cos://aiwill-backup/db/
EOF
chmod +x /etc/cron.daily/aiwill-backup
```

### 6.2 监控

腾讯云监控 → CVM → 告警策略：
- CPU > 80% 持续 5 分钟 → 短信
- 内存 > 90% → 短信
- 磁盘 > 85% → 短信
- 网络出带宽 > 80Mbps → 邮件

### 6.3 升级 Supabase

```bash
ssh root@<S5 公网 IP>
cd /opt/aiwill-supabase/supabase
git pull
cd docker
docker compose pull
docker compose up -d
# 注意: 升级前先停业务 5-10 分钟
```

### 6.4 故障排查

| 现象 | 原因 | 解决 |
|---|---|---|
| 8000 端口连不上 | docker 容器未启动 | `docker ps` / `docker logs supabase-rest` |
| 5432 连接超时 | 安全组未放行 | 控制台放行 5432 给运维 IP |
| Studio 401 | DASHBOARD_PASSWORD 错 | 看 /opt/aiwill-supabase/.env |
| Caddy 申请证书失败 | 80 端口被占 / DNS 未生效 | `systemctl stop nginx` 后重试 |
| HK Vercel 调不通 | CORS 没配 SITE_URL | 修改 .env SITE_URL，重启容器 |

---

## 7. 回滚方案

如果 Supabase 部署失败，**已部署的 CN 静态站不受影响**（在 124.222.215.107:80 跑 nginx，与 Supabase 是不同容器）。

如需回滚 Supabase 部署：

```bash
ssh root@<S5 公网 IP>
cd /opt/aiwill-supabase/supabase/docker
docker compose down -v   # ⚠️ -v 会删数据, 谨慎
# 静态站仍在 124.222.215.107 上跑 (因为用 image 启动, 不依赖 supabase 容器)
```

---

## 8. 成本与 ROI

| 资源 | 月成本 | 备注 |
|---|---|---|
| S5.SMALL4 (2C4G) | ~¥100 | 含 50G SSD |
| 公网带宽 (5M) | ~¥30 | Vercel 回调流量 |
| 备案 (一次性) | 0 | ICP + 公安 |
| **合计** | **~¥130/月** | |

**对比**：
- 阿里云 RDS PostgreSQL 1C2G + 阿里云 ECS 2C2G：~¥300/月
- Supabase Cloud Pro (8GB)：$25/月 = ~¥180/月（**数据不在大陆，违规**）
- 腾讯云 TencentDB for PG 1C2G + 轻量 2C2G：~¥280/月

**当前方案性价比最高**（一次性部署，简单，单点风险用每日备份兜底）。

---

## 9. 实施 Checklist

打印此表，每完成一项打勾：

```
D-1  准备
  ☐ Cloudflare 添加 api-cn.aiwill-planner.cn A 记录
  ☐ ICP / 公安备案信息核对 (子域名不需额外备案)
  ☐ 锐驰做镜像备份

D 0  升级 + 部署
  ☐ 退还锐驰实例
  ☐ 新购 S5 2C4G
  ☐ 绑定原公网 IP
  ☐ ssh 到 S5, 验证 4G 内存
  ☐ bash deployment/tencent-cvm/setup-supabase.sh
  ☐ 复制 ANON_KEY / SERVICE_ROLE_KEY 到密码管理器
  ☐ bash deployment/tencent-cvm/setup-caddy.sh
  ☐ curl https://api-cn.aiwill-planner.cn/rest/v1/ 验证
  ☐ 浏览器打开 https://studio.api-cn.aiwill-planner.cn/

D+1  HK Vercel 集成
  ☐ Vercel 配置 6 个 env var
  ☐ Redeploy
  ☐ H5 测试页验证 Supabase 连接
  ☐ 公众号配置 (URL, Token, 域名)
  ☐ OAuth 流程跑通 (扫码 → 同意 → 绑定成功)

D+7  稳定性
  ☐ 每日备份 cron 配置
  ☐ 监控告警配置
  ☐ 7 天运行无异常
  ☐ 文档 (架构图, runbook) 提交 git
```
