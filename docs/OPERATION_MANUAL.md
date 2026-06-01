# AIWILL-PLANNER 项目操作手册

**项目**: 合规优先的契约生成平台  
**版本**: 1.0  
**更新日期**: 2026-05-24

---

## 一、项目概述

aiwill-planner 是一个多租户 SaaS 平台，提供 AI 驱动的合同生成、合规检测、文档渲染等功能。

### 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Go 1.21+ |
| 前端 | Next.js 14 (H5) / React (PC后台) |
| 数据库 | PostgreSQL + MySQL + SQLite |
| 网关 | Go Fiber |
| 部署 | Docker + Kubernetes |

### 服务架构图

```
                          ┌─────────────┐
                          │   Clients   │
                          └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                          │  API Gateway│  :8080
                          │  (t2)       │
                          └──────┬──────┘
                                 │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
   ┌────▼────┐  ┌──────────┐  ┌──▼───┐  ┌────────┐  ┌────▼────┐
   │Contract │  │Membership│  │Affiliate│ │Document│ │Mini     │
   │Generator│  │  (t5)    │  │ (t6)  │  │Renderer│ │program  │
   │  (t4)   │  │  :8082   │  │ :8083 │  │  (t7)  │ │  (t8)   │
   │ :8081   │  └──────────┘  └───────┘  │ :8084  │  │ :8085   │
   └────┬────┘                          └────────┘  └─────────┘
        │
   ┌────▼────────────┐
   │ Compliance      │
   │ Engine   (t1)   │
   │ :8086           │
   └─────────────────┘
```

---

## 二、快速启动

### 2.1 Docker Compose 一键启动

```bash
cd /Users/maran/aiwill-planner

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f t2-api-gateway
```

### 2.2 本地开发启动

```bash
# T1 合规引擎
cd t1-compliance-engine
go build -o bin/server ./cmd/server
./bin/server

# T2 API网关
cd t2-api-gateway
go build -o bin/gateway ./cmd/gateway
./bin/gateway

# T4 合同生成器
cd t4-contract-generator
go build -o bin/server ./cmd/server
./bin/server
```

---

## 三、服务详情

### 3.1 T1 - 合规引擎 (端口: 8086)

**职责**: 多租户合规规则引擎，YAML规则热加载

**API端点**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/v1/compliance/evaluate` | 规则评估 |

**环境变量**:
```bash
SERVER_HOST=0.0.0.0
SERVER_PORT=8086
COMPLIANCE_RULES_PATH=./rules
COMPLIANCE_HOT_RELOAD=true
AUDIT_PATH=./logs
```

---

### 3.2 T2 - API网关 (端口: 8080)

**职责**: 统一入口，JWT鉴权，限流，熔断

**路由配置**:
| 路径 | 代理到 | 说明 |
|------|--------|------|
| `/api/v1/contracts/*` | t4:8081 | 合同生成 |
| `/api/v1/membership/*` | t5:8082 | 会员系统 |
| `/api/v1/affiliates/*` | t6:8083 | 分销系统 |
| `/api/v1/render/*` | t7:8084 | 文档渲染 |
| `/api/v1/miniprogram/*` | t8:8085 | 小程序后端 |

**环境变量**:
```bash
GW_HOST=0.0.0.0
GW_PORT=8080
JWT_SECRET=<32字符密钥>
RATE_LIMIT_REQUESTS_PER_SEC=100
CIRCUIT_THRESHOLD=5
```

---

### 3.3 T4 - AI合同生成器 (端口: 8081)

**职责**: AI驱动的合同模板渲染与生成

**API端点**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/v1/contracts/generate` | 生成合同 |
| GET | `/api/v1/templates` | 模板列表 |
| GET | `/api/v1/templates/:id` | 获取模板 |
| GET | `/api/v1/compliance/rules` | 合规规则 |

**请求示例**:
```json
POST /api/v1/contracts/generate
{
  "tenant_id": "tenant_001",
  "template_id": "service-agreement",
  "data": {
    "party_a": "甲方公司",
    "party_b": "乙方公司",
    "amount": 50000
  }
}
```

---

### 3.4 T5 - 会员系统 (端口: 8082)

**职责**: 会员管理，订阅计划，Stripe支付集成

**API端点**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/v1/plans` | 订阅计划列表 |
| POST | `/api/v1/membership` | 创建会员 |
| POST | `/api/v1/membership/renew` | 续费 |
| POST | `/api/v1/orders` | 创建订单 |
| POST | `/webhook/stripe` | Stripe回调 |

---

### 3.5 T6 - 推广分销 (端口: 8083)

**职责**: 分销商管理，佣金结算，邀请关系

**API端点**:
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/affiliates` | 创建分销商 |
| GET | `/api/v1/affiliates/:id` | 获取分销商 |
| POST | `/api/v1/commissions/record` | 记录佣金 |
| POST | `/api/v1/withdraws` | 申请提现 |
| POST | `/api/v1/invites` | 创建邀请 |

---

### 3.6 T7 - 文档渲染 (端口: 8084)

**职责**: DOCX/PDF 合同文件渲染

**API端点**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/v1/render` | 渲染合同 |
| POST | `/api/v1/render/download` | 下载文件 |

**请求示例**:
```json
POST /api/v1/render
{
  "contract_id": "uuid",
  "title": "服务协议",
  "content": "<html>合同内容...</html>",
  "data": {},
  "format": "pdf"
}
```

---

### 3.7 T8 - 微信小程序后端 (端口: 8085)

**职责**: 小程序用户登录，合同管理

**API端点**:
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/login` | 微信授权登录 |
| GET | `/api/v1/profile` | 用户资料 |
| GET | `/api/v1/contracts` | 合同列表 |
| POST | `/api/v1/contracts` | 生成合同 |
| POST | `/api/v1/contracts/:id/sign` | 电子签约 |
| GET | `/api/v1/contracts/:id/download` | 下载合同 |

---

### 3.8 T9 - H5前端

**技术栈**: Next.js 14 + Tailwind CSS + Zustand

**页面结构**:
- 首页/发现
- 合同列表
- 合同创建向导
- 合同详情
- 个人中心

**部署**: Vercel

---

### 3.9 T10 - PC管理后台

**技术栈**: React + Ant Design

**页面模块**:
- 概览仪表盘
- 契约管理
- 模板管理
- 签约方管理
- 合规检测
- 审计日志
- 系统管理

---

## 四、测试

### 4.1 单元测试

```bash
# 运行所有测试
go test -v ./...

# 运行带覆盖率
go test -cover ./...

# 运行特定测试
go test -v -run TestAuthService ./tests/t8_service_test/
```

### 4.2 压力测试 (T11)

```bash
cd tests/t11_compliance_stress
go test -race -v ./...
```

### 4.3 E2E测试 (T12)

```bash
cd tests/t12_e2e
# 配置环境变量
export E2E_GW_URL=http://localhost:8080
export E2E_TENANT=test_tenant
go test -v ./...
```

---

## 五、部署

### 5.1 Docker部署

```bash
# 构建镜像
docker build -t aiwill-t1:latest ./t1-compliance-engine

# 运行
docker run -d -p 8086:8086 \
  -e SERVER_PORT=8086 \
  -v $(pwd)/rules:/rules \
  aiwill-t1:latest
```

### 5.2 Kubernetes部署

```bash
cd deployment/k8s

# 创建命名空间
kubectl apply -f 00-namespace.yaml

# 部署所有服务
kubectl apply -f .

# 检查状态
kubectl get pods -n aiwill
kubectl get svc -n aiwill
```

---

## 六、监控与维护

### 6.1 健康检查

```bash
# 检查网关
curl http://localhost:8080/health

# 检查各服务
curl http://localhost:8081/health  # T4
curl http://localhost:8082/health  # T5
curl http://localhost:8083/health  # T6
```

### 6.2 日志查看

```bash
# Docker Compose日志
docker-compose logs -f --tail=100

# Kubernetes日志
kubectl logs -f -n aiwill deployment/t2-api-gateway
```

### 6.3 审计日志

审计日志位于各服务的 `./logs/audit-{tenant_id}-{date}.log`

```bash
# 查看T1审计日志
tail -f t1-compliance-engine/logs/audit-*.log
```

---

## 七、目录结构

```
aiwill-planner/
├── t1-compliance-engine/    # 合规引擎
├── t2-api-gateway/         # API网关
├── t4-contract-generator/   # AI合同生成
├── t5-membership/          # 会员系统
├── t6-affiliate/            # 推广分销
├── t7-document-renderer/    # 文档渲染
├── t8-miniprogram/          # 小程序后端
├── t9-h5-frontend/         # H5前端
├── t10-pc-admin/           # PC管理后台
├── tests/                   # 测试代码
│   ├── t11_compliance_stress/
│   ├── t12_e2e/
│   └── t8_service_test/
├── deployment/              # 部署配置
│   ├── dockerfiles/
│   ├── k8s/
│   └── docs/
├── docs/                    # 文档
│   ├── api.md              # API汇总
│   └── OPTIMIZATION_REPORT.md  # 优化报告
├── docker-compose.yml      # 容器编排
└── README.md               # 项目说明
```

---

## 八、常见问题

### Q1: 服务启动失败
**检查**: 端口占用、环境变量、数据库连接

### Q2: JWT认证失败
**检查**: JWT_SECRET 是否 >= 32 字符

### Q3: 规则热加载不生效
**检查**: YAML格式、规则文件路径、权限

### Q4: 文档渲染返回空文件
**检查**: 模板路径、HTML内容格式

---

**技术支持**: 通过 Hermes Agent (supervisor) 协调各代理工作

**文档版本**: v1.0 | 更新: 2026-05-24