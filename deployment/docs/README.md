# AiWill Planner 部署文档

## 目录结构

```
deployment/
├── dockerfiles/           # 各服务Dockerfile
│   ├── Dockerfile.t1-compliance-engine
│   ├── Dockerfile.t2-api-gateway
│   ├── Dockerfile.t4-contract-generator
│   ├── Dockerfile.t5-membership
│   ├── Dockerfile.t6-affiliate
│   ├── Dockerfile.t7-document-renderer
│   ├── Dockerfile.t8-miniprogram
│   └── Dockerfile.t9-h5-frontend
├── k8s/                   # Kubernetes配置
│   ├── 00-namespace.yaml
│   ├── 01-config.yaml
│   ├── 02-t1-compliance-engine.yaml
│   ├── 03-t2-api-gateway.yaml
│   ├── 04-t4-contract-generator.yaml
│   ├── 05-t5-membership.yaml
│   ├── 06-t6-affiliate.yaml
│   ├── 07-t7-document-renderer.yaml
│   ├── 08-t8-miniprogram.yaml
│   ├── 09-t9-h5-frontend.yaml
│   ├── 10-mysql.yaml
│   └── ingress.yaml
└── docs/
    └── README.md         # 本文档
```

## 服务架构

```
                          ┌─────────────────┐
                          │  微信小程序     │
                          │ t8-miniprogram  │
                          └────────┬────────┘
                                   │
┌─────────┐    ┌────────────────┐  │  ┌─────────────┐
│ H5前端  │───▶│   API Gateway  │◀─┼──│  联盟系统   │
│t9-h5-f  │    │  t2-api-gateway│  │  │t6-affiliate │
└─────────┘    └───────┬─────────┘  │  └─────────────┘
                      │            │
         ┌────────────┼────────────┤
         │            │            │
    ┌────▼────┐  ┌────▼────┐  ┌───▼────┐
    │合规引擎 │  │合同生成器│  │文档渲染 │
    │t1-compl │  │t4-contr │  │t7-doc  │
    └─────────┘  └─────────┘  └───┬────┘
                                   │
                            ┌──────▼──────┐
                            │  会员系统   │
                            │t5-membership│
                            └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │   MySQL     │
                            └─────────────┘
```

## 前置要求

- Docker 20.10+
- Kubernetes 1.24+
- kubectl 1.24+
- PV供应器 (用于持久化存储)
- Ingress Controller (如 nginx-ingress)

## 快速部署

### 1. 构建Docker镜像

```bash
# 设置镜像仓库
REGISTRY=your-registry.com/aiwill-planner

# 构建后端服务
for svc in t1-compliance-engine t2-api-gateway t4-contract-generator \
           t5-membership t6-affiliate t7-document-renderer t8-miniprogram; do
  docker build -t ${REGISTRY}/${svc}:latest \
    -f deployment/dockerfiles/Dockerfile.${svc} \
    ./${svc}
  docker push ${REGISTRY}/${svc}:latest
done

# 构建前端
docker build -t ${REGISTRY}/t9-h5-frontend:latest \
  -f deployment/dockerfiles/Dockerfile.t9-h5-frontend \
  ./t9-h5-frontend
docker push ${REGISTRY}/t9-h5-frontend:latest
```

### 2. 配置Secrets

```bash
# 编辑 secret 配置
vim deployment/k8s/01-config.yaml

# 或使用 kubectl 创建 secret
kubectl create secret generic aiwill-secrets \
  --namespace=aiwill-planner \
  --from-literal=jwt-secret="your-production-jwt-secret" \
  --from-literal=stripe-key="sk_test_xxx" \
  --from-literal=mysql-root-password="your-mysql-password"
```

### 3. 部署到Kubernetes

```bash
cd deployment/k8s

# 创建命名空间和基础配置
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-config.yaml

# 部署核心服务
kubectl apply -f 02-t1-compliance-engine.yaml
kubectl apply -f 03-t2-api-gateway.yaml
kubectl apply -f 04-t4-contract-generator.yaml
kubectl apply -f 05-t5-membership.yaml
kubectl apply -f 06-t6-affiliate.yaml
kubectl apply -f 07-t7-document-renderer.yaml
kubectl apply -f 08-t8-miniprogram.yaml
kubectl apply -f 09-t9-h5-frontend.yaml
kubectl apply -f 10-mysql.yaml

# 部署Ingress
kubectl apply -f ingress.yaml

# 验证部署
kubectl get pods -n aiwill-planner
```

### 4. 验证部署

```bash
# 检查所有服务
kubectl get all -n aiwill-planner

# 查看服务日志
kubectl logs -n aiwill-planner deployment/t2-api-gateway -f

# 检查 ingress
kubectl get ingress -n aiwill-planner
```

## 服务配置

### 环境变量说明

#### API Gateway (t2-api-gateway)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| GW_HOST | 0.0.0.0 | 监听地址 |
| GW_PORT | 8080 | 监听端口 |
| JWT_SECRET | - | JWT密钥 (必填) |
| RATE_LIMIT_ENABLED | true | 启用限流 |
| CIRCUIT_ENABLED | true | 启用熔断 |

#### 合规引擎 (t1-compliance-engine)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| SERVER_PORT | 8086 | 监听端口 |
| COMPLIANCE_RULES_PATH | /rules | 规则文件路径 |
| AUDIT_PATH | /logs | 审计日志路径 |

#### 合同生成器 (t4-contract-generator)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| SERVER_PORT | 8081 | 监听端口 |
| GENERATOR_TEMPLATES_PATH | /templates | 模板路径 |

#### 会员系统 (t5-membership)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| SERVER_PORT | 8082 | 监听端口 |
| DATABASE_DSN | - | 数据库连接串 (必填) |
| STRIPE_KEY | - | Stripe密钥 (必填) |

#### 联盟系统 (t6-affiliate)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| SERVER_PORT | 8083 | 监听端口 |
| DATABASE_HOST | mysql | 数据库主机 |
| APP_COMMISSION_RULE_LEVEL1 | 0.1 | 一级佣金比例 |

#### 文档渲染器 (t7-document-renderer)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| SERVER_PORT | 8084 | 监听端口 |
| RENDERER_TEMPLATES_PATH | /templates | 模板路径 |
| RENDERER_OUTPUT_PATH | /output | 输出路径 |

#### 小程序服务 (t8-miniprogram)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| SERVER_PORT | 8085 | 监听端口 |
| DATABASE_DSN | /data/miniprogram.db | SQLite数据库路径 |

#### H5前端 (t9-h5-frontend)
| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3000 | 监听端口 |
| NEXT_PUBLIC_API_URL | - | API地址 (必填) |

## 持久化存储

部署包含以下持久化卷:

| PVC | 服务 | 大小 | 用途 |
|-----|------|------|------|
| mysql-pvc | mysql | 20Gi | 数据库存储 |
| t4-templates-pvc | contract-generator | 1Gi | 合同模板 |
| t7-templates-pvc | document-renderer | 1Gi | 文档模板 |
| t7-output-pvc | document-renderer | 5Gi | 渲染输出 |
| t8-data-pvc | miniprogram | 1Gi | SQLite数据 |

## 健康检查

所有服务都配置了:
- **Liveness Probe**: 检测服务是否存活
- **Readiness Probe**: 检测服务是否可以接收流量

## 扩缩容

```bash
# 扩容
kubectl scale deployment t2-api-gateway --replicas=4 -n aiwill-planner

# 缩容
kubectl scale deployment t2-api-gateway --replicas=2 -n aiwill-planner

# 使用HPA自动扩缩容
kubectl autoscale deployment t2-api-gateway \
  --min=2 --max=10 --cpu-percent=70 \
  -n aiwill-planner
```

## 故障排查

```bash
# 查看日志
kubectl logs -n aiwill-planner <pod-name>

# 进入容器
kubectl exec -it -n aiwill-planner <pod-name> -- /bin/sh

# 查看资源事件
kubectl describe pod -n aiwill-planner <pod-name>

# 检查配置
kubectl get configmap -n aiwill-planner
kubectl get secret -n aiwill-planner
```