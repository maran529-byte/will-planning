/**
 * /dashboard - 用户主页
 *
 * 改版 v1 (2026-06-08, Phase B):
 *   - 已登录用户才可访问 (layout requireUser 鉴权)
 *   - 展示: 用户信息 / 博主状态 / 我的文书草稿 (TBD) / 我的订单 (TBD)
 *   - 不是博主 → 显示"申请成为博主" CTA → /affiliate
 *   - 是博主 (approved) → 显示推广码 + "进入博主工作台" 链接
 *
 * 改版 v2 (2026-06-09, UI polish):
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums 排版
 *   - 添加 role="status" / aria-label / aria-hidden
 *   - 添加 pb-safe (iOS 底部安全区)
 *
 * 注意:
 *   - /dashboard 是 user 鉴权, /admin 是 admin 鉴权
 *   - 用 admin 账号也能登录此页面 (因为 admin 也有 user 记录)
 *   - 顶部 nav 由 (authed) route group 提供 (类似 admin 的 (authed))
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/user-auth';
import { UserNavBar } from './UserNavBar';
import { LogoutButton } from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const auth = await requireUser();
  if (!auth.authenticated || !auth.user) {
    redirect(`/login?return=${encodeURIComponent('/dashboard')}`);
  }

  const user = auth.user;
  const isBloggerApproved = user.blogger?.status === 'approved';
  const isBloggerPending = user.blogger?.status === 'pending';
  const isBloggerRejected = user.blogger?.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      <UserNavBar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 欢迎卡片 */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl shadow-md p-6 sm:p-8 text-white mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight-cn text-balance">
            <span aria-hidden>👋 </span>您好, {user.displayName || user.email.split('@')[0]}
          </h1>
          <p className="text-amber-50 text-sm sm:text-base leading-relaxed-cn">
            欢迎回到爱的延续 · 您可以管理文书草稿、订单和博主推广
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span
              className="bg-white/20 px-2.5 py-1 rounded-full"
              role="status"
              aria-label={`当前角色: ${roleDisplay(user.role)}`}
            >
              角色: <strong>{roleDisplay(user.role)}</strong>
            </span>
            <span className="bg-white/20 px-2.5 py-1 rounded-full font-mono tabular-nums">
              {user.email}
            </span>
          </div>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 创建新文书 */}
          <article className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3" aria-hidden>📝</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2 leading-tight-cn">创建新文书</h2>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">
              6 类法律文书模板, 系统化生成草稿, 1 分钟出稿
            </p>
            <Link
              href="/doc-type"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <span aria-hidden>→ </span>开始创建
            </Link>
          </article>

          {/* 我的订单 */}
          <article className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3" aria-hidden>💳</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2 leading-tight-cn">我的订单</h2>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">
              查看付费下载历史, 重新下载 PDF/Word
            </p>
            <Link
              href="/orders"
              className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <span aria-hidden>→ </span>查看订单
            </Link>
          </article>

          {/* 博主卡片 (根据状态显示不同内容) */}
          {isBloggerApproved && user.blogger ? (
            <article className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl p-6 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-2xl mb-1" aria-hidden>🎁</div>
                  <h2 className="text-lg font-bold text-emerald-900 leading-tight-cn">您是博主</h2>
                  <p className="text-emerald-700 text-sm leading-relaxed-cn">
                    推广码已激活, 通过专属链接下单可获 10-15% 佣金
                  </p>
                </div>
                <Link
                  href="/affiliate/dashboard"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
                >
                  <span aria-hidden>→ </span>进入博主工作台
                </Link>
              </div>
              <div className="bg-white/70 rounded-lg p-3 mt-2">
                <div className="text-xs text-slate-500 mb-1">您的推广码</div>
                <code
                  className="font-mono font-bold text-amber-700 text-lg tracking-wider tabular-nums"
                  aria-label={`推广码: ${user.blogger.refCode}`}
                >
                  {user.blogger.refCode}
                </code>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed-cn">
                  推广链接:{' '}
                  <code className="text-slate-700 break-all">
                    aiwill-planner.cn/?ref={user.blogger.refCode}
                  </code>
                </div>
              </div>
            </article>
          ) : isBloggerPending ? (
            <article
              className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6"
              role="status"
            >
              <div className="text-2xl mb-2" aria-hidden>⏳</div>
              <h2 className="text-lg font-bold text-amber-900 mb-1 leading-tight-cn">
                博主申请审核中
              </h2>
              <p className="text-amber-800 text-sm leading-relaxed-cn">
                我们会在 1-2 个工作日内审核您的申请, 审核通过后即可开始推广
              </p>
              <Link
                href="/affiliate"
                className="inline-block mt-3 text-amber-700 hover:text-amber-900 text-sm font-semibold underline"
              >
                查看申请详情
              </Link>
            </article>
          ) : isBloggerRejected ? (
            <article
              className="bg-red-50 border-2 border-red-200 rounded-2xl p-6"
              role="status"
            >
              <div className="text-2xl mb-2" aria-hidden>❌</div>
              <h2 className="text-lg font-bold text-red-900 mb-1 leading-tight-cn">
                博主申请未通过
              </h2>
              <p className="text-red-800 text-sm leading-relaxed-cn">
                详情请查看{' '}
                <Link href="/affiliate" className="underline">/affiliate</Link> 页面的审核备注
              </p>
            </article>
          ) : (
            // 默认: 还没申请博主
            <article className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-2xl mb-1" aria-hidden>🚀</div>
                  <h2 className="text-lg font-bold text-purple-900 leading-tight-cn">成为博主</h2>
                  <p className="text-purple-800 text-sm leading-relaxed-cn">
                    分享有温度的资产规划服务, 获得长期被动收入 (10-15% 佣金)
                  </p>
                </div>
                <Link
                  href="/affiliate"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
                >
                  申请成为博主
                </Link>
              </div>
            </article>
          )}
        </div>

        {/* 退出登录 */}
        <div className="mt-8 text-center">
          <LogoutButton />
        </div>
      </main>
    </div>
  );
}

function roleDisplay(role: string): string {
  const map: Record<string, string> = {
    user: '普通用户',
    blogger: '博主',
    lawyer: '专业资产规划人员',
    admin: '管理员',
  };
  return map[role] || role;
}
