# aiwill-planner · Code & Architecture Review (REVIEW)

> 项目：家有所爱 · AI 人生规划平台 (aiwill-planner)
> 文档版本：v1.0
> 编制日期：2026-06-02
> 编制者：Code & Architecture Reviewer
> 评审基线：commit `a22a9ae`（t9-h5-frontend 已移除，HK 43.129.207.154 退役中）
> 评审范围：`src/app/*`、`src/components/*`、`src/lib/*`、`supabase-schema.sql`、`deployment/mainland-server/*`、`t1-t10/*`、`.github/workflows/*`、`package.json`、`next.config.ts`、`tsconfig.json`、以及 peer outputs (`docs/PRD.md`、`docs/ARCHITECTURE.md`)
> 母文档：`/Users/maran/Desktop/aiwill-planner/aiwill-planner_合规手册.docx`（v1.0, 7 项证据清单）

---

## 1. 执行摘要 (Executive Summary)

**整体风险等级：HIGH**（综合考虑：合规底线 + 上线死线 + 商业链路未打通）。

- **5 大红线问题**（P0，不修不能上线）：
  1. **Supabase 凭证完全缺失** — `src/lib/config.ts:24-46` 直接抛错，所有数据 API 100% 失败，订单、支付、用户全部不可用。
  2. **支付链路是 demo，未接真实商户号** — `src/lib/payment.ts:8-87` 用 `setTimeout` 模拟回调，没有任何真实 `wechat-pay` / `alipay` SDK；PRD §6.5 承诺的"7×24 上线"无法达成。
  3. **微信支付 V3 Webhook 端点不存在** — PRD/ARCH §5.6 把 `/api/v1/webhook/wechat` 列为 P0，但 `src/app/api/` 下完全没有该目录；当前 `payment/callback` 接受未签名 JSON 即可置订单 paid，等同于"任何人拿 `order_id` 都可改订单状态"。
  4. **问卷敏感字段无任何校验** — `src/app/questionnaire/page.tsx:80-112` 将 `name/id_card/phone` 等个人信息直接放进 `JSON.stringify` 表单，客户端可任意修改；后端 `src/app/api/generate-will/route.ts:11-37` 不做格式校验，存在身份证号合规风险（PIPL 最小必要原则违反）。
  5. **Web 域没有 LegalFooter** — `src/app/layout.tsx:6-28` 没有任何 `LegalFooter` 引用（虽然 `src/components/LegalFooter.tsx` 存在）；ICP 备案号**不会**出现在 Vercel 域（`aiwill-planner.vercel.app`）的任何页面。

- **5 大快速胜利**（P0-P1，几小时内可修）：
  1. 在 `src/app/layout.tsx:24` 之前加 `<LegalFooter />` 渲染（10 分钟）。
  2. 抽出 `PRICING_PLAN` 常量到 `src/lib/`，3 个硬编码 `{ amount: 1990, plan: 'ai' }` (`create-order/route.ts:14`, `payment/route.ts:13`, `result/page.tsx:55`) 全部对齐（1 小时）。
  3. `src/app/api/generate-will/route.ts:15-37` 加 zod schema 校验，return 400 (30 分钟)。
  4. `src/lib/orders.ts:50-58` `getOrdersServer` 用 `?.maybeSingle()` 替代 `.single()`，避免 PGRST116 异常把整个订单列表拉黑 (5 分钟)。
  5. `deployment/mainland-server/nginx.conf` 补 `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy` 三个安全头 (15 分钟)。

- **核心建议（top 3）**：
  - 推迟上线：**不要**在 Supabase/Wepay Webhook/真实支付接入完成前 Vercel prod deploy。
  - Vercel 域也要挂 ICP Footer，PRD 把它和 CN 域割裂是误判（Vercel 域实际承担 SaaS 入口，是用户第一接触点）。
  - `t1-t10` Go 微服务**强烈建议退役**（Q1 决策已经倾向）；保留只会拖 Day 90 后的清理工作，ARCH §12 Q1 已经识别此问题。

- **整体判断**：
  - 当前代码是**功能骨架完成 + 关键链路完全空**的状态；
  - 商业可上线必须先做 **Phase 0（Supabase 真实接入） + Phase 1（支付 Webhook + 微信 V3 接入）**；
  - 在 P0 全部 PASS 前，**VERDICT = FIX-THEN-SHIP**（再做 1 轮 Developer Agent 迭代后再上 prod）。

---

## 2. 代码评审 — `src/app/page.tsx`

文件：`/Users/maran/aiwill-planner/src/app/page.tsx`（263 行，6 个文档类型、3 个定价档位的 Landing）

### 2.1 质量与结构

- **优点**：
  - 组件化清晰，`PricingCard` / `DocumentCard` 抽出内联渲染，便于将来抽取到 `src/components/`。
  - 使用 `useState` 做 demo 数据（`LandingPage` 第 3 行），方便未来替换为真实 CMS 拉取。
  - 颜色/排版用 `tailwind` class 写出，简洁。

- **问题**：
  1. **状态管理反模式**（`page.tsx:3`）：`useState` 在 `LandingPage` 组件挂载时立即 `setGeneratedText("...")`，会导致每次 SSR hydration 失败 / 闪烁。**建议**：要么用 `useEffect` 设置，要么改成 `const` 默认值。
  2. **客户端逻辑泄漏**（`page.tsx:3-5`）：Landing page 是纯展示页，不需要 `useState` + `'use client'`。**建议**：去掉 `'use client'` 让 SSR 渲染。
  3. **`window.location.href` 跳转**（多处 `onClick` handler）：应改用 `<Link href="...">` 以便 a11y 键盘导航、预取、右键复制链接。
  4. **CTA 按钮 href 仍指向相对路径**（如 `questionnaire?type=will`）：未显式区分"大陆入口"与"Vercel 入口"。**建议**：明确显示 `https://aiwill-planner.vercel.app/questionnaire?type=will`（满足 PRD §4.2.1 表格），便于网信自查（证据 6）。

### 2.2 a11y (Accessibility)

- **L1** 缺少 `aria-label` 的纯图标按钮：未发现（当前未用图标）。
- **L2** 颜色对比度未审计：`text-gray-400` / `bg-gray-50` 在某些组合下 < 4.5:1，WCAG AA 不通过。**建议**：用 [axe DevTools](https://www.deque.com/axe/devtools/) 跑一遍。
- **L3** 缺 `lang` 属性：`<html lang="zh-CN">` 未在 review 范围内（layout.tsx 也没看到），需要补。
- **L4** 缺 `<main>` / `<nav>` 语义化标签：`<div>` 满天飞。

### 2.3 i18n (国际化)

- **当前**：纯中文硬编码，无 i18n 抽象。
- **问题**：PRD §7.3 P2-11 要求"多语言 (i18n) / 繁体 / 英文"，但代码层面没有任何 `next-intl` 或 `react-i18next` 依赖。
- **P0 建议**（如不打算 Day 0 上多语言）：把文案抽到 `src/lib/zh-CN.ts` 常量文件，便于将来 i18n。
- **P1 建议**：接入 `next-intl` 抽象。

### 2.4 ICP 合规

- **关键问题**：`src/app/page.tsx` **没有任何 ICP 备案号、免责声明、Footer**。
- 原因：`src/app/layout.tsx:6-28` 是占位 layout，没渲染 `<LegalFooter />`（虽然组件已存在）。
- **影响**：Vercel 域每个页面（`/`、`/questionnaire`、`/result`、`/payment`、`/orders`）都缺失备案号，违反《非经营性互联网信息服务备案管理办法》第 13 条："应当在网站首页底端标明备案编号"。
- **P0 修复**：在 `src/app/layout.tsx` 的 `<body>` 末尾加 `<LegalFooter />`（5 分钟）。

### 2.5 性能

- 无代码分割（无 `dynamic` import），3 文档类型 + 3 定价 + FAQ 都是同步渲染，首屏约 20KB JS，可接受。
- 无图片优化（无 `<Image>`），未来加图时要改 `next/image`。

---

## 3. 代码评审 — `src/app/{questionnaire,orders,payment,result}/`

### 3.1 `src/app/questionnaire/page.tsx`（229 行）

- **状态管理**（`page.tsx:22-28`）：`useState` 7 模块 25 题的状态以**展平对象**保存，setter 频繁触发全量重渲染。**P2 建议**：用 `useReducer` 或 `zustand`。
- **校验**：**缺失**。
  - `name` (line 81) 必填但无长度限制，可传 `''` 提交。
  - `id_card` (line 90) 18 位身份证号无正则校验，可传任意字符串。
  - `phone` (line 86) 11 位手机号无正则校验。
  - `age` (line 84) `number` 类型无范围（理论上可填 999）。
  - 整本问卷无 zod / yup 校验库，**不符合 PIPL 最小必要**（身份证号是否必填？手机号是否必填？需法务确认；当前设计对大陆用户强收 PII）。
- **错误处理**：catch 块 (`page.tsx:206-208`) 只 `console.error`，UI 不显示任何错误，用户提交失败无感知。
- **loading 态**：`useState` 有 `submitting` 标志 (`page.tsx:23`) 但 button 渲染 (line 198) 用了 `disabled={submitting}` 但 text 仍显示"下一步"而非"提交中..."。
- **mobile 响应式**：用了 `md:grid-cols-2` 等响应式 class，移动端可用。
- **可访问性**：step 进度 (`page.tsx:175-180`) 没有 `aria-valuenow` / `role="progressbar"`。
- **PII 风险**：PII 直接以明文 form-data 提交，需确认是否走 HTTPS（Vercel 默认 TLS 1.3 ✅）+ 是否日志脱敏（**当前后端 `console.log` 会打印完整 body**，`generate-will/route.ts:24` 是个坑）。

### 3.2 `src/app/orders/page.tsx`（264 行）

- **状态**：`useState` 直接拿 API 数据 + polling；30s 间隔 (`page.tsx:32`) 用 `setInterval` 但 unmount 时没清理 → 内存泄漏。
- **验证**：仅展示页面，无表单，可接受。
- **错误**：`setError` (`page.tsx:33`) 设置后无 retry 按钮。
- **loading**：首次加载无 skeleton。
- **mobile**：表格在 mobile 横向溢出，应改卡片式（PRD §8.1 强调 mobile-first）。
- **关键 UX**：未支付订单的"继续支付"按钮 href (`page.tsx:127`) 写到 `/orders` 自身（`href: '#'` 或当前页），死链。
- **轮询幂等**：30s 轮询是 fire-and-forget，并发请求未去重（用户停留 60s 会发 2 个 GET）。

### 3.3 `src/app/payment/page.tsx`（352 行）

- **状态**：复杂（订单 + 支付通道 + 轮询 + 模态），应抽 `useReducer`。
- **QR Code**：`page.tsx:6-13` 注释"Currently displays demo QR"，无真实 `qrcode.react` 库调用；**P0 必修**。
- **错误处理**：`page.tsx:71` 的 catch 弹"网络错误"但隐藏真实错误。
- **loading**：button 上有 `disabled={loading}` 标志 (`page.tsx:222`) ✅，但支付通道切换无 loading 态。
- **mobile**：QR Code 在 mobile 显示要居中且可缩放，目前 `<div className="w-64 h-64">` 是固定像素，移动端 ok 但平板过大。
- **关键合规**：
  - PRD §6.1 要求"AI 草稿不具备法律效力"在支付页强提示 → **未实现**。
  - 支付页无退款政策链接 → 违反微信支付商户接入规范 §3.2。
- **轮询**：与 orders 页同样问题。

### 3.4 `src/app/result/page.tsx`（389 行）

- **状态**：草稿内容 + 套餐选择 + 下载 + 邮件发送。
- **数据获取**：`useEffect` 依赖 `searchParams.get('id')` (`page.tsx:24-39`)，可接受但 SSR 数据预取更好。
- **套餐价格硬编码**（`page.tsx:55-61`）：与 `lib/config.ts` 的 `PRICING` 重复定义。
- **下载 PDF / Word**：`page.tsx:73-89` 是 mock，无真实 Supabase Storage 签名 URL 生成。
- **错误**：API 失败无 fallback，loading 卡死。
- **mobile**：长文 AI 输出 (line 175-203) 在 mobile 无折叠，"返回顶部"按钮缺失。
- **关键合规**：
  - **水印缺失**：`will_content` 渲染时未叠加"AI 草稿 / 不具备法律效力"水印。PRD §6.1 + ARCH §9.1 都明确要求。
  - **免责声明缺失**：成功页无"使用本平台即同意《服务条款》"提示。

---

## 4. 代码评审 — `src/app/api/*`

### 4.1 `src/app/api/generate-will/route.ts`（100 行）

- **输入验证**：**缺失**。
  - `request.json()` (line 12) 直接 `await` 不 catch。
  - body 任意字段均接受，无 zod schema 校验。
  - **P0 必修**：加 zod schema，必填字段 missing → 400。
- **LLM 调用**（`route.ts:43-67`）：
  - `fetch` 调 `https://api.aiwill-planner.cn/v1/...`（line 47）—— **这个域名在 ARCH §1.1 部署拓扑里是 HK 备用节点**，但代码用 `https://` 配裸域可能违反合规证据 1（"大陆 0 AI"）。
  - 实际上 Vercel Edge Function 调境外 LLM 是允许的（因为 Vercel Edge 在境外），但域名配置需复核。
  - **关键**：`config.ts:32` 注释 `baseUrl: "https://api.aiwill-planner.cn/v1"`，而 ARCH §1.1 部署图写的是 Vercel Edge → MiniMax 国际 endpoint。**两者不一致**。
- **错误格式**：line 70-72 `return NextResponse.json({ error: ... }, { status: 500 })` 不规范，缺 `code` 字段（ARCH §5.7 错误码规范定义 `INTERNAL_ERROR`）。
- **Auth**：无（demo 模式可接受，但 PRD §4.2.6 标 ✅ 已有，预期应该有 auth）。
- **Rate limit**：无（ARCH §9.2 提到 login 5/min, generate 3/min，未实现）。
- **日志**：`console.log("Generate will request:", ...)` (line 24) **会打印 PII**（姓名、身份证、手机号），违反 PIPL §51 个人信息处理者义务。
- **fallback**：`generateDefaultWill` (line 78) 模板硬编码，质量低，应放到 `src/lib/templates/` 抽离。
- **DB 写入**：`saveWill` 调用 `supabase.from('wills').insert(...)` (line 38) **完全被 `try-catch` 吞掉** (line 39-41)，实际可能写库失败但接口仍返回 `{ id, success: true }`，**对账将失真**。

### 4.2 `src/app/api/create-order/route.ts`（145 行）

- **输入验证**：`amount: 1990, plan: 'ai'` (line 14) **客户端硬编码金额** → 严重安全漏洞。
  - 攻击者 POST `{ amount: 1, plan: 'ai' }` 即可以 0.01 元买到 ¥19.9 套餐。
  - **P0 必修**：从 `src/lib/config.ts:PRICING` 查 server-side 价格，忽略 client `amount`。
- **金额单位**：用 `分` 1990 = ¥19.9 ✅（PRD §7.1 一致），但 schema 缺 CHECK 约束（`amount > 0` 缺失）。
- **order_no 生成**：`ORD${Date.now()}${Math.random().toString(36).slice(2, 6)}` (line 35) 有微小碰撞概率（10^4 组合 + ms 精度），建议 uuid v4。
- **错误格式**：line 64-70、106-108 错误响应缺 `code` 字段。
- **list 端点** (line 117-145)：`userId` 永远返回 `mock-user-id`，所有用户的订单混在一起（演示模式可接受，但与 schema RLS 冲突）。

### 4.3 `src/app/api/payment/route.ts`（92 行）

- **支付通道**：仅 'wechat' / 'alipay' / 'demo' 三选一，全部走 demo fallback (line 48-55)。
- **真实集成**：**完全缺失**。PRD §7.2 P1-1 微信支付 V3 真实接入未实现。
- **QR Code URL**：line 80-85 返回 `weixin://wxpay/bizpayurl?pr=xxxxx` 是 mock URL（string），前端 `payment/page.tsx:6-13` 注释承认。
- **错误格式**：line 59-65 错误响应不规范。

### 4.4 `src/app/api/payment/callback/route.ts`（96 行）

- **签名验证**：**完全缺失**。
  - line 17 `request.json()` 接受任意 body。
  - line 34-46 直接更新订单为 `paid`，无任何签名/HMAC/RSA 校验。
  - 攻击者 POST `{ order_id: "xxx", status: "paid" }` 即可绕过支付 → **白送 P0 漏洞**。
- **微信 V3**：缺 RSA 验签 (`Wechatpay-Signature` header 校验) + AES-256-GCM `resource` 解密 (ARCH §7.3)。
- **支付宝**：缺 RSA2 `sign` 校验。
- **Stripe**：缺 `Stripe-Signature` HMAC 校验。
- **幂等性**：line 34 重复回调会重复写库（缺 `payments.channel_transaction_id` UNIQUE 检查，ARCH §4.2 payments 表设计里有但 schema 未应用）。
- **金额校验**：line 39 没校验回调金额 vs 订单金额是否一致 → 攻击者可支付 ¥0.01 改 ¥19.9 订单。
- **审计**：无 audit_log 写入（PIPL §51 要求可追溯）。

### 4.5 `src/app/api/payment/status/route.ts`（72 行）

- `userId` 参数 (line 23) 客户端可控，**可查任意订单的支付状态**（信息泄露）。
- 缺权限校验。

### 4.6 `src/app/api/orders/[orderId]/route.ts`（108 行）

- **Idempotency**：PATCH 端点 (line 60-100) 任意用户可改任意订单状态，缺 owner 校验。
- **金额再校验**：line 80 update 时无 amount check。
- **错误格式**：line 67、87、95 错误响应缺 `code`。

### 4.7 `src/app/api/book-lawyer/route.ts`（119 行）

- **输入验证**：line 20-28 接受任意 phone、preferTime、notes，无格式校验。
- **隐私**：律师预约时存储 `phone: preferTime: notes:`，**明文存到 Supabase**（schema `appointments.notes TEXT`）。
- **预约时间校验**：line 56-62 检查时间是否在未来，无更细粒度（如"距现在 < 1h" 或 "营业时间外"）。
- **重复预约防刷**：无（同 user_id + lawyer_id + 时间段可重复预约）。
- **rate limit**：无。

### 4.8 共性问题（所有 API）

| 问题 | 严重度 | 涉及文件 |
|------|--------|----------|
| 无 zod/yup 验证 | P0 | 所有 POST |
| 错误响应无 `code` | P1 | 所有 |
| 无 audit_log 写入 | P1 | 所有 mutating endpoints |
| 无 rate limit | P0 | 全部 |
| 无 auth 校验 | P0 | `create-order`, `payment/callback`, `payment/status`, `orders/[id]` |
| PII 打到 console.log | P0 | `generate-will` |
| 缺 CORS 配置 | P1 | 全部（Vercel 域跨域访问） |
| 缺 `request-id` trace id | P2 | 全部 |
| SQL 注入 | ✅ 安全 | 用 Supabase client 参数化 |

---

## 5. 代码评审 — `src/lib/*`

### 5.1 `src/lib/config.ts`（64 行）

- **优点**：
  - 集中 env vars 读取 (`getServerEnv` / `getPublicEnv` 模式清晰)。
  - `PRICING` 集中定义。
- **严重问题**：
  - line 24-46 `getServerEnv()` 在**没有**相应 env vars 时直接 `throw new Error(...)`。这导致**任何**调用 `config.ts` 的 API route 启动即崩。
  - 当前 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `WECHAT_*` 全部未配置（`.env.example` 缺失 / Vercel env 未配）→ 上线即挂。
  - **P0 必修**：补 `.env.example` + Vercel env 配置 + DevOps 操作手册。
- **PII 风险**：`PRICING.plans` (line 56-61) 用 `price: 1990`，前端 `create-order/route.ts:14` 也写 `amount: 1990` 硬编码 → 价格不一致风险。
- **`MINIMAX_API_KEY` 命名**：建议改为 `LLM_API_KEY`（vendor-neutral），ARCH §1.1 已用 "MiniMax M2.7" 但 §2.3 又说"多供应商"。

### 5.2 `src/lib/orders.ts`（85 行）

- `inMemoryOrders` 模式（line 3-7）：Vercel 多实例部署下**数据不一致**（每个 Lambda 实例独立内存）。
- `getOrdersServer` (line 50-58) 用 `.single()` 替代 `.maybeSingle()`，缺数据时抛 PGRST116。
- **`userId` 硬编码 `mock-user-id`**：与 schema RLS 冲突。
- 错误信息泄露内部细节 (line 56 `error.message`)。

### 5.3 `src/lib/payment.ts`（87 行）

- `simulatePaymentSuccess` (line 32-40) 是 mock，line 35 `await new Promise(resolve => setTimeout(resolve, 1000))` 模拟 1s 延迟。
- 真实微信/支付宝 SDK 完全未集成。
- 支付凭证存储用 `localStorage` (line 67-71) **客户端**，可任意篡改。

### 5.4 `src/lib/questionnaire.ts`（80 行）

- 7 模块 25 题的元数据配置：`MODULES` 数组（line 10-71）。
- **问题**：
  - `id_card` / `phone` 无 validation 字段（如 `validation: { pattern: '/^1[3-9]\d{9}$/' }`）。
  - `plan` 选项 ('ai' / 'lawyer' / 'family') 与 schema `plan CHECK` 一致 ✅。
- **可维护性**：每个问题 ID 字符串硬编码，schema 改动需双修。
- **i18n**：文案硬编码中文。

### 5.5 `src/lib/supabase.ts` & `supabase-server.ts`（45 行 + 50 行）

- `supabase.ts`（客户端）：用 anon key，NEXT_PUBLIC_ 前缀正确。
- `supabase-server.ts`（服务端）：用 service role key，未导出客户端，✅。
- **严重问题**：
  - line 8 (`supabase.ts`) `createClient` 不接 `auth.persistSession`，会让 SSR + 客户端切换出问题。
  - **两者都未 import `Database` 类型**（ARCH §3 提到应有 `supabase-types.ts`），TS 推断为 `any`。
- **DB 连接未做容错**：env 缺失时 `createClient(url, key)` 即崩，未在调用前校验。

---

## 6. 合规评审 (Compliance Review)

> 参考：`/Users/maran/Desktop/aiwill-planner/aiwill-planner_合规手册.docx` §二（7 项证据）+ 表 0（网信调查表）

### 6.1 ICP 备案（沪ICP备2026020925号-1）

- **CN 静态域**（`aiwill-planner.cn` 124.222.215.107）：
  - `LegalFooter` 组件存在 ✅ (`src/components/LegalFooter.tsx:24-39`)，标准 4 行文案（备案号 + 备案链接 + 免责声明 + 联系方式）✅
  - `compliance_check.sh` 7 项证据校验脚本齐全 ✅
  - **但**：Vercel 部署脚本 (`mainland-server/deploy_mainland.sh`) 推送的是 `index.html` 静态文件，`LegalFooter` 是否**真在** `index.html` 内联（不是组件）需要核验。
- **Vercel 域**（`aiwill-planner.vercel.app`）：
  - **`src/app/layout.tsx` 未挂 `<LegalFooter />`**，每个 Vercel 页面（`/`、`/questionnaire`、`/result`、`/payment`、`/orders`）都**没有**备案号、免责声明。
  - 关键问题：Vercel 域虽然不在大陆 ICP 管辖，但**用户第一接触点**；若用户是大陆用户（且使用海外链路），从合规"主观陈述"角度，仍应在 Footer 标明"本站 AI 能力由境外服务器提供 / 不构成法律服务"（合规手册 Footer 标准内容第 2、3 行）。
  - **P0 必修**：在 `src/app/layout.tsx:24` 之前加 `<LegalFooter />`。
- **7 项证据 vs 现有实现**：

| # | 证据 | 现状 | 评估 |
|---|------|------|------|
| 1 | 大陆节点 0 AI endpoint | `nginx.conf` 全 grep 0 命中（需 on-box 验证）| ⚠️ 待自动化 |
| 2 | 大陆 nginx 0 境外反代 | `nginx.conf` 无 `proxy_pass` ✅ | ✅ 通过 |
| 3 | H5 fetch 域名仅 `api.aiwill-planner.cn` | `src/lib/config.ts:32` `baseUrl` = `https://api.aiwill-planner.cn/v1` ✅ | ✅ 但 Vercel 部署未配 `NEXT_PUBLIC_API_BASE` 环境变量 |
| 4 | 5 页面 footer 备案号 100% 覆盖 | `index.html` + 4 个 `static-content/*.html` 需手 grep | ⚠️ |
| 5 | 备案号链接到 `beian.miit.gov.cn` | `LegalFooter.tsx:25` href 正确 ✅ | ✅ |
| 6 | CTA 按钮 IP 不在大陆 ASN | Landing CTA 跳 `vercel.app` ✅ | ✅ |
| 7 | ICP 调查表与实际一致 | 法务核对（人工）| ⏳ |

### 6.2 网信调查表逐项核对（合规手册表 0）

| 问题 | 应填 | 当前实现 | 一致性 |
|------|------|----------|--------|
| 是否利用生成式 AI 向境内公众提供服务 | **否** | Vercel 域实现生成式 AI（`/api/generate-will`）| ⚠️ **风险点**：若大陆用户通过 CN 静态站跳 Vercel，仍属"境内公众使用" |
| 是否涉及新闻/出版/药品/医疗/金融等前置审批 | 否 | 婚姻/遗嘱文书模板生成，**未做前置审批** | ✅ 一致 |
| 是否提供互联网信息服务深度合成 | 否 | 仅文本生成（`willContent` 文本）| ✅ 一致（但需在 UI 强化"非深度合成"提示）|
| 是否涉及个人信息处理 | 是 | 强收身份证号 + 手机号 | ✅ 一致，但需 PIPL 隐私协议 |
| 是否建立网络安全等级保护 | 需评估 | 未提交等保备案 | ❌ **P0 必修**（PIPL + 网络安全法）|

### 6.3 AI 法规（《生成式 AI 暂行办法》+《深度合成规定》）

- **Vercel 域** `/api/generate-will` 实际承担"生成式 AI 服务"——按大陆法规，**必须**做算法备案（合规手册表 0 第 1 行才选"否"，是因为"AI 在境外"）。
- **风险点**：用户实际体验中**没有**"AI 在境外"的明确感知，UI 必须强化"AI 草稿 / 不具备法律效力"水印（PRD §6.1 / ARCH §9.1）。
- **当前 UI**：`result/page.tsx:175-203` 渲染 `willContent` 时**无水印**。
- **P0 必修**：
  1. `result/page.tsx` 顶部加红框 banner："⚠️ AI 草稿，不具备法律效力"
  2. PDF / Word 下载文件 footer 加 "AI GENERATED / NOT LEGAL ADVICE"
  3. `result/page.tsx:30-39` loading 状态文案明确"AI 生成中（境外服务器，30 秒内返回）"

### 6.4 律师 cross-region 执业合规（《律师法》）

- 当前 `book-lawyer` API (route.ts:30-65) 未做律师地域校验 —— 大陆用户预约了"无大陆执业证"的境外律师怎么办？
- 解决方案：在 `lawyers` 表加 `jurisdiction` 字段（PRD 未设计；需补充 schema migration）。

### 6.5 7 项证据项详细评审

证据 1-7 见 §6.1 表格。**主要风险**：Vercel 部署后，自动化 `compliance_check.sh` 跑在 CN 静态域，**不会**自动校验 Vercel 域，证据 3（H5 fetch 域名）需要 GitHub Action 加 step。

### 6.6 总结

- **CN 静态域合规**：基本到位，Footer 模板、nginx 收紧、compliance 脚本齐全 ✅
- **Vercel 域合规**：UI Footer、水印、免责声明**全部缺失**；网信调查表第 1 项的"否"实际上是有条件的，需要在 UI 上让用户明确感知 ⚠️
- **整体**：**P0 必修**（Vercel 域挂 Footer + 草稿水印 + 隐私协议 `/legal/privacy`），**P1 应修**（等保备案 + 律师地域校验）。

---

## 7. 安全评审 (Security Review)

### 7.1 Secrets 管理

- ✅ `config.ts:13-22` 集中 env 读取，无明文密钥硬编码（已 grep 确认）。
- ❌ **缺 `.env.example`**：仓库根目录无 `.env.example`（Bash 验证 `ls -la /Users/maran/aiwill-planner/.env*` 不存在），开发者不知道要配哪些 env vars。
- ❌ **GitHub Actions 缺 secrets 文档**：`deploy.yml` 用 `${{ secrets.VERCEL_TOKEN }}` 等 3 个 secrets，未在 README 列出。
- **P0 必修**：补 `.env.example`、更新 `README.md` 的 "Setup" 章节。

### 7.2 HTTPS / TLS

- ✅ Vercel 默认 TLS 1.3。
- ✅ CN 静态域有 `ssl/` 目录（`deployment/mainland-server/`），`deploy_mainland.sh` 未包含证书自动续签（需 certbot cron）。

### 7.3 CSRF

- 当前 Next.js App Router + Server Actions 默认带 origin 校验（`ARCH §6.4 JWT 与 Session`）。
- 自定义 API 用 Bearer header，CSRF 风险低 ✅
- **P1 建议**：在 `<form action>` 用 Server Actions 而非 fetch。

### 7.4 XSS

- React 默认转义 ✅
- `willContentHtml` 字段（schema 第 48 行）若用 `dangerouslySetInnerHTML` 渲染（`result/page.tsx:175-203` line 203 似乎用了），需用 `DOMPurify` 清洗（ARCH §9.2 提到但未实现）。

### 7.5 Webhook 幂等

- `payment/callback/route.ts` **无幂等** —— 微信可能重试 3-5 次相同回调，会写库 N 次。
- 解决方案：ARCH §4.2 设计的 `payments.channel_transaction_id` UNIQUE 已规划但 schema 未应用。

### 7.6 文件上传验证

- 当前**无文件上传端点**（文档下载是 mock 字符串），无 `Content-Type` / 大小 / 病毒扫描。
- **P1 计划**：`/api/v1/documents/{id}/download` 需要 302 → Supabase Storage signed URL（ARCH §5.2），无客户端上传。

### 7.7 安全头（`mainland-server/nginx.conf`）

- **缺失**以下安全头：
  - `X-Frame-Options: DENY`（防 clickjacking）
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer-when-downgrade`
  - `Content-Security-Policy: default-src 'self'; ...`（防 XSS）
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **P0 必修**：补 6 条标准安全头（参考 Mozilla Observatory A+ 配置）。
- Vercel 域：通过 `next.config.ts` 的 `headers()` 函数配，或 `deployment/vercel/vercel.json`（未创建）。

### 7.8 总结

- **核心安全风险**：`payment/callback` 无签名验证（可绕过支付）= **P0 致命**。
- **P0 必修清单**：
  1. Webhook 签名验证（微信 V3 RSA + AES-256-GCM、支付宝 RSA2、Stripe HMAC）
  2. Webhook 幂等（`channel_transaction_id` UNIQUE）
  3. 金额服务端校验（`create-order`）
  4. nginx 6 条安全头
- **P1 必修清单**：
  1. API rate limit
  2. `dangerouslySetInnerHTML` DOMPurify
  3. `auth.uid()` 中间件 / JWT 验证
  4. audit_log 写入
- **P2 建议**：CSP nonce、HSTS preload、Sentry 接入。

---

## 8. 架构评审 (Architecture Review)

### 8.1 Vercel + CN 双部署划分（正确性）

- **CN 静态域**（`aiwill-planner.cn` → 124.222.215.107 nginx）：
  - 5 个 HTML 页面 ✅
  - 0 proxy_pass ✅ (`nginx.conf` 已验证)
  - 0 API ✅ (无 `/api/*` location block)
  - 0 JS fetch ✅ (HTML 静态)
  - 备案号 footer ✅ (若 `index.html` 内嵌 Footer)
- **Vercel 域**（`aiwill-planner.vercel.app` → Vercel Edge）：
  - 完整 SaaS ✅ (Next.js 16.2.4)
  - 6 API routes ✅
  - Supabase + LLM + 支付 集成中
- **互操作**：浏览器跨域跳转 (CN → Vercel) ✅；无服务端跨域调用 ✅
- **架构评估**：**整体方向正确**，符合 PRD §1.6 / ARCH §1.1 设计。**唯一问题**：Vercel 域 UI Footer 缺失（§6.1 已述）。

### 8.2 `src/app/` 准备 Vercel 部署？

- ✅ `package.json:6-7` `dev` / `build` 脚本符合 Next.js 16.2.4。
- ✅ `.github/workflows/deploy.yml` 已有 Vercel Action。
- ⚠️ `next.config.ts:5` `ignoreBuildErrors: true` —— 隐藏 TS 错误，**P1 必修**：Day 0 关闭，修复所有 TS 错。
- ⚠️ `package.json:11-17` 无 `next-intl` / `zod` / `axios` / `stripe` / `wechatpay-axios-plugin`，**P0 必修**。
- ⚠️ `package.json:28` `vercel` 出现在 devDependencies，**应移到 dependencies**（虽然只是 CLI，但语义不对）。

### 8.3 Env vars 文档化

- ❌ 仓库**无 `.env.example`**。
- ❌ `README.md` 的 "Setup" / "环境变量" 章节未列。
- ✅ ARCH §附录 A 列了 21 个 env vars（PRD 也有同步），但**与代码实际引用不一致**：
  - `config.ts:32` 用 `MINIMAX_API_KEY` (arch: 同)
  - `config.ts:33-34` 用 `MINIMAX_BASE_URL` / `MINIMAX_MODEL` (arch: 同)
  - 但代码**未读** `WECHAT_*` / `ALIPAY_*` / `STRIPE_*` / `ID_CARD_ENCRYPTION_KEY` 等（payment.ts 是 demo）。
- **P0 必修**：补 `.env.example`、README Setup 章节、Day 0 配置 Vercel env。

### 8.4 Supabase RLS

- schema 启用 RLS (line 210-213) ✅
- 4 条 RLS policy (line 216-233)：
  - `wills.SELECT` 用 `current_setting('request.jwt.claims', true)::jsonb->>'phone'` ⚠️ 字段是 `phone` 而非 `user_id`，**意味着 RLS 校验 mobile phone，与 user 表的主键（UUID）脱节**。
  - `wills.INSERT` `WITH CHECK (true)` ⚠️ **任何客户端都可插入** —— 与 SELECT 严格不符（数据可写不可读的设计很奇怪）。
  - `lawyers` 仅有 admin ALL，**普通用户查不到 active 律师** —— 与 ARCH §6.3 矩阵"SELECT active (公开)"不符。
  - `appointments` SELECT 复杂，缺 INSERT policy。
- **P0 必修**：
  1. `wills` 改用 `user_id = auth.uid()` 替代 `phone`
  2. 补 `lawyers` 公开 SELECT policy
  3. 补 `appointments` INSERT policy
  4. 删 `wills.INSERT WITH CHECK (true)`，改为 `user_id = auth.uid()`

### 8.5 `t1-t10` 旧 Go 微服务

- **现状**：
  - `t1-compliance-engine/` 有 5 个 `.go` 文件 + 2 个 YAML 规则
  - `t2-api-gateway/` 6 个 `.go` 文件
  - `t4-contract-generator/` 6 个 `.go` + 3 个 YAML 规则 + 3 个 JSON 模板
  - `t5-membership/` 完整 handler / repository / service / model 分层
  - `t6-affiliate/` 同样完整
  - `t7` / `t8` / `t10` 未详查
  - `t9-h5-frontend/` **已删除源码**（只剩 `.next` 编译产物 + `node_modules` + `next-env.d.ts`）
- **评估**：
  - t1-t6 代码量**可观**（~30+ `.go` 文件），不是空 stub。
  - t1 YAML 规则（如 `prohibited-terms.yaml`）是有内容的（line 12 检测"最高法"关键词）。
  - t4 的 JSON 模板（`will.json` / `nda.json` / `service-agreement.json`）是真实业务数据。
- **ARCH §12 Q1 已经识别问题**：t1/t4 硬约束 multi-tenant DB，与 Vercel + Supabase single-tenant 矛盾。
- **建议**：
  - **P0**：Day 0 不集成 t1-t6（Vercel + Next.js API routes 完全够用）
  - **P1**：把 t4 的 JSON 模板迁到 `src/lib/templates/` （10 分钟工作量）
  - **P1**：把 t1 的 YAML 规则迁到 `src/lib/compliance-rules.ts`（TypeScript const）
  - **P2**：保留 Go 代码作为"应急回退"参考（ARCH §11.4 Rollback Plan），但 Vercel 部署**完全脱离** t1-t6
- **t9-h5-frontend/ 残留**：
  - 编译产物 `.next/` 和 `node_modules/` 应该 git rm（`fix-then-ship` 后清理）
  - `next-env.d.ts` 残留无害
  - **P1 必修**：`git rm -r t9-h5-frontend/`

### 8.6 整体架构评分

| 维度 | 评分 | 备注 |
|------|------|------|
| 双部署划分 | 9/10 | 方向正确，Vercel Footer 缺 |
| 技术栈选型 | 8/10 | Next.js 16 + Supabase + Vercel 现代合理 |
| API 设计 | 6/10 | 6 个端点够 MVP；缺 auth / rate limit / 签名验证 |
| 数据模型 | 7/10 | RLS 有但策略错；PII 字段未加密（schema 无 pgcrypto）|
| 认证 | 3/10 | 完全未实现（用 mock user_id）|
| 支付 | 2/10 | demo only；缺真实 SDK + Webhook 签名 |
| 安全 | 3/10 | 致命：Webhook 签名缺失 |
| 合规 | 7/10 | CN 域 9/10；Vercel 域 5/10 |
| t1-t10 兼容 | 5/10 | 决策已识别，建议退役 |

---

## 9. 部署评审 (Deployment Review)

### 9.1 `mainland-server/nginx.conf`（91 行）

- **优点**：
  - `proxy_pass` 全无（证据 2 ✅）
  - 5 paths 白名单（`location / { try_files }`）
  - HTTPS 强制 301 → https
  - `server_tokens off` ✅
- **缺失**：
  - **6 条安全头**（§7.7 已列）
  - 速率限制 (`limit_req_zone` + `limit_req`)
  - 客户端 body 大小限制 (`client_max_body_size 1m;`)
  - 隐藏 nginx 版本（`server_tokens` 已有 ✅）
  - 缺少 `/health` 显式 location（PRD §4.1 提到，ARCH §10.2 提到）
- **P0 必修**：补 6 条安全头 + `client_max_body_size`。
- **P1 必修**：补 `/health` 端点（200 OK）。

### 9.2 `mainland-server/compliance_check.sh`（107 行）

- **优点**：
  - 7 项证据检查齐全（line 49-103）
  - cron 友好：归档到 `/var/log/compliance/`
  - exit 0/1 明确
- **不足**：
  - **缺 GitHub Action 集成**（`/Users/maran/aiwill-planner/.github/workflows/compliance.yml` 不存在 —— ARCH §3 规划）
  - line 82-85 步骤 6 仅"打印按钮 + 手动验证"，无 ASN 自动判断（应 `curl ipinfo.io` / `whois`）
  - line 92-100 步骤 7 同样手动
- **P0 必修**：把"自动 ASN 检查"加进来（`curl -s ipinfo.io/43.129.207.154/org` 返回非大陆 ASN 即 ✅）。

### 9.3 `mainland-server/deploy_mainland.sh`（131 行）

- **优点**：
  - 6 步骤清晰（SSH 预检 / 备份 / 上传 / nginx reload / compliance / 烟囱）
  - 自动回滚 (line 88-89) ✅
- **不足**：
  - 缺 SSL 证书同步（`deployment/mainland-server/ssl/` 不存在）
  - 缺 certbot 自动续签 cron
  - **第 3 步上传静态资源**假设 `${REPO_ROOT}/index.html` 存在（`ls /Users/maran/aiwill-planner/index.html` 验证 **不存在** —— 需先创建）
  - **第 3 步上传静态资源**假设 `${REPO_ROOT}/static-content/*.html` 存在（**不存在** —— 需先创建 4 个 SEO 页）
- **P0 必修**：补 `index.html` + `static-content/{faq,tutorial,compare,tool}.html` + `LegalFooter` 内嵌。

### 9.4 `hk-server/deploy_h5.sh`（111 行）

- **定位**：HK 节点 43.129.207.154 部署脚本。
- **现状**：在 commit `a22a9ae` 标"已退役"，但**文件还在**（ARCH §3 把它归入 `deployment/hk-server/` 标记"保留作历史"）。
- **建议**：
  - **P1 必修**（不是 P0）：把 `hk-server/` 移到 `archive/` 子目录或 README 写明"deprecated after Day 90"。
  - **P1 必修**：在 `hk-server/README.md` 顶部加横幅 "DEPRECATED - Use Vercel"。
  - **不建议直接删**（ARCH §11.4 Rollback Plan 提到 Vercel 故障时切回 h5 子域）。

### 9.5 Vercel 部署（`.github/workflows/deploy.yml`）

- **优点**：
  - main 推送自动部署 ✅
  - Node 20 ✅ (Next.js 16 要求)
  - 使用 `amondnet/vercel-action@v25` ✅
- **不足**：
  - **缺 lint step**（line 18-22 跳到 `npm ci` → `npm run build`）
  - **缺 compliance check step**（ARCH §3 规划有 `compliance.yml`，但目录里**没有**）
  - **缺 smoke test step**（ARCH §10.5 提到但未实现）
  - 缺 artifact 上传（构建失败时定位困难）
- **P0 必修**：加 lint + compliance + smoke test step。
- **P0 必修**：`amondnet/vercel-action@v25` 是第三方 action，建议用 Vercel 官方 `vercel/actions/setup-node` + `vercel build --prod` 替代（更安全）。

### 9.6 总结

| 文件 | 状态 | 必修项 |
|------|------|--------|
| `nginx.conf` | 90% ✅ | 补 6 条安全头 |
| `compliance_check.sh` | 80% ✅ | 自动 ASN 检查 + GH Action |
| `deploy_mainland.sh` | 60% ⚠️ | 补 4 个 SEO HTML + 证书 + certbot |
| `deploy_h5.sh` | 50% ⚠️ | 移到 archive/ + 横幅 |
| `.github/workflows/deploy.yml` | 60% ⚠️ | 加 lint + compliance + smoke step |
| `.github/workflows/compliance.yml` | 0% ❌ | 需新建 |
| `index.html` | 0% ❌ | **需新建** |
| `static-content/{faq,tutorial,compare,tool}.html` | 0% ❌ | **需新建** |

---

## 10. 风险评估 (Top 5 Risks)

| # | 风险 | 等级 | 影响 | 概率 | 缓解 |
|---|------|------|------|------|------|
| R1 | **支付 Webhook 漏洞**（无签名验证）| **CRITICAL** | 攻击者伪造支付回调，0 元买到 ¥999 律师版 → 法务纠纷 + 损失 | 高（公开暴露）| P0 必修：Wechat V3 RSA + AES-256-GCM |
| R2 | **ICP 备案被吊销**（Vercel 域 Footer 缺失 + 网信调查表第 1 项的"否"被实锤）| **HIGH** | 主域名停止解析，1 周内流量归零 | 中（网信巡查无固定时间）| P0 必修：layout.tsx 挂 LegalFooter + 草稿水印 |
| R3 | **Supabase 凭证完全缺失**（`config.ts` throw）| **HIGH** | Vercel 部署后**所有** API 500 | 高（确定会发生）| P0 必修：补 Vercel env vars + 改 throw 为 warn + fallback |
| R4 | **Demo 支付上线**（真实用户付款 0.01 元）| **HIGH** | 商户号冻结 + 用户投诉 + 退款潮 | 中（Vercel 一上线就发生）| P0 必修：把支付 demo 替换为沙箱测试模式 + 未配 WECHAT_MCHID 时整个 `/api/payment` 路由返回 503 |
| R5 | **LLM 配额/费用**（MiniMax M2.7 不存在或涨价）| MEDIUM | AI 草稿生成失败 → 用户流程断 | 中（已识别，ARCH §Q4 决策中）| P1 必修：fallback 模板已有，但需 fallback 触发时给用户提示"已切换到标准模板" |

---

## 11. 建议 (Recommendations)

### 11.1 P0 · 必须修复（上线前 24h）

| # | 任务 | 文件 | 工作量 |
|---|------|------|--------|
| 1 | 在 `src/app/layout.tsx` 加 `<LegalFooter />` | `src/app/layout.tsx:6-28` | 10 min |
| 2 | 补 `.env.example` 列出 21 个 env vars | 新建 `/Users/maran/aiwill-planner/.env.example` | 30 min |
| 3 | README 加 "Setup" 章节 + Vercel env 配置说明 | `README.md` | 30 min |
| 4 | Supabase env 写入 Vercel Dashboard | Vercel 后台 | 15 min |
| 5 | `payment/callback/route.ts` 加签名验证（先放 stub，TODO） | `src/app/api/payment/callback/route.ts:17` | 2 h |
| 6 | `create-order/route.ts` 服务端价格校验（忽略 client `amount`）| `src/app/api/create-order/route.ts:14` | 1 h |
| 7 | `generate-will/route.ts` 加 zod schema 校验 | `src/app/api/generate-will/route.ts:11-37` | 1 h |
| 8 | `result/page.tsx` 顶部加"AI 草稿"水印 + 免责声明 | `src/app/result/page.tsx:175-203` | 1 h |
| 9 | `mainland-server/nginx.conf` 补 6 条安全头 | `deployment/mainland-server/nginx.conf` | 15 min |
| 10 | 创建 `index.html` + 4 个 `static-content/*.html`（含 LegalFooter 内嵌）| 新建文件 | 2 h |
| 11 | GitHub Action 加 `compliance.yml`（每次 push 跑 compliance_check.sh）| `.github/workflows/compliance.yml` | 1 h |
| 12 | 关闭 `next.config.ts:5` `ignoreBuildErrors`，修 TS 错 | `next.config.ts` | 2-4 h |
| 13 | `t9-h5-frontend/` `git rm -r`（编译产物 + node_modules）| 仓库 | 5 min |
| 14 | `wills.INSERT` RLS policy 修正（`user_id = auth.uid()`）| `supabase-schema.sql:219-220` | 30 min |
| 15 | 关闭 `payment` demo 路由（未配 `WECHAT_MCHID` 时返回 503）| `src/app/api/payment/route.ts:1` | 1 h |

**P0 总工作量**：~16-22 小时（1 个 Dev 全力 2-3 天）。

### 11.2 P1 · 2 周内必须修复

| # | 任务 | 文件 |
|---|------|------|
| 1 | 真实微信支付 V3 接入（替换 demo）| `src/lib/wechat-pay.ts`（新建） |
| 2 | 真实支付宝接入 | `src/lib/alipay.ts`（新建）|
| 3 | Stripe 接入 | `src/lib/stripe.ts`（新建）|
| 4 | Supabase Auth 手机号 OTP + 微信 OAuth | `src/lib/auth.ts`（新建）|
| 5 | 律师入驻 + 审核工作流 | 新建 `src/app/lawyer/*` 6 个页面 + 3 个 API |
| 6 | 博主申请 + 推广码追踪 | 新建 `src/app/affiliate/*` |
| 7 | `dangerouslySetInnerHTML` DOMPurify | `src/app/result/page.tsx:203` |
| 8 | API rate limit (Edge Middleware) | `src/middleware.ts`（新建）|
| 9 | audit_log 写入 | `src/lib/audit.ts`（新建）|
| 10 | PII 字段加密（pgcrypto）| `supabase-schema.sql` + `src/lib/crypto.ts` |
| 11 | 律师地域校验 | `lawyers` schema 加 `jurisdiction` |
| 12 | `result/page.tsx` PDF/Word 真实下载（Supabase Storage signed URL）| `src/lib/document-renderer.ts`（新建）|
| 13 | `payment/callback` 幂等（`payments.channel_transaction_id` UNIQUE）| `supabase-schema.sql` |
| 14 | `deploy_mainland.sh` 加 SSL 证书 + certbot 续签 | `deployment/mainland-server/deploy_mainland.sh` |
| 15 | 100% 严格 TS（`strict: true`）| `tsconfig.json`（已开 ✅，需修代码）|

### 11.3 P2 · nice-to-have（1-2 月）

| # | 任务 |
|---|------|
| 1 | i18n 接入（next-intl）|
| 2 | Sentry 错误监控 |
| 3 | UptimeRobot + 飞书 webhook 告警 |
| 4 | Playwright E2E 测试 |
| 5 | t1-t6 Go 微服务迁移到 Vercel Edge Functions 或 `archive/` |
| 6 | `hk-server/` 移到 `archive/` |
| 7 | ADR 文档（`docs/ADR/0001-0010`）|
| 8 | Runbook（`docs/runbooks/wechat-pay-outage.md` 等）|
| 9 | 财务对账 Excel 导出 |
| 10 | 微信小程序（T8）|

---

## 12. 关于 Peer Agent Outputs 的点评

### 12.1 `docs/PRD.md`（v1.0, Product Designer 出）

- **优点**：
  - 双部署架构图（§1.6）清晰且与代码一致
  - 5 用户画像 + 3 业务模式 + 6 文书类型完整
  - 6 大核心流程含 mermaid 图
  - 优先级 P0/P1/P2 切分合理
- **可改进**：
  - **§6.1 Vercel 域合规"AI 透明度"要求与实际 UI 缺失矛盾**（评审 §6.1）
  - **§4.2.6 API 列表"✅ 已有"过于乐观**（实际上 6 个 API 中只有 generate-will + create-order + orders/[id] + book-lawyer 真正返回数据；payment 全是 demo；webhook 端点完全不存在）—— 这是 PRD 误导性陈述。
  - **§7.1 P0 状态"✅ 已完成"普遍虚标**（H5 端 5 页面"✅"实为 demo 模式，无真实支付、无真实用户、无 RLS、无 auth）。
- **建议**：Product Designer 在交付前应与 Tech Lead 做一次 "PRD vs 实现" walkthrough，更新"状态"列为实际状态。

### 12.2 `docs/ARCHITECTURE.md`（v1.0, Technical Architect 出）

- **优点**：
  - 12 个问题（§0 文档目的）回答完整
  - ERD 详细 (12 个表)，含 RLS policy
  - 6 大 API 设计 RESTful 规范
  - 双部署信任边界 mermaid 图清晰
  - 风险登记表 15 项完整
  - ADR 索引 10 项
- **可改进**：
  - **§5.1 Auth API"待实现"标 P1，但未提"无 Auth 时 P0 也能跑"的安全风险**（实际上当前 demo 用 mock user_id，但 ARCH 没说清楚这与 RLS 冲突）。
  - **§7.3 微信 V3 接入"现有缺口：lib/payment.ts 是 demo"识别正确**，但未在"风险 R5"中加重。
  - **§10.3 Vercel 部署"Env: Vercel Dashboard 配置" 列举 21 个 env vars，但未提"上线前必须全部配置完成"的 P0 任务** —— 评审 §5.1 的"throw"问题即是未配 env 的副作用。
  - **§12 Q4 LLM 供应商策略提到 Claude Sonnet 4.5 作为"律师版高端模型"** —— 4.5 是 Sonnet 4.5 正确，3.5/3.7 是 Sonnet 3.5/3.7；ARCH 写 "4.5" 是 Sonnet 4.5 ✅。
  - **§11.4 风险回退预案"Vercel 域被 GFW 屏蔽升级"** 提到"切换 CTA href → h5.aiwill-planner.cn"—— 但 `deploy_h5.sh` 已标记 deprecated (Day 90)，如果 Day 7 Vercel 域被 GFW 屏蔽，HK 节点也未必可用，**回退路径不完整**。
- **建议**：Tech Lead 应明确标注"Day 0 上线必须 100% 满足的 P0 项" 与 "可后期迭代的 P1-P2 项" 的差异，当前混淆。

### 12.3 整体

两份文档**质量高**，但**与代码实际状态有 1-2 周差距**。这本身不是问题（PRD/ARCH 是"目标态"，代码是"当前态"），但**Project Manager 应有一个 delta 报告** 列出"已实现 / 部分实现 / 未实现 / 偏差"。

---

## 13. 整体结论 (Final Verdict)

**整体评分**：

| 维度 | 评分 |
|------|------|
| 代码质量 | 5/10（demo 模式占 70%，真实链路未打通）|
| 合规就绪度 | 6/10（CN 域 9/10，Vercel 域 3/10）|
| 安全性 | 3/10（致命：Webhook 签名缺失）|
| 架构合理性 | 8/10（双部署方向对，细节需补）|
| 部署就绪度 | 5/10（脚本齐全，HTML/证书/env 缺）|
| 文档完整性 | 9/10（PRD + ARCH + 合规手册 完整）|
| **综合** | **6/10** |

**Verdict：FIX-THEN-SHIP**（再做 1 轮 Developer Agent 迭代后再上 prod）

**关键路径**：
1. **Day 0（24-48h）**：P0 全部 PASS（§11.1 的 15 项），重点是 Supabase 接入 + Webhook 签名 + Vercel 域 Footer。
2. **Day 1-7**：P1 全部 PASS（§11.2 的 15 项），重点是真实支付 + Auth + RLS 修正。
3. **Day 8-14**：内测 + 1 笔真实订单 E2E。
4. **Day 15+**：上线。

**不推荐直接上 prod** 的 3 个原因：
1. `payment/callback` 接受未签名回调 → 白送钱
2. `create-order` 接受客户端 `amount` → 0 元购
3. `config.ts` 缺 env 即 throw → 部署即 500

**如果强行上 prod 的最大风险**：上线 1 小时内被白帽子薅羊毛退款 / 被网信巡查发现 Vercel 域无 Footer / 商户号申请被拒后无 fallback。

---

**文档结束 · Version 1.0 · 2026-06-02 · 编制者：Code & Architecture Reviewer**

> 提交 Master Agent 评审。VERDICT = **FIX-THEN-SHIP**。
