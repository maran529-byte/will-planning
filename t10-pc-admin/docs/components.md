# PC管理后台 组件规范

## 1. 设计规范

### 1.1 色彩系统

**主色 (Primary)**
```
基础色:     #2563EB
浅色:       #3B82F6
深色:       #1D4ED8
悬停:       #1E40AF
激活:       #1E3A8A
```

**功能色**
```
成功:       #16A34A
警告:       #F59E0B
错误:       #DC2626
信息:       #3B82F6
```

**中性色**
```
背景:       #F1F5F9
卡片:       #FFFFFF
侧边栏:     #1E293B
边框:       #E2E8F0
文字主:     #1E293B
文字次:     #64748B
文字弱:     #94A3B8
文字高亮:   #F8FAFC
```

### 1.2 字体系统

```
字体族: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

尺寸:
- H1: 24px / 700 / line-height: 1.2
- H2: 20px / 600 / line-height: 1.3
- H3: 16px / 600 / line-height: 1.4
- 正文: 14px / 400 / line-height: 1.5
- 小字: 12px / 400 / line-height: 1.5
- 辅助: 12px / 400 / line-height: 1
```

### 1.3 间距系统

```
基础单位: 4px

xs:   4px   (紧凑)
sm:   8px   (小)
md:   16px  (标准)
lg:   24px  (大)
xl:   32px  (较大)
2xl:  48px  (宽松)
3xl:  64px  (极大)
```

### 1.4 圆角

```
无:   0px
小:   4px   (输入框/小按钮)
中:   6px   (卡片/大按钮)
大:   8px   (模态框/面板)
全:   9999px (标签/胶囊)
```

### 1.5 阴影

```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.15)
```

---

## 2. 布局组件

### 2.1 Layout 布局容器

```tsx
// 结构
<Layout>
  <Sider />      // 侧边栏
  <Header />     // 顶部栏
  <Content />    // 主内容
</Layout>

// Sider 属性
- width: 240px (展开) | 64px (折叠)
- theme: dark (深色背景 #1E293B)
- collapsible: true
- trigger: 底部折叠触发器

// Header 属性
- height: 64px
- background: #FFFFFF
- border-bottom: 1px solid #E2E8F0

// Content 属性
- background: #F1F5F9
- padding: 24px
- min-height: calc(100vh - 64px)
```

### 2.2 PageHeader 页面标题

```tsx
interface PageHeaderProps {
  title: string;           // 页面标题
  subtitle?: string;      // 副标题/描述
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;    // 操作按钮区域
  tabs?: TabItem[];       // Tab 切换
}

使用示例:
<PageHeader
  title="契约管理"
  subtitle="管理所有契约"
  breadcrumbs={[{ label: '首页', path: '/' }, { label: '契约' }]}
  actions={<Button type="primary">新建</Button>}
/>
```

---

## 3. 导航组件

### 3.1 Menu 侧边菜单

```tsx
interface MenuItem {
  key: string;
  icon?: ReactNode;
  label: string;
  children?: MenuItem[];
  disabled?: boolean;
}

// 样式规范
- 高度: 44px
- 图标: 20px
- 间距: 图标与文字 12px
- 默认态: 文字 #94A3B8
- 悬停态: 文字 #CBD5E1 + 背景 rgba(255,255,255,0.05)
- 选中态: 文字 #F8FAFC + 左侧 3px 主色指示条 + 背景 #334155

// 分组菜单
- 分组标题: 12px + #64748B + 大写
```

### 3.2 Breadcrumb 面包屑

```tsx
// 样式
- 分隔符: "/" + #94A3B8
- 最后一级: #1E293B + font-weight: 600
- 可点击项: 悬停显示下划线
- 路径: 首页 / 契约管理 / 契约详情
```

### 3.3 Tabs 标签页

```tsx
// 样式
- 高度: 44px
- 选中下划线: 2px + 主色
- 悬停: 文字变为主色
- 背景: 透明
```

---

## 4. 数据展示

### 4.1 Table 表格

```tsx
// 基础样式
- 表头: 背景 #F8FAFC + 字体 #64748B + 12px + font-weight: 600
- 行高: 52px
- 斑马纹: 奇数行 #FFFFFF，偶数行 #F8FAFC
- 悬停: 背景 #F1F5F9
- 边框: 底部 1px #E2E8F0

// 列类型
- 文本列: 左对齐
- 数字列: 右对齐
- 操作列: 居中

// 功能
- 排序: 点击列头显示箭头
- 筛选: 列内下拉菜单
- 多选: Checkbox 列
- 分页: 底部右侧
```

### 4.2 Card 卡片

```tsx
// 样式
- 背景: #FFFFFF
- 圆角: 8px
- 阴影: sm
- 内边距: 20px

// 类型
- 统计卡片 (带图标)
- 列表卡片
- 网格卡片
```

### 4.3 Badge/Tag 状态标签

```tsx
// 状态颜色
const statusColors = {
  draft: { bg: '#F1F5F9', text: '#64748B' },      // 草稿
  pending: { bg: '#FEF3C7', text: '#D97706' },     // 待签
  signing: { bg: '#DBEAFE', text: '#2563EB' },     // 签署中
  signed: { bg: '#D1FAE5', text: '#059669' },      // 已签
  rejected: { bg: '#FEE2E2', text: '#DC2626' },    // 已拒
  expired: { bg: '#F1F5F9', text: '#94A3B8' }     // 已过期
};

// 样式
- 圆角: 全圆
- 内边距: 4px 12px
- 字体: 12px
```

### 4.4 Statistic 统计数字

```tsx
// 样式
- 数字: 28px + font-weight: 700 + #1E293B
- 标签: 14px + #64748B
- 变化: 12px + 绿色(↑)/红色(↓)

// 布局
- 横向排列: 数字在左，标签/变化在右
- 或纵向排列: 数字在上，标签在下
```

---

## 5. 表单组件

### 5.1 Input 输入框

```tsx
// 尺寸
- 高度: 36px
- 内边距: 0 12px
- 圆角: 6px
- 字体: 14px

// 状态
- 默认: 边框 #E2E8F0
- 悬停: 边框 #CBD5E1
- 聚焦: 边框 #2563EB + 阴影 0 0 0 3px rgba(37,99,235,0.1)
- 错误: 边框 #DC2626 + 阴影 0 0 0 3px rgba(220,38,38,0.1)
- 禁用: 背景 #F8FAFC + 文字 #94A3B8

// 类型
- 普通文本
- 密码 (带显隐切换)
- 手机号 (带 +86 前缀)
- 搜索 (带搜索图标)
```

### 5.2 Select 选择器

```tsx
// 样式 (同 Input)
// 下拉菜单
- 背景: #FFFFFF
- 圆角: 6px
- 阴影: md
- 最大高度: 300px (超出滚动)
- 选中项: 背景 #EFF6FF + 文字 #2563EB

// 功能
- 单选
- 多选
- 搜索过滤
- 远程搜索
- 支持新建选项
```

### 5.3 DatePicker 日期选择

```tsx
// 样式 (同 Input)
// 类型
- 日期选择
- 日期范围选择
- 快捷选项: 今天/本周/本月/本年

// 面板
- 背景: #FFFFFF
- 选中: 背景 #2563EB + 白色文字
- 悬停: 背景 #F1F5F9
```

### 5.4 Button 按钮

```tsx
// 变体
- primary: 背景 #2563EB + 白色文字
- secondary: 背景 #F1F5F9 + #1E293B文字 (hover: #E2E8F0)
- outline: 边框 #E2E8F0 + #1E293B文字 (hover: 背景 #F8FAFC)
- ghost: 透明背景 + #2563EB文字
- danger: 背景 #DC2626 + 白色文字

// 尺寸
- sm: 32px高 + 12px水平padding + 12px字体
- md: 36px高 + 16px水平padding + 14px字体
- lg: 40px高 + 20px水平padding + 14px字体

// 状态
- 默认
- 悬停: 颜色加深 10%
- 点击: 颜色加深 15%
- 禁用: 透明度 50%
- 加载: 显示 Spinner + 禁用

// 图标
- 左图标 + 8px间距
- 右图标 + 8px间距
```

### 5.5 Checkbox/Radio

```tsx
// Checkbox
- 尺寸: 18px × 18px
- 圆角: 4px
- 选中: 背景 #2563EB + 白色勾
- 悬停: 边框 #2563EB

// Radio
- 尺寸: 18px
- 圆角: 全圆
- 选中: 外圈 #2563EB + 内芯 #2563EB
```

### 5.6 Form 表单

```tsx
// 布局
- 垂直布局: 标签在字段上方
- 网格布局: 2列/3列

// 标签
- 宽度: 120px
- 对齐: 右对齐
- 必填: 红色星号

// 错误提示
- 位置: 字段下方
- 颜色: #DC2626
- 图标: 感叹号

// 校验
- 实时校验 (onChange/onBlur)
- 提交校验
```

---

## 6. 反馈组件

### 6.1 Modal 对话框

```tsx
// 居中对话框
- 背景: #FFFFFF
- 圆角: 8px
- 阴影: lg
- 遮罩: rgba(0,0,0,0.5)
- 宽度: 480px (小) | 640px (中) | 800px (大)

// 头部
- 高度: 56px
- 标题: 16px + font-weight: 600
- 关闭按钮: 右侧 X 图标

// 内容
- 内边距: 24px
- 最大高度: calc(100vh - 200px) (超出滚动)

// 底部
- 内边距: 16px 24px
- 按钮: 右对齐
- 间距: 12px
```

### 6.2 Drawer 抽屉

```tsx
// 从右滑入
- 宽度: 480px (小) | 640px (中) | 800px (大)
- 背景: #FFFFFF
- 圆角: 0 (无)
- 阴影: xl

// 头部
- 高度: 56px
- 边框底: 1px solid #E2E8F0

// 内容
- 内边距: 24px

// 关闭
- 点击遮罩关闭
- ESC 键关闭
- 右上角关闭按钮
```

### 6.3 Toast 提示

```tsx
// 位置: 顶部居中
// 动画: 从上滑入
// 自动消失: 2s

// 类型
- success: 绿色图标 + 成功文案
- error: 红色图标 + 错误文案
- warning: 橙色图标 + 警告文案
- info: 蓝色图标 + 信息文案

// 操作提示
- 右侧操作按钮 (如"撤销")
```

### 6.4 Message 全局提示

```tsx
// 位置: 顶部居中
// 背景: rgba(30, 41, 59, 0.9) + 白色文字
// 圆角: 全圆
// 内边距: 12px 24px
```

---

## 7. 数据输入

### 7.1 Upload 上传

```tsx
// 点击上传
- 边框: 2px dashed #E2E8F0
- 圆角: 8px
- 内边距: 40px
- 悬停: 边框 #2563EB + 背景 #F8FAFC

// 拖拽上传
- 拖拽进入: 边框 #2563EB + 背景 #EFF6FF

// 进度
- 进度条: 高度 4px + 圆角 + 主色
- 百分比: 显示数字

// 文件列表
- 文件名 + 大小 + 删除按钮
```

### 7.2 RichText 富文本

```tsx
// 工具栏
- 高度: 44px
- 背景: #F8FAFC
- 边框: 1px solid #E2E8F0

// 功能
- 标题 (H1/H2/H3)
- 加粗/斜体/下划线
- 列表 (有序/无序)
- 链接
- 引用
- 代码块
```

---

## 8. 辅助组件

### 8.1 Avatar 头像

```tsx
// 尺寸
- sm: 32px
- md: 40px
- lg: 56px
- xl: 80px

// 形状
- 圆形 (默认)
- 方形 (带圆角)

// 内容
- 图片
- 文字 (取名字首)
- 默认图标 (用户)
```

### 8.2 Tooltip 提示

```tsx
// 样式
- 背景: #1E293B
- 文字: #F8FAFC
- 圆角: 6px
- 内边距: 8px 12px
- 字体: 12px

// 位置
- 上 (默认)
- 下/左/右 (自动调整)
```

### 8.3 Pagination 分页

```tsx
// 样式
- 按钮: 32px × 32px
- 圆角: 6px
- 当前页: 背景 #2563EB + 白色文字
- 其他页: 背景透明 + 文字 #1E293B

// 信息
- 共 X 条
- 每页 Y 条

// 功能
- 首页/末页
- 上一页/下一页
- 直接跳转
```

### 8.4 Empty 空状态

```tsx
// 内容
- 插图: 灰色 + 简单图形
- 标题: 16px + #1E293B
- 描述: 14px + #64748B
- 操作: 按钮 (可选)

// 布局
- 居中
- 上下间距: 24px
```

### 8.5 Loading 加载

```tsx
// Spinner
- 尺寸: 20px (小) | 32px (中) | 48px (大)
- 颜色: #2563EB

// Skeleton 骨架屏
- 背景: #E2E8F0
- 动画: 闪烁效果 (从左到右)
- 用于: 表格行/卡片/文字段落

// Progress 进度条
- 高度: 4px
- 圆角: 全圆
- 背景: #E2E8F0
- 进度: #2563EB
```

---

## 9. 响应式断点

```tsx
// 断点定义
const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// 组件响应式
// 表格: 在小屏幕下转为卡片列表
// 侧边栏: 在 <1024px 时折叠/隐藏
// 搜索栏: 在移动端收起为筛选按钮
```

---

## 10. 组件使用示例

### 10.1 页面结构

```tsx
<Layout>
  <Sider>
    <Menu items={menuItems} collapsed={collapsed} onCollapse={setCollapsed} />
  </Sider>
  <Layout>
    <Header>
      <Breadcrumb items={breadcrumbs} />
      <Space>
        <Badge count={5}><BellOutlined /></Badge>
        <Avatar name={user.name} src={user.avatar} />
      </Space>
    </Header>
    <Content>
      <PageHeader
        title="契约管理"
        actions={<Button type="primary">新建</Button>}
      />
      <Card>
        <Table columns={columns} dataSource={data} loading={loading} />
      </Card>
    </Content>
  </Layout>
</Layout>
```

### 10.2 筛选表单

```tsx
<Card>
  <Form layout="inline" onFinish={handleSearch}>
    <Form.Item name="status">
      <Select placeholder="状态" options={statusOptions} />
    </Form.Item>
    <Form.Item name="keyword">
      <Input placeholder="搜索契约名称" prefix={<SearchOutlined />} />
    </Form.Item>
    <Form.Item>
      <Space>
        <Button type="primary" htmlType="submit">搜索</Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
    </Form.Item>
  </Form>
</Card>
```

### 10.3 详情抽屉

```tsx
<Drawer
  title="契约详情"
  placement="right"
  width={640}
  onClose={onClose}
  open={visible}
>
  <Descriptions column={1} bordered>
    <Descriptions.Item label="契约名称">{contract.name}</Descriptions.Item>
    <Descriptions.Item label="状态">
      <Badge status={contract.status} text={contract.statusText} />
    </Descriptions.Item>
  </Descriptions>
  <Divider />
  <Title level={4}>签约方</Title>
  <PartyList data={contract.parties} />
</Drawer>
```