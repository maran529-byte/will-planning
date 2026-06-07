import Link from 'next/link';
import { cookies } from 'next/headers';
import LegalFooter from '@/components/LegalFooter';
import { getOrdersByOpenidServer } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getInvoiceRequestsServer } from '@/lib/invoices';
import type { Order } from '@/lib/orders';
import AccountContent from './AccountContent';

export const dynamic = 'force-dynamic';

async function loadAccountData(openid: string) {
  const orders = await getOrdersByOpenidServer(openid);
  const invoices = await getInvoiceRequestsServer(openid);

  // 统计
  const paidOrders = orders.filter((o) => o.status === 'paid');
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const refundedOrders = orders.filter((o) => o.status === 'refunded');

  const totalSpent = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  const pendingAmount = pendingOrders.reduce((sum, o) => sum + o.amount, 0);

  return {
    orders,
    invoices,
    stats: {
      total_orders: orders.length,
      paid_orders: paidOrders.length,
      pending_orders: pendingOrders.length,
      refunded_orders: refundedOrders.length,
      total_spent: totalSpent,
      pending_amount: pendingAmount,
    },
  };
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const openid = cookieStore.get('wx_openid')?.value ?? null;

  if (!openid) {
    return <NotLoggedInView />;
  }

  const data = await loadAccountData(openid);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">👤 我的账户</h1>
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-amber-600 transition"
          >
            ← 返回首页
          </Link>
        </div>

        <AccountContent
          openid={openid}
          orders={data.orders}
          invoices={data.invoices}
          stats={data.stats}
        />
      </main>

      <LegalFooter />
    </div>
  );
}

function NotLoggedInView() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">请先登录</h1>
          <p className="text-sm text-slate-600 mb-6">
            查看订单 / 下载文书 / 申请发票, 需要先关注公众号「爱的延续」并完成绑定
          </p>
          <div className="space-y-3">
            <a
              href="/wechat/bind"
              className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition"
            >
              🔗 绑定公众号登录
            </a>
            <Link
              href="/"
              className="block w-full border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl transition"
            >
              返回首页
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-6">
            遇到问题? 联系客服微信 (见网站底部)
          </p>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
