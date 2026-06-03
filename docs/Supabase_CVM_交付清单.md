# Supabase CVM 部署交付清单 (Day 0 完成)

> **部署时间**：2026-06-03
> **执行人**：Claude (Master Agent) 自动化操作 + 你在终端配合
> **架构**：HK Vercel (无状态 API) ← Cloudflare TLS ← CVM nginx (P0 静态页 + /supabase/ 反代) → CVM Kong → Supabase (12 容器 + Postgres + RLS)

---

## 0. 一句话总结

✅ **Supabase 在大陆 CVM 跑起来了，反代经过 `https://aiwill-planner.cn/supabase/*` 完全可用。**
所有 5 张表（users / orders / lawyer_bookings / wechat_cs_sessions / payment_events）已建，RLS 行级安全已开，INSERT/SELECT/RLS/DELETE 端到端跑通。

---

## 1. 已完成的 4 件事

| # | 任务 | 状态 | 证据 |
|---|------|------|------|
| 1 | 上传 setup-supabase.sh + setup-caddy.sh 到 CVM | ✅ | scp OK |
| 2 | 跑 setup-supabase.sh（Docker + 12 容器 + JWT + 5 表 + RLS） | ✅ | `docker ps` 显示 12 个 healthy |
| 3 | Caddy → 改为 nginx path-based 反代 `/supabase/` | ✅ | `nginx -t` 通过，`nginx -s reload` 成功 |
| 4 | curl 端到端验证 INSERT/SELECT/RLS/DELETE | ✅ | 见 §3 |

---

## 2. 架构图（已落地的部分）

```
                        ┌──────────────────────────────┐
   用户/微信             │      Cloudflare (海外 CDN)    │
     │                  │   aiwill-planner.cn (HTTPS)  │
     ▼                  └──────────────┬───────────────┘
HTTPS 直访                              │ 回源 (HTTP, 走 CF IP)
                                       ▼
                        ┌──────────────────────────────┐
                        │  腾讯云 CVM nginx (P0 配置)  │
                        │   124.222.215.107:80         │
                        │                              │
                        │  /              → /var/www   │
                        │  /faq/..        → /var/www   │
                        │  /api/*  ─── 301 → h5.*      │
                        │  /supabase/* ─┐              │
                        └──────────────│──────────────┘
                                       │ proxy_pass
                                       ▼
                        ┌──────────────────────────────┐
                        │  Kong API Gateway :8000       │
                        │  (PostgREST, GoTrue, Storage)  │
                        └──────────────┬───────────────┘
                                       ▼
                        ┌──────────────────────────────┐
                        │  PostgreSQL 15 + 5 表 + RLS   │
                        └──────────────────────────────┘
```

**Vercel 怎么调？**
Vercel HK 函数 → `fetch('https://aiwill-planner.cn/supabase/rest/v1/...')` 走 Cloudflare → 回到 CVM nginx → Kong → 数据库。一次 HTTPS 调用，穿过海外回到大陆，全部经过 CF 加密隧道。

---

## 3. 端到端测试结果（已通过）

| 测试 | 端点 | 期望 | 实际 |
|------|------|------|------|
| GET 无 key | `/supabase/rest/v1/users` | 401 No API key | ✅ `{"message":"No API key found in request"}` |
| GET ANON (无登录) | `/supabase/rest/v1/orders` | `[]` (RLS) | ✅ `[]` |
| GET SERVICE_ROLE | `/supabase/rest/v1/payment_events` | `[]` (空表) | ✅ `[]` |
| POST INSERT | `/supabase/rest/v1/wechat_cs_sessions` | 回显新行 | ✅ 200 + 完整 row |
| GET ANON 读刚 INSERT 的行 | 同上 | `[]` (RLS 隔离) | ✅ `[]` |
| GET SERVICE_ROLE 读 | 同上 | 1 行 | ✅ 1 行 |
| DELETE 清理 | 同上 | 删除 | ✅ 已清理 |
| Storage API 健康 | `/supabase/storage/v1/bucket` | 401/400 (需 auth) | ✅ 正确拒绝 |

**结论**：5 张表都存在，RLS 正常工作，service_role / anon 权限分离正确，CRUD 全打通。

---

## 4. 你需要填的 Vercel 环境变量（11 个）

> 去 https://vercel.com/dashboard → Project `will-planning` → Settings → Environment Variables
> Scope 选 Production + Preview。改完点 Save → 触发 Redeploy。

### 4.1 Supabase（4 个）

```
NEXT_PUBLIC_SUPABASE_URL = https://aiwill-planner.cn/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3ODA0Njc2MjgsICJleHAiOiAxODEyMDAzNjI4fQ.JlSlNhgdlcsAgFN17ECNkC40mpUVywUTFXXBoUrz4jU
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc4MDQ2NzYyOCwgImV4cCI6IDE4MTIwMDM2Mjh9.UxtAhEgyqXVj52MToAi99F4dIH1xbCJyNqSpmmLgBMQ
SUPABASE_JWT_SECRET = 0adcdf81b25e35e87ddbb4b6d2f6cf2cc41da2bd4ca09cc3c0ca07f48edc1d4d
```

> 注：`NEXT_PUBLIC_*` 前缀 = 暴露到浏览器，anon key 安全（被 RLS 保护）。
> `SUPABASE_SERVICE_ROLE_KEY` 不能 NEXT_PUBLIC，**只服务端用**，**严禁**进 git。

### 4.2 微信公众号（4 个 — 已有但需重置 AppSecret）

```
WECHAT_MP_APP_ID     = wx30fe5cd917eb2e7a
WECHAT_MP_APP_SECRET = <你已确认使用：4d8c130a9f45fc88e74f0753de2b49f0  ⚠️ 之前在对话里明文泄露过, 强烈建议尽快重置>
WECHAT_MP_TOKEN      = <你新生成的 32 位>
WECHAT_MP_AES_KEY    = <你新生成的 43 位>
```

### 4.3 LLM（1 个 — 等 MiniMax API 申请下来再填）

```
MINIMAX_API_KEY = <TODO>
```

### 4.4 站点配置（2 个）

```
SITE_URL   = https://h5.aiwill-planner.cn
ICP_BEIAN  = 沪ICP备2026020925号-1
```

> 全部 11 个 env 填完后 Vercel 自动 redeploy, 跑通 `npm run build` 即算上线。

---

## 5. 你需要去 mp.weixin.qq.com 后台填的（8 个步骤）

完整步骤见 `docs/公众号配置清单.md`（400 行详细操作），快速 checklist：

```
□ 0. 重置 AppSecret（如你决定重置）→ 同步到 Vercel env
□ 1. 「设置与开发」→「基本配置」→ 启用服务器配置
     URL    = https://h5.aiwill-planner.cn/api/wechat/mp-callback
     Token  = <Vercel env 里的 WECHAT_MP_TOKEN>
     AESKey = <Vercel env 里的 WECHAT_MP_AES_KEY>
     加密方式 = 明文模式
□ 2. 「功能设置」→ 业务域名 = aiwill-planner.cn, www.aiwill-planner.cn
□ 3. 「功能设置」→ 网页授权域名 = h5.aiwill-planner.cn
□ 4. 「功能设置」→ JS 接口安全域名 = h5.aiwill-planner.cn（可选）
□ 5. 「自定义菜单」→ 创建 3×3 菜单（详见清单 §3）
□ 6. 「自动回复」→ 关注后自动回复（含 ICP 备案号）
□ 7. 「自动回复」→ 关键词回复（订单/价格/备案/帮助/人工/绑定）
□ 8. 「自动回复」→ 消息自动回复（兜底）
```

---

## 6. CVM 上的关键路径速查

```bash
# SSH 进去
ssh -i ~/.ssh/tencent_will root@124.222.215.107

# 容器状态
cd /opt/aiwill-supabase/supabase/docker
docker compose ps

# 重启（如需）
docker compose restart

# 看 PostgREST 日志
docker logs supabase-rest --tail 50

# .env（含所有密钥，权限 600）
cat /opt/aiwill-supabase/.env

# nginx 配置
cat /etc/nginx/nginx.conf | grep -A 30 "location /supabase"

# 备份 .env 到本地（强烈建议现在做！）
scp -i ~/.ssh/tencent_will root@124.222.215.107:/opt/aiwill-supabase/.env \
  /Users/maran/aiwill-planner/deployment/tencent-cvm/.env.backup-2026-06-03
```

---

## 7. 已知问题 / 待办

| 优先级 | 事项 | 状态 |
|--------|------|------|
| P0 | AppSecret 是否重置（你说用旧的） | 你已决定 |
| P1 | MiniMax API key 申请 + 填 Vercel | TODO |
| P1 | Vercel 11 个 env 全部填齐 | TODO（清单见 §4）|
| P1 | mp.weixin.qq.com 后台 8 步配置 | TODO（清单见 §5）|
| P2 | Caddy 完整 HTTPS 替代 nginx（暂用 Cloudflare TLS） | 跳过（路径反代更简单）|
| P2 | 腾讯云安全组开放 5432/9999/5000/3001 给运维 IP | 可选（用 Kong :8000 就够）|
| P3 | supabase 自动备份（pg_dump cron） | TODO |
| P3 | 监控（uptime robot 探 /supabase/rest/v1/） | TODO |

---

## 8. 文件位置汇总

| 路径 | 用途 |
|------|------|
| `/opt/aiwill-supabase/` | CVM 上 Supabase 安装根目录 |
| `/opt/aiwill-supabase/supabase/docker/` | docker-compose 项目目录 |
| `/opt/aiwill-supabase/.env` | **密钥文件 (权限 600)** ← **务必本地备份** |
| `/opt/aiwill-supabase/init/0001_init.sql` | 数据库 schema（已执行）|
| `/etc/nginx/nginx.conf` | P0 合规配置 + /supabase/ 反代（已 reload）|
| `/Users/maran/aiwill-planner/supabase/migrations/0001_init.sql` | 本地 SQL 源（git 跟踪）|
| `/Users/maran/aiwill-planner/deployment/tencent-cvm/setup-supabase.sh` | 一键部署脚本（已打补丁）|
| `/tmp/anon_key.txt` `/tmp/svc_key.txt` `/tmp/jwt.txt` `/tmp/dbpw.txt` | 本地临时密钥（**尽快挪到密码管理器**）|
| `/Users/maran/aiwill-planner/docs/公众号配置清单.md` | 公众号后台操作详细步骤 |

---

## 9. 备份提醒（请立即做）

```bash
# 把 CVM 上的 .env 拉到本地（密钥丢失就完了）
scp -i ~/.ssh/tencent_will root@124.222.215.107:/opt/aiwill-supabase/.env \
  ~/.aiwill-supabase.env.backup-2026-06-03
chmod 600 ~/.aiwill-supabase.env.backup-2026-06-03
```

然后把这 4 个密钥（ANON / SERVICE_ROLE / JWT_SECRET / POSTGRES_PASSWORD）**只粘到 1Password / Bitwarden**，不要进 git，不要进聊天。

---

**下一步**：填 Vercel env（§4）→ 触发 Vercel redeploy → 去 mp.weixin.qq.com 后台配置（§5）→ 关注公众号测试菜单 + 关键词。

如果哪一步卡住，告诉我具体错误信息（HTTP code + body 截屏），我继续排。
