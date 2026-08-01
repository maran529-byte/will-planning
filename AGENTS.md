<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 🚨 合规整改 (改版 v16, 2026-07-29) · ICP 备案声明对齐 · 最高优先级

> **触发**: 工作室确认网信 ICP 调查表第 1 题「本企业是否利用生成式 AI 向境内公众提供服务」填 **"否"**。但当前 H5 全部交互（含 12 步问卷 + 6 类文书生成 + 订单 + 账户 + 微信登录）跑在大陆 124.222.215.107，与备案声明实质冲突。
>
> **文档**: 桌面 `~/Desktop/aiwill-planner/aiwill-planner_合规手册.docx` v1.0（7 项证据清单） + 网信 ICP 调查表（已提交，"否"）。

## 当前违规事实 (2026-07-29 审计)

| 维度 | 备案声明 | 实际架构 | 风险等级 |
|---|---|---|---|
| AI 推理 endpoint 在大陆 | 不应出现 | `lib/config.ts` 仍引用 `MINIMAX_API_KEY` + `MINIMAX_BASE_URL`，3 个生成 API 含完整调用代码（kill-switch 关闭但代码存在） | 🔴 高 |
| `h5.aiwill-planner.cn` DNS | 应解析境外 | `dig h5.aiwill-planner.cn → 124.222.215.107`（大陆腾讯云 CVM） | 🔴 严重 |
| 12 步问卷所在服务器 | 应在境外 | 全程大陆（nginx → 127.0.0.1:3001 Next.js → 127.0.0.1:8000 Supabase） | 🔴 严重 |
| 文书生成 endpoint | 应在境外 | `/api/generate-will` / `/api/generate-document` 全部大陆响应 | 🔴 严重 |
| PII 存储地 | 应在境外 | auth.users / public.users / wills 表 / orders 表 / red_packets 全在大陆 PG | 🔴 严重 |
| HK 节点实际角色 | 应承担 H5 全栈 | 当前仅运行微信公众号反代（`api.weixin.qq.com`），无 Next.js / 无 Supabase / 无 vhost | 🟡 待整改 |

## 整改目标架构 (target state)

```
┌──────────────────────────────────────────────────────────────┐
│ 大陆 aiwill-planner.cn / 124.222.215.107 (仅展示)             │
│  ✓ 静态首页 (index.html)                                     │
│  ✓ 5 个 SEO 页 (about/pricing/faq/tutorial/methodology)      │
│  ✓ sitemap.xml / robots.txt / llms.txt                      │
│  ✓ LegalFooter (沪ICP备 + 沪公网安备 + 跳 H5 提示)          │
│  ✓ 公众号反代 (wx-proxy.aiwill-planner.cn)                   │
│  ✗ 所有 /api/*                                                │
│  ✗ /login /register /dashboard /account /feedback /questionnaire │
│  ✗ /doc-type /orders /payment /result /affiliate (动态部分)  │
└──────────────────────────────────────────────────────────────┘
                          │
                          │  (302 跳转, "前往移动端体验完整功能")
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ HK h5.aiwill-planner.cn / 43.129.207.154 (全部交互)          │
│  ✓ Next.js production (next start:3001)                       │
│  ✓ Supabase (HK 独立 PG 或 fetch 大陆只读 + HK 写)            │
│  ✓ Auth: /api/auth/* (login/register/me/verify-otp)          │
│  ✓ 表单: /api/generate-will /api/generate-document           │
│  ✓ 订单/支付: /api/orders /api/payment /api/wallet           │
│  ✓ 微信: /api/wechat/* (公众号反代保留 wx-proxy 别名)         │
│  ✓ AI 推理: 调用境外 LLM (HuggingFace / OpenAI / Anthropic)  │
└──────────────────────────────────────────────────────────────┘
```

## P0 整改清单 (7 项 · 截止 2026-08-05)

| # | 动作 | 责任人 | 验收 |
|---|---|---|---|
| **P0-1** | DNS: `h5.aiwill-planner.cn` A 记录 → 43.129.207.154 | 运维 | `dig h5.aiwill-planner.cn` 返 HK IP |
| **P0-2** | HK 部署: `git pull` + `npm ci` + `npm run build` + 配 `SUPABASE_INTERNAL_URL=https://api.aiwill-planner.cn` 或 HK 自建 Supabase | 运维 | HK `curl localhost:3001/api/auth/me` 返 200 |
| **P0-3** | HK nginx vhost: `listen 443 ssl http2; server_name h5.aiwill-planner.cn; proxy_pass http://127.0.0.1:3001;` | 运维 | `https://h5.aiwill-planner.cn/` 返 HK 内容 |
| **P0-4** | HK systemd / pm2 起 next-server, 配 watchdog | 运维 | `systemctl status aiwill-hk.service` active |
| **P0-5** | 大陆 nginx 删除所有动态路由: `/api/` `/admin` `/login` `/register` `/dashboard` `/account` `/feedback` `/questionnaire` `/doc-type` `/orders` `/payment` `/result` `/affiliate` `/tool` 改为 302 → `https://h5.aiwill-planner.cn/<原路径>` | 运维 | `curl -I https://aiwill-planner.cn/questionnaire` 返 302 |
| **P0-6** | 大陆代码 `lib/config.ts` 删 `MINIMAX_*` 常量 (证据 1) | 开发 | `grep -r MINIMAX src/` 0 命中 |
| **P0-7** | 大陆 footer 加 "本站仅展示信息 · 完整功能请访问 https://h5.aiwill-planner.cn" 提示 | 开发 | 5 个静态页 + index.html 全部含 |

## P1 持续合规 (证据 1-7 自查脚本)

合规手册 §三 的 `compliance_check.sh` 必须每日 cron 执行, 7 项全部 ✅ 才能继续运营:

```bash
[1] 大陆 nginx 不得有指向境外的 proxy_pass            ✅ (现状)
[2] 大陆 HTML/JS 不得出现 AI 推理 endpoint           ⚠️ (P0-6 修复)
[3] H5 fetch 域名 = api.aiwill-planner.cn (HK)      🔴 (P0-1 修复)
[4] 全站 footer 备案号 100% 覆盖                     ✅ (现状 5/5)
[5] 备案号链接到 beian.miit.gov.cn                    ✅
[6] AI 规划按钮 href → ASN 不在大陆                  🔴 (P0-1 修复)
[7] ICP 调查表第 1 题 = "否"                          ✅ (已提交)
```

脚本部署: `/usr/local/bin/compliance_check.sh` 已在大陆 + HK 各部署一份, 每日 0 点 cron 执行, 结果归档 `/var/log/compliance/{YYYY-MM-DD}.log`。

## P2 算法备案 (备选路径)

**若 2026-08-05 P0 整改未达成** (例如 DNS / HK 部署遇阻), 必须立即启动算法备案:
- 网信办《生成式 AI 服务备案》周期 60-90 工作日
- 算法安全评估报告 30+ 页
- 语料合规审查
- 期间停止所有 AI 推理 endpoint, 仅保留问卷 + 模板文书 + 人工咨询通道

**禁止** 在 P0 未达成且 P2 未启动的状态下继续运营 — 任何时刻被网信现场核查都将触发 ICP 吊销。

## 责任与触发

- 任何 dev 修改 `/etc/nginx/nginx.conf` 或 `src/app/api/**` 必须先重跑 `compliance_check.sh`
- 任何 PR 包含 MINIMAX / api.minimaxi / `/v1/chat` / `/v1/completions` 关键字 → 直接 block
- 每周一 PM 抽检 5 个大陆页面 + 1 个 H5 页面, 截图归档 `/docs/compliance/weekly/`
- 每季度法务复核 7 项证据, 出具签字报告

---

# 🚨 最高级架构要求 (改版 v15, 2026-07-23) · 不能出错 · 优先级高于一切

> **完整文档**: `~/Desktop/架构要求.md` (同步在服务器 `/root/aiwill-self-ops/ARCHITECTURE_REQUIREMENT.md`)
> **每日验证**: `python3 /root/aiwill-self-ops/compliance_check.py` (crontab 9/15 点)

## 核心铁律
- **主站 `aiwill-planner.cn`** = 纯展示 + SEO
  - ❌ 禁止: `<form>` / `<input>` / `<select>` / `<textarea>` / `/api/*` 调用 / 登录态读取
  - ❌ 禁止: Cookie-based session / localStorage / 微信扫码 / 邮箱登录 / 订单 / 支付 / 问卷 / 上传
- **H5 `h5.aiwill-planner.cn`** = 所有交互
  - ✅ 允许: 表单 / 输入 / API / 登录 / 支付 / 订单 / 问卷 / 上传 / 评论

## 路由规则

| 路由 | 主站 | H5 |
|------|------|-----|
| `/` `/about` `/pricing` `/doc-type` `/faq` `/tutorial` `/methodology` `/knowledge` `/guide` `/compare` | ✅ 静态 | - |
| `/login` `/register` `/dashboard` `/account` `/feedback` | 🔄 跳 H5 | ✅ 真实 |
| `/tool` | ✅ 静态 (tool.html) | ✅ 工具 |
| `/affiliate` | ✅ 静态展示 | ✅ 申请 |
| `/questionnaire` | ✅ 静态 (跳 H5) | ✅ 真实 |
| `/orders /payment /result` | ❌ 404 | ✅ 真实 |
| `/api/auth/*` `/api/feedback/*` `/api/wechat/pc-login-*` `/api/wechat/admin/*` `/api/wechat/menu/*` | ❌ 404 (nginx deny) | ✅ 真实 |

## 自检 Checklist (改任何 Next.js 代码前必须跑)
```bash
# 1. PC 域 0 form/input/api
for p in / /login /register /dashboard /account /feedback /affiliate /tool /doc-type /pricing; do
  curl -sL https://aiwill-planner.cn$p | grep -cE '<form|<input|/api/auth/|/api/feedback/|/api/wechat/pc-login-' && echo " ❌ $p"
done

# 2. PC API 必须 404
for p in /api/auth/login /api/feedback/submit /api/wechat/pc-login-verify; do
  curl -s -o /dev/null -w "%{http_code}\n" https://aiwill-planner.cn$p
done  # 期望: 404 404 404

# 3. H5 仍 200
for p in / /login /register /dashboard /questionnaire; do
  curl -s -o /dev/null -w "%{http_code}\n" https://h5.aiwill-planner.cn$p
done  # 期望: 200 200 200 200 200
```

## 违反后果
- 经营性互联网信息服务认定 → ICP 监管风险 → 法务风险
- 触发后: 立即回滚 + 重跑 `compliance_check.py` 验证 + 邮件告警

## 何时可以突破
- 仅当用户**明确要求**且**同时**给 H5 等价路径时
- 突破前必须先更新 `~/Desktop/架构要求.md` + 服务器 `/root/aiwill-self-ops/ARCHITECTURE_REQUIREMENT.md`

---

## 业务铁律 v1.0 (改版 2026-07-24 · 工作室已批准)

### 微信登录注册 (H5 域)
- H5 `/login` `/register` 必须有 **"微信一键登录/注册"** 按钮
- 走 OAuth2.0: `open.weixin.qq.com/connect/oauth2/authorize` → `/api/wechat/callback`
- 仅 H5 域可用, PC 域 `/api/auth/wechat-login` 仍 nginx ^~ 404
- `users.wechat_openid` / `users.wechat_unionid` 必须落库

### 微信服务号菜单
- 自定义菜单: 生成文书 / 我的订单 / 个人中心 / 民法典 / 定制留言
- 全部跳 `https://h5.aiwill-planner.cn/<page>?from=wechat-mp`
- 公众号每日 9:00 群发文章 (wechat-publisher)

### 文章发布 (多通道)
| 通道 | 频率 | 实现 |
| --- | --- | --- |
| 主站 `/knowledge` | 每日 3 篇 | `auto_publish_server.sh` (零停机 v30) |
| 公众号 | 每日 1 篇 (09:00) | `wechat-publisher` |
| 小红书 / 微博 / 知乎 / 抖音 | 周级别 | 各 publisher |

### 移动端访问
- 主站响应式: `md:` 以下显示"📱 打开移动端"按钮 → 跳 H5
- nginx UA 嗅探: Mobile UA 302 → `h5.aiwill-planner.cn`
- 微信内置浏览器: H5 自动适配 (viewport + safe-area)

### 红包 (2-10 元随机)
- 单个红包: **¥2 ~ ¥10 随机** (`random.randint(200, 1000)` 分)
- 触发: 问卷完成 / 订单支付 / 分享注册 / 反馈采纳
- **订单使用红包 ≤ 订单金额 50%** (硬约束, 结算时校验)
- 分享注册红包: **固定 ¥2** (在 2-10 区间内, 不随机)
- 有效期 30 天, 退款按比例扣回

### 代理博主
- **提成 30%** (订单金额)
- **提现门槛 ≥ ¥50** (满 50 才能提)
- 入口: H5 `/account/affiliate` → 申请提现 → 工作室人工审核

### 反馈机制 (自动化)
- 提交即匹配 15+ 关键词 → 1 分钟内自动回复 (订单状态/退款/客服)
- 未命中 → pending → `feedback_optimizer` 每日聚类
- **关键信息 `***` 模糊处理** (`lib/redact.ts`): 姓名/身份证/银行卡/手机/详细地址/精确金额
- 自动回复率目标 ≥ 80%

### 价格
- **只 ¥19.9**, 移除 `¥99` `¥299` 等历史价格
- `/pricing` 改为 19.9 介绍页

### 定制服务留言
- 主站 footer + H5 `/custom` 都有"📮 定制服务留言"按钮
- 表单: 姓名/手机/需求描述 → `custom_inquiries` 表
- **自动发邮件到 330320991@qq.com** (统一邮箱)
- 工作室 24h 内回复

### 联系邮箱 (统一)
- 全部统一改为 **330320991@qq.com**
- 替换位置: 主站 footer / H5 客服 / `aiwill_lib.py` MAIL_TO / crontab 邮件

### 关键信息模糊处理 (`lib/redact.ts`)
- 自动回复/邮件/反馈提示中: 姓名 `张*三` / 身份证 `110***********1234` / 手机 `138****5678` / 银行卡 `62**************7890`
- 用户下载自己文书时显示完整 (登录态校验)
- 下载后提示"含敏感信息, 上传/分享前自行打码或加密"
- `compliance_check.py` 加 7.0 项检查 → 反馈/邮件不应有未打码的字段

---

## 业务铁律 v1.1 (改版 2026-07-24 · 工作室已批准)

### 红包转赠 (密钥方式)
- A 可将本人账户红包转赠给 B, **A 自定义金额** (¥2-¥10 范围)
- **硬约束**: 转赠金额 **不得超过 A 账户剩余可用红包总额**
- 6 位数字 PIN 验证, 错误 5 次锁定账户 1 小时
- 24h 内可撤销 (B 红包未被使用时)
- 单用户日转赠次数 ≤ 3, 累计金额 ≤ ¥30
- 转赠永久留痕 (red_packet_transfers 表, 含 IP/UA)
- H5 `/wallet-policy` 底部嵌入 `TransferPanel` 操作区
- 完整规则: 桌面手册 v1.1 §1.7.5 + §2.6 + §6.2

### 全站合规位置补 沪公网安备31011502406720号
- nginx `X-Beian` header: `"沪ICP备2026020925号-1; 沪公网安备31011502406720号"`
- `LegalFooter` 组件已有两行备案链接 (主站 + H5 同步)
- `static-content/architecture-requirement.md` 顶部已补全
- 主站静态 `index.html` 底部已带

### 红包 / 转赠相关 lib
- `lib/red_packet.ts`: 加 5 个转赠工具 (`validateTransferAmount` / `fifoDeductPackets` / `buildTransferConfirmText` / `canRevokeTransfer` / `isValidPinFormat`) + 5 个风控常量
- `lib/user_pin.ts` (新增): 6 位 PIN 锁定 / 尝试 / 提示工具
- `lib/redact.ts`: 加 `redactPin` + 关键词匹配 (PIN/密钥/验证码上下文 6 位数字自动打码)

### 红包 / 转赠相关 API (H5 域)
- `POST /api/red-packet/transfer`: A → B 转赠, 调 RPC `transfer_red_packet`
- `POST /api/red-packet/transfer/revoke`: 24h 撤销, 调 RPC `revoke_red_packet_transfer`
- `GET  /api/red-packet/transfer?records=1`: 查询最近 20 条记录
- `POST /api/red-packet/pin/set`: 首次设置 6 位 PIN (含弱密码校验)
- `POST /api/red-packet/pin/verify`: 校验 PIN (5 次错锁定 1 小时)

### 数据库迁移
- `supabase/migrations/0021_red_packet_transfer_pin.sql`:
  - 新表 `red_packet_transfers` + 3 索引 + RLS
  - `users` 加 `pin_hash` / `pin_attempts` / `pin_locked_until` / `pin_set_at`
  - `red_packets.trigger` 加 `share_transfer`
  - 4 个 RPC: `set_user_pin` / `verify_user_pin` / `transfer_red_packet` / `revoke_red_packet_transfer`

---

# CLAUDE.md · 工程纪律十条 (改版 v14, 2026-06-30)

> 副标: A Short List of Rules, Earned by Watching the Same Mistakes Twice
> 模型擅长生成**看起来合理**的代码,但不擅长发现「看起来合理」跟「真的对」之间的差距。

## 1. Read Before You Code (先读再写)
写代码前**必须**先读:
- 要改的文件 + 同目录下相邻文件
- 已有的 import / 工具函数 / 类型约定
- 仓库里的 README / docs/ARCHITECTURE.md / 相关 docs/*.md
**禁止**凭空假设依赖 (例如猜项目用 axios,实际全员 fetch)。

## 2. Think Before You Code (先想再敲)
动手前用 1-3 句话说清:
- 任务真正要做什么 (「加认证」= 5 件事,列出来)
- 取舍 (用什么 / 不用什么 / 为什么)
- 完成长什么样 (可验证的成功标准)
真不懂就停下来问,不要用「看着像那么回事」的代码糊弄。

## 3. Simplicity (极简主义)
写**能解决眼前问题**的最少代码,不是能解决「未来版本」的最少代码。
判断标准:如果某个抽象的唯一理由是「以防万一」,就是过度构建。

## 4. Surgical Changes (精准手术)
diff 应和任务一样小:
- 没让碰的别碰
- 匹配已有代码风格 (缩进/引号/分号)
- 不要顺手重排格式 (会让关键改动埋在噪音里)
判断标准:**每一行改动**都能找到和用户需求的直接关联,找不到就撤回。

## 5. Verification (验证) — 灵魂条款
> 「你觉得能跑的代码」和「真正能跑的代码」之间,隔着一条叫「测试」的鸿沟。

修 bug / 加功能 / 改路由 **必须**:
1. 先写**复现 / 调用脚本** (curl / 浏览器 / unit test)
2. 跑一遍,看到期望 vs 实际
3. 改代码
4. 再跑一遍,看到期望达成
无法测试 = 代码本身设计有问题,**不要跳过**。

## 6. Goal-Driven Execution (目标驱动执行)
动手前先说清**「做完了」长什么样**,而且要可验证:
- ❌「加个验证」 → ✅「邮箱为空时弹错误;格式错时弹错误;两种情况都过 e2e」
- 多步任务**先列计划**,用户确认后再动手,避免方向错了干一小时

## 7. Debugging (调试)
东西坏了,去**查**,别猜:
- 读完整报错 + 堆栈 (不要只看第一行)
- 先稳定复现,再动手改
- 一次只改一个地方
- 改完跑测试,验证假设

## 8. Dependencies (依赖管理)
每个依赖都是**无法控制的永久代码**。
加之前先问:
- 标准库能搞定吗? (`crypto.randomUUID()` vs `uuid` 包)
- 仓库已经在用吗? (查 `package.json` + 实际 import,不要凭印象)
加了就**说清楚为什么**,不要悄悄塞进 manifest。

## 9. Communication (沟通)
说你做了什么 + 为什么,不只是丢代码:
- ✅「我不确定这个库是否支持流式传输,需要先查文档」
- ❌「我觉得这应该能用」
不确定 → 标注**置信度 + 验证手段**。

## 10. Common Failure Modes (常见翻车)
发现自己正在犯以下任一错误,**立刻停手**,不要硬冲:

| 模式 | 症状 | 对策 |
|------|------|------|
| **Kitchen Sink** 厨房水槽 | 修水龙头却拆了整个厨房 | 回退,只改真正相关的文件 |
| **Wrong Abstraction** 错误抽象 | 同段代码复制粘贴 N 遍 | 第 3 次重复时停下来抽函数 |
| **Optimistic Path** 盲目乐观 | 只考虑 happy path | 显式列空值/网络断/服务器挂 |
| **Runaway Refactor** 失控连锁 | 改一个文件触发 10 个 | 用 `git diff --stat` 自检范围 |

---

## 自检清单 (每次提交前过一遍)
- [ ] 每一行改动都有用户需求对应 (§4)
- [ ] 至少一项验证手段 (curl 输出 / 浏览器截图 / 单测) (§5)
- [ ] 没有「以防万一」的抽象 (§3)
- [ ] 没有复制粘贴第 3 次的代码 (§10)
- [ ] 空值/异常路径有显式处理 (§10)
- [ ] `package.json` 没被偷偷改 (§8)
- [ ] 用户清楚知道改了什么 + 为什么 (§9)

---

## 自运营守护 (2026-07-24 部署 · 三层防护 · v1.3 修复于 2026-07-31)

服务器被改/异常自动恢复, **不需要人工介入**。原 5 优化器 + watchdog 全部保留; 加了 aiwill-keeper + driver。

> **v1.3 (2026-07-31) 修复记录**:
> - `driver.sh` line 137 bash bug — `${#MISSED_TASKS[@]:-0}` 改为 `${#MISSED_TASKS[@]}` (每 5 分钟刷错误日志, 现正常输出"补跑 N 个任务")
> - `watchdog_v2.py` 心跳 ts 字段扩展 — 增 `last_run_at` 兼容 + 嵌套结构自动取最深 last_run_at (修前每 15 分钟误报 4 类异常, 修后 `全部检查通过 ✓`)

| Layer | 触发 | 监控范围 | 恢复动作 |
|---|---|---|---|
| L1 进程守护 | systemd `aiwill-keeper.service` (30s 循环) | nginx / aiwill.service / supabase-db / cron 是否存活 | 直接 systemctl restart + 容器 restart |
| L2 端点巡检 | cron `*/5 min` → `aiwill-healthcheck.sh` | 8 个 HTTPS 端点 (PC/H5 home/health/sitemap/dashboard/wallet-policy) | 连续 3 次失败 → restart aiwill + 邮件 |
| L3 任务调度 | cron `*/5 min` → `aiwill-driver.sh` | 5 优化器 + 公众号 + 网站 + 合规 的今日心跳 | 超期 → 主动 `cd && ./optimizer.py` 补跑 |
| L4 主监控 | cron `*/15 min` → `watchdog_v2.py` | 心跳过期 + cron Error 关键词 + nginx 5xx 累计 > 10 + RLS/401 异常 | 邮件告警 maran529@icloud.com (6h 冷却) |

部署位置:
- 脚本 `/usr/local/bin/{aiwill-healthcheck,aiwill-driver,aiwill-alert,aiwill-keeper}.sh`
- 主监控 `/root/aiwill-self-ops/watchdog_v2.py`
- systemd unit `/etc/systemd/system/aiwill-keeper.service`
- 日志 `/var/log/aiwill-keeper/*.log`
- 告警冷却状态 `/var/log/aiwill-keeper/alert-state.json`
- 心跳 `/var/log/aiwill-keeper/last-tick.json` (30s 更新一次)

手动命令:
```bash
sudo /usr/local/bin/aiwill-healthcheck.sh       # 立即跑 L1
sudo /usr/local/bin/aiwill-driver.sh             # 立即跑 L2
sudo /usr/bin/python3 /root/aiwill-self-ops/watchdog_v2.py   # 立即跑 L3
/usr/local/bin/aiwill-alert.sh "测试" "正文"      # 发送测试告警邮件
sudo systemctl status aiwill-keeper.service       # 守护进程
tail -f /var/log/aiwill-keeper/keeper.log         # 守护日志
tail -f /var/log/aiwill-keeper/driver.log         # 任务调度日志
```
