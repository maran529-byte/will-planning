# T4: AI Contract Generator

AI契约生成引擎，支持模板化合同生成、合规校验和审计日志。

## 项目结构

```
t4-contract-generator/
├── cmd/server/              # 主服务入口
│   └── main.go              # HTTP API 服务
├── internal/
│   ├── config/              # 配置管理
│   ├── tenant/              # 多租户隔离管理
│   ├── audit/              # 审计日志
│   ├── compliance/         # 合规规则引擎
│   └── generator/         # 合同生成引擎
├── templates/              # 合同模板 JSON 文件
├── rules/                  # 合规规则 YAML 文件
├── go.mod
└── README.md
```

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /api/v1/contracts/generate | 生成合同 |
| GET | /api/v1/templates | 列出所有模板 |
| GET | /api/v1/templates/{id} | 获取特定模板 |
| GET | /api/v1/compliance/rules | 列出所有合规规则 |

## 生成合同请求示例

```bash
curl -X POST http://localhost:8081/api/v1/contracts/generate \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-001" \
  -H "X-User-ID: user-001" \
  -d '{
    "template_id": "template-service-agreement-v1",
    "title": "Service Agreement",
    "data": {
      "party_a_name": "Acme Corp",
      "party_a_email": "legal@acme.com",
      "party_b_name": "Client Inc",
      "party_b_email": "client@example.com",
      "service_description": "Software development services",
      "contract_amount": 50000,
      "currency": "USD",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31"
    }
  }'
```

## 合规校验

合同生成前会经过合规规则引擎校验，包括：
- 合同金额限制
- 禁止词汇检查
- 必填字段验证

## 技术约束

- Go 1.21+
- PostgreSQL (多租户隔离)
- 禁止 Redis/Kafka
- 所有操作记录审计日志

## 构建

```bash
cd t4-contract-generator
go build -o bin/server ./cmd/server
```