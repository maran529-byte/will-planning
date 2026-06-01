# aiwill-planner 上线修复执行报告

> 生成时间：2026-06-01
> 依据：桌面 `aiwill-planner/aiwill-planner_合并执行版.docx` + `aiwill-planner_合规手册.docx`
> 自动执行：本机本地源码 + 部署脚本生成；**远程服务器需你手动 SSH 跑脚本**（本机 SSH 钥匙到服务器不通）

---

## 一、已自动完成（本地源码 + 配置）

| # | 优先级 | 文件 | 修复内容 | 状态 |
|---|---|---|---|---|
| 1 | P0 | `index.html:73` | `vercel.app` → `https://h5.aiwill-planner.cn` | ✅ |
| 2 | P0 | `index.html:155` | 备案号加可点击链接到 beian.miit.gov.cn | ✅ |
| 3 | P0 | `static-content/faq.html` | 加备案号 + 工信部链接 | ✅ |
| 4 | P0 | `static-content/tutorial.html` | 加备案号 + 工信部链接 | ✅ |
| 5 | P0 | `static-content/compare.html` | 加备案号 + 工信部链接 | ✅ |
| 6 | P0 | `static-content/tool.html` | 加备案号 + 工信部链接 | ✅ |
| 7 | P0 | `t9-h5-frontend/app/components/Footer.tsx` | 加备案号 + 工信部链接（H5 站全部 5 个页面通过此组件复用） | ✅ |
| 8 | P0 | `deployment/mainland-server/nginx.conf` **(新建)** | 大陆收紧版：只放行 5 个 location，禁掉 `proxy_pass`，`/api/*` 301 跳到 h5 子域 | ✅ |
| 9 | P1 | `deployment/mainland-server/sitemap.xml` | 5 个 URL，供百度站长提交 | ✅ |
| 10 | P1 | `deployment/mainland-server/robots.txt` | 含 Baiduspider/360Spider/Sogou/bingbot 规则 | ✅ |
| 11 | P1 | `deployment/mainland-server/compliance_check.sh` | 7 项证据自查脚本（curl + grep） | ✅ |
| 12 | P0 | `deployment/mainland-server/deploy_mainland.sh` | 大陆一键部署（SSH 预检 → 备份 → 上传 → reload → 自查） | ✅ |
| 13 | P0 | `deployment/hk-server/deploy_h5.sh` | HK H5 一键重建（清旧容器 → rsync → npm ci → next build → :80 启动） | ✅ |
| 14 | P0 | `npm run build` | NextJS 14 本地构建通过，9 个路由全部 prerender 成功，**未复现 PRICING_TIERS 错误** | ✅ |

---

## 二、必须人工执行（远程，本机 SSH 不通到云服务器）

> 本机的 `~/.ssh/tencent_will`、`id_rsa`、`thor_ed25519` 都无法连入 124.222.215.107 / 43.129.207.154。
> 你需要在能直连云服务器的电脑（或腾讯云 Web 控制台）执行下面步骤。

### Step 1 — 部署大陆节点（P0，合规救命）

```bash
cd ~/aiwill-planner
bash deployment/mainland-server/deploy_mainland.sh
```

脚本会自动：
1. SSH 预检
2. 备份现有 `/etc/nginx/nginx.conf`
3. 上传新 `nginx.conf` + 5 个静态页 + `sitemap.xml` + `robots.txt`
4. `nginx -t` + `nginx -s reload`（如失败自动回滚）
5. 跑 `compliance_check.sh`
6. 5 个静态路径 + `/api/*` 烟囱测试

**预期结果**：
- `/`, `/faq`, `/tutorial`, `/compare`, `/tool` 全部 200
- `/api/v1/health` 返回 301 或 404（不再反代到 HK）

### Step 2 — 重建香港 H5 节点（P0）

```bash
bash deployment/hk-server/deploy_h5.sh
```

脚本会自动：
1. 停掉 `will-planning-nextjs-1` 旧容器
2. rsync 本地干净源码到 `/opt/aiwill-planner/t9-h5-frontend`
3. 远端 `npm ci` + `NEXT_DISABLE_TURBOPACK=1 npm run build`
4. `PORT=80 npm start` 后台运行
5. 外网 `http://h5.aiwill-planner.cn/` 烟囱测试

**修服务器上的 PRICING_TIERS 错误**：本地源码并不存在这个符号 → 服务器上跑的是旧版本，rsync 同步后即解决。

### Step 3 — 修 MySQL → Postgres 容器（P3，但卡住 membership/affiliate）

服务器实际跑 MySQL（`aiwill-mysql` 容器），但仓库 `deployment/hk-server/docker-compose.yml` 用 Postgres。两条路：

**路 A（推荐，与文档一致）：切回 Postgres**
```bash
cd /opt/aiwill-planner/deployment/hk-server
docker rm -f aiwill-mysql mysql-test-run 2>/dev/null
docker compose up -d postgres t5-membership t6-affiliate
```

**路 B（保留 MySQL）：需要改 t5/t6 的 DB driver 配置 + 重打 docker image**（不推荐，工作量大）

### Step 4 — 重启所有 Exited 的容器

```bash
docker compose -f /opt/aiwill-planner/deployment/hk-server/docker-compose.yml \
    up -d --remove-orphans \
    t1-compliance-engine t4-contract-generator t7-document-renderer
```

### Step 5 — 腾讯云 443 工单（合规要求并行）

文档 P1 要求今天提交。脚本无法替你提交，请去：
https://console.cloud.tencent.com/workorder/category → 备案/合规 → 描述：
> 大陆节点 aiwill-planner.cn (124.222.215.107) 启用 443 HTTPS。当前已收紧 nginx，仅服务 5 个静态合规页面，无任何境外反代。请协助开通 80→443 跳转。

### Step 6 — 百度站长 + sitemap 提交（P1）

1. 访问 https://ziyuan.baidu.com/site/index
2. 添加站点 `aiwill-planner.cn` → HTML 文件验证
3. 链接提交 → 上传 `https://aiwill-planner.cn/sitemap.xml`

---

## 三、推迟项（非 6/2 上线门槛）

| 项 | 优先级 | 原因 |
|---|---|---|
| 微信支付 + Stripe 闭环 | P1 (Day 2-3) | 商户号申请周期长，与 Day 0 合规无关 |
| will-v1 遗嘱模板 | P2 (Day 4) | 业务功能，合规通过后再做 |
| auditd 容器守护 | P2 (Day 4) | 稳定性，非合规死线 |
| Playwright E2E | P2 (Day 4-5) | 测试，非合规死线 |
| 小程序 / 分销前端 | P3 | MySQL 问题修完自动恢复 |

---

## 四、合规 7 项证据当前状态预测（执行 Step 1 后）

| # | 证据 | 修复前 | Step 1 后预期 |
|---|---|---|---|
| 1 | 大陆节点不出现 AI endpoint | ⚠️ 反代中 | ✅ 静态站，零 AI 字符串 |
| 2 | 大陆 nginx 不反代境外 | ❌ `/api/*` 反代到 HK | ✅ `/api/*` 301 跳 h5 子域 |
| 3 | H5 fetch 目标为 api.aiwill-planner.cn | 未知 | 需 Step 2 后再查 |
| 4 | 法律 Footer 全站覆盖 | ❌ 4 个静态页缺备案号 | ✅ 5 页 + H5 全覆盖 |
| 5 | 备案号可点击到工信部 | ❌ 纯文本 | ✅ 6 处都已加 `<a href=beian.miit.gov.cn>` |
| 6 | CTA 按钮 IP 不在大陆 | ❌ vercel.app | ✅ h5.aiwill-planner.cn → 43.129.207.154（HK） |
| 7 | ICP 调查表一致 | 人工核对 | 见 docx，由你确认 |

---

## 五、本机已生效的源码 diff 摘要

```
M  /Users/maran/aiwill-planner/index.html
M  /Users/maran/aiwill-planner/static-content/faq.html
M  /Users/maran/aiwill-planner/static-content/tutorial.html
M  /Users/maran/aiwill-planner/static-content/compare.html
M  /Users/maran/aiwill-planner/static-content/tool.html
M  /Users/maran/aiwill-planner/t9-h5-frontend/app/components/Footer.tsx

A  /Users/maran/aiwill-planner/deployment/mainland-server/nginx.conf
A  /Users/maran/aiwill-planner/deployment/mainland-server/sitemap.xml
A  /Users/maran/aiwill-planner/deployment/mainland-server/robots.txt
A  /Users/maran/aiwill-planner/deployment/mainland-server/compliance_check.sh
A  /Users/maran/aiwill-planner/deployment/mainland-server/deploy_mainland.sh
A  /Users/maran/aiwill-planner/deployment/hk-server/deploy_h5.sh
```

---

## 六、关键事实更正（修正你 status 报告里的猜测）

| 你的报告 | 真实情况 |
|---|---|
| "首页按钮 href 已修复 ✅" | ❌ 当时未修，已**刚刚**改完 |
| "Footer 法律免责未植入" | ✅ 免责声明已全站植入；**缺的是备案号**（已补齐） |
| "NextJS 构建失败（PRICING_TIERS）" | ⚠️ 本地代码**无此符号**，构建成功。服务器跑的是过期代码，rsync 后即修复 |
| "DNSPod h5 子域 ✅ 已解析" | 保留你的判断；compliance_check.sh 里有 `dig +short h5.aiwill-planner.cn` 二次验证 |
| "大陆 nginx 部分修复" | 仓库本来就没有大陆 nginx 配置；**已新建**一份合规收紧版 |

---

## 七、下一步建议（按时间排序）

1. **立刻**：本机 `git diff` 检查 6 个修改文件，确认无误
2. **5 分钟内**：在能 SSH 到服务器的机器上跑 `deploy_mainland.sh`
3. **15 分钟内**：跑 `deploy_h5.sh`
4. **30 分钟内**：远端跑 `compliance_check.sh` 确认 7 项证据通过
5. **今天内**：提交腾讯云 443 工单 + 百度站长 sitemap
6. **明天起**：按 Day 2-5 计划推进支付 / 模板 / E2E

完成 1-4 步 = **合规死线达标**。
