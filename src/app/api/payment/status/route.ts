import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdAndOpenidServer, getOrderByIdAndOpenidLocal } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidFromCookie } from '@/lib/cookie';

/**
 * GET /api/payment/status?order_id=xxx
 * 查询支付状态. 必须 cookie 中的 openid 匹配 order.openid, 否则 404.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    // 1. 必须先登录
    const openid = await getOpenidFromCookie();
    if (!openid) {
      return NextResponse.json(
        {
          code: 'UNAUTHENTICATED',
          error: '请先在公众号绑定微信账号',
          redirect: '/wechat/bind',
        },
        { status: 401 }
      );
    }

    // 2. 用 openid + orderId 双重过滤 (不允许查别人的订单)
    const order = supabaseAdmin
      ? await getOrderByIdAndOpenidServer(orderId, openid)
      : getOrderByIdAndOpenidLocal(orderId, openid) ?? null;

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: order.status,
      paid_at: order.paid_at,
      order_no: order.order_no,
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
