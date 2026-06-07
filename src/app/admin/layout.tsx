import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * /admin 全局 layout (Phase 3)
 *
 * 鉴权: requireAdmin() 校验 session + role='admin'
 *  - 未登录 → redirect /admin/login
 *  - 已登录但 role !== 'admin' → 401 (无权限)
 *
 * 顶部 nav: 7 个页面链接 + 当前 admin + 退出
 */

const NAV_ITEMS = [
  { href: '/admin', label: '概览' },
  { href: '/admin/orders', label: '订单' },
  { href: '/admin/refunds', label: '退款' },
  { href: '/admin/users', label: '用户' },
  { href: '/admin/affiliates', label: '博主' },
  { href: '/admin/withdrawals', label: '提现审批' },
  { href: '/admin/lawyers', label: '律师预约' },
  { href: '/admin/payments', label: '支付流水' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    // 未登录或无权限 → 跳登录
    redirect(`/admin/login?return=${encodeURIComponent('/admin')}`);
  }

  const user = auth.user!;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 顶部 nav */}
      <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded bg-amber-500/20 flex items-center justify-center text-lg flex-shrink-0">
              🛡️
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">aiwill-planner 管理后台</h1>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
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

          <form action="/api/admin/auth" method="POST">
            {/* @ts-expect-error - React 19 form action w/ Server Action; 我们用 hidden input + onClick */}
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/admin/auth', { method: 'DELETE' });
                window.location.href = '/admin/login';
              }}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800"
            >
              退出
            </button>
          </form>
        </div>

        {/* 移动端 nav */}
        <nav className="md:hidden flex overflow-x-auto gap-1 px-2 pb-2 text-xs">
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
