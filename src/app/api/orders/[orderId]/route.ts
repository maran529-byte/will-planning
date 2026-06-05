import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderServer,
  getOrderByIdAndOpenidServer,
  getOrderByIdAndOpenidLocal,
  updateOrderStatusServer,
  updateOrderStatusLocal,
  Order,
} from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidFromCookie } from '@/lib/cookie';

// ---- Server-side localStorage fallback (in-memory, dev only) ----
type GlobalWithOrders = typeof globalThis & { orders?: Order[] };

function getServerOrders(): Order[] {
  const g = globalThis as GlobalWithOrders;
  if (!g.orders) g.orders = [];
  return g.orders;
}

/**
 * GET /api/orders/[orderId]
 * 读取单个订单. 校验 openid 所有权, 不允许读别人的订单.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
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

    // 2. 用 openid + orderId 双重过滤 (不会查到别人的订单)
    const order = supabaseAdmin
      ? await getOrderByIdAndOpenidServer(orderId, openid)
      : getOrderByIdAndOpenidLocal(orderId, openid) ?? null;

    if (!order) {
      // 不区分"不存在"和"非本人" (防枚举攻击)
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('获取订单失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[orderId]
 * 更新订单状态 (用于支付回调等场景).
 *
 * P0 修复: 修复前 PATCH 不校验 openid, 任意用户可改任意订单.
 * 修复后: 必须 cookie 中的 openid === order.openid 才能更新.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { status, payment_channel } = body;

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

    if (!status) {
      return NextResponse.json({ error: '缺少更新字段' }, { status: 400 });
    }

    const validStatuses: Order['status'][] = ['pending', 'paid', 'refunded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '无效的订单状态' }, { status: 400 });
    }

    // 2. 校验所有权 (订单必须存在且属于当前用户)
    let existingOrder;
    if (supabaseAdmin) {
      existingOrder = await getOrderByIdAndOpenidServer(orderId, openid);
    } else {
      existingOrder = getOrderByIdAndOpenidLocal(orderId, openid) ?? null;
    }
    if (!existingOrder) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 3. 执行更新 (本地 fallback 路径上, updateOrderStatusLocal 还会再次校验)
    let order;
    if (supabaseAdmin) {
      // Supabase 路径: 用 .eq('id', id).eq('openid', openid) 做原子 update,
      // 即使并发请求也无法改别人的订单.
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
          status,
          paid_at: status === 'paid' ? new Date().toISOString() : existingOrder.paid_at,
          payment_channel: payment_channel || existingOrder.payment_channel,
        })
        .eq('id', orderId)
        .eq('openid', openid)
        .select()
        .maybeSingle();
      if (error) {
        console.error('Supabase updateOrder error:', error);
        return NextResponse.json({ error: '更新订单失败' }, { status: 500 });
      }
      order = data as Order | null;
    } else {
      order = updateOrderStatusLocal(orderId, status, payment_channel, openid) ?? null;
    }

    if (!order) {
      return NextResponse.json({ error: '订单不存在或更新失败' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('更新订单失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
