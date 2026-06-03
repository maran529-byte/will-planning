# 中国大陆站点 DNS 修复指南

> 创建时间: 2026-06-03
> 状态: 阻塞 - 用户必须在 Cloudflare 控制台手动改 DNS 记录
> 优先级: P0 (备案通过前, 中国大陆用户无法访问)

---

## 1. 当前状态

| 项目 | 值 |
|---|---|
| 域名 | `aiwill-planner.cn` |
| 当前 DNS 解析 | `198.18.1.48` ❌ |
| 实际服务器 IP | `124.222.215.107` ✅ |
| 期望 DNS 解析 | `124.222.215.107` |
| 服务器状态 | nginx 1.24.0 正常, 200 OK |
| ICP 备案头 | `X-Beian: 沪ICP备2026020925号-1` ✅ |
| 防火墙 | 124.222.215.107:80 正常 (腾讯云默认放行) |

### 1.1 直接 IP 访问 (正常)

```bash
$ curl -sI http://124.222.215.107/
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
X-Beian: 沪ICP备2026020925号-1
```

### 1.2 域名访问 (失败)

```bash
$ nslookup aiwill-planner.cn 8.8.8.8
Address: 198.18.1.48   # ← 错误! IANA 保留 Benchmarking 段, 不是服务器

$ curl -sI http://aiwill-planner.cn/  # 解析到 198.18.1.48 后超时/拒绝
curl: (7) Failed to connect to 198.18.1.48 port 80
```

`198.18.0.0/15` 是 IANA 保留给 "Benchmarking" 的 IP 段, 公共 DNS 不应返回该地址。
说明域名 DNS 记录**配置错误** (Cloudflare 仪表盘 A 记录没指向 124.222.215.107)。

---

## 2. 修复步骤 (用户需在 Cloudflare 控制台操作)

### 2.1 登录 Cloudflare

- 网址: https://dash.cloudflare.com/
- 选中域名 `aiwill-planner.cn`

### 2.2 修改 DNS 记录

进入 **DNS → Records** 页面, 修改/添加以下 A 记录:

| Type | Name | Content | Proxy | TTL |
|---|---|---|---|---|
| A | `@` (根域) | `124.222.215.107` | **DNS only** (灰色云) | Auto |
| A | `www` | `124.222.215.107` | **DNS only** (灰色云) | Auto |

**关键**: Proxy 状态必须设为 **DNS only** (灰色云朵), 不是 Proxied (橙色云朵)。
原因: 备案完成前 Cloudflare 节点不能代理中国大陆域名, 否则会触发合规审查。

### 2.3 (可选) SSL/TLS 设置

如果 Cloudflare 代理开启 (橙色云), SSL/TLS → Overview → 模式必须选 **Full**, 不是 Flexible。
因为源站 nginx 没配 SSL (只监听 80 端口), Flexible 模式会让用户→Cloudflare HTTPS, 但 Cloudflare→源站 HTTP, Cloudflare 会回源失败。

**当前方案不需要 SSL** (DNS only 模式, Cloudflare 不代理, 用户直接连源站 80 端口)。

### 2.4 验证

修改后, 等待 DNS 传播 (5-30 分钟), 然后测试:

```bash
# 期望返回 124.222.215.107
nslookup aiwill-planner.cn 8.8.8.8

# 期望 200 OK
curl -sI http://aiwill-planner.cn/
```

---

## 3. 备案 (ICP) 状态

| 项目 | 值 |
|---|---|
| 备案号 | 沪ICP备2026020925号-1 |
| 状态 | **已通过** (Vercel H5 站点和 CN nginx 都已加备案号) |
| 公安备案 | 待办 (备案号下来后 30 天内必须做) |

### 3.1 当前备案号在哪些页面

- ✅ Vercel H5 (`/`, `/questionnaire`, `/orders`, `/payment`, `/result`)
  - 通过 `src/components/Legal/LegalFooter.tsx` 全站覆盖
- ✅ CN nginx 静态页 (`/`, `/faq`, `/tutorial`, `/compare`, `/tool`)
  - 5 个 HTML 页面 footer 都含 ICP 链接

### 3.2 公安备案 (待办)

- 入口: https://beian.mps.gov.cn/
- 所需: 营业执照 + 法人身份证 + 网站备案号
- 期限: 备案号下来后 30 天内
- 公安备案号格式: 京公网安备 XXXXXXX 号

---

## 4. 微信公众号集成 (Day 1 完成)

### 4.1 当前状态 (✅ 全部通过)

| 步骤 | 状态 |
|---|---|
| HK CVM nginx 反代 (43.129.207.154:80) | ✅ |
| 微信公众号 IP 白名单 (43.129.207.154) | ✅ |
| Vercel 环境变量 WECHAT_PROXY_URL 配置 | ✅ |
| access_token 获取 (WeChat 200 OK) | ✅ |
| cgi-bin/getcallbackip (读) | ✅ |
| cgi-bin/get_current_selfmenu_info (读) | ✅ |
| **cgi-bin/menu/create** (写) | ❌ **48001** |
| **cgi-bin/menu/delete** (写) | ❌ **48001** |
| **cgi-bin/user/get** (写) | ❌ **48001** |

### 4.2 48001 根因分析

微信公众号 `wx30fe5cd917eb2e7a` 是**订阅号 (非认证个人订阅号)**。
微信 API 权限:

| API 类别 | 订阅号 | 服务号 | 微信测试号 |
|---|---|---|---|
| 接收消息 / 自动回复 | ✅ | ✅ | ✅ |
| 自定义菜单 (create/get/delete) | ❌ | ✅ | ✅ |
| 用户管理 (user/get) | ❌ | ✅ | ✅ |
| 客服消息 (48h 窗口) | ❌ | ✅ | ✅ |
| 模板消息 | ❌ | ✅ | ✅ |
| OAuth 网页授权 | ❌ | ✅ | ✅ |

**结论**: 订阅号 API 受限, 48001 是 WeChat 返回的"功能未授权"。

### 4.3 两个解决方案

#### 方案 A: 升级为「服务号」 (生产推荐)

- 所需: **企业营业执照** (个体工商户也行) + 法人身份证
- 费用: 微信认证 ¥300/年
- 时长: 提交后 1-7 个工作日审核
- 步骤:
  1. mp.weixin.qq.com → 设置与开发 → 微信认证 → 申请
  2. 提交营业执照 + 法人身份证
  3. 打款验证 (微信打 1 分钱到指定账号, 备注里填验证金额)
  4. 审核通过后即可使用服务号 API

#### 方案 B: 微信测试号 (开发推荐)

- 入口: https://mp.weixin.qq.com/debug/cgi-bin/sandboxinfo?action=showinfo&t=sandbox/index
- 优点: 5 分钟开通, **支持所有 API** (菜单、用户、客服、模板)
- 缺点: 有效期 1 年, 关注者上限 100 人
- 适用: 开发联调 / MVP 演示
- 步骤:
  1. 登录 mp.weixin.qq.com
  2. 进入测试号管理
  3. 拿到测试号 appID/secret, 替换 Vercel env 的 WECHAT_MP_APP_ID 和 WECHAT_MP_APP_SECRET
  4. 测试号 → 体验者管理 → 添加你的微信号
  5. 测试号 → 自定义菜单 → 可以正常创建

### 4.4 推荐路径

1. **今天**: 切换到方案 B (测试号), 跑通全链路 (菜单 + 客服 + 绑定)
2. **本周**: 准备营业执照, 提交方案 A 升级服务号
3. **审核通过后**: 切回正式 appID, 测试号保留作为开发环境

---

## 5. 服务器清单

| 服务器 | 公网 IP | 角色 | 状态 |
|---|---|---|---|
| 腾讯云轻量 HK | `43.129.207.154` | 微信反代 (port 80) | ✅ nginx + proxy_pass |
| 腾讯云 CVM CN | `124.222.215.107` | 静态站 (port 80) | ✅ nginx + static |
| Vercel Global | `aiwill-planner.vercel.app` | Next.js H5 + API | ✅ Serverless |

---

## 6. 紧急回滚

如果 Cloudflare 改完出问题:

```bash
# 1. 删 A 记录
# Cloudflare → DNS → Records → Delete @ (aiwill-planner.cn)

# 2. 加回原 Cloudflare parking
# Type: A, Name: @, Content: 104.21.x.x (Cloudflare 提供的占位 IP), Proxy: Proxied
```

不会影响其他服务, 因为源站 IP `124.222.215.107` 一直在 80 端口正常工作。

---

## 7. 相关文件

- `deployment/mainland-server/nginx.conf` — CN nginx 配置 (静态)
- `deployment/mainland-server/deploy_mainland.sh` — 一键远程部署
- `deployment/mainland-server/compliance_check.sh` — 7项合规自检
- `deployment/mainland-server/sitemap.xml`, `robots.txt` — SEO 资产
- `deployment/hk-server/wechat-proxy.conf` — HK 微信反代配置
- `src/lib/wechat/config.ts` — Vercel 端 WECHAT_PROXY_URL + 48001 警告
- `docs/公众号配置清单.md` — 公众号开发配置
- `docs/公众号集成架构_v1.md` — 集成架构设计
