# T8: 微信小程序后端服务

微信小程序后端微服务，处理小程序 API 请求。

## 功能

- **用户登录**: 微信授权登录/JWT token 认证
- **合同列表**: 获取用户所有合同
- **合同生成**: 根据模板生成合同
- **合同下载**: 下载合同文件
- **合同签约**: 电子签约功能

## 项目结构

```
t8-miniprogram/
├── cmd/server/main.go          # 主入口
├── go.mod                      # Go 模块定义
├── internal/
│   ├── config/config.go        # 配置管理
│   ├── handler/handler.go      # HTTP 处理器
│   ├── middleware/auth.go      # JWT 认证中间件
│   ├── model/models.go         # 数据模型
│   ├── repository/
│   │   ├── user_repo.go        # 用户仓储
│   │   └── contract_repo.go    # 合同仓储
│   └── service/
│       ├── auth_svc.go         # 认证服务
│       └── contract_svc.go     # 合同服务
└── README.md
```

## API 端点

### 公共端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/login | 用户登录 |
| GET | /health | 健康检查 |

### 受保护端点 (需 Authorization: Bearer <token>)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/profile | 获取用户资料 |
| GET | /api/v1/contracts | 合同列表 |
| POST | /api/v1/contracts | 生成合同 |
| GET | /api/v1/contracts/:id | 获取合同详情 |
| POST | /api/v1/contracts/:id/sign | 签约 |
| GET | /api/v1/contracts/:id/download | 下载合同 |

## 配置

通过环境变量配置:

| 变量 | 默认值 | 描述 |
|------|--------|------|
| SERVER_PORT | 8080 | 服务端口 |
| DATABASE_PATH | ./miniprogram.db | SQLite 数据库路径 |
| JWT_SECRET | miniprogram-secret-key-change-in-production | JWT 密钥 |
| ENVIRONMENT | development | 运行环境 |

## 运行

```bash
# 安装依赖
go mod tidy

# 运行服务
go run cmd/server/main.go
```

## 合同模板

支持以下模板:

- `labor` - 劳动合同
- `rental` - 租赁合同
- `default` - 通用合同

## 数据模型

### User
- ID, OpenID, Nickname, AvatarURL, Phone, Status, CreatedAt, UpdatedAt

### Contract
- ID, UserID, Title, TemplateID, Status, Content, FilePath, Checksum, SignData, SignedAt, CreatedAt, UpdatedAt

### SignRecord
- ID, ContractID, UserID, SignType, SignData, IP, UserAgent, CreatedAt