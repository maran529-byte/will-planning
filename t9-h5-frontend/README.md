# T9: H5 前端 (Vercel 部署)

## 1. 项目概述

H5 前端是 aiwill-planner 合规生成平台的用户交互界面，提供移动端优先的响应式设计，支持用户通过 H5 页面完成契约生成、查看、管理的全流程操作。

### 核心目标
- 移动端优先，适配手机/平板/桌面
- 快速加载，首屏 < 2s
- 符合平台品牌调性

---

## 2. 技术选型

| 类别 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | SSR/SSG 支持，Vercel 原生集成 |
| UI 库 | Tailwind CSS + shadcn/ui | 原子化 CSS，快速构建 |
| 状态管理 | Zustand | 轻量，TypeScript 友好 |
| 表单 | React Hook Form + Zod | 类型安全验证 |
| HTTP | Fetch API / SWR | 数据获取与缓存 |
| 部署 | Vercel | H5 友好，免费额度 |

---

## 3. 页面结构

```
src/app/
├── (auth)/                 # 认证模块
│   ├── login/             # 登录页
│   └── register/          # 注册页
├── (dashboard)/            # 主模块
│   ├── layout.tsx         # 仪表盘布局
│   ├── page.tsx           # 首页/概览
│   ├── create/            # 创建契约
│   │   └── page.tsx       # 契约编辑器
│   ├── contracts/         # 契约列表
│   │   ├── page.tsx       # 列表页
│   │   └── [id]/          # 契约详情
│   │       └── page.tsx
│   ├── templates/         # 模板管理
│   │   └── page.tsx
│   └── settings/          # 设置
│       └── page.tsx
├── api/                   # API 路由（可选 BFF 层）
└── layout.tsx             # 根布局
```

---

## 4. 核心功能

### 4.1 认证模块
- 手机号 + 验证码登录
- JWT Token 存储（HttpOnly Cookie）
- Token 刷新机制

### 4.2 契约创建
- 表单式契约编辑（分步向导）
- 字段级联联动
- 草稿自动保存（localStorage）
- 合规预检（调用 T1）

### 4.3 契约列表
- 状态筛选（草稿/待签/已签/已拒绝）
- 关键词搜索
- 时间范围筛选
- 分页加载

### 4.4 契约详情
- PDF 预览
- 契约内容展示
- 签署状态追踪
- 审计日志查看

### 4.5 模板管理
- 常用模板收藏
- 模板预览

---

## 5. 组件设计

| 组件 | 说明 |
|------|------|
| `<ContractForm>` | 契约表单主体 |
| `<FormField>` | 字段组件（支持多种类型） |
| `<StatusBadge>` | 状态标签 |
| `<ContractCard>` | 契约卡片 |
| `<PreviewModal>` | PDF 预览弹窗 |
| `<StepWizard>` | 分步向导 |

---

## 6. API 集成

### 6.1 基础地址
- 开发环境：`http://localhost:8080`
- 生产环境：`https://api.aiwill-planner.com`

### 6.2 核心接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/login` | POST | 登录 |
| `/api/v1/contracts` | GET/POST | 列表/创建 |
| `/api/v1/contracts/:id` | GET/PUT/DELETE | 详情/更新/删除 |
| `/api/v1/compliance/check` | POST | 合规预检 |

### 6.3 请求拦截
- 自动携带 JWT
- 401 时跳转登录
- 错误统一 Toast 提示

---

## 7. 部署架构

```
Vercel (H5 Frontend)
    │
    ▼
T2 API Gateway (JWT 鉴权)
    │
    ▼
T1 Compliance Engine (核心服务)
    │
    ▼
PostgreSQL (多租户独立实例)
```

### 环境变量
```env
NEXT_PUBLIC_API_BASE_URL=https://api.aiwill-planner.com
NEXT_PUBLIC_APP_NAME=aiwill-planner
```

---

## 8. 验收标准

| 标准 | 目标 |
|------|------|
| 首屏加载 | < 2s (3G) |
| 移动端适配 | 375px - 428px 完美展示 |
| 认证流程 | 登录/登出正常 |
| 契约 CRUD | 完整可用 |
| 合规预检 | 字段错误实时提示 |

---

## 9. TODO

- [ ] 项目初始化 (Next.js + Tailwind)
- [ ] 认证模块开发
- [ ] 契约列表页
- [ ] 契约创建向导
- [ ] 契约详情页
- [ ] 响应式适配
- [ ] 部署 Vercel