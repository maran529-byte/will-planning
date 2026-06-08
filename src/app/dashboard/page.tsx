/**
 * /dashboard - 用户主页
 *
 * 改版 v1 (2026-06-08, Phase B):
 *   - 已登录用户才可访问 (layout requireUser 鉴权)
 *   - 展示: 用户信息 / 博主状态 / 我的文书草稿 (TBD) / 我的订单 (TBD)
 *   - 不是博主 → 显示"申请成为博主" CTA → /affiliate
 *   - 是博主 (approved) → 显示推广码 + "进入博主工作台" 链接
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
    <div className="min-h-screen bg-slate-50">
      <UserNavBar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 欢迎卡片 */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl shadow-md p-6 sm:p-8 text-white mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            您好, {user.displayName || user.email.split('@')[0]} 👋
          </h1>
          <p className="text-amber-50 text-sm sm:text-base">
            欢迎回到爱的延续 · 您可以管理文书草稿、订单和博主推广
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="bg-white/20 px-2.5 py-1 rounded-full">
              角色: <strong>{roleDisplay(user.role)}</strong>
            </span>
            <span className="bg-white/20 px-2.5 py-1 rounded-full font-mono">
              {user.email}
            </span>
          </div>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 创建新文书 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">📝</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">创建新文书</h2>
            <p className="text-slate-600 text-sm mb-4">
              6 类法律文书模板, AI 智能生成草稿, 1 分钟出稿
            </p>
            <Link
              href="/doc-type"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              开始创建 →
            </Link>
          </div>

          {/* 我的订单 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">💳</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">我的订单</h2>
            <p className="text-slate-600 text-sm mb-4">
              查看付费下载历史, 重新下载 PDF/Word
            </p>
            <Link
              href="/orders"
              className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              查看订单 →
            </Link>
          </div>

          {/* 博主卡片 (根据状态显示不同内容) */}
          {isBloggerApproved && user.blogger ? (
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl p-6 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-2xl mb-1">🎁</div>
                  <h2 className="text-lg font-bold text-emerald-900">您是博主</h2>
                  <p className="text-emerald-700 text-sm">
                    推广码已激活, 通过专属链接下单可获 10-15% 佣金
                  </p>
                </div>
                <Link
                  href="/affiliate/dashboard"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
                >
                  进入博主工作台 →
                </Link>
              </div>
              <div className="bg-white/70 rounded-lg p-3 mt-2">
                <div className="text-xs text-slate-500 mb-1">您的推广码</div>
                <code className="font-mono font-bold text-amber-700 text-lg tracking-wider">
                  {user.blogger.refCode}
                </code>
                <div className="text-xs text-slate-500 mt-1">
                  推广链接: <code className="text-slate-700">aiwill-planner.cn/?ref={user.blogger.refCode}</code>
                </div>
              </div>
            </div>
          ) : isBloggerPending ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
              <div className="text-2xl mb-2">⏳</div>
              <h2 className="text-lg font-bold text-amber-900 mb-1">博主申请审核中</h2>
              <p className="text-amber-800 text-sm">
                我们会在 1-2 个工作日内审核您的申请, 审核通过后即可开始推广
              </p>
              <Link
                href="/affiliate"
                className="inline-block mt-3 text-amber-700 hover:text-amber-900 text-sm font-semibold underline"
              >
                查看申请详情
              </Link>
            </div>
          ) : isBloggerRejected ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <div className="text-2xl mb-2">❌</div>
              <h2 className="text-lg font-bold text-red-900 mb-1">博主申请未通过</h2>
              <p className="text-red-800 text-sm">
                详情请查看 <Link href="/affiliate" className="underline">/affiliate</Link> 页面的审核备注
              </p>
            </div>
          ) : (
            // 默认: 还没申请博主
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-2xl mb-1">🚀</div>
                  <h2 className="text-lg font-bold text-purple-900">成为博主</h2>
                  <p className="text-purple-800 text-sm">
                    分享有温度的资产规划服务, 获得长期被动收入 (10-15% 佣金)
                  </p>
                </div>
                <Link
                  href="/affiliate"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
                >
                  申请成为博主 →
                </Link>
              </div>
            </div>
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
    lawyer: '律师',
    admin: '管理员',
  };
  return map[role] || role;
}
