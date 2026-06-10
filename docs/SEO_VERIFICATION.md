# 搜索引擎站长平台验证 (Baidu / Google / Bing)

要让网站被搜索引擎收录, 需要先在各家站长平台「认领」域名, 它们会给一段 `<meta>` 验证码放到网站 `<head>` 里。

## 一次性配置 (用户操作)

### 1. 百度站长平台 (https://ziyuan.baidu.com)

1. 用百度账号登录, 添加站点: `aiwill-planner.cn` + `h5.aiwill-planner.cn`
2. 站点属性 → 验证网站 → 选「HTML标签验证」
3. 复制 meta 标签里的 `content` 值 (一串 32 位字符)

### 2. Google Search Console (https://search.google.com/search-console)

1. 用 Google 账号登录, 添加资源: `https://aiwill-planner.cn` (URL prefix 方式)
2. 验证方法选「HTML 标签」
3. 复制 meta 标签里的 `content` 值

### 3. Bing Webmaster (https://www.bing.com/webmasters) - 可选

1. 添加站点: `https://aiwill-planner.cn`
2. 选「Meta tag」验证, 复制 `content`

## 拿到码以后 (开发操作)

需要同时在 3 个地方填入 (因为我们有 2 个站点 + 静态/动态混部):

### A) Next.js metadata (覆盖 H5 + CN 所有动态页面)

`src/app/layout.tsx` 第 74-78 行:

```ts
verification: {
  google: "你从GSC拿到的code",
  yandex: "选填",
  // Bing 也支持, 任意代填 yahoo 字段
  yahoo: "你从Bing拿到的code",
},
```

### B) Next.js 头部 <meta> (Baidu 不在 Next.js 内置字段, 必须自定义)

`src/app/layout.tsx` 把下面这段加到 layout body 顶部:

```tsx
<head>
  <meta name="baidu-site-verification" content="你从百度拿到的code" />
  <meta name="msvalidate.01" content="你从Bing拿到的code(可选)" />
</head>
```

(Next.js App Router 不支持任意 meta, 需用上面这种 <head> 注入方式)

### C) 静态首页 (CN / 根)

`index.html` 第 6 行附近添加 (3 个 <meta>):

```html
<meta name="baidu-site-verification" content="...">
<meta name="google-site-verification" content="...">
<meta name="msvalidate.01" content="...">
```

## 部署

修改完一次 `git add -A && git commit && git push origin main` 同时触发:

- Vercel: 自动重新部署 H5
- CN: `bash deployment/mainland-server/deploy_mainland.sh` 重新发布

## 验证收录

提交后, 各站长平台都会实时显示验证状态。
- 验证通过后, 立即可点「提交 sitemap」
- 推荐优先提交: `https://aiwill-planner.cn/sitemap.xml` + `https://h5.aiwill-planner.cn/sitemap-h5.xml`

## 收录加速 (可选)

- 百度: 主动推送 / sitemap / 自动推送 (有 JS 嵌入版)
- Google: 提交 sitemap 即可, 主动推送走 Indexing API
- Bing: Import from Google Search Console 一键导入 GSC 数据
