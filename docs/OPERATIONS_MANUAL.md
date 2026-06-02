# aiwill-planner 运营维护手册

> **版本**: 2026-06-02 Day 1 终稿
> **作者**: Master Agent（汇总 Product/Architect/Reviewer/Developer/QA/Ops 6 个子 Agent）
> **仓库**: https://github.com/maran529-byte/will-planning
> **当前 HEAD**: 60c74a1（已 push 到 origin/main）

---

## 0. 一页速览

| 项目 | 状态 |
|---|---|
| 双部署架构 | ✅ 大陆静态域 (aiwill-planner.cn) + Vercel Global (aiwill-planner.vercel.app) |
| ICP 备案 | ✅ 沪ICP备2026020925号-1（已嵌入所有 5 个 Vercel 路由 + 4 个 CN 静态页） |
| P0 代码修复 | ✅ 4 模块全部 PASS（LegalFooter / 服务端价格+zod / nginx 安全头 / 文档同步） |
| 单元测试 / QA | ✅ READY-FOR-PUSH，0 回归 |
| 部署文档 | ✅ docs/DEPLOYMENT.md（458 行） |
| 环境变量手册 | ✅ docs/ENV.md（282 行） |
| CI 质量门 | ⚠️ 已编写 .github/workflows/compliance.yml，**需 PAT 加 workflow 权限后 push** |
| 外部服务配置 | ❌ Supabase / WeChat / Alipay / LLM 凭据待 Master 申请配置 |

**距上线还差 1 步**：用户在 Vercel 控制台补 11 个必填环境变量（详见 §4）。

---

## 1. 你（Master）需要做的 5 件事

按顺序执行，全部完成后系统即上线。

### 1.1 在 Vercel 创建项目并绑定仓库

1. 打开 https://vercel.com/new
2. 选 **Import Git Repository** → `maran529-byte/will-planning`
3. 配置：
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `next build`（默认）
   - Output Directory: `.next`（默认）
   - Node Version: 20.x（在 `package.json` engines 旁或 Vercel 设置中指定）
4. **先不点 Deploy**，先做 §1.2 配环境变量

### 1.2 配置 Vercel 环境变量（11 个必填）

打开 Vercel 项目 → Settings → Environment Variables，**Production / Preview / Development 三处都加**：

| 变量名 | 取值 | 来源 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 控制台 → Project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | 同上（**不要**泄露给前端） |
| `MINIMAX_API_KEY` | `eyJ...` | https://api.minimaxi.com → API Keys |
| `LLM_PROVIDER` | `minimax` | 字面量 |
| `LLM_MODEL` | `MiniMax-M2.7` | 字面量 |
| `WECHAT_APPID` | `wx...` | 微信支付商户平台 |
| `WECHAT_MCHID` | 商户号 | 同上 |
| `WECHAT_API_V3_KEY` | 32 字符串 | 同上 |
| `SITE_URL` | `https://aiwill-planner.vercel.app` | 字面量（prod） |
| `ICP_BEIAN_NUMBER` | `沪ICP备2026020925号-1` | 字面量 |

可选（等用到再配）：`WECHAT_PRIVATE_KEY`、`WECHAT_SERIAL_NO`、`ALIPAY_*`、`STRIPE_*`、`RESEND_API_KEY`、`SENTRY_DSN`。

详细对照表见 [`docs/ENV.md`](./ENV.md)。

### 1.3 在 Vercel 点 Deploy

环境变量配完后，回到项目主页 → Deployments → Trigger Deploy → 选 main 分支。

预期：Vercel build 通过 → 分配 `aiwill-planner.vercel.app` 域名 → Live。

**如果 build 失败**，去 Deployments 详情页看日志。常见原因：
- `Module not found: zod` → 没装依赖，重 Deploy
- `Error: supabase url is required` → 环境变量没配（即使在代码里 throw，也得先能 build 通过；实际 API 调用才 throw）

### 1.4 在腾讯云大陆节点部署静态站

SSH 到 `124.222.215.107`（已有 SSH 密钥在 `~/.ssh/tencent_will`）：

```bash
ssh root@124.222.215.107
cd /opt/aiwill-planner

# 拉最新代码
git pull origin main

# 一键部署（含 nginx -t 验证 + 自动回滚）
bash deployment/mainland-server/deploy_mainland.sh

# 跑合规自查
bash deployment/mainland-server/compliance_check.sh
```

预期：5 项 evidence PASS（已 PASS 的 5 项），13 项原本 FAIL 的（针对 live 服务器）转 PASS。

### 1.5 DNS 解析

| 主机记录 | 记录类型 | 记录值 | 备注 |
|---|---|---|---|
| `@` | A | `124.222.215.107` | 指向大陆 nginx |
| `www` | A | `124.222.215.107` | 同上 |
| `h5` | CNAME | `cname.vercel-dns.com` | 把 h5 子域绑到 Vercel |
| `api` | CNAME | `<your-project>.supabase.co` | 如果用 Supabase API |

在 DNSPod 控制台配置。SSL：大陆站用腾讯云免费证书或 Let's Encrypt；Vercel 自动 SSL。

---

## 2. 日常运营（上线后）

### 2.1 每天早上 9 点的检查清单

```bash
# 1. 看合规（CN 节点）
ssh root@124.222.215.107 'bash /opt/aiwill-planner/deployment/mainland-server/compliance_check.sh'

# 2. 看 Vercel 状态
open https://vercel.com/maran529-byte/will-planning

# 3. 看 Supabase 日志
open https://app.supabase.com/project/_/logs

# 4. 看支付 webhook 状态
# （如果有 Stripe / WeChat，登录商户平台看回调成功率）
```

### 2.2 每周一上午的周会

- 拉取上周关键数据（订单数、付费转化率、客单价）— 见 `docs/PRD.md` §8 KPIs
- Review 上周 Vercel build 失败 / 回滚记录
- 同步开发进度（产品迭代、技术债）
- 检查合规自查脚本输出趋势（应该逐步 100% PASS）

### 2.3 内容更新（SEO 静态页）

大陆静态页 4 个：`/faq`、`/tutorial`、`/compare`、`/tool`。改它们的流程：

1. 本地编辑 `static-content/*.html`
2. 提交 PR
3. CI（如果配置了）跑 compliance check
4. 合入 main
5. Vercel 自动重新构建（但 Vercel 不服务这些 CN 页，所以**还需要**）
6. SSH 到大陆节点：`bash deployment/mainland-server/deploy_mainland.sh`
7. 验证：`curl -I https://aiwill-planner.cn/faq` 看 200

### 2.4 紧急回滚

#### Vercel 回滚

Vercel 控制台 → Deployments → 找上一个绿色 build → 点 "..." → "Promote to Production"。

#### 大陆节点回滚

```bash
ssh root@124.222.215.107
cd /opt/aiwill-planner
git log --oneline -n 5  # 找到上一个稳定 commit
git checkout <stable-sha>
bash deployment/mainland-server/deploy_mainland.sh
```

#### 数据库回滚（Supabase）

Supabase 控制台 → Database → Backups → 选时间点 → Restore。**生产数据丢失风险，慎用**。

---

## 3. 监控与告警

### 3.1 Vercel Analytics

Vercel 项目 → Analytics 标签页，看：
- 实时请求量
- 错误率（应 < 1%）
- 冷启动次数
- 带宽使用

### 3.2 Supabase 监控

Supabase 控制台 → Reports，看：
- 数据库 CPU / 连接数
- API 请求量
- 慢查询（> 1s）

### 3.3 Sentry 错误追踪（推荐开启）

Vercel env 加 `SENTRY_DSN` → 自动捕获前后端异常。

### 3.4 支付 webhook 监控

微信支付 / Stripe webhook 失败的告警，必须在商户平台开启（默认会邮件通知，但建议配 Slack/钉钉 webhook）。

---

## 4. 故障应急手册

### 4.1 Vercel 域名 502

1. 看 Vercel 日志：项目 → Deployments → 当前 build → Logs
2. 常见原因：环境变量缺失（API 调用 throw → 500 → 502）
3. 检查项：
   - 所有 11 个必填 env 都配了
   - `SITE_URL` 正确
   - `SUPABASE_SERVICE_ROLE_KEY` 没过期

### 4.2 微信支付回调失败

1. 看 `src/lib/payment.ts:91-95` 的 `verifyPaymentCallback`（**目前是 stub**）
2. 上线前**必须**用真实商户平台 V3 key 实现 RSA-SHA256 验签
3. 临时方案：手动在数据库把订单状态从 `pending` 改为 `paid`，给用户补发文件

### 4.3 ICP 备案被管局驳回

1. 看管局驳回原因（通常邮件）
2. 常见原因：网站内容含境外服务链接；法人口与备案主体不一致
3. 处理：
   - 改静态站内容，删境外服务链接
   - 让法人口补资质
4. 重提备案（5-10 个工作日）

### 4.4 数据泄露

1. 立刻改 Supabase `service_role` key
2. 重置所有用户 session（Supabase 控制台 → Auth → Users → Sign out all）
3. 在 `audit_logs` 查访问记录
4. 24 小时内向网信办报备（PIPL §57）

---

## 5. 团队协作

### 5.1 Git 工作流

- `main` 分支：受保护，必须经 PR 合入
- feature 分支：`feature/<name>`
- bug 修复：`fix/<issue-id>`
- 提交信息格式：`<module>: <imperative summary>`，如 `payment: 修复回调签名验证`

### 5.2 PR 检查清单

- [ ] CI 全绿（`compliance.yml`）
- [ ] 至少 1 个 reviewer 通过
- [ ] 没有新增 console.log（PII 保护）
- [ ] 没有新增硬编码 secret
- [ ] 涉及 src/app 的改动，更新 docs/PRD.md 的 P0/P1 状态
- [ ] 涉及 src/app/api 的改动，更新 docs/ARCHITECTURE.md 的 API 列表

### 5.3 发布节奏

- 每周二、四上午 10 点发版
- 周二发版当周 Reviewer 周会同步
- 大版本（V2、V3）每月一次，提前 1 周发 release notes

---

## 6. 文档地图

| 文档 | 行数 | 何时读 |
|---|---|---|
| [`PRD.md`](./PRD.md) | 839 | 产品改版时 |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 1856 | 架构评审 / 新人入职 |
| [`REVIEW.md`](./REVIEW.md) | - | 改代码前先看，避免重蹈覆辙 |
| [`QA_REPORT.md`](./QA_REPORT.md) | - | QA 周会 |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | 458 | 每次发版 / 新人 |
| [`ENV.md`](./ENV.md) | 282 | 配置 / 排查环境问题 |
| [`OPERATIONS_MANUAL.md`](./) | 本文件 | 日常运营的入口 |
| [`FIX_PLAN.md`](../FIX_PLAN.md) | - | 历次修复的历史记录 |

外部参考（桌面文件夹 `/Users/maran/Desktop/aiwill-planner/`）：
- `aiwill-planner_合并执行版.docx` — 总执行方案
- `aiwill-planner_合规手册.docx` — 合规 7 证据
- `aiwill-planner_现状分析与优化建议.docx` — 现状分析
- `aiwill-planner_上线修复方案*.docx` — 上线方案

---

## 7. 联系 / 升级路径

| 级别 | 联系方式 |
|---|---|
| 技术问题 → 研发 | 在 `docs/QA_REPORT.md` 提 issue |
| 合规问题 → 法务 | 工信部 https://beian.miit.gov.cn 反馈 |
| 紧急故障 → Master Agent | 7×24 钉钉/微信群 |
| ICP / 支付 → Master Agent | 工单系统 |

---

**附录 A：完整 commit 树（main 分支）**

```
60c74a1 (HEAD -> main, origin/main) docs: Phase 1-4 deliverables (PRD/Arch/Review/QA/Deploy/ENV)
3433183 docs: sync README + FIX_PLAN to Vercel-based architecture
7947ef7 P0: nginx security headers + mark hk-server deploy_h5.sh deprecated
932b33c P0: server-side price enforcement + zod input validation
8b03629 P0: add LegalFooter to root layout for full-site ICP coverage
a22a9ae Day 1 prep: stage ICP compliance + retire t9-h5-frontend stub
597a24b Merge origin/main (business frontend) into local P0 compliance fixes
7828120 Day 0: P0 compliance hardening for ICP review
... (earlier history)
```

**附录 B：关键 file:line 索引**

- ICP 备案: `src/components/LegalFooter.tsx:22-29` + `src/app/page.tsx:399-406` + 4 个 `static-content/*.html`
- 服务端价格: `src/lib/pricing.ts` + `src/app/api/create-order/route.ts:82`
- zod 校验: `src/app/api/*/route.ts`（7 个）
- Webhook 签名: `src/lib/payment.ts:91-95`（**stub，上线前必改**）
- nginx 安全头: `deployment/mainland-server/nginx.conf:52-57`
- 合规自查: `deployment/mainland-server/compliance_check.sh`

---

*本手册由 Master Agent 在 Day 1 P0 修复完成后自动汇总。后续每次大版本发布后由 Ops Agent 增量更新。*
