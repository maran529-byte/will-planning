/**
 * /affiliate/dashboard - 博主工作台.
 *
 * 显示:
 *  - 推广码 + 推广链接 + 一键复制
 *  - 4 张统计卡: 点击 / 转化 / 累计佣金 / 可提现
 *  - tier-1/2 佣金拆分 (二级分销)
 *  - 我的团队 (下级博主列表)
 *  - 佣金明细 (最近 10 条, 含 tier 标识)
 *  - 点击明细 (最近 20 条)
 *  - 提现按钮 + 提现记录
 */
import { cookies } from 'next/headers';
import { getBloggerByUserId, getBloggerDashboard, getDownline, listWithdrawals } from '@/lib/affiliate';
import { DashboardContent } from './DashboardContent';

export const dynamic = 'force-dynamic';

async function getCurrentUser() {
  const adminStore = await cookies();
  const adminCookie = adminStore.get('admin_session');
  if (!adminCookie) return null;
  try {
    const payload = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString());
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export default async function AffiliateDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-md">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">请先登录</h1>
          <p className="text-sm text-slate-600 mb-5">您需要登录才能查看博主工作台</p>
          <a
            href="/admin/login?return=/affiliate/dashboard"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium"
          >
            前往登录
          </a>
        </div>
      </div>
    );
  }

  const blogger = await getBloggerByUserId(user.id);
  if (!blogger) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-md">
          <div className="text-4xl mb-3">📮</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">尚未申请</h1>
          <p className="text-sm text-slate-600 mb-5">您还未申请成为博主</p>
          <a
            href="/affiliate"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium"
          >
            前往申请
          </a>
        </div>
      </div>
    );
  }

  if (blogger.status !== 'approved') {
    const statusLabel = {
      pending: { title: '⏳ 审核中', desc: '我们会在 1-2 个工作日内审核您的申请' },
      rejected: { title: '❌ 申请被拒', desc: '请查看审核备注或联系客服' },
      disabled: { title: '🚫 账号已禁用', desc: '请联系客服' },
    };
    const s = statusLabel[blogger.status as keyof typeof statusLabel];
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{s.title}</h1>
          <p className="text-sm text-slate-600 mb-5">{s.desc}</p>
          {blogger.review_note && (
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 mb-5">
              备注: {blogger.review_note}
            </div>
          )}
          <a
            href="/affiliate"
            className="inline-block bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg text-sm font-medium"
          >
            返回
          </a>
        </div>
      </div>
    );
  }

  // 加载数据
  const dashboard = await getBloggerDashboard(blogger.id);
  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-md">
          <p className="text-slate-700">数据加载失败</p>
        </div>
      </div>
    );
  }

  // 加载提现记录
  const withdrawalsResult = await listWithdrawals({ bloggerId: blogger.id, limit: 20 });
  const withdrawals = withdrawalsResult.withdrawals;

  // 加载下级博主 (二级分销)
  const downline = await getDownline(blogger.id);

  return (
    <DashboardContent
      blogger={dashboard.blogger}
      stats={dashboard.stats}
      withdrawals={withdrawals}
      downline={downline}
    />
  );
}
