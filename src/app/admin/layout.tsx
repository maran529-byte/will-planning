/**
 * /admin 全局 layout (passthrough)
 *
 * ⚠️ 这个 layout 故意不做任何鉴权, 让 /admin/login 自身能正常渲染
 *
 * 真正需要鉴权的 admin 页面都在 /admin/(authed)/ 子目录下,
 * 它们用 (authed)/layout.tsx 里的 requireAdmin() 做鉴权.
 *
 * 为什么这样设计:
 *  - 之前 /admin/layout.tsx 里有 requireAdmin(), 但 layout 也包裹了 /admin/login
 *    导致访问 login 时: 鉴权失败 → redirect 到 login → 又鉴权失败 → 死循环 (307)
 *  - 用 route group (authed) 把 login 隔出来, 父 layout 不做鉴权, 子 layout 做
 *  - URL 不变 (/admin/login 仍是 /admin/login)
 *  - 其他 admin 页面 (/admin, /admin/orders, ...) URL 也不变
 *
 * 行为:
 *  - /admin/login     → 走这个 passthrough layout → 渲染 login/page.tsx ✅
 *  - /admin           → 走 (authed)/layout.tsx → requireAdmin() 鉴权
 *  - /admin/orders    → 同上
 *  - /admin/users     → 同上
 *  - ... 11 个页面全部走 (authed)/layout.tsx
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
