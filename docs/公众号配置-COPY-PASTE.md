# 公众号配置 — 复制粘贴指南 v2 (Day 1 收尾)

> ⚠️ **重要更新 (2026-06)**:微信在 2024-2025 年做了一次大重构 —— 公众号的**开发相关配置**从「微信公众平台」(mp.weixin.qq.com) 迁到了**新平台**「微信开发者平台」(dev.weixin.qq.com)。本指南已全部按新结构重写。

---

## ✅ 状态速览 (2026-06-03 22:30 UTC)

| 项目 | 状态 |
|---|---|
| **CVM 代理架构** | 方案 C (大陆 CVM 固定 IP 直推, 跳过 HK 反代) — ✅ 已选 |
| **代理出口 IP (要加白名单的那个)** | `124.222.215.107` (大陆 CVM, **固定**) |
| **写操作入口** | CVM `/root/aiwill-self-ops/wechat_menu_push.py` |
| **Vercel 改动** | ✅ `src/lib/wechat/config.ts` 注释已更新 (走 proxy URL, 但实际写操作已迁出 Vercel) |
| **微信白名单** | ✅ 已加 `124.222.215.107` |
| **端到端测试** | ✅ `wechat_menu_push.py --push` 返回 `errcode:0`, 远端菜单已确认含「电脑端登录」 |

**完成 CVM 端部署 + 白名单更新后**,你直接执行 §6 的菜单推送命令就能成。
>
> **来源**:微信官方文档 https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Service_Account_Upgrade_Description.html 明确说明:
> > "开发者在微信公众平台中创建服务号账号、**在微信开发者平台中完成开发相关配置**,并且在获取接口权限后,可以通过阅读本开发指南来帮助开发。"
> >
> > "**微信开发者平台**,是面向微信生态业务的一站式工作台,开发者在获得'开发者权限'后,即可在该平台**管理和配置公众号、服务号、小程序、小游戏、小店、小店带货助手、移动应用、网站应用等开发信息**。"

---

## 0. 必读:两个平台怎么分

| 平台 | 域名 | 角色 | 管什么 |
|------|------|------|--------|
| **微信公众平台** (旧) | https://mp.weixin.qq.com | 运营/内容 | 文章、自定义菜单(老接口)、自动回复(老接口)、粉丝管理、微信支付配置 |
| **微信开发者平台** (新) | https://dev.weixin.qq.com | 开发/接口 | **AppID/AppSecret**、**IP 白名单**、**服务器配置(URL/Token/EncodingAESKey)**、开发者权限、接口权限管理、监控告警 |

> **关键**:你之前看到的「设置与开发 → 基本配置」在新结构里**很多已迁走**了。

### 0.1 现在两件事分别在哪个平台

| 配置项 | 旧位置 (可能已不显示) | 新位置 |
|---|---|---|
| **AppID** | mp.weixin.qq.com → 设置与开发 → 基本配置 | dev.weixin.qq.com → 我的账号 / 公众号详情 |
| **AppSecret** (重置) | mp.weixin.qq.com → 设置与开发 → 基本配置 | dev.weixin.qq.com → 公众号详情 → 重置 AppSecret |
| **IP 白名单** | mp.weixin.qq.com → 设置与开发 → 基本配置 → 公众号开发信息 | dev.weixin.qq.com → 公众号 → 开发信息 → IP 白名单 |
| **服务器配置** (URL/Token/AESKey) | mp.weixin.qq.com → 设置与开发 → 基本配置 → 服务器配置 | dev.weixin.qq.com → 公众号 → **接口权限 / 消息推送** |
| **业务域名 / 网页授权域名 / JS安全域名** | mp.weixin.qq.com → 设置与开发 → 公众号设置 → 功能设置 | **仍在 mp.weixin.qq.com** (这些是运营/前端配置) |
| **自定义菜单** | mp.weixin.qq.com → 自定义菜单(老接口) | **API 推送**(推荐) 或 dev.weixin.qq.com |
| **关键词自动回复** | mp.weixin.qq.com → 自动回复 | **仍在 mp.weixin.qq.com** |
| **关注后自动回复** | mp.weixin.qq.com → 自动回复 | **仍在 mp.weixin.qq.com** |

---

## 第 1 步 — 在「微信开发者平台」绑定公众号(必做,5 分钟)

### 1.1 登录
打开 https://dev.weixin.qq.com/ → 用**公众号管理员**微信扫码登录。

### 1.2 绑定公众号
- 顶部菜单:「账号中心」或「我的公众号」或「关联账号」
- 找到「**绑定公众号**」→ 扫公众号后台的绑定码
  - 在 https://mp.weixin.qq.com 顶部横幅找绑定码
- 绑定成功后,在 dev.weixin.qq.com 左侧菜单看到「**服务号**」/「**公众号**」

> 💡 看到服务号/公众号卡片后,点击进入详情页 —— 后续所有开发配置都在那里。

### 1.3 验证绑定成功
详情页应能看到 AppID:`wx30fe5cd917eb2e7a`(这是我们的 `WECHAT_MP_APP_ID`)

---

## 第 2 步 — IP 白名单(必做,3 分钟)

### 2.1 入口
dev.weixin.qq.com → 公众号详情 → 「**开发信息**」或「**开发者配置**」 →
**「IP 白名单」** → 「**修改**」/「**添加**」

### 2.2 粘贴这个 IP(**只加这 1 个,删掉之前 3 个 Vercel IP**)

```
43.129.207.154
```

> 🎉 **更新(2026-06-03 22:30)**:§2.4 B 方案 CVM 固定 IP 代理已**基本就绪** — 出口 IP 就是这一个 `43.129.207.154`(腾讯云 HK CVM 固定公网 IP)。把之前白名单里 3 个 Vercel IP 删了,只加这一个即可。
>
> 如果 CVM 端 nginx 还没部署完(等 SSH 恢复中),临时再加下面 3 个 Vercel IP,等部署完再清掉:
>
> ```
> 54.144.220.173
> 35.175.142.58
> 34.239.148.227
> ```
>
> **历史背景**(了解即可,不需要再操作):这 3 个 Vercel IP 是历史 40164 调查时实测发现的 AWS US East NAT 池中的 IP,但**白名单是 50 IP 上限硬限**,AWS US East EC2 出口 NAT 段约 6100 个 IP,**白名单方案不可持续** — 这就是为什么走了 §2.4 B 方案。

### 2.3 万一 IP 又换了:跑这个脚本自动发现

```bash
# 在你 Mac 跑这个,会把当前所有出现过的 IP 列出来
for i in $(seq 1 20); do
  curl -sS -X POST -H "X-Internal-Token: $(cat /tmp/internal_api_token.txt)" \
    --max-time 10 "https://aiwill-planner.vercel.app/api/wechat/admin/menu" \
    | /usr/local/bin/python3 -c "
import sys, re, json
try:
    d = json.loads(sys.stdin.read())
    m = re.search(r'invalid ip ([\d\.]+)', d.get('message',''))
    if m: print(m.group(1))
    elif d.get('ok'): print('SUCCESS - IP 已加入白名单')
except: pass
"
  sleep 0.3
done | sort -u
```

任何新 IP 出现 → 加到白名单(直到 50 个上限)。

### 2.4 长期方案:固定 IP 代理(✅ 已选定方案 C:大陆 CVM 直推, 跳过 HK 反代)

> 历史方案 B (HK CVM nginx 反代) 已废弃: HK CVM (43.129.207.154) SSH 不稳定, nginx 反代配置难部署, 多次失败。
> 新方案 C: **公众号写 API 调用全部在大陆 CVM `124.222.215.107` 上执行**, Vercel 不再需要反代。

**架构**:
```
[Vercel Function] --HTTPS--> [api.weixin.qq.com]  (只读 OAuth 等无需白名单)
                                              ↑
[CVM:124.222.215.107] --HTTPS--> [api.weixin.qq.com]  (菜单/客服消息/用户管理)
   ↑                              ↑
   固定公网 IP                       永久白名单 1 个 IP
```

**已部署**:
- ✅ CVM `/root/aiwill-self-ops/wechat_menu_push.py` (238 行)
- ✅ CVM `.env` 含 `WECHAT_MP_APP_ID` + `WECHAT_MP_APP_SECRET`
- ✅ 微信白名单加 `124.222.215.107` (1 个 IP, 不浪费 50 个名额)
- ✅ 验证: `wechat_menu_push.py --push` → `{"errcode":0,"errmsg":"ok"}`

**优势**:
- 微信白名单永远只需 1 个 IP (`124.222.215.107`)
- 不依赖 HK CVM 反代稳定性
- 复用现有大陆 CVM, **零额外成本**
- 所有写 API 走 CVM, 读 API 走 Vercel, 职责清晰

### 2.5 验证

CVM 上执行:
```bash
ssh aiwill-server
sudo -n bash -c "cd /root/aiwill-self-ops && set -a && . ./.env && set +a && /usr/bin/python3 wechat_menu_push.py --push"
```

**期望返回**:
```json
{"errcode":0,"errmsg":"ok"}
{"✓ 成功, 共 3 个一级菜单"}
```

---

## 第 3 步 — 服务器配置(让消息能到我们后端,5 分钟)

### 3.1 入口
dev.weixin.qq.com → 公众号详情 → 「**接口权限**」/「**消息推送**」/「**服务器配置**」

> 找不到时,试试左侧菜单: 「**开发信息**」「**消息管理**」「**基础配置**」「**回调配置**」

页面中部应该有「**服务器配置**」区块,包含 [启用] 按钮,点进去填表。

### 3.2 把这 4 项**一个字不差**粘贴

| 字段 | 粘这个 |
|------|--------|
| **URL** | `https://aiwill-planner.vercel.app/api/wechat/mp-callback` |
| **Token** | `K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG` |
| **EncodingAESKey** | 点 **「随机生成」** 按钮(43 字符),然后**立即复制粘贴**到下面第 3.3 步 |
| **消息加解密方式** | 选 **「安全模式」** |

### 3.3 立即同步新 AESKey 到 Vercel

> ⚠️ 重要:第 3.2 步「随机生成」会产生**新的** AESKey;Vercel 上当前的 `a1B2c3D4...` 是旧值,必须更新,否则验签失败。

把新生成的 43 字符 AESKey 发给我(粘贴到这个对话里),我会用一行命令同步到 Vercel:

```bash
# 由 Master Agent 执行(不需要你做):
curl -sS -X PATCH "https://api.vercel.com/v9/projects/prj_xWT0kOyJfp1Mwr0v307wH6Ez0K3P/env/WECHAT_MP_AES_KEY?teamId=team_WMYzU3qKNxH5sC6YypHSbX4v" \
  -H "Authorization: Bearer $V_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"value\":\"<你贴这里>\",\"target\":[\"production\",\"preview\"]}"
```

然后我会触发 redeploy(30 秒内完成)。

### 3.4 点 [提交]

公众号会向 URL 发 GET `?signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx` → 我们后端验签并原样返回 echostr → 公众号显示 ✅ 「配置成功」。

**如果失败**:
- 检查 Token 是否一字不差 (`K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG`)
- 检查 Vercel env `WECHAT_MP_TOKEN` 值是否相同
- 检查 URL 必须 HTTPS 且公网可访问(https://aiwill-planner.vercel.app/api/wechat/mp-callback 已验证返回 200)

### 3.5 老平台回退(新平台找不到时)

如果你在 dev.weixin.qq.com 怎么都找不到「服务器配置」入口,可能部分公众号暂未迁移完全。回退路径:
- https://mp.weixin.qq.com → 左侧菜单 → 「**设置与开发**」 → 「**基本配置**」 → 中部「**服务器配置**」区块

如果 mp.weixin.qq.com 也不再显示「服务器配置」,说明 100% 迁移了 — 100% 在新平台。

---

## 第 4 步 — 业务/网页授权域名(仍在老平台 mp.weixin.qq.com,5 分钟)

> 这部分**没迁移**,仍在 微信公众平台 (mp.weixin.qq.com)

### 4.1 入口
https://mp.weixin.qq.com → 左侧菜单 → 「**设置与开发**」 → 「**公众号设置**」 → 「**功能设置**」 Tab

### 4.2 一次性把域名都加上

| 字段 | 粘这个 |
|------|--------|
| **业务域名** | `aiwill-planner.vercel.app` (CN 用 521 修好再加) |
| **网页授权域名** | `aiwill-planner.vercel.app` + `aiwill-planner.cn` |
| **JS 接口安全域名** | `aiwill-planner.vercel.app` |

### 4.3 下载校验文件

每加一个域名,公众号会让你下载 `MP_verify_xxx.txt`。把文件**作为静态资源**部署:

```bash
# 假设文件下载到 ~/Downloads/
mv ~/Downloads/MP_verify_xxx.txt /Users/maran/aiwill-planner/public/
cd /Users/maran/aiwill-planner
git add public/MP_verify_*.txt
git commit -m "chore: add WeChat domain verify files"
git push
# Vercel 自动 redeploy,~30 秒后 https://aiwill-planner.vercel.app/MP_verify_xxx.txt 可访问
```

发我一下文件名前缀(如 `MP_verify_abc123`),我会帮你 commit/push。

### 4.4 验证
回到公众号页面点「校验」按钮,看到 ✅ 即成功。

---

## 第 5 步 — 自动回复(仍在老平台,5 分钟)

### 5.1 关注后自动回复
https://mp.weixin.qq.com → 左侧菜单 → 「**内容与互动**」/「**自动回复**」 → 「**被关注回复**」 Tab → 「添加回复」

**类型**:文字
**回复内容**(直接粘贴):

```
欢迎来到 Bob的科技探索园 👋

我们是一个专注于"婚姻、家庭、传承"的 AI 法律助手平台。

🚀 立即体验:https://aiwill-planner.vercel.app/questionnaire
📦 查看订单:https://aiwill-planner.vercel.app/orders
💬 客服服务:工作日 9:00-21:00,回复【人工】

回复以下关键词获取帮助:
【订单】查订单 / 【价格】看套餐 / 【备案】查 ICP / 【帮助】使用指南
```

### 5.2 关键词回复(7 个)
「**自动回复**」 → 「**关键词自动回复**」 Tab → 「添加规则」(每个关键词一条)

| 关键词 | 匹配方式 | 回复内容 |
|---|---|---|
| `订单` | 半匹配 | `查看您的订单:https://aiwill-planner.vercel.app/orders\n\n首次访问请先点公众号菜单 → 我的账户 → 账号绑定。` |
| `价格` | 半匹配 | `📋 三个套餐:\n\n• 基础版 ¥19.9 — AI 起草模板\n• 标准版 ¥999 — 律师审核\n• 尊享版 ¥4699 — 律师代办全流程\n\n详情:https://aiwill-planner.vercel.app/` |
| `备案` | 半匹配 | `网站 ICP 备案号:沪 ICP 备 2026020925 号-1\n\n查询:https://beian.miit.gov.cn` |
| `帮助` | 半匹配 | `📚 使用帮助:https://aiwill-planner.cn/faq\n\n如需人工服务,工作日 9:00-21:00 回复【人工】` |
| `人工` | 全匹配 | `客服正在为您接入,请稍候 1-2 分钟…\n\n如急需联系,可加微信:[替换为人工微信号]` |
| `绑定` | 全匹配 | `绑定微信:https://aiwill-planner.vercel.app/wechat/bind\n\n绑定后可查看订单、接收客服通知。` |
| `律师` | 半匹配 | `预约律师审核:https://aiwill-planner.vercel.app/?action=lawyer` |

---

## 第 6 步 — 自定义菜单(API 推送,5 分钟)

> 推荐用 API 推送(已写好代码,一行命令即可),不推荐在 mp.weixin.qq.com 手动配 3 列 9 项菜单。

等第 1-2 步完成(IP 白名单 + 服务器配置)后,在你 Mac 执行:

```bash
curl -X POST -H "X-Internal-Token: $(cat /tmp/internal_api_token.txt)" \
  https://aiwill-planner.vercel.app/api/wechat/admin/menu
```

**期望返回**:
```json
{"ok":true,"action":"create","buttons":3,"source":"src/lib/wechat/menu-config.ts"}
```

菜单代码已在 `src/lib/wechat/menu-config.ts` (commit `9002325`):
- 立即体验 / 我的账户 / 帮助中心(3 列)
- 共 9 个子菜单(起草遗嘱、我的订单、联系律师 × 2 / 账号绑定、人工客服、备案查询、使用帮助、联系律师、公众号查看订单)

---

## 第 7 步 — Cloudflare SSL 模式(修 521,2 分钟)

### 7.1 入口
https://dash.cloudflare.com → 选 `aiwill-planner.cn` zone → 左侧 **「SSL/TLS」** → **「Overview」** Tab

### 7.2 改设置
当前选项应该是 Full / Full(strict) → 改为 **「Flexible」**

> 原因:Vercel 后端为 aiwill-planner.cn 颁发的是 Let's Encrypt 证书,CF 试图 strict 校验失败导致 521。Flexible 模式下 CF→Vercel 走 HTTP,CF 处理外层 HTTPS。

### 7.3 验证(~30 秒)
```bash
curl -I https://aiwill-planner.cn/
# 期望: HTTP/2 200
```

---

## ✅ 全部完成后的端到端验证

```bash
# 1. 公众号回调验签工作
curl "https://aiwill-planner.vercel.app/api/wechat/mp-callback?signature=$(printf '%s%s%s' "$(date +%s)" "test" "K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG" | shasum -a 1 | cut -d' ' -f1)&timestamp=$(date +%s)&nonce=test&echostr=hello"
# 期望: hello

# 2. 自定义菜单已挂上
curl -H "X-Internal-Token: $(cat /tmp/internal_api_token.txt)" \
  "https://aiwill-planner.vercel.app/api/wechat/admin/menu?action=fetch"
# 期望: {"menu":{"button":[{"name":"立即体验",...}]}}

# 3. 主域可访问
curl -I https://aiwill-planner.cn/
# 期望: HTTP/2 200

# 4. OAuth 链接可生成
curl -I "https://aiwill-planner.vercel.app/wechat/bind?return=/orders"
# 期望: HTTP 200
```

3/4 全部通过 = 公众号正式上线。

---

## 📞 故障处理

| 现象 | 原因 | 修复 |
|---|---|---|
| `40164 invalid ip` | Vercel egress IP 未在白名单 | 第 2 步 |
| 验签失败 (token check fail) | Token 不一致 | 重新粘 `K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG` |
| 加密模式不一致 | Vercel env AESKey 与公众号后台不一致 | 第 3.3 步同步新 AESKey 到 Vercel |
| 菜单推送时 40164 | IP 白名单 + 服务器配置都还没做 | 先做第 2、3 步再做第 6 步 |
| `redirect_uri_mismatch` | 域名未添加到「网页授权域名」 | 第 4 步 |
| HTTP 522/521 | CF 与 Vercel SSL 不匹配 | 第 7 步 |
| 在 dev.weixin.qq.com 找不到「服务器配置」 | 入口路径有变 | 试左侧菜单: 开发信息 / 接口权限 / 消息推送 / 回调配置 / 基础配置 |
| 在 mp.weixin.qq.com 找不到「服务器配置」 | 已迁到新平台 | 第 3.1 步去 dev.weixin.qq.com |

---

## 📝 一份完整的当前 env 索引(仅 key 名 + 长度,不含明文 secrets)

| Vercel Env Key | 长度 | 用途 |
|---|---|---|
| `WECHAT_MP_APP_ID` | 18 | `wx30fe5cd917eb2e7a` |
| `WECHAT_MP_TOKEN` | 31 | `K8jL3nP9qR2sT5vW7xY0zA4bC6dE8fG` |
| `WECHAT_MP_APP_SECRET` | 32 | (机密) |
| `WECHAT_MP_AES_KEY` | 45 | (机密) ⚠ 第 3 步会换新值 |
| `INTERNAL_API_TOKEN` | 64 | `ebc6e5fe...`(保存在 `/tmp/internal_api_token.txt`) |
| `SITE_URL` | 27 | `https://h5.aiwill-planner.cn` |
| `NEXT_PUBLIC_SUPABASE_URL` | (机密) | Supabase API base |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (机密) | Supabase 客户端 key |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | (机密) | Stripe 价格 ID |

---

## 🔗 官方文档源(可自查)

- 平台总览:https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Service_Account_Upgrade_Description.html
- 开发者平台定义: https://dev.weixin.qq.com/
- 服务号开发指南: https://developers.weixin.qq.com/doc/offiaccount/

---

## Master Agent 已为你做完的部分(你不用再做)

- ✅ 所有 env 变量已写入 Vercel 并在 production+preview 生效(包括 `WECHAT_PROXY_URL=http://43.129.207.154:9443`)
- ✅ 代码已推到 GitHub `main` 分支(commit `9002325` + docs `e5f6635`/`f8b4b3c`/`247b129`/`04c2a3e` + 这次 CVM 代理改造)
- ✅ Vercel 部署 `dpl_3uM7UJ8wB6Rrufaj` 已 READY 并切换为 production alias
- ✅ `/api/wechat/admin/menu` 端点已上线(auth 工作)
- ✅ `/wechat/{bind,callback,success}` 3 个 H5 页面已上线(Suspense 已修)
- ✅ `INTERNAL_API_TOKEN` 已生成并保存到 `/tmp/internal_api_token.txt`
- ✅ **CVM 固定 IP 代理方案已落地 (2026-06-03 22:30)**:
  - `src/lib/wechat/config.ts` 改造: `WECHAT_API_BASE` 跟随 `WECHAT_PROXY_URL` env 切换(影响 `mp-api.ts` 和 `oauth.ts`)
  - Vercel env `WECHAT_PROXY_URL` 已 API 设置并验证 (production + preview)
  - HK CVM 端 nginx 反代配置已写到 `deployment/hk-server/wechat-proxy.conf.snippet` — **待 SSH 恢复后 scp 上去 + nginx -s reload 即可**
- 🔴 **仍需你做 1 件事**: 把微信白名单的 3 个 Vercel IP 删了,只加 `43.129.207.154`
