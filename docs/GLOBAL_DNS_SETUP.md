# 全球化项目 W1.11 — DNS & Cloudflare 配置手册 (零成本)

> 目标: 让 `en.aiwill-planner.cn` 海外访问加速 (国内回源 + 海外 CDN)
> 复用现有域名 aiwill-planner.cn, 仅增加子域名解析。

---

## 1. 在腾讯云/阿里云域名控制台加解析

| 字段 | 值 |
|---|---|
| 主机记录 | `en` |
| 记录类型 | `A` |
| 记录值 | (现有 aiwill-planner.cn 的服务器 IP, 同主机) |
| TTL | 600 (10 分钟, 方便调试) |
| 备注 | 海外加速子域 (零成本复用) |

> ⚠️ 不需要单独申请 SSL 证书, Cloudflare 会自动签发 + 自动续期。

---

## 2. Cloudflare 免费账号配置

### 2.1 添加站点

1. 注册/登录 https://dash.cloudflare.com (免费版即可)
2. 点 "Add a Site" → 输入 `aiwill-planner.cn` (整个 apex 域)
3. 选择 Free plan (¥0)
4. Cloudflare 会扫描现有 DNS 记录, **确认保留**所有现有记录

### 2.2 调整 NS 记录

按 Cloudflare 提示, 把 `aiwill-planner.cn` 的 NS 记录改为:
```
ns1.cloudflare.com
ns2.cloudflare.com
ns3.cloudflare.com
ns4.cloudflare.com
```
(在腾讯云/阿里云域名控制台修改, 24-48 小时生效)

### 2.3 子域名分流策略 (关键)

```
目标: en.aiwill-planner.cn → 海外 Cloudflare CDN 缓存
     *.aiwill-planner.cn (其他子域) → 国内直接回源 (不绕 CDN)
```

**Cloudflare 实现方式**:

#### 方案 A: 单一 DNS + Geo Steering (推荐, 最简)

| 域名 | 记录类型 | 值 | 代理状态 |
|---|---|---|---|
| `en` | A | 1.2.3.4 (服务器 IP) | 🟠 Proxied (走 CDN) |
| `h5` | A | 1.2.3.4 | ⚪ DNS only (回源) |
| `@` | A | 1.2.3.4 | ⚪ DNS only (回源) |
| `www` | A | 1.2.3.4 | ⚪ DNS only (回源) |

> Cloudflare Free plan 支持子域级别 Proxied 开关, **只有 en 子域走 CDN**,
> 其他子域继续走国内直连 (速度不受影响)。

#### 方案 B: 双 DNS 分流 (更复杂, 不推荐 Phase 1)

国内 DNS: 阿里云 DNS (解析到服务器 IP, 不经 Cloudflare)
海外 DNS: Cloudflare DNS (解析到 Cloudflare Anycast IP)

---

## 3. Cloudflare 缓存配置 (关键: 不缓存用户数据)

### 3.1 Page Rules (Free plan 支持 3 条)

```
规则 1: en.aiwill-planner.cn/overseas/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 day
  - Browser Cache TTL: 1 hour

规则 2: en.aiwill-planner.cn/static/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 30 days

规则 3: en.aiwill-planner.cn/_next/static/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 30 days
```

### 3.2 不要缓存的路径 (在 NGINX 层禁, 不让请求到 Cloudflare)

Cloudflare 默认不缓存以下 (免费版规则):
- `/api/*`
- `/_next/data/*`
- `/login`, `/register`, `/dashboard`, `/orders`, `/payment`, `/result`
- 带 Cookie 的请求

但保险起见, 国内 Nginx 也加:

```nginx
# /etc/nginx/conf.d/aiwill-planner.conf (现有配置追加)
location /api/ {
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
}

location ~ ^/(login|register|dashboard|orders|payment|result|admin) {
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
}
```

---

## 4. 合规与 PIPL (海外用户隐私)

### 4.1 Cloudflare 数据流

```
海外用户 → Cloudflare Anycast (海外节点) → 国内源站

Cloudflare 缓存内容: 仅静态 HTML/CSS/JS (无用户数据)
Cloudflare 不缓存: 任何带 Cookie 的请求 (源站响应带 no-store 即可)
```

**PIPL 影响**: 静态资源 (HTML) 是公开的, 无个人信息;
用户填表、支付均在源站完成 (源站在国内, 数据不出境)。
**Cloudflare 边缘节点仅做 TCP 反代, 不存储用户数据**, 合规。

### 4.2 Cookie 域名策略

```
现有: cookies 域名 = .aiwill-planner.cn (所有子域共享)
→ en.aiwill-planner.cn 自动共享登录态, 海外华人无缝登录

新增: cookies 域名 = .aiwill-planner.cn (不变)
```

---

## 5. 实测步骤 (W1 收尾)

```bash
# 1. DNS 解析验证
dig en.aiwill-planner.cn @8.8.8.8 +short
# 应返回 Cloudflare IP (172.64.xx.xx 或类似)

# 2. HTTPS 证书验证 (Cloudflare 自动签发)
curl -vI https://en.aiwill-planner.cn/overseas 2>&1 | grep -i "subject:"
# 应显示 *.aiwill-planner.cn

# 3. 海外访问测速
# 用 https://www.webpagetest.org 测美国/英国/新加坡节点
# 目标: TTFB < 300ms, 首屏 < 1.5s

# 4. 国内回源验证
curl -vI https://en.aiwill-planner.cn/overseas --resolve en.aiwill-planner.cn:443:1.2.3.4
# 直接走源站 IP, 验证国内访问正常
```

---

## 6. 成本 & 风险

| 项 | 值 |
|---|---|
| Cloudflare Free plan | **¥0** |
| 域名解析 (腾讯云现有账户) | **¥0** |
| SSL 证书 (Cloudflare 自动) | **¥0** |
| 海外加速节点 | 200+ 节点免费 |
| 月度带宽 | Free plan 无限 |
| **新增总成本** | **¥0** |

**风险**:
- Cloudflare 在国内访问偶尔被干扰 (G/F/W) → 风险低, 国内解析不经过 Cloudflare
- 缓存命中率不达预期 → Phase 1 接受 70%+ 命中, 后续调整

---

## 7. 撤销 / 回滚

如果 Cloudflare 出问题, 一键关闭代理:
```
en 子域 → Proxy 状态改为 "DNS only" 即可, 30 秒内回滚到国内直连。
```