<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
