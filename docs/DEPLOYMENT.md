# aiwill-planner · 部署运行手册 (Deployment Runbook)

> 编制者：DevOps / SRE Agent
> 编制日期：2026-06-02
> 文档版本：v1.0
> 适用基线：commit `3433183` (HEAD)
> 上游文档：[`PRD.md`](./PRD.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`REVIEW.md`](./REVIEW.md) · [`QA_REPORT.md`](./QA_REPORT.md) · [`ENV.md`](./ENV.md)

---

## 0. 文档目的 (Purpose)

本手册为 **Master Agent / 运维工程师** 提供端到端部署 aiwill-planner 全栈系统的 step-by-step 操作指南，覆盖：

- 大陆静态展示域 (aiwill-planner.cn) on Tencent Cloud
- Vercel Global SaaS 域 (aiwill-planner.vercel.app)
- Supabase 数据库 + Auth
- DNS 解析
- 部署后冒烟测试 (smoke test)

**安全红线**（来自 `docs/ARCHITECTURE.md` §1.3）：
- 大陆节点 **零 AI endpoint** · **零 proxy_pass** · **零 JS fetch**
- 任何 `/api/*` 必须 `301 → h5.aiwill-planner.cn`（不可反代境外）

---

## 1. 部署前清单 (Pre-flight Checklist)

| # | 项 | 状态 | 备注 |
|---|----|------|------|
| 1 | 本机 SSH 私钥可连 `root@124.222.215.107` | ☐ | 检查 `~/.ssh/tencent_will` |
| 2 | Vercel 账号 + 团队权限 | ☐ | https://vercel.com/dashboard |
| 3 | Supabase 账号 | ☐ | https://app.supabase.com |
| 4 | 域名注册商 (DNSPod) 账号 | ☐ | https://console.dnspod.cn |
| 5 | 微信支付商户号（可选 Day 0） | ☐ | https://pay.weixin.qq.com |
| 6 | 支付宝商户号（可选 Day 0） | ☐ | https://open.alipay.com |
| 7 | Stripe 账号（可选 intl launch） | ☐ | https://dashboard.stripe.com |
| 8 | LLM 供应商 API Key (MiniMax/Qwen) | ☐ | https://api.minimaxi.com |
| 9 | `.env.example` 复制为 `.env.local` | ☐ | 参考 `docs/ENV.md` |
| 10 | 所有 env vars 在 Vercel Dashboard 配置完毕 | ☐ | 见 `docs/ENV.md` 表 |

---

## 2. Section A — 大陆静态站 (aiwill-planner.cn)

> 目标：将 5 个静态 HTML + 合规 nginx.conf 部署到 Tencent Cloud CN (124.222.215.107)

### 2.1 一次性准备 (One-time Setup)

```bash
# 在本机执行
ssh -i ~/.ssh/tencent_will root@124.222.215.107 \
  "mkdir -p /var/www/aiwill-planner-cn/static-content && \
   mkdir -p /var/log/compliance && \
   nginx -v"   # 确认 nginx >= 1.24
```

### 2.2 部署静态资源 (5 paths + SEO)

```bash
# 从仓库根目录执行
cd /Users/maran/aiwill-planner

# 上传 index.html
scp -i ~/.ssh/tencent_will \
  index.html root@124.222.215.107:/var/www/aiwill-planner-cn/index.html

# 上传 4 个 SEO 页
scp -i ~/.ssh/tencent_will \
  static-content/*.html root@124.222.215.107:/var/www/aiwill-planner-cn/static-content/

# 上传 sitemap + robots
scp -i ~/.ssh/tencent_will \
  deployment/mainland-server/sitemap.xml \
  deployment/mainland-server/robots.txt \
  root@124.222.215.107:/var/www/aiwill-planner-cn/
```

### 2.3 部署 nginx 配置（合规收紧版）

```bash
# 上传新 nginx.conf（含 6 个安全头 + 0 proxy_pass）
scp -i ~/.ssh/tencent_will \
  deployment/mainland-server/nginx.conf \
  root@124.222.215.107:/etc/nginx/conf.d/aiwill-planner.cn.conf

# 语法检查 + reload
ssh -i ~/.ssh/tencent_will root@124.222.215.107 \
  "nginx -t && systemctl reload nginx"
```

### 2.4 上传并注册 compliance 脚本（可选 cron）

```bash
scp -i ~/.ssh/tencent_will \
  deployment/mainland-server/compliance_check.sh \
  root@124.222.215.107:/usr/local/bin/compliance_check.sh

ssh -i ~/.ssh/tencent_will root@124.222.215.107 \
  "chmod +x /usr/local/bin/compliance_check.sh && \
   (crontab -l 2>/dev/null | grep -v compliance_check; \
    echo '0 0 1 * * bash /usr/local/bin/compliance_check.sh >> /var/log/compliance/\$(date +\%Y-\%m).log 2>&1') | crontab -"
```

### 2.5 验证大陆域

```bash
# 5 个静态路径应全部 200
for path in "" "/faq" "/tutorial" "/compare" "/tool"; do
  echo -n "/${path:-index} → "
  curl -s -o /dev/null -w "%{http_code}\n" \
    --max-time 10 "https://aiwill-planner.cn${path}"
done

# /api/* 应 301 跳 h5 子域（合规红线）
curl -sI --max-time 10 https://aiwill-planner.cn/api/v1/health | head -3

# 备案号应可点击
curl -s https://aiwill-planner.cn | grep -c "沪ICP备2026020925号-1"   # ≥1
curl -s https://aiwill-planner.cn | grep -c "beian.miit.gov.cn"      # ≥1
```

### 2.6 一键脚本（推荐）

```bash
# 仓库根目录
bash deployment/mainland-server/deploy_mainland.sh
# 脚本会自动：SSH 预检 → 备份 → 上传 → nginx -t → reload → compliance → 烟囱测试
```

---

## 3. Section B — Vercel Global SaaS (aiwill-planner.vercel.app)

> 目标：Next.js 16.2.4 SaaS 全栈应用（AI 草稿 / 订单 / 支付 / 用户中心 / 律师 / 博主）

### 3.1 一次性创建 Vercel 项目

1. 登录 https://vercel.com/dashboard
2. **Add New… → Project**
3. **Import** Git 仓库 `maran529-byte/will-planning` (或当前 fork)
4. 配置：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `next build`（默认）
   - **Output Directory**: `.next`（默认）
   - **Install Command**: `npm ci`（默认）
   - **Node Version**: 20.x

### 3.2 配置环境变量 (Vercel Project Settings → Environment Variables)

> 完整变量清单见 [`docs/ENV.md`](./ENV.md)。**必填项**（无任何 fallback）：

| Var | Environment | 说明 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Supabase anon (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Supabase service role (server) |
| `MINIMAX_API_KEY` | Production | LLM 推理（`src/lib/config.ts:2`）|
| `SITE_URL` | Production | `https://aiwill-planner.vercel.app` |
| `WECHAT_APPID` | Production | 仅 CN 真实支付前必填 |
| `WECHAT_MCHID` | Production | 同上 |
| `WECHAT_API_V3_KEY` | Production | 同上 |
| `WECHAT_NOTIFY_URL` | Production | `https://aiwill-planner.vercel.app/api/payment/callback` |
| `STRIPE_SECRET_KEY` | Production | 仅 intl 真实支付前必填 |
| `STRIPE_WEBHOOK_SECRET` | Production | 同上 |

### 3.3 部署

```bash
# 本机开发
npm ci
npm run dev      # http://localhost:3000

# 触发生产部署（main push 自动触发）
git push origin main
# Vercel GitHub integration 自动 build + deploy
# 部署日志：https://vercel.com/team_WMYzU3qKNxH5sC6YypHSbX4v/aiwill-planner
```

### 3.4 自定义域 (Custom Domain)

Vercel Dashboard → Project → Settings → Domains：

| 域名 | 用途 |
|------|------|
| `aiwill-planner.vercel.app` | 默认 Vercel 域（自动） |
| `h5.aiwill-planner.cn` | 备用 H5 入口（与大陆静态站 CTA 对接） |
| `api.aiwill-planner.cn` | 可选，API 子域（与 Vercel 路由绑定） |

### 3.5 Vercel GitHub Secrets 必填

仓库 Settings → Secrets and variables → Actions：

| Secret | 用途 |
|--------|------|
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | 团队 ID |
| `VERCEL_PROJECT_ID` | 项目 ID |

---

## 4. Section C — Supabase 部署

> 目标：托管 PostgreSQL + Auth + Storage，作为业务数据层

### 4.1 一次性创建 Supabase 项目

1. 登录 https://app.supabase.com
2. **New Project**：
   - **Name**: `aiwill-planner`
   - **Database Password**: 生成强密码（保存到 1Password）
   - **Region**: `ap-southeast-1` (Singapore) — 距离 Vercel HK Edge 最近
   - **Pricing Plan**: Free（开发）→ Pro $25/月（Day 7 上线后）

### 4.2 跑数据库 Schema

```bash
# 方法 1：Dashboard SQL Editor（推荐首次）
# 1. 打开 https://app.supabase.com/project/<PROJECT_ID>/sql
# 2. 粘贴 supabase-schema.sql 全部内容
# 3. 点击 "Run"

# 方法 2：CLI 推送
supabase login
supabase link --project-ref <PROJECT_ID>
psql "$SUPABASE_DB_URL" < supabase-schema.sql
```

### 4.3 启用 RLS

```sql
-- 已在 supabase-schema.sql:210-213 自动启用
-- 验证：
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

### 4.4 配置 Auth Providers

Supabase Dashboard → Authentication → Providers：

| Provider | 配置 | 用途 |
|----------|------|------|
| Email | 默认启用 | 用户邮箱注册 |
| Phone | 启用 OTP | 大陆手机号验证码 |
| Google | 配 Client ID/Secret | 海外用户 |
| WeChat | (Custom OAuth) | 大陆微信扫码（Day 5+） |

### 4.5 复制 Key 到 Vercel

```bash
# 在 Supabase Dashboard → Settings → API
SUPABASE_URL=https://<PROJECT_ID>.supabase.co
SUPABASE_ANON_KEY=eyJ...                    # 客户端 anon
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # 服务端 admin
```

将三个值填入 **Vercel Project → Environment Variables**（见 §3.2）。

---

## 5. Section D — DNS 配置 (DNSPod / Cloudflare)

### 5.1 DNSPod 添加记录

| 主机记录 | 记录类型 | 记录值 | TTL | 说明 |
|----------|---------|--------|-----|------|
| `@` | A | `124.222.215.107` | 600 | 大陆主入口 |
| `www` | CNAME | `aiwill-planner.cn` | 600 | www 跳转 |
| `h5` | CNAME | `cname.vercel-dns.com` | 300 | Vercel H5 子域（生产推荐） |
| `api` | CNAME | `cname.vercel-dns.com` | 300 | 可选 API 子域 |
| （根域）| — | — | — | `aiwill-planner.vercel.app` 由 Vercel 自动管理 |

### 5.2 验证解析

```bash
dig +short aiwill-planner.cn          # 应返回 124.222.215.107
dig +short www.aiwill-planner.cn      # 应返回 124.222.215.107
dig +short h5.aiwill-planner.cn       # 应返回 Vercel Edge IP (76.76.21.21 类)
```

### 5.3 备援 HK 节点 (43.129.207.154)

如需保留 HK 备援（Vercel 域被 GFW 屏蔽时切换）：

| 主机记录 | 记录类型 | 记录值 |
|----------|---------|--------|
| `h5-fallback` | A | `43.129.207.154` |

---

## 6. Section E — 部署后冒烟测试 (Post-deploy Smoke Test)

> 从运维笔记本执行，验证三端可访问

### 6.1 大陆静态域

```bash
# 5 路径必须 200
curl -I https://aiwill-planner.cn          # → 200
curl -I https://aiwill-planner.cn/faq      # → 200
curl -I https://aiwill-planner.cn/tutorial # → 200
curl -I https://aiwill-planner.cn/compare  # → 200
curl -I https://aiwill-planner.cn/tool     # → 200

# 备案号必须出现
curl -s https://aiwill-planner.cn | grep -c "沪ICP备2026020925号-1"   # 应 ≥1
curl -s https://aiwill-planner.cn | grep -c "beian.miit.gov.cn"      # 应 ≥1

# /api/* 必须 301（合规）
curl -sI https://aiwill-planner.cn/api/v1/health | head -1   # 应 301/302
```

### 6.2 Vercel Global 域

```bash
# 首页 + 4 核心页必须 200
curl -I https://aiwill-planner.vercel.app                  # → 200
curl -I https://aiwill-planner.vercel.app/questionnaire    # → 200
curl -I https://aiwill-planner.vercel.app/result            # → 200
curl -I https://aiwill-planner.vercel.app/payment           # → 200
curl -I https://aiwill-planner.vercel.app/orders            # → 200

# 备案号 Footer（来自 LegalFooter 组件）
curl -s https://aiwill-planner.vercel.app | grep -c "beian.miit.gov.cn"  # 应 ≥1
```

### 6.3 API 端点

```bash
# create-order 应拒绝空 body → 400
curl -s -X POST https://aiwill-planner.vercel.app/api/create-order \
  -H "Content-Type: application/json" \
  -d '{}' -w "\n→ HTTP %{http_code}\n"

# generate-will 应拒绝空 body → 400
curl -s -X POST https://aiwill-planner.vercel.app/api/generate-will \
  -H "Content-Type: application/json" \
  -d '{}' -w "\n→ HTTP %{http_code}\n"

# payment 应拒绝空 body → 400
curl -s -X POST https://aiwill-planner.vercel.app/api/payment \
  -H "Content-Type: application/json" \
  -d '{}' -w "\n→ HTTP %{http_code}\n"
```

### 6.4 合规自查脚本 (本地)

```bash
# 7 项证据检查（应在合规 prod server 上跑）
bash deployment/mainland-server/compliance_check.sh
# 预期：所有自动项 PASS
```

### 6.5 完整冒烟测试 (一键)

```bash
# 仓库根目录
cat > /tmp/smoke_test.sh <<'EOF'
#!/bin/bash
set -e
DOMAINS=("https://aiwill-planner.cn" "https://aiwill-planner.vercel.app")
PATHS_CN=("/" "/faq" "/tutorial" "/compare" "/tool")
PATHS_VC=("/" "/questionnaire" "/result" "/payment" "/orders")
for path in "${PATHS_CN[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://aiwill-planner.cn${path}")
  echo "CN  ${path} → ${code}"
  [[ "$code" == "200" ]] || exit 1
done
for path in "${PATHS_VC[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://aiwill-planner.vercel.app${path}")
  echo "VC  ${path} → ${code}"
  [[ "$code" == "200" ]] || exit 1
done
echo "✅ 全部通过"
EOF
chmod +x /tmp/smoke_test.sh && /tmp/smoke_test.sh
```

---

## 7. 应急回退 (Rollback)

### 7.1 Vercel 回退

```bash
# Vercel Dashboard → Deployments → 找到上一个 green build → "Promote to Production"
# 或 CLI：
vercel rollback
```

### 7.2 大陆 nginx 回退

```bash
# 远端：找最新备份
ssh root@124.222.215.107 \
  "ls -t /etc/nginx/nginx.conf.bak.* | head -1"
# 假设是 nginx.conf.bak.20260601_120000
ssh root@124.222.215.107 \
  "cp -a /etc/nginx/nginx.conf.bak.20260601_120000 /etc/nginx/nginx.conf && \
   nginx -t && nginx -s reload"
```

### 7.3 Supabase Migration 回退

```bash
# Supabase Dashboard → Database → Migrations → 找到上一版本 → Apply
# 或 CLI：
supabase db reset --version <previous_migration_id>
```

---

## 8. 监控与告警 (Post-deploy Day 1+)

| 监控项 | 工具 | 阈值 | 告警通道 |
|--------|------|------|----------|
| Uptime (大陆 + Vercel) | UptimeRobot | 5xx > 3/5min | 飞书 / 钉钉 webhook |
| 性能 LCP | Vercel Analytics | LCP > 4s | (仅 dashboard) |
| 错误日志 | Sentry (Day 1+ P1) | new error > 10/h | 飞书 |
| 支付成功率 | Supabase + 自建脚本 | < 95% | 飞书 |
| compliance 7 项 | cron (每月 1 日) | 任意 FAIL | 飞书 + 阻断下次部署 |

---

## 9. 已知阻塞与残留风险

来自 `docs/QA_REPORT.md` §9 + `docs/REVIEW.md` §11：

| 阻塞项 | 描述 | 上线前必做 |
|--------|------|-----------|
| R1 | `verifyPaymentCallback` 是 stub（`src/lib/payment.ts:91-95`）| 替换为真实 RSA-SHA256 / AES-256-GCM / HMAC-SHA256 |
| R2 | prod server (aiwill-planner.cn) 尚未 re-deploy 新 nginx.conf | SSH 跑 `deploy_mainland.sh` |
| R3 | Supabase env 未在 Vercel 配置（API 启动 throw）| Vercel Dashboard 填 env vars |
| R4 | 6 个安全头已上配置文件但线上 server 未 reload | 同步 §2.3 |
| R5 | HK 43.129.207.154 退役中 (Day 90 决策) | 当前不需操作 |

---

## 10. 附录 · 关键 URL 速查

| 用途 | URL |
|------|-----|
| 大陆主站 | https://aiwill-planner.cn |
| Vercel Global | https://aiwill-planner.vercel.app |
| HK 备援 | h5.aiwill-planner.cn |
| 备案查询 | https://beian.miit.gov.cn |
| 百度站长 | https://ziyuan.baidu.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase Dashboard | https://app.supabase.com |
| 微信商户平台 | https://pay.weixin.qq.com |
| Stripe Dashboard | https://dashboard.stripe.com |

---

**手册结束 · Version 1.0 · 2026-06-02 · 编制者：DevOps / SRE Agent**
