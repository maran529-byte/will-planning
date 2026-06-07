import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Admin 概览统计
 *
 * GET /api/admin/stats
 * 返回:
 *  - today_orders:    今日订单数
 *  - today_gmv_cents: 今日 GMV (仅 paid 订单)
 *  - pending_orders:  待支付订单数
 *  - recent_orders:   最近 10 单 (含 paid_at, amount, order_no, status, plan, openid)
 *  - error_orders:    异常订单数 (pending 超过 1 小时未支付)
 */

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: auth.reason }, { status: auth.status });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase admin client 未配' },
      { status: 503 }
    );
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // 并发 4 个查询
    const [
      { count: todayOrders },
      { data: todayPaidOrders },
      { count: pendingOrders },
      { data: recentOrders },
      { count: errorOrders },
    ] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      supabaseAdmin
        .from('orders')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', todayStart),
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseAdmin
        .from('orders')
        .select('id, order_no, amount, plan, status, payment_channel, payment_method, paid_at, created_at, openid')
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', oneHourAgo),
    ]);

    const todayGmvCents = (todayPaidOrders || []).reduce(
      (sum, o) => sum + (Number(o.amount) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      stats: {
        today_orders: todayOrders || 0,
        today_gmv_cents: todayGmvCents,
        today_gmv_yuan: (todayGmvCents / 100).toFixed(2),
        pending_orders: pendingOrders || 0,
        error_orders: errorOrders || 0,
      },
      recent_orders: recentOrders || [],
    });
  } catch (error) {
    console.error('admin stats error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '查询统计失败' },
      { status: 500 }
    );
  }
}
