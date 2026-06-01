# aiwill-planner

合规优先的契约生成平台

## 项目结构

```
aiwill-planner/
├── t1-compliance-engine/     # T1: 合规引擎核心服务
│   ├── cmd/server/          # 主服务入口
│   ├── internal/
│   │   ├── config/          # 配置管理
│   │   ├── database/        # 数据库查询封装
│   │   ├── tenant/         # 多租户隔离管理
│   │   ├── audit/          # 审计日志
│   │   └── compliance/     # 合规规则引擎
│   ├── rules/               # YAML 规则文件（热加载）
│   └── go.mod
│
├── t2-api-gateway/          # T2: API 网关
│   ├── cmd/gateway/         # 网关入口
│   ├── internal/
│   │   ├── config/         # 配置管理
│   │   ├── jwt/            # JWT 鉴权
│   │   ├── ratelimit/      # 按租户限流
│   │   ├── circuit/        # 按租户熔断
│   │   └── gray/           # 灰度发布
│   └── go.mod
│
├── t4-contract-generator/  # T4: AI契约生成引擎
│   ├── cmd/server/         # 主服务入口
│   ├── internal/
│   │   ├── config/        # 配置管理
│   │   ├── tenant/        # 多租户隔离管理
│   │   ├── audit/         # 审计日志
│   │   ├── compliance/    # 合规规则引擎
│   │   └── generator/     # 合同生成引擎
│   ├── templates/          # 合同模板
│   ├── rules/              # YAML 规则文件
│   └── go.mod
│

## T1 验收标准

| 标准 | 状态 |
|------|------|
| 每个 tenant 拥有独立数据库实例 | ✅ |
| 租户间数据 100% 隔离 | ✅ |
| 支持合规规则热更新（无需重启） | ✅ |
| 所有生成行为记录审计日志 | ✅ |
| 单租户 QPS ≥ 100 | ✅ |

技术约束：Go + PostgreSQL，禁止 Redis/Kafka/共享表

## T2 验收标准

| 标准 | 状态 |
|------|------|
| 基于 JWT 的租户鉴权 | ✅ |
| 支持按租户限流 | ✅ |
| 支持按租户熔断 | ✅ |
| 支持灰度发布 | ✅ |

## T4 验收标准

| 标准 | 状态 |
|------|------|
| 支持多模板合同生成 | ✅ |
| 合规规则引擎校验 | ✅ |
| 热加载合规规则 | ✅ |
| 所有操作记录审计日志 | ✅ |
| 多租户隔离 | ✅ |

## 构建

```bash
# T1
cd t1-compliance-engine
go build -o bin/server ./cmd/server

# T2
cd t2-api-gateway
go build -o bin/gateway ./cmd/gateway

# T4
cd t4-contract-generator
go build -o bin/server ./cmd/server
```

## 环境变量

### T1
- SERVER_HOST: 服务监听地址
- DB_HOST/DB_USER/DB_PASSWORD: PostgreSQL 连接信息
- AUDIT_LOG_PATH: 审计日志目录
- COMPLIANCE_RULES_PATH: 规则文件目录

### T2
- GW_HOST/GW_PORT: 网关监听地址
- UPSTREAM_URL: 上游服务地址
- JWT_SECRET/JWT_ISSUER/JWT_AUDIENCE: JWT 配置

### T4
- SERVER_HOST: 服务监听地址（默认 0.0.0.0）
- SERVER_PORT: 服务端口（默认 8081）
- DB_HOST/DB_USER/DB_PASSWORD: PostgreSQL 连接信息
- AUDIT_LOG_PATH: 审计日志目录
- TEMPLATES_PATH: 合同模板目录
- COMPLIANCE_RULES_PATH: 规则文件目录
