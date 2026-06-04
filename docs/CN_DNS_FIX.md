# 中国大陆站点 DNS 修复指南

> 创建时间: 2026-06-03
> 最后更新: 2026-06-04 (新增 HTTPS + h5 子域配置)
> 状态: 部分完成 - 服务器端已修好, 等用户在 Cloudflare 加 DNS 记录
> 优先级: P0 (没修好之前, 中国大陆用户无法访问)

---

## 0. TL;DR — 用户需要在 Cloudflare 加 2 条记录

| 记录类型 | 名称 | 内容 | 代理模式 | 说明 |
|---|---|---|---|---|
| A | `@` | `124.222.215.107` | **DNS only** (灰色云) | aiwill-planner.cn → 大陆 CVM 静态站 |
| A | `www` | `124.222.215.107` | **DNS only** (灰色云) | www 同上 |
| CNAME | `h5` | `cname.vercel-dns.com` | **DNS only** (灰色云) | h5.aiwill-planner.cn → Vercel H5 |

加完后等 5-30 分钟 DNS 传播, 然后验证。

---

## 1. 修复历史

### 1.1 ✅ 已修: 源站 HTTPS 缺失 (2026-06-04)

**问题**: 主 `/etc/nginx/nginx.conf` 之前被改为「合规收紧版」, 删除了 443 监听器。
导致 https://124.222.215.107 完全连不上 (443 端口不存在)。

**修复**:
- 提交 a4ba394: 重新添加 443 server block, 用 `/etc/letsencrypt/live/aiwill-planner.cn/` 现有证书
- HTTP 80 改为整站 301 跳 HTTPS (return 301 https://$host$request_uri)
- HTTP/2 通过 `listen 443 ssl http2;` 启用 (nginx 1.24 语法)
- 所有 location 块镜像到 443 server

**验证 (源站直连)**:
```bash
$ curl -I https://124.222.215.107/
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
X-Beian: 沪ICP备2026020925号-1
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
```

### 1.2 ✅ 已修: Vercel h5 子域 (2026-06-04)

**问题**: `aiwill-planner.vercel.app` 在中国大陆被 DNS 污染 + GFW 屏蔽, 用户必须有代理才能访问。
**根因**: `*.vercel.app` 域名没有 ICP 备案, 中国大陆运营商直接 reset。

**修复**:
- 通过 Vercel API 给项目 `prj_xWT0kOyJfp1Mwr0v307wH6Ez0K3P` 加了 `h5.aiwill-planner.cn`
- 状态: `verified: true` (Vercel 自动用 apex 域验证)
- 用户现在在 Cloudflare 加 CNAME 后, 就能用 `h5.aiwill-planner.cn` 访问 H5, 不需代理

### 1.3 ❌ 待用户操作: Cloudflare DNS 记录 (最关键)

DNS 从公网解析 (`nslookup aiwill-planner.cn 223.5.5.5`) 返回:
```
Address: 104.21.83.107
Address: 172.67.223.118
```

这俩是 Cloudflare 自己的 IP (orange cloud 代理模式), **不是源站 124.222.215.107**。
意味着用户从浏览器访问 aiwill-planner.cn 时, 流量先到 Cloudflare, Cloudflare 再回源到... 哪里? 看 SSL/TLS 设置。

如果 Cloudflare SSL/TLS 模式是 "Full" 或 "Full (Strict)" → Cloudflare 连到 124.222.215.107:443 (现在通了)
如果是 "Flexible" → Cloudflare 连到 124.222.215.107:80 (HTTP) (现在也通, 但浏览器显示锁是 CF 的, 不是真 HTTPS)
如果是 "Off" → 浏览器直接打 https://... 到 Cloudflare, Cloudflare 不回源 → 失败

---

## 2. 详细修复步骤 (用户需在 Cloudflare 控制台操作)

### 2.1 登录 Cloudflare

- 网址: https://dash.cloudflare.com/
- 选中域名 `aiwill-planner.cn`

### 2.2 修改/添加 DNS 记录

进入 **DNS → Records** 页面:

| Type | Name | Content | Proxy | TTL | 操作 |
|---|---|---|---|---|---|
| A | `@` | `124.222.215.107` | **DNS only** (灰色云) | Auto | 修改 (当前应是 orange cloud → 124.222.215.107 或 Cloudflare IP) |
| A | `www` | `124.222.215.107` | **DNS only** (灰色云) | Auto | 修改 (如不存在则添加) |
| CNAME | `h5` | `cname.vercel-dns.com` | **DNS only** (灰色云) | Auto | 添加 |
| A | `api` | `124.222.215.107` | **DNS only** (灰色云) | Auto | 添加 (Supabase Kong 入口, 内部) |

**关键**: Proxy 状态全部设为 **DNS only** (灰色云朵)。
原因:
1. 备案号 2026-02-09 下来后短期内 Cloudflare 节点代理 CN 域名会触发审查
2. 我们源站已经稳定 + 有 HTTPS, 不需要 Cloudflare CDN
3. 如果想用 Cloudflare CDN, 等备案满 1 个月后再开, SSL/TLS 模式设 "Full"

### 2.3 SSL/TLS 设置

SSL/TLS → Overview → 模式:
- 如果用 "DNS only" 模式 (推荐) → 这里**无关紧要** (CF 不回源, 用户直连)
- 如果用 "Proxied" 模式 → 必须选 **Full** (不是 Flexible, 不是 Full (Strict))
  - 源站 124.222.215.107 证书是 Let's Encrypt 签发, Full (Strict) 也能通过

### 2.4 验证

修改后等待 5-30 分钟 DNS 传播, 然后测试:

```bash
# 1. DNS 应返回 124.222.215.107
$ nslookup aiwill-planner.cn 8.8.8.8
Address: 124.222.215.107  ✅

$ nslookup h5.aiwill-planner.cn 8.8.8.8
h5.aiwill-planner.cn    canonical name = cname.vercel-dns.com
cname.vercel-dns.com    canonical name = ...
Address: <Vercel IP>   ✅

# 2. HTTPS 应返回 200
$ curl -I https://aiwill-planner.cn/
HTTP/2 200
server: nginx/1.24.0 (Ubuntu)
x-beian: 沪ICP备2026020925号-1
strict-transport-security: max-age=31536000; includeSubDomains

# 3. H5 应返回 200 (Vercel 走 Next.js)
$ curl -I https://h5.aiwill-planner.cn/
HTTP/2 200
server: Vercel
x-vercel-id: ...
```

如果第 1 步不通, 等更久 (Cloudflare DNS TTL 5 分钟, 但国内 DNS 缓存可能 30 分钟)。
如果第 2 步不通, 重新检查 §2.2 的 Proxy 模式。
如果第 3 步不通, 检查 §2.2 的 h5 CNAME。

---

## 3. 备案 (ICP) 状态

| 项目 | 值 |
|---|---|
| 备案号 | 沪ICP备2026020925号-1 |
| 状态 | **已通过** |
| 公安备案 | 待办 (备案号下来后 30 天内必须做) |
| 域名 | aiwill-planner.cn, www.aiwill-planner.cn |
| 接入商 | 腾讯云 (DNSPod) - 默认在腾讯云, 但用户用了 Cloudflare |

### 3.1 备案号显示位置 (全站覆盖)

- ✅ Vercel H5: `src/components/Legal/LegalFooter.tsx` (根 layout 引用, 5 个页面全覆盖)
- ✅ CN nginx: 主配置文件 `add_header X-Beian "沪ICP备2026020925号-1" always;` (5 个 HTML 页面)

### 3.2 公安备案 (待办)

- 入口: https://beian.mps.gov.cn/
- 所需: 营业执照 + 法人身份证 + 网站备案号
- 期限: 备案号下来后 30 天内
- 公安备案号格式: 京公网安备 XXXXXXX 号

---

## 4. 微信公众号集成 (Day 1 完成, 不在本次修复范围)

### 4.1 当前状态 (✅ 全部通过)

| 步骤 | 状态 |
|---|---|
| HK CVM nginx 反代 (43.129.207.154:80) | ✅ |
| 微信公众号 IP 白名单 (43.129.207.154) | ✅ |
| Vercel 环境变量 WECHAT_PROXY_URL 配置 | ✅ |
| access_token 获取 (WeChat 200 OK) | ✅ |
| cgi-bin/getcallbackip (读) | ✅ |
| cgi-bin/get_current_selfmenu_info (读) | ✅ |
| cgi-bin/menu/create (写) | ❌ 48001 (订阅号限制) |
| cgi-bin/menu/delete (写) | ❌ 48001 (订阅号限制) |
| cgi-bin/user/get (写) | ❌ 48001 (订阅号限制) |

### 4.2 48001 解决方案

`wx30fe5cd917eb2e7a` 是订阅号, 写 API 需服务号或测试号:
- **方案 A**: 升级「服务号」(需营业执照 + ¥300/年)
- **方案 B**: 微信测试号 (5 分钟, 1 年有效, 适合开发联调)

用户说稍后做, 本次跳过。

---

## 5. 服务器清单

| 服务器 | 公网 IP | 角色 | 状态 | 端口 |
|---|---|---|---|---|
| 腾讯云 CVM CN | `124.222.215.107` | 静态站 | ✅ | 80 + 443 (HTTPS) |
| 腾讯云轻量 HK | `43.129.207.154` | 微信反代 | ✅ | 80 (HTTP) |
| Vercel Global | `cname.vercel-dns.com` | Next.js H5 + API | ✅ | Serverless |

Vercel 项目域名 (`prj_xWT0kOyJfp1Mwr0v307wH6Ez0K3P`):
- ✅ `h5.aiwill-planner.cn` (新, 2026-06-04 加)
- ✅ `aiwill-planner.cn` (老)
- ✅ `aiwill-planner.vercel.app` (默认, CN 用户无法访问)

---

## 6. 紧急回滚

如果 Cloudflare 改完出问题:

```bash
# 1. 删 A 记录 (aiwill-planner.cn)
# Cloudflare → DNS → Records → Delete @

# 2. 删 CNAME 记录 (h5)
# Cloudflare → DNS → Records → Delete h5

# 3. 删 www 记录 (如新加的)
# Cloudflare → DNS → Records → Delete www
```

不会影响其他服务, 因为:
- 源站 IP `124.222.215.107` 一直正常 (200 OK, HTTPS 也通了)
- Vercel 的 `h5.aiwill-planner.cn` 验证不依赖 Cloudflare (Vercel 自己的 DNS 已 verify)
- 用户可以暂时直接用 IP 访问: `https://124.222.215.107/`

---

## 7. 相关文件

- `deployment/mainland-server/nginx.conf` — CN nginx 配置 (含 443 HTTPS, 已更新)
- `deployment/mainland-server/deploy_mainland.sh` — 一键远程部署
- `deployment/mainland-server/compliance_check.sh` — 7项合规自检
- `deployment/mainland-server/sitemap.xml`, `robots.txt` — SEO 资产
- `deployment/hk-server/wechat-proxy.conf` — HK 微信反代配置
- `src/lib/wechat/config.ts` — Vercel 端 WECHAT_PROXY_URL + 48001 警告
- `docs/公众号配置清单.md` — 公众号开发配置
- `docs/公众号集成架构_v1.md` — 集成架构设计
- GitHub 提交: `a4ba394` (nginx HTTPS) + `6b538d3` (DNS fix 文档)
