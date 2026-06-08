# Supabase 一键启动手册 (Day 2 上线)

> 预计耗时: 5 分钟 | 难度: ⭐ (复制粘贴即可)

## 为什么需要 Supabase?

平台现在**完全 ready** for production:
- ✅ 14 个页面 + 6 个文书生成 API
- ✅ 24 个环境变量已在 Vercel 配置
- ✅ 5 类新文书问卷 (Day 2 实装)
- ⏳ **仅缺 Supabase 3 个 key** — 这是唯一阻塞项

没 Supabase 会发生什么:
- `/api/generate-will` / `/api/generate-document` 返 200 (不存库)
- `/api/auth/login` 返 401 (找不到用户)
- `/api/orders/*` 返 404 (无订单)
- `/api/affiliate/*` 返 401

—— **用户能体验 AI 文书生成, 但不能保存/登录/支付回调**

---

## 5 步上手

### Step 1: 注册 Supabase 项目 (1 分钟)
1. 打开 https://supabase.com/dashboard
2. 用 GitHub 登录 (maran529-byte)
3. 点 **New project**
   - Name: `aiwill-planner`
   - Database Password: 自设 (复制保存到密码管理器)
   - Region: `Singapore` (离大陆近)
   - Plan: **Free** (够 MVP)
4. 等 1-2 分钟, 项目创建完成

### Step 2: 跑 SQL 建表 (10 秒)
1. 左侧菜单 → **SQL Editor** → **New query**
2. 复制下面这 1 条命令 (来自我们项目根目录的 `supabase/run_all_migrations.sql`):

```bash
# 在你 Mac 上:
cat /Users/maran/aiwill-planner/supabase/run_all_migrations.sql
```

3. **复制整个文件内容** (约 1450 行), 粘贴到 SQL Editor
4. 点右下角 **Run** (或 Ctrl+Enter)
5. 应看到 `Success. No rows returned` — 13 个表 + 索引 + 触发器全部建好

### Step 3: 拿 3 个 key (1 分钟)
在 Supabase Dashboard:
1. 左侧 **Settings** (齿轮) → **API**
2. 复制 3 个值:
   ```
   Project URL  → NEXT_PUBLIC_SUPABASE_URL
   anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
   service_role (点 Reveal) → SUPABASE_SERVICE_ROLE_KEY
   ```

### Step 4: 填到 Vercel (1 分钟)
打开 https://vercel.com/dashboard → 选 `aiwill-planner` 项目 → Settings → Environment Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production + Preview + Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxxx...` | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxxx...` | 同上 |

点 **Save** 3 次。Vercel 会**自动重新部署** (~60s)。

### Step 5: 验收 (1 分钟)
跑我们的一键冒烟脚本:

```bash
bash /Users/maran/aiwill-planner/deployment/mainland-server/compliance_check.sh
```

应看到 `7/7` PASS。

或者你直接打开 https://h5.aiwill-planner.cn, 走一遍:
- 注册 1 个测试账号
- 任意问卷提交
- 查 https://h5.aiwill-planner.cn/orders 看到记录
- ✅ 完成

---

## 之后你做的事 (可选 v1.1)

- **绑域名**: Supabase 默认 URL 太丑, v1.1 我会帮你加自定义域名
- **邮件模板**: Supabase 默认模板够用, v1.1 我会优化
- **RLS 策略**: 已在 SQL 里全开 (public 读, auth 写)

## 失败排查

| 错误 | 原因 | 解决 |
|------|------|------|
| `permission denied for table users` | SQL 没全跑 | 重新跑 run_all_migrations.sql |
| `Invalid API key` | key 复制错 | 重拿 3 个 key, 注意 `anon` vs `service_role` |
| `CORS error` | 浏览器拒绝 | 不可能, Vercel URL 已在 Supabase 默认白名单 |
| `auth.users not found` | 没建 schema | 必须 Step 2 跑 SQL |

---

需要任何帮助, 直接回复. 祝上线顺利!
