# PC管理后台 权限管理方案

## 1. 权限模型设计

### 1.1 基于 RBAC 的权限模型

采用 RBAC (Role-Based Access Control) 模型：

```
用户 → 角色 → 权限
```

- **用户 (User)**: 系统操作者
- **角色 (Role)**: 权限集合的载体
- **权限 (Permission)**: 对特定资源的操作许可

### 1.2 权限粒度

```
模块 (Module) → 操作 (Action) → 资源实例 (Instance)
```

示例：
- 模块: `contract` (契约管理)
- 操作: `read`, `write`, `delete`, `export`
- 资源实例: 特定契约 ID

---

## 2. 角色定义

### 2.1 内置角色

| 角色标识 | 显示名称 | 说明 | 适用场景 |
|----------|----------|------|----------|
| `super_admin` | 超级管理员 | 系统全部权限 | 平台运营方 |
| `tenant_admin` | 企业管理员 | 租户内全部权限 | 企业管理员 |
| `operator` | 操作员 | 业务操作权限 | 普通员工 |
| `viewer` | 查看者 | 只读权限 | 访客/外部人员 |

### 2.2 超级管理员权限范围

- 全租户数据管理
- 用户管理 (所有租户)
- 角色管理 (所有租户)
- 租户管理 (CRUD)
- 系统设置管理
- 审计日志查看 (全系统)
- 额度管理

### 2.3 企业管理员权限范围

- 本租户数据管理
- 本租户用户管理
- 本租户角色管理 (基于超级管理员分配的权限)
- 本租户审计日志
- 本租户系统设置

### 2.4 操作员权限范围

- 创建/编辑契约
- 使用模板
- 查看契约列表
- 查看统计数据
- 签约方管理 (CRUD)

### 2.5 查看者权限范围

- 查看契约列表
- 查看统计数据
- 导出报表 (受限)

---

## 3. 权限矩阵

### 3.1 功能权限矩阵

| 功能模块 | 功能项 | 超级管理员 | 企业管理员 | 操作员 | 查看者 |
|----------|--------|-----------|-----------|--------|--------|
| **概览统计** | 看板查看 | ✓ | ✓ | ✓ | ✓ |
| | 数据导出 | ✓ | ✓ | ✗ | ✗ |
| **契约管理** | 列表查看 | ✓ | ✓ | ✓ | ✓ |
| | 创建契约 | ✓ | ✓ | ✓ | ✗ |
| | 编辑契约 | ✓ | ✓ | ✓ (自己创建) | ✗ |
| | 删除契约 | ✓ | ✓ | ✗ | ✗ |
| | 提交签署 | ✓ | ✓ | ✓ | ✗ |
| | 签署/拒绝 | ✓ | ✓ | ✓ | ✗ |
| | 下载 PDF | ✓ | ✓ | ✓ | ✓ |
| | 批量操作 | ✓ | ✓ | ✗ | ✗ |
| **模板管理** | 列表查看 | ✓ | ✓ | ✓ | ✓ |
| | 创建模板 | ✓ | ✓ | ✓ | ✗ |
| | 编辑模板 | ✓ | ✓ | ✓ | ✗ |
| | 删除模板 | ✓ | ✓ | ✗ | ✗ |
| | 复制模板 | ✓ | ✓ | ✓ | ✗ |
| **签约方管理** | 列表查看 | ✓ | ✓ | ✓ | ✓ |
| | 添加签约方 | ✓ | ✓ | ✓ | ✗ |
| | 编辑签约方 | ✓ | ✓ | ✓ | ✗ |
| | 删除签约方 | ✓ | ✓ | ✗ | ✗ |
| **合规检测** | 使用检测 | ✓ | ✓ | ✓ | ✗ |
| | 查看检测记录 | ✓ | ✓ | ✓ | ✗ |
| **审计日志** | 查看日志 | ✓ | ✓ (本租户) | ✗ | ✗ |
| | 导出日志 | ✓ | ✓ | ✗ | ✗ |
| **用户管理** | 用户列表 | ✓ | ✓ | ✗ | ✗ |
| | 添加用户 | ✓ | ✓ | ✗ | ✗ |
| | 编辑用户 | ✓ | ✓ | ✗ | ✗ |
| | 删除用户 | ✓ | ✓ | ✗ | ✗ |
| | 重置密码 | ✓ | ✓ | ✗ | ✗ |
| | 禁用/启用 | ✓ | ✓ | ✗ | ✗ |
| **角色权限** | 角色列表 | ✓ | ✓ | ✗ | ✗ |
| | 创建角色 | ✓ | ✓ | ✗ | ✗ |
| | 编辑角色 | ✓ | ✓ | ✗ | ✗ |
| | 删除角色 | ✓ | ✓ | ✗ | ✗ |
| | 分配角色 | ✓ | ✓ | ✗ | ✗ |
| **租户管理** | 租户列表 | ✓ | ✗ | ✗ | ✗ |
| | 创建租户 | ✓ | ✗ | ✗ | ✗ |
| | 编辑租户 | ✓ | ✗ | ✗ | ✗ |
| | 删除租户 | ✓ | ✗ | ✗ | ✗ |
| | 额度管理 | ✓ | ✗ | ✗ | ✗ |
| **系统设置** | 查看设置 | ✓ | ✓ | ✗ | ✗ |
| | 修改设置 | ✓ | ✓ (部分) | ✗ | ✗ |

---

## 4. 权限定义详细说明

### 4.1 权限标识符规范

```
{module}:{action}
```

示例：
- `contract:read` - 查看契约
- `contract:write` - 创建/编辑契约
- `contract:delete` - 删除契约
- `contract:export` - 导出契约
- `user:read` - 查看用户
- `user:write` - 创建/编辑用户
- `role:read` - 查看角色
- `role:write` - 创建/编辑角色

### 4.2 模块划分

| 模块标识 | 显示名称 | 说明 |
|----------|----------|------|
| `dashboard` | 概览统计 | 数据看板相关 |
| `contract` | 契约管理 | 契约 CRUD 及签署 |
| `template` | 模板管理 | 合同模板管理 |
| `party` | 签约方 | 签约方管理 |
| `compliance` | 合规检测 | 合规检测功能 |
| `audit` | 审计日志 | 日志查看导出 |
| `user` | 用户管理 | 用户 CRUD |
| `role` | 角色权限 | 角色及权限管理 |
| `tenant` | 租户管理 | 租户 CRUD |
| `setting` | 系统设置 | 系统配置 |

### 4.3 操作定义

| 操作标识 | 显示名称 | 说明 |
|----------|----------|------|
| `read` | 查看 | 查看列表和详情 |
| `write` | 写入 | 创建和编辑 |
| `delete` | 删除 | 删除资源 |
| `export` | 导出 | 导出数据 |
| `manage` | 管理 | 全部管理权限 |

---

## 5. 权限验证流程

### 5.1 前端权限控制

```
路由访问 → 检查用户角色权限 → 允许/拒绝
```

1. **路由守卫**: 访问页面时检查是否有权限
2. **按钮控制**: 操作按钮根据权限显示/隐藏
3. **API 拦截**: 请求前检查权限，阻止无权限请求

### 5.2 后端权限验证

```
请求 → JWT 解析 → 获取用户角色 → 检查权限 → 允许/拒绝
```

1. **Token 解析**: 从 JWT 中获取用户信息
2. **权限查询**: 查询用户角色对应的权限列表
3. **资源校验**: 检查是否有权操作特定资源
4. **操作日志**: 记录权限验证结果

---

## 6. 数据权限控制

### 6.1 租户数据隔离

- 所有数据查询自动加上 `tenant_id` 条件
- 超级管理员可跨租户查看 (需特殊权限)

### 6.2 资源所有权

- 用户只能操作自己创建的契约 (操作员角色)
- 企业管理员可操作本租户所有资源
- 超级管理员可操作所有资源

---

## 7. 权限配置存储

### 7.1 数据库表设计

```sql
-- 角色表
CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  tenant_id VARCHAR(36),           -- NULL 表示系统级角色
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 权限表
CREATE TABLE permissions (
  id VARCHAR(36) PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(module, action)
);

-- 角色-权限关联表
CREATE TABLE role_permissions (
  role_id VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  PRIMARY KEY(role_id, permission_id),
  FOREIGN KEY(role_id) REFERENCES roles(id),
  FOREIGN KEY(permission_id) REFERENCES permissions(id)
);

-- 用户-角色关联表
CREATE TABLE user_roles (
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36),           -- 用户在该租户的角色
  PRIMARY KEY(user_id, role_id, tenant_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(role_id) REFERENCES roles(id)
);
```

### 7.2 默认权限配置

**超级管理员**
```
所有模块: *
```

**企业管理员**
```
dashboard: read
contract: read, write, delete, export
template: read, write, delete
party: read, write, delete
compliance: read, write
audit: read, export
user: read, write, delete
role: read, write
setting: read, write (受限)
```

**操作员**
```
dashboard: read
contract: read, write
template: read, write
party: read, write
compliance: read, write
```

**查看者**
```
dashboard: read
contract: read
template: read
party: read
```

---

## 8. 权限变更审计

### 8.1 审计内容

- 角色权限变更
- 用户角色分配变更
- 权限验证失败记录

### 8.2 审计字段

```json
{
  "id": "string",
  "timestamp": "ISO8601",
  "operator": "userId",
  "targetType": "role|user",
  "targetId": "string",
  "action": "grant|revoke|update",
  "before": {...},
  "after": {...},
  "result": "success|failure",
  "ip": "string"
}
```

---

## 9. 前端实现

### 9.1 权限指令/组件

```tsx
// 权限检查组件
<PermissionChecker permission="contract:write">
  <Button onClick={handleCreate}>创建契约</Button>
</PermissionChecker>

// 或者 Hook 方式
const { can } = usePermission();
if (can('contract:write')) {
  // 显示创建按钮
}
```

### 9.2 路由守卫

```tsx
<Route
  path="/contracts/create"
  element={
    <RequirePermission permission="contract:write">
      <ContractCreate />
    </RequirePermission>
  }
/>
```

### 9.3 API 请求拦截

```tsx
// 请求前检查
api.interceptors.request.use(config => {
  const { permissions } = useAuthStore();
  const required = config.meta?.permission;
  if (required && !permissions.includes(required)) {
    return Promise.reject('无权限');
  }
  return config;
});
```