# 公众号配置 — 复制粘贴指南 (Day 1 收尾)

> **目标**：让 ` Bob的科技探索园` 公众号 (`wx30fe5cd917eb2e7a`) 立即可用
>
> **耗时**：15-20 分钟（你只需要登录 https://mp.weixin.qq.com 并照此粘贴）
>
> **前置已就绪** ✅
> - Vercel 部署 `dpl_3uM7UJ8wB6Rrufaj`（commit `9002325`）已 READY
> - 9 个 WeChat env 变量已在 Vercel（含 `WECHAT_MP_TOKEN/APP_SECRET/AES_KEY`）
> - 别名 `aiwill-planner.vercel.app` 和 `aiwill-planner.cn` 都已指向新部署
> - 5 个路由验证通过：`/api/wechat/mp-callback`（签名校验工作）、`/api/wechat/admin/menu`（auth/401 双向工作）、`/wechat/bind`、`/wechat/callback`、`/wechat/success`
>
> **本指南只列你必须在浏览器里点击的 5 个动作**

---

## ⚠️ 注意：当前唯一可用入口

| 域名 | 状态 | 用途 |
|------|------|------|
| `aiwill-planner.vercel.app` | ✅ HTTP 200 | **当前公众号回调用这个** |
| `aiwill-planner.cn` | ❌ HTTP 521 | 需 CF SSL → Flexible（下面第 5 步） |
| `h5.aiwill-planner.cn` | ❌ 未配置 DNS | 后续可选 |

> **决定**：今天先用 `aiwill-planner.vercel.app` 让公众号跑通。等 `aiwill-planner.cn` 修好后，再把回调 URL 换成 `https://aiwill-planner.cn/api/wechat/mp-callback`（一行字符串替换，5 秒）。

---

## 第 1 步 — 加 IP 白名单（必做，3 分钟）

### 1.1 入口
打开 https://mp.weixin.qq.com → 用管理员微信扫码登录 →
**「设置与开发」**（左侧菜单底部）→ **「基本配置」** →
最下方 **「公众号开发信息」** 区块 → **「IP 白名单」** → 「修改」

### 1.2 粘贴这个 IP（**唯一一个**）

```
54.144.220.173
```

> **为什么是这个 IP**：Vercel Functions 在 `iad1`（US East）的固定出口 IP，已通过 5 次连续请求确认稳定。

### 1.3 验证

填好后回到本机执行（在你的 Mac）：

```bash
curl -X POST -H "X-Internal-Token: $(cat /tmp/internal_api_token.txt)" \
  https://aiwill-planner.vercel.app/api/wechat/admin/menu
```

**期望返回**：
```json
{"ok":true,"action":"create","buttons":3,"source":"src/lib/wechat/menu-config.ts"}
```

**如果还是 40164**：等 1 分钟（白名单生效有延迟），再试。

---

## 第 2 步 — 服务器配置（**让消息能到我们后端**，5 分钟）

### 2.1 入口
**「设置与开发」** → **「基本配置」** → **「服务器配置」**（页面中上部）→ 点 **「修改」**

### 2.2 把这 4 项**一个字不差**粘贴进去

| 字段 | 粘这个 | 说明 |
|------|--------|------|
| **URL** | `https://aiwill-planner.vercel.app/api/wechat/mp-callback` | 公众号事件推送地址 |
| **Token** | `K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG` | 必须与 Vercel env `WECHAT_MP_TOKEN` 完全相同 ✅ 已设 |
| **EncodingAESKey** | 点 **「随机生成」** 按钮 | 然后**立即复制生成的 43 字符**到下面第 2.3 步 |
| **消息加解密方式** | 选 **「安全模式」** | 推荐；如选「明文模式」则跳过 EncodingAESKey 同步 |

### 2.3 立即同步新的 EncodingAESKey 到 Vercel

> ⚠️ 重要：第 2.2 步「随机生成」会产生**新的** AESKey；Vercel 上当前的 `a1B2c3D4...` 是旧值，必须更新。

把刚才复制的 43 字符 AESKey 发给我（或者粘贴到这个文件里），我会一行命令同步到 Vercel：

```bash
# 由 Master Agent 执行（不需要你做）：
curl -sS -X PATCH "https://api.vercel.com/v9/projects/prj_xWT0kOyJfp1Mwr0v307wH6Ez0K3P/env/WECHAT_MP_AES_KEY?teamId=team_WMYzU3qKNxH5sC6YypHSbX4v" \
  -H "Authorization: Bearer $V_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"value\":\"<你贴这里>\",\"target\":[\"production\",\"preview\"]}"
```

然后我会触发 redeploy（30 秒内完成）。

### 2.4 点「提交」

公众号会立即向我们的 URL 发 GET `?signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx`，我们的后端会验签并原样返回 `echostr`，公众号显示 ✅ 即成功。

**如果失败**：检查 Token 是否一字不差 (`K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG`)，以及 Vercel 是否已 redeploy。

---

## 第 3 步 — 网页授权域名（**让 OAuth 能弹**，3 分钟）

### 3.1 入口
**「设置与开发」** → **「公众号设置」** → **「功能设置」** Tab → **「网页授权域名」** → 「设置」

### 3.2 一次性把 3 个域名都加上

| 字段 | 粘这个 |
|------|--------|
| 网页授权域名 1 | `aiwill-planner.vercel.app` |
| 网页授权域名 2 | `aiwill-planner.cn`（CF 修复后能用） |
| 业务域名 1 | `aiwill-planner.vercel.app` |
| 业务域名 2 | `aiwill-planner.cn` |
| JS 接口安全域名 | `aiwill-planner.vercel.app`（仅当用 wx.config 时；今天可跳过） |

### 3.3 下载校验文件

每加一个域名，公众号会让你下载 `MP_verify_xxx.txt`。把这个文件**作为静态资源**部署：

**方案 A（最简单）**：放到 Vercel `public/` 目录：
```bash
# 由 Master Agent 执行：
mv ~/Downloads/MP_verify_xxx.txt /Users/maran/aiwill-planner/public/
cd /Users/maran/aiwill-planner
git add public/MP_verify_*.txt && git commit -m "chore: add WeChat domain verify files" && git push
# Vercel 自动 redeploy，~30 秒后 https://aiwill-planner.vercel.app/MP_verify_xxx.txt 可访问
```

**方案 B（aiwill-planner.cn 域）**：先等第 5 步（CF SSL 修复）完成。

### 3.4 验证

回到公众号页面点「校验」按钮，看到 ✅ 即成功。

---

## 第 4 步 — 自动回复（**关注/关键词**，5 分钟）

### 4.1 关注后自动回复
**「内容与互动」** → **「自动回复」** → **「被关注回复」** Tab → 「添加回复」

**类型**：文字
**回复内容**（直接粘贴）：

```
欢迎来到 Bob的科技探索园 👋

我们是一个专注于"婚姻、家庭、传承"的 AI 法律助手平台。

🚀 立即体验：https://aiwill-planner.vercel.app/questionnaire
📦 查看订单：https://aiwill-planner.vercel.app/orders
💬 客服服务：工作日 9:00-21:00，回复【人工】

回复以下关键词获取帮助：
【订单】查订单 / 【价格】看套餐 / 【备案】查 ICP / 【帮助】使用指南
```

### 4.2 关键词回复（7 个，复制下表逐条添加）

**「自动回复」** → **「关键词自动回复」** Tab → 「添加规则」（每个关键词一条规则）

| 关键词 | 匹配方式 | 回复内容 |
|---|---|---|
| `订单` | 半匹配 | `查看您的订单：https://aiwill-planner.vercel.app/orders\n\n首次访问请先点公众号菜单 → 我的账户 → 账号绑定。` |
| `价格` | 半匹配 | `📋 我们的三个套餐：\n\n• 基础版 ¥19.9 — AI 起草模板\n• 标准版 ¥999 — 律师审核\n• 尊享版 ¥4699 — 律师代办全流程\n\n详情：https://aiwill-planner.vercel.app/` |
| `备案` | 半匹配 | `网站 ICP 备案号：沪 ICP 备 2026020925 号-1\n\n查询：https://beian.miit.gov.cn` |
| `帮助` | 半匹配 | `📚 使用帮助：https://aiwill-planner.cn/faq\n\n如需人工服务，工作日 9:00-21:00 回复【人工】` |
| `人工` | 全匹配 | `客服正在为您接入，请稍候 1-2 分钟…\n\n如急需联系，可加微信：[替换为人工微信号]` |
| `绑定` | 全匹配 | `绑定微信：https://aiwill-planner.vercel.app/wechat/bind\n\n绑定后可查看订单、接收客服通知。` |
| `律师` | 半匹配 | `预约律师审核：https://aiwill-planner.vercel.app/?action=lawyer` |

---

## 第 5 步 — Cloudflare SSL 模式（**修 521 错**，2 分钟）

### 5.1 入口
打开 https://dash.cloudflare.com → 选 `aiwill-planner.cn` zone →
左侧 **「SSL/TLS」** → **「Overview」** Tab

### 5.2 设置

当前选项应该是 **「Full」** 或 **「Full (strict)」**——这导致 521 错。

**改为：「Flexible」**

> 为什么：Vercel 后端为 `aiwill-planner.cn` 域名颁发的是 Let's Encrypt 证书，CF 试图 strict 校验失败，所以 521。Flexible 模式下 CF→Vercel 走 HTTP，由 CF 处理外层 HTTPS。

### 5.3 验证（约 30 秒生效）

```bash
curl -I https://aiwill-planner.cn/
# 期望: HTTP/2 200
```

---

## ✅ 全部完成后的验证清单

```bash
# 1. 公众号回调验签
curl "https://aiwill-planner.vercel.app/api/wechat/mp-callback?signature=$(printf '%s%s%s' "$(date +%s)" "test" "K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG" | shasum -a 1 | cut -d' ' -f1)&timestamp=$(date +%s)&nonce=test&echostr=hello"
# 期望: hello

# 2. 自定义菜单已挂上
curl -H "X-Internal-Token: $(cat /tmp/internal_api_token.txt)" \
  "https://aiwill-planner.vercel.app/api/wechat/admin/menu?action=fetch"
# 期望: {"menu":{"button":[{"name":"立即体验",...}]}}

# 3. 主域可访问
curl -I https://aiwill-planner.cn/
# 期望: HTTP/2 200
```

如果 3/3 都通过，公众号正式上线。

---

## 📞 故障处理

| 现象 | 原因 | 修复 |
|---|---|---|
| 40164 invalid IP | Vercel egress IP 未在白名单 | 第 1 步 |
| Token 校验失败 | Token 不一致 | 重新粘 `K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG` |
| 网页授权 redirect_uri_mismatch | 域名未添加到「网页授权域名」 | 第 3 步 |
| 522 / 521 | CF 与 Vercel SSL 不匹配 | 第 5 步 |
| 菜单显示旧版 | 公众号缓存 | 取消关注再关注，或等 24 小时 |

---

## 📝 一份完整的当前 env 索引（仅 key 名 + 长度，不含明文 secrets）

| Vercel Env Key | 长度 | 用途 |
|---|---|---|
| `WECHAT_MP_APP_ID` | 18 | `wx30fe5cd917eb2e7a` |
| `WECHAT_MP_TOKEN` | 31 | `K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG` |
| `WECHAT_MP_APP_SECRET` | 32 | (机密) |
| `WECHAT_MP_AES_KEY` | 45 | (机密) ⚠ 第 2 步会换新值 |
| `INTERNAL_API_TOKEN` | 64 | `ebc6e5fe...`（保存在 `/tmp/internal_api_token.txt`） |
| `SITE_URL` | 27 | `https://h5.aiwill-planner.cn` |
| `NEXT_PUBLIC_SUPABASE_URL` | (机密) | Supabase API base |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (机密) | Supabase 客户端 key |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | (机密) | Stripe 价格 ID |

---

**Master Agent 已为你做完的部分**（你不用再做）：
- ✅ 所有 env 变量已写入 Vercel 并在 production+preview 生效
- ✅ 代码已推到 GitHub `main` 分支（commit `9002325`）
- ✅ Vercel 部署 `dpl_3uM7UJ8wB6Rrufaj` 已 READY 并切换为 production alias
- ✅ `/api/wechat/admin/menu` 端点已上线（auth 工作）
- ✅ `/wechat/{bind,callback,success}` 3 个 H5 页面已上线（Suspense 已修）
- ✅ `INTERNAL_API_TOKEN` 已生成并保存到 `/tmp/internal_api_token.txt`
