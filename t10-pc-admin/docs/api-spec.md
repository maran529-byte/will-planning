# PC管理后台 API 接口设计

## 1. 认证接口

### 1.1 登录
```
POST /api/v1/auth/login
Request:
{
  "phone": "string",
  "code": "string"       // 验证码
}
Response:
{
  "code": 0,
  "data": {
    "token": "string",
    "refreshToken": "string",
    "expiresIn": 7200,
    "user": {
      "id": "string",
      "name": "string",
      "phone": "string",
      "avatar": "string",
      "role": "admin|operator|viewer"
    }
  }
}
```

### 1.2 获取验证码
```
POST /api/v1/auth/code
Request:
{
  "phone": "string",
  "type": "login|reset"  // 场景
}
Response:
{
  "code": 0,
  "message": "发送成功"
}
```

### 1.3 刷新 Token
```
POST /api/v1/auth/refresh
Request:
{
  "refreshToken": "string"
}
Response:
{
  "code": 0,
  "data": {
    "token": "string",
    "expiresIn": 7200
  }
}
```

### 1.4 登出
```
POST /api/v1/auth/logout
Response:
{
  "code": 0,
  "message": "登出成功"
}
```

---

## 2. 概览接口

### 2.1 统计数据
```
GET /api/v1/dashboard/stats
Query:
  - tenantId: string (可选，超级管理员查看其他租户)
Response:
{
  "code": 0,
  "data": {
    "total": 1000,           // 契约总数
    "monthlyNew": 50,        // 本月新增
    "pendingSign": 12,       // 待签署
    "completed": 850,        // 已完成
    "trend": [               // 环比变化
      { "type": "total", "change": 5.2 },
      { "type": "monthlyNew", "change": -2.1 },
      { "type": "pendingSign", "change": 0 },
      { "type": "completed", "change": 3.8 }
    ]
  }
}
```

### 2.2 契约趋势
```
GET /api/v1/dashboard/trend
Query:
  - days: number (默认 30)
Response:
{
  "code": 0,
  "data": {
    "labels": ["2024-01-01", "2024-01-02", ...],
    "datasets": [
      { "name": "创建", "data": [10, 15, ...] },
      { "name": "签署", "data": [8, 12, ...] }
    ]
  }
}
```

### 2.3 状态占比
```
GET /api/v1/dashboard/status-distribution
Response:
{
  "code": 0,
  "data": {
    "items": [
      { "status": "draft", "label": "草稿", "count": 50, "percent": 5.0 },
      { "status": "pending", "label": "待签", "count": 30, "percent": 3.0 },
      { "status": "signed", "label": "已签", "count": 900, "percent": 90.0 },
      { "status": "rejected", "label": "已拒", "count": 20, "percent": 2.0 }
    ]
  }
}
```

### 2.4 待办事项
```
GET /api/v1/dashboard/todos
Query:
  - limit: number (默认 5)
Response:
{
  "code": 0,
  "data": [
    {
      "id": "string",
      "type": "sign|approve|expire",
      "title": "string",
      "contractId": "string",
      "contractName": "string",
      "deadline": "2024-01-15T00:00:00Z"
    }
  ]
}
```

---

## 3. 契约管理接口

### 3.1 契约列表
```
GET /api/v1/contracts
Query:
  - page: number (默认 1)
  - pageSize: number (默认 20)
  - status: string (draft/pending/signed/rejected/expired)
  - startDate: string (ISO date)
  - endDate: string (ISO date)
  - keyword: string (搜索契约名称/签约方)
Response:
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "status": "string",
        "parties": ["party1", "party2"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-02T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3.2 创建契约
```
POST /api/v1/contracts
Request:
{
  "name": "string",
  "type": "string",           // 模板类型
  "validityPeriod": {         // 有效期
    "start": "2024-01-01",
    "end": "2025-01-01"
  },
  "parties": [
    {
      "name": "string",
      "type": "enterprise|personal",
      "contact": "string",
      "phone": "string"
    }
  ],
  "content": "string",        // 条款内容 (富文本)
  "attachments": ["fileId1", "fileId2"]
}
Response:
{
  "code": 0,
  "data": {
    "id": "string",
    "status": "draft"
  }
}
```

### 3.3 获取契约详情
```
GET /api/v1/contracts/:id
Response:
{
  "code": 0,
  "data": {
    "id": "string",
    "name": "string",
    "type": "string",
    "status": "string",
    "validityPeriod": {...},
    "parties": [...],
    "content": "string",
    "attachments": [...],
    "auditLogs": [...],
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### 3.4 更新契约
```
PUT /api/v1/contracts/:id
Request: (同创建)
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

### 3.5 删除契约
```
DELETE /api/v1/contracts/:id
Response:
{
  "code": 0,
  "message": "删除成功"
}
```

### 3.6 提交签署
```
POST /api/v1/contracts/:id/submit
Response:
{
  "code": 0,
  "message": "提交成功"
}
```

### 3.7 签署契约
```
POST /api/v1/contracts/:id/sign
Request:
{
  "signature": "data:...",     // Base64 签名图片
  "signedAt": "2024-01-01T00:00:00Z"
}
Response:
{
  "code": 0,
  "message": "签署成功"
}
```

### 3.8 拒绝契约
```
POST /api/v1/contracts/:id/reject
Request:
{
  "reason": "string"
}
Response:
{
  "code": 0,
  "message": "已拒绝"
}
```

### 3.9 下载 PDF
```
GET /api/v1/contracts/:id/pdf
Response: Binary (application/pdf)
```

### 3.10 批量操作
```
POST /api/v1/contracts/batch
Request:
{
  "action": "delete|submit|export",
  "ids": ["id1", "id2"]
}
Response:
{
  "code": 0,
  "data": {
    "success": 10,
    "failed": 2,
    "errors": [...]
  }
}
```

---

## 4. 模板管理接口

### 4.1 模板列表
```
GET /api/v1/templates
Query:
  - category: string
  - page: number
  - pageSize: number
Response:
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "category": "string",
        "thumbnail": "string",
        "usageCount": 100,
        "status": "active|inactive",
        "createdAt": "string"
      }
    ],
    "total": 50
  }
}
```

### 4.2 创建模板
```
POST /api/v1/templates
Request:
{
  "name": "string",
  "category": "string",
  "content": "string",
  "thumbnail": "string"
}
Response:
{
  "code": 0,
  "data": { "id": "string" }
}
```

### 4.3 更新模板
```
PUT /api/v1/templates/:id
Request: (同创建)
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

### 4.4 删除模板
```
DELETE /api/v1/templates/:id
Response:
{
  "code": 0,
  "message": "删除成功"
}
```

### 4.5 复制模板
```
POST /api/v1/templates/:id/clone
Response:
{
  "code": 0,
  "data": { "id": "newId" }
}
```

---

## 5. 签约方接口

### 5.1 签约方列表
```
GET /api/v1/parties
Query:
  - type: enterprise|personal
  - status: active|inactive
  - keyword: string
  - page: number
  - pageSize: number
Response:
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "contact": "string",
        "phone": "string",
        "contractCount": 10,
        "status": "active",
        "createdAt": "string"
      }
    ],
    "total": 100
  }
}
```

### 5.2 添加签约方
```
POST /api/v1/parties
Request:
{
  "name": "string",
  "type": "enterprise|personal",
  "contact": "string",
  "phone": "string",
  "email": "string",
  "address": "string"
}
Response:
{
  "code": 0,
  "data": { "id": "string" }
}
```

### 5.3 更新签约方
```
PUT /api/v1/parties/:id
Request: (同添加)
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

### 5.4 删除签约方
```
DELETE /api/v1/parties/:id
Response:
{
  "code": 0,
  "message": "删除成功"
}
```

### 5.5 签约方详情
```
GET /api/v1/parties/:id
Response:
{
  "code": 0,
  "data": {
    "basicInfo": {...},
    "contracts": [...],
    "auditLogs": [...]
  }
}
```

---

## 6. 合规检测接口

### 6.1 上传检测
```
POST /api/v1/compliance/check
Content-Type: multipart/form-data
Form:
  - file: binary (PDF/Word)
Response:
{
  "code": 0,
  "data": {
    "taskId": "string",
    "status": "processing"
  }
}
```

### 6.2 查询检测结果
```
GET /api/v1/compliance/check/:taskId
Response:
{
  "code": 0,
  "data": {
    "status": "completed|processing|failed",
    "result": {
      "passed": true,
      "issues": [
        {
          "clause": "第 3.2 条",
          "problem": "违规条款描述",
          "suggestion": "修改建议"
        }
      ]
    }
  }
}
```

---

## 7. 审计日志接口

### 7.1 日志列表
```
GET /api/v1/audit-logs
Query:
  - startDate: string
  - endDate: string
  - actionType: string
  - userId: string
  - keyword: string
  - page: number
  - pageSize: number
Response:
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "string",
        "timestamp": "2024-01-01T00:00:00Z",
        "userId": "string",
        "userName": "string",
        "action": "create_contract|update_contract|...",
        "targetType": "contract|template|...",
        "targetId": "string",
        "ip": "192.168.1.1",
        "result": "success|failure",
        "detail": {...}
      }
    ],
    "total": 1000
  }
}
```

### 7.2 日志详情
```
GET /api/v1/audit-logs/:id
Response:
{
  "code": 0,
  "data": {
    "fullDetail": {...}
  }
}
```

### 7.3 导出日志
```
GET /api/v1/audit-logs/export
Query: (同列表筛选条件)
Response: Binary (application/vnd.ms-excel 或 .csv)
```

---

## 8. 系统管理接口

### 8.1 用户管理

#### 用户列表
```
GET /api/v1/users
Query:
  - role: string
  - status: active|inactive
  - keyword: string
  - page: number
  - pageSize: number
Response:
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "phone": "string",
        "avatar": "string",
        "role": "admin|operator|viewer",
        "status": "active",
        "lastLoginAt": "string",
        "createdAt": "string"
      }
    ],
    "total": 50
  }
}
```

#### 添加用户
```
POST /api/v1/users
Request:
{
  "name": "string",
  "phone": "string",
  "role": "admin|operator|viewer",
  "email": "string"
}
Response:
{
  "code": 0,
  "data": { "id": "string" }
}
```

#### 更新用户
```
PUT /api/v1/users/:id
Request: (同添加)
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

#### 删除用户
```
DELETE /api/v1/users/:id
Response:
{
  "code": 0,
  "message": "删除成功"
}
```

#### 重置密码
```
POST /api/v1/users/:id/reset-password
Response:
{
  "code": 0,
  "data": { "tempPassword": "string" }
}
```

#### 禁用/启用
```
PATCH /api/v1/users/:id/status
Request:
{
  "status": "active|inactive"
}
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

### 8.2 角色权限

#### 角色列表
```
GET /api/v1/roles
Response:
{
  "code": 0,
  "data": [
    {
      "id": "string",
      "name": "admin",
      "displayName": "管理员",
      "description": "string",
      "permissions": ["contract:read", "contract:write", ...],
      "userCount": 10
    }
  ]
}
```

#### 创建角色
```
POST /api/v1/roles
Request:
{
  "name": "string",
  "displayName": "string",
  "description": "string",
  "permissions": ["string"]
}
Response:
{
  "code": 0,
  "data": { "id": "string" }
}
```

#### 更新角色
```
PUT /api/v1/roles/:id
Request: (同创建)
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

#### 删除角色
```
DELETE /api/v1/roles/:id
Response:
{
  "code": 0,
  "message": "删除成功"
}
```

#### 权限列表
```
GET /api/v1/permissions
Response:
{
  "code": 0,
  "data": {
    "modules": [
      {
        "name": "contract",
        "displayName": "契约管理",
        "actions": [
          { "code": "read", "displayName": "查看" },
          { "code": "write", "displayName": "创建/编辑" },
          { "code": "delete", "displayName": "删除" },
          { "code": "export", "displayName": "导出" }
        ]
      }
    ]
  }
}
```

### 8.3 租户管理 (超级管理员)

#### 租户列表
```
GET /api/v1/tenants
Query:
  - status: active|inactive|expired
  - keyword: string
  - page: number
  - pageSize: number
Response:
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "adminName": "string",
        "adminPhone": "string",
        "plan": "free|pro|enterprise",
        "contractLimit": 1000,
        "contractUsed": 500,
        "status": "active",
        "expireAt": "2025-01-01",
        "createdAt": "string"
      }
    ],
    "total": 20
  }
}
```

#### 创建租户
```
POST /api/v1/tenants
Request:
{
  "name": "string",
  "adminName": "string",
  "adminPhone": "string",
  "adminEmail": "string",
  "plan": "free|pro|enterprise",
  "contractLimit": 1000
}
Response:
{
  "code": 0,
  "data": { "id": "string" }
}
```

#### 更新租户
```
PUT /api/v1/tenants/:id
Request: (同创建)
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

#### 删除租户
```
DELETE /api/v1/tenants/:id
Response:
{
  "code": 0,
  "message": "删除成功"
}
```

### 8.4 系统设置

#### 获取设置
```
GET /api/v1/settings
Query:
  - group: string (general|email|sms|compliance)
Response:
{
  "code": 0,
  "data": {
    "general": {
      "siteName": "aiwill-planner",
      "siteLogo": "string",
      "defaultLanguage": "zh-CN"
    },
    "email": {
      "host": "smtp.example.com",
      "port": 465,
      "username": "string",
      "fromAddress": "noreply@example.com"
    },
    "sms": {...},
    "compliance": {...}
  }
}
```

#### 更新设置
```
PUT /api/v1/settings
Request:
{
  "group": "string",
  "data": {...}
}
Response:
{
  "code": 0,
  "message": "更新成功"
}
```

---

## 9. 公共响应格式

```json
// 成功
{
  "code": 0,
  "message": "success",
  "data": {...}
}

// 错误
{
  "code": 40001,          // 业务错误码
  "message": "错误描述",
  "detail": "详细错误信息"
}

// 分页响应
{
  "code": 0,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

## 10. 错误码定义

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 40001 | 参数错误 |
| 40002 | 权限不足 |
| 40003 | 资源不存在 |
| 40004 | 资源已存在 |
| 40101 | 未登录 |
| 40102 | Token 过期 |
| 40301 | 禁止访问 |
| 50001 | 服务器错误 |