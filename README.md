# aiwill-planner

合规优先的契约生成平台

> ICP 备案：沪ICP备2026020925号-1
> 域名主站：aiwill-planner.cn（大陆） · h5.aiwill-planner.cn（香港 H5）

---

## 项目结构

```
aiwill-planner/
├── src/                            # 业务前端（Next.js App Router，部署在 Vercel Global）
│   ├── app/
│   │   ├── page.tsx                # 首页
│   │   ├── questionnaire/          # 问卷
│   │   ├── orders/                 # 订单
│   │   ├── payment/                # 支付页
│   │   ├── result/                 # 生成结果
│   │   └── api/                    # 7 个业务 API 路由
│   ├── components/                 # 共用组件（含 LegalFooter，root layout 全站挂载）
│   ├── lib/                        # pricing / questionnaire / orders / payment / supabase
│   └── types/
│
├── supabase-schema.sql             # Supabase 表结构
│
├── t1-compliance-engine/           # T1: 合规引擎核心服务 (Go) [legacy]
├── t2-api-gateway/                 # T2: API 网关 (Go)        [legacy]
├── t4-contract-generator/          # T4: AI 契约生成引擎 (Go)  [legacy]
├── t5-membership/                  # T5: 会员系统 (Go)         [legacy]
├── t6-affiliate/                   # T6: 分销 (Go)            [legacy]
├── t7-document-renderer/           # T7: 文档渲染 (Go)        [legacy]
├── t8-miniprogram/                 # T8: 小程序 (Go)          [legacy]
├── t10-pc-admin/                   # T10: PC 管理端           [legacy]
│
├── static-content/                 # SEO 静态页（4 个合规页面，供大陆 nginx 服务）
│   ├── faq.html
│   ├── tutorial.html
│   ├── compare.html
│   └── tool.html
│
├── index.html                      # 大陆主站首页
│
├── deployment/
│   ├── hk-server/                  # 香港云部署（43.129.207.154）— 仅做 H5 紧急回滚
│   ├── mainland-server/            # 大陆云部署（124.222.215.107）— P0 合规收紧 nginx
│   ├── dockerfiles/
│   └── docs/
│
├── tests/                          # 集成测试
│
├── FIX_PLAN.md                     # 上线修复执行报告
├── docker-compose.yml
├── next.config.ts                  # Next.js 业务前端配置
└── package.json
```

---

## 验收标准

### T1 合规引擎
| 标准 | 状态 |
|------|------|
| 每个 tenant 拥有独立数据库实例 | ✅ |
| 租户间数据 100% 隔离 | ✅ |
| 支持合规规则热更新（无需重启） | ✅ |
| 所有生成行为记录审计日志 | ✅ |
| 单租户 QPS ≥ 100 | ✅ |

### T2 API 网关
| 标准 | 状态 |
|------|------|
| 基于 JWT 的租户鉴权 | ✅ |
| 支持按租户限流 | ✅ |
| 支持按租户熔断 | ✅ |
| 支持灰度发布 | ✅ |

### T4 契约生成
| 标准 | 状态 |
|------|------|
| 支持多模板合同生成 | ✅ |
| 合规规则引擎校验 | ✅ |
| 热加载合规规则 | ✅ |
| 所有操作记录审计日志 | ✅ |
| 多租户隔离 | ✅ |

技术约束：Go + PostgreSQL，禁止 Redis/Kafka/共享表

---

## 合规约束（P0 — ICP 死线）

详见 [aiwill-planner_合规手册.docx](docs/)（项目外文档）。

- **大陆节点不出现 AI 推理 endpoint**：所有 AI 能力走 h5.aiwill-planner.cn → 香港
- **大陆 nginx 不反代境外**：仅 5 个静态路径，`/api/*` 301 跳 h5
- **法律 Footer 全站 100% 覆盖**：含 `沪ICP备2026020925号-1` + 工信部链接
- **首页 CTA 按钮**：必跳 `https://h5.aiwill-planner.cn`

自查脚本：
```bash
bash deployment/mainland-server/compliance_check.sh
```

---

## 构建

### 业务前端（src/，来自 origin/main）
```bash
npm install
npm run dev      # 本地
npm run build    # 生产构建
```

### 微服务（Go）
```bash
# T1
cd t1-compliance-engine && go build -o bin/server ./cmd/server
# T2
cd t2-api-gateway && go build -o bin/gateway ./cmd/gateway
# T4
cd t4-contract-generator && go build -o bin/server ./cmd/server
```

### Docker 全栈
```bash
docker compose up -d
```

---

## 部署

- **业务前端（H5 + Web）** `h5.aiwill-planner.cn` + `aiwill-planner.vercel.app`：Vercel Global（自动从 `main` 分支部署，无本地脚本）
- **大陆主站** `aiwill-planner.cn`（合规收紧 nginx，仅 5 个静态路径）：`bash deployment/mainland-server/deploy_mainland.sh`
- **香港节点** `43.129.207.154`（H5 紧急回滚用，**已废弃**）：`bash deployment/hk-server/deploy_h5.sh.deprecated`（拒绝运行，仅作归档）

---

## 环境变量

### T1
- `SERVER_HOST`: 服务监听地址
- `DB_HOST/DB_USER/DB_PASSWORD`: PostgreSQL 连接信息
- `AUDIT_LOG_PATH`: 审计日志目录
- `COMPLIANCE_RULES_PATH`: 规则文件目录

### T2
- `GW_HOST/GW_PORT`: 网关监听地址
- `UPSTREAM_URL`: 上游服务地址
- `JWT_SECRET/JWT_ISSUER/JWT_AUDIENCE`: JWT 配置

### T4
- `SERVER_HOST`: 服务监听地址（默认 0.0.0.0）
- `SERVER_PORT`: 服务端口（默认 8081）
- `DB_HOST/DB_USER/DB_PASSWORD`: PostgreSQL 连接信息
- `AUDIT_LOG_PATH`: 审计日志目录
- `TEMPLATES_PATH`: 合同模板目录
- `COMPLIANCE_RULES_PATH`: 规则文件目录

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — Web 前端
- [Supabase Docs](https://supabase.com/docs) — 业务数据
- [腾讯云合规指引](https://cloud.tencent.com/document/product/301) — ICP 备案

Check out the [腾讯云部署文档](https://cloud.tencent.com/document/product/213) for our cloud setup.
