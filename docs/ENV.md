# aiwill-planner · 环境变量目录 (Environment Variable Catalog)

> 编制者：DevOps / SRE Agent
> 编制日期：2026-06-02
> 文档版本：v1.0
> 适用基线：commit `3433183` (HEAD)

---

## 0. 文档目的 (Purpose)

本目录是 aiwill-planner 全栈系统 **所有环境变量的唯一来源 (Single Source of Truth)**，覆盖：

- Vercel (Next.js SaaS) env vars
- 大陆 Tencent Cloud nginx env vars (如适用)
- Supabase 配置
- 第三方服务 (微信 / 支付宝 / Stripe / LLM / 监控)

**关键命名规则**：
- `NEXT_PUBLIC_*` — 暴露给浏览器（**不可包含 secrets**）
- `SUPABASE_SERVICE_ROLE_KEY` — 服务端 **bypass RLS**，永不出 client
- `*_KEY` / `*_SECRET` / `*_TOKEN` — 永不入 git / 永不出前端

---

## 1. 完整变量清单 (Master Table)

### 1.1 Supabase 凭证 (Vercel 必填)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | **Yes** | Vercel Project → Environment Variables | Supabase project URL (公开) | `https://abcxyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | **Yes** | Vercel Project → Environment Variables | Supabase anon key (client-side, 受 RLS 约束) | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | **Yes** | Vercel Project → Environment Variables (Production only) | Supabase service role (server-side, bypass RLS) | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

### 1.2 微信支付 (Vercel · CN launch 必填)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `WECHAT_APPID` | Vercel | Yes (CN launch) | Vercel env | 微信公众号 / 小程序 AppID | `wx1234567890abcdef` |
| `WECHAT_MCHID` | Vercel | Yes (CN launch) | Vercel env | 微信支付商户号 | `1234567890` |
| `WECHAT_API_V3_KEY` | Vercel | Yes (CN launch) | Vercel env | 微信 V3 API key (AES-256-GCM 回调解密) | `32-char-string...` |
| `WECHAT_PRIVATE_KEY` | Vercel | Yes (CN launch) | Vercel env | 商户私钥 (PEM, RSA 签名) | `-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...` |
| `WECHAT_SERIAL_NO` | Vercel | Yes (CN launch) | Vercel env | 商户证书序列号 | `1234567890ABCDEF` |
| `WECHAT_NOTIFY_URL` | Vercel | Yes (CN launch) | Vercel env | 回调 URL | `https://aiwill-planner.vercel.app/api/payment/callback` |

> **代码引用**：`src/lib/config.ts:12-15` 读取 `WECHAT_APPID/MCHID/API_KEY/NOTIFY_URL`；`src/lib/payment.ts:4,28,44` 使用之。
>
> **遗留命名不一致**（P1 应统一）：代码当前读 `WECHAT_API_KEY`，本目录按 ARCH §7.3 推荐统一为 `WECHAT_API_V3_KEY`。**Day 0 部署时建议在 Vercel 同时设两个 key（值相同）做兼容过渡**。

### 1.3 支付宝 (Vercel · CN launch 必填)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `ALIPAY_APPID` | Vercel | Yes (CN launch) | Vercel env | 支付宝 AppID | `2021000000000000` |
| `ALIPAY_PRIVATE_KEY` | Vercel | Yes (CN launch) | Vercel env | 商户私钥 (RSA2 签名) | `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAA...` |
| `ALIPAY_PUBLIC_KEY` | Vercel | Yes (CN launch) | Vercel env | 支付宝公钥 (验签) | `-----BEGIN PUBLIC KEY-----\nMIIBIjANB...` |

### 1.4 Stripe (Vercel · intl launch 必填)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel | Yes (intl launch) | Vercel env | Stripe secret key (server-side) | `sk_live_51N...` |
| `STRIPE_WEBHOOK_SECRET` | Vercel | Yes (intl launch) | Vercel env | Stripe Webhook 签名密钥 | `whsec_abc123...` |
| `STRIPE_PUBLISHABLE_KEY` | Vercel | Yes (intl launch) | Vercel env | Stripe publishable (client-side) | `pk_live_51N...` |

### 1.5 LLM 推理 (Vercel 必填)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `MINIMAX_API_KEY` | Vercel | **Yes** | Vercel env | LLM provider API key | `eyJhbGciOiJIUzI1NiI...` |
| `MINIMAX_BASE_URL` | Vercel | No | Vercel env | LLM endpoint (默认 MiniMax) | `https://api.minimaxi.com/anthropic` |
| `MINIMAX_MODEL` | Vercel | No | Vercel env | Model 名称 | `MiniMax-M2.7` |

> **代码引用**：`src/lib/config.ts:2-4` 读取全部 3 个；`src/lib/config.ts:2-4` 为 hardcoded fallback。
>
> **多供应商规划** (P1+)：未来将 `MINIMAX_*` 统一抽象为 `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL`，切换 DeepSeek / Qwen / Claude 无需改代码。

### 1.6 站点与合规 (Vercel + CN 必填)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `SITE_URL` | Vercel | **Yes** | Vercel env | 公开站点 URL（用于 callback / OG tag）| `https://aiwill-planner.vercel.app` |
| `ICP_BEIAN_URL` | Vercel + CN | **Yes** | Vercel env + nginx (hardcoded) | MIIT 备案查询 URL | `https://beian.miit.gov.cn` |
| `ICP_BEIAN_NUMBER` | Vercel + CN | **Yes** | Vercel env + nginx (hardcoded) | ICP 备案号 | `沪ICP备2026020925号-1` |
| `LEGAL_NOTICE_TEXT` | Vercel | No | Vercel env | 免责声明文案（默认从 LegalFooter 组件读）| `本平台 AI 草稿不构成法律意见...` |

> **代码引用**：`src/components/LegalFooter.tsx:23,28` 直接 hardcode `沪ICP备2026020925号-1` + `beian.miit.gov.cn`；P1 建议改为读 env。

### 1.7 数据加密 (Vercel · 启用 PII 加密后必填)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `ID_CARD_ENCRYPTION_KEY` | Vercel | Yes (启用后) | Vercel Secret | pgcrypto 加密身份证号 | `64-hex-char-string...` |
| `BANK_ENCRYPTION_KEY` | Vercel | Yes (启用后) | Vercel Secret | 银行账号加密 | `64-hex-char-string...` |
| `IP_HASH_SALT` | Vercel | Yes (启用后) | Vercel Secret | IP 不可逆 hash salt | `random-32-byte-base64` |

> **P1 待办**：`supabase-schema.sql` 当前未启用 pgcrypto；启用时同步设置以上 3 个 key。

### 1.8 监控与通知 (Vercel · 可选)

| Var | Scope | Required? | Where Set | Description | Example |
|---|---|---|---|---|---|
| `SENTRY_DSN` | Vercel | No | Vercel env | Sentry 错误追踪 (P1) | `https://abc123@sentry.io/456` |
| `RESEND_API_KEY` | Vercel | No | Vercel env | Resend 邮件服务 (P2) | `re_abc123...` |
| `SENDGRID_API_KEY` | Vercel | No | Vercel env | SendGrid 邮件 (P2 替代) | `SG.abc123...` |
| `ALIYUN_SMS_KEY` | Vercel | No | Vercel env | 阿里云短信 (P2) | `LTAI5t...` |
| `TENCENT_SMS_KEY` | Vercel | No | Vercel env | 腾讯云短信 (P2 替代) | `AKID...` |

---

## 2. 按作用域分类 (By Scope)

### 2.1 Vercel Project → Environment Variables

所有 Vercel 部署需要的 env vars 都在 **同一处** 配置：

```
https://vercel.com/<TEAM>/<PROJECT>/settings/environment-variables
```

> **生产环境 (Production) 必填 11 项**（无任何 graceful fallback）：
>
> 1. `NEXT_PUBLIC_SUPABASE_URL`
> 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> 3. `SUPABASE_SERVICE_ROLE_KEY`
> 4. `MINIMAX_API_KEY`
> 5. `SITE_URL`
> 6. `ICP_BEIAN_URL`
> 7. `ICP_BEIAN_NUMBER`
> 8. `WECHAT_APPID`
> 9. `WECHAT_MCHID`
> 10. `WECHAT_API_V3_KEY` (建议同时设 `WECHAT_API_KEY` 兼容)
> 11. `WECHAT_NOTIFY_URL`

### 2.2 Vercel Project → GitHub Secrets (CI/CD)

仓库 `Settings → Secrets and variables → Actions`：

| Secret | 用途 |
|--------|------|
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | 团队 ID |
| `VERCEL_PROJECT_ID` | 项目 ID |

### 2.3 Tencent Cloud (大陆) env vars

**当前部署不依赖 OS env vars**——nginx.conf 是静态文件。`ICP_BEIAN_URL` / `ICP_BEIAN_NUMBER` 在 `nginx.conf:51` (`X-Beian` 头) + `LegalFooter.tsx:23,28` 中 **hardcoded**。

如未来需要从 env 注入（多环境差异化），建议在 `deploy_mainland.sh` 替换 `/etc/nginx/conf.d/aiwill-planner.cn.conf` 时使用 `envsubst`。

### 2.4 Supabase Dashboard → Settings → API

- `Project URL` → 对应 `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → 对应 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` key → 对应 `SUPABASE_SERVICE_ROLE_KEY` (Admin only)

### 2.5 本地开发 (`.env.local`)

```bash
# /Users/maran/aiwill-planner/.env.local (git ignored)
# 复制自 .env.example（如果存在）或从本目录复制以下项

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
MINIMAX_API_KEY=your-llm-key
SITE_URL=http://localhost:3000
ICP_BEIAN_URL=https://beian.miit.gov.cn
ICP_BEIAN_NUMBER=沪ICP备2026020925号-1
```

---

## 3. 代码引用映射 (Code Reference Map)

> 标注每个 env var 在代码中的读取位置 + 缺失时的行为

| Var | Code Reference (file:line) | Missing Behavior |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/config.ts:7`, `src/app/api/generate-will/route.ts:10` | Client & Server Supabase clients → `null`；API 调用 throw |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/config.ts:8`, `src/app/api/generate-will/route.ts:11` | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/config.ts:9`, `src/app/api/generate-will/route.ts:11` | 服务端 admin client → `null`；所有 DB 写操作失败 |
| `WECHAT_APPID` | `src/lib/config.ts:12`, `src/lib/payment.ts:4,28,44` | `isWechatConfigured()` → `false`；自动 fallback 到 `demo` channel |
| `WECHAT_MCHID` | `src/lib/config.ts:13`, `src/lib/payment.ts:4,28,44` | 同上 |
| `WECHAT_API_KEY` / `WECHAT_API_V3_KEY` | `src/lib/config.ts:14`, `src/lib/payment.ts:4,28,44` | 同上（命名待统一）|
| `WECHAT_NOTIFY_URL` | `src/lib/config.ts:15` | 回调 URL 缺失，微信商户平台配置 fallback 至硬编码 |
| `MINIMAX_API_KEY` | `src/lib/config.ts:2` | **HARD FAIL** — `fetch` 无 Authorization header → 401；fallback 模板触发 |

---

## 4. 获取途径 (How to Obtain)

| Var | Dashboard | URL |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | https://app.supabase.com/project/<id>/settings/api |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上 (Reveal once) | 同上 |
| `WECHAT_APPID` | 微信公众平台 | https://mp.weixin.qq.com |
| `WECHAT_MCHID` | 微信支付商户平台 | https://pay.weixin.qq.com |
| `WECHAT_API_V3_KEY` | 商户平台 → API 安全 → APIv3 密钥 | https://pay.weixin.qq.com/index.php/account/api |
| `WECHAT_PRIVATE_KEY` | 商户平台 → API 证书 → 下载 | 同上 |
| `WECHAT_SERIAL_NO` | 证书下载后从文件名获取 | 同上 |
| `ALIPAY_APPID` | 支付宝开放平台 | https://open.alipay.com/develop/manage |
| `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY` | 同上 → 密钥管理 | 同上 |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Dashboard → Webhooks → endpoint signing secret | https://dashboard.stripe.com/webhooks |
| `STRIPE_PUBLISHABLE_KEY` | 同 secret key 页面 | 同上 |
| `MINIMAX_API_KEY` | MiniMax 控制台 → API Keys | https://api.minimaxi.com |
| `SENTRY_DSN` | Sentry Project Settings → Client Keys | https://sentry.io/settings/<org>/projects/<proj>/keys/ |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | https://resend.com/api-keys |

---

## 5. 安全管理 (Security Practices)

### 5.1 强制规则

- **永不入库**：所有 `*_KEY` / `*_SECRET` / `*_TOKEN` / `*_PRIVATE_KEY` 永不入 git
- **永不出前端**：除 `NEXT_PUBLIC_*` 外，所有 vars **仅** 在 server 端 (`route.ts` / `lib/*.ts`) 读取
- **永不打日志**：`console.log` **不可** 打印任何 env var 值（包括部分 mask）
- **季度轮转**：所有 secrets **90 天** 强制轮转（在 Vercel Dashboard 操作）

### 5.2 密钥轮转 SOP

1. 在服务商 Dashboard 生成新 key
2. 在 Vercel Dashboard 更新 env var（**先 Preview 环境验证**）
3. 部署 Preview → 跑 smoke test
4. 验证通过后 → 部署 Production
5. 在服务商 Dashboard **撤销旧 key**
6. 更新 1Password / 团队密码管理器
7. 在 `docs/REVIEW.md` 风险登记表标注 `Rotated YYYY-MM-DD`

### 5.3 紧急轮转 (Suspected Leak)

1. **立即**在服务商 Dashboard 撤销被泄露 key
2. 同步在 Vercel 替换为新 key
3. 触发 Vercel 重新部署（自动）
4. 检查 `Sentry` / Vercel Logs 是否有滥用迹象
5. 通知 Master Agent + 法务 (如涉及支付)

---

## 6. 验证清单 (Verification)

部署完成后，从运维笔记本执行：

```bash
# 1. 大陆域 — ICP 备案号可点击
curl -s https://aiwill-planner.cn | grep -c "沪ICP备2026020925号-1"   # ≥1
curl -s https://aiwill-planner.cn | grep -c "beian.miit.gov.cn"      # ≥1

# 2. Vercel 域 — Footer 全站覆盖
for path in / /questionnaire /result /payment /orders; do
  count=$(curl -s "https://aiwill-planner.vercel.app${path}" | grep -c "beian.miit.gov.cn")
  echo "${path} → beian link count: ${count}"
done

# 3. Supabase 连接
curl -sI "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" | head -1

# 4. LLM 端点 (需服务端调用，client 不可直接测)
# 跳过 — 已在 generate-will API smoke test 覆盖
```

---

## 7. 附录 · 命名一致性修复 (P1)

代码中 `WECHAT_API_KEY` 与 ARCH/PRD 中的 `WECHAT_API_V3_KEY` 命名不一致：

| 来源 | 名称 | 备注 |
|------|------|------|
| `src/lib/config.ts:14` | `WECHAT_API_KEY` | 旧命名 |
| `docs/ARCHITECTURE.md` §7.3 | `WECHAT_API_V3_KEY` | ARCH 推荐 |
| `docs/REVIEW.md` §11.2 #15 | `WECHAT_API_V3_KEY` | Reviewer 建议统一 |

**Day 0 过渡方案**：在 Vercel 同时设置 `WECHAT_API_KEY` 和 `WECHAT_API_V3_KEY`（值相同）。**P1 清理**：`src/lib/config.ts:14` 改名为 `WECHAT_API_V3_KEY`，删除 fallback。

---

**目录结束 · Version 1.0 · 2026-06-02 · 编制者：DevOps / SRE Agent**
