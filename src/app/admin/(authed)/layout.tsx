import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { LogoutButton } from './LogoutButton';

/**
 * /admin (authed) route group layout
 *
 * ⚠️ 这个 layout 只包裹 /admin/(authed)/* (除了 login 之外的所有 admin 页面)
 *
 * 鉴权: requireAdmin() 校验 session + role='admin'
 *  - 未登录 → redirect /admin/login
 *  - 已登录但 role !== 'admin' → 401 (无权限)
 *
 * 为什么用 route group:
 *  - /admin/login 不能被这个 layout 包裹, 否则会无限 redirect 死循环
 *    (login 自身也是 /admin/*, layout 也会对它跑 requireAdmin)
 *  - 把 login 留在 /admin/login/ 不动, 其他页面挪到 /admin/(authed)/
 *  - URL 不变, 行为正确
 *
 * 顶部 nav: 11 个页面链接 + 当前 admin + 退出
 *
 * 改版 v2 (2026-06-09, UI polish):
 *   - 移除 stale @ts-expect-error (form action 注释已不需要)
 *   - nav 加 aria-label="管理后台导航"
 *   - 退出按钮加 aria-label
 *   - sticky header 加 leading-tight-cn
 */

const NAV_ITEMS = [
  { href: '/admin', label: '概览' },
  { href: '/admin/issues', label: '🐛 问题审核' },
  { href: '/admin/issue-keywords', label: '🤖 自运营词库' },
  { href: '/admin/orders', label: '订单' },
  { href: '/admin/refunds', label: '退款' },
  { href: '/admin/users', label: '用户' },
  { href: '/admin/affiliates', label: '博主' },
  { href: '/admin/withdrawals', label: '提现审批' },
  { href: '/admin/lawyers', label: '专业资产规划人员预约' },
  { href: '/admin/payments', label: '支付流水' },
  { href: '/admin/payment-events', label: '回调事件' },
  { href: '/admin/analytics', label: '数据看板' },
  { href: '/admin/ab-tests', label: 'A/B 测试' },
  { href: '/admin/wechat-menu', label: '公众号菜单' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    // 未登录或无权限 → 跳登录
    redirect(`/admin/login?return=${encodeURIComponent('/admin')}`);
  }

  const user = auth.user!;

  return (
    <div className="min-h-screen bg-slate-100 pb-safe">
      {/* 顶部 nav */}
      <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-8 w-8 rounded bg-amber-500/20 flex items-center justify-center text-lg flex-shrink-0"
              aria-hidden
            >
              🛡️
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate leading-tight-cn">家有所爱 管理后台</h1>
              <p className="text-xs text-slate-400 truncate leading-tight-cn">{user.email}</p>
            </div>
          </div>

          <nav
            className="hidden md:flex items-center gap-1 text-sm"
            aria-label="管理后台导航"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <LogoutButton />
        </div>

        {/* 移动端 nav */}
        <nav
          className="md:hidden flex overflow-x-auto gap-1 px-2 pb-2 text-xs"
          aria-label="管理后台导航 (移动端)"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
