import { NextRequest, NextResponse } from 'next/server';
import { getOrderServer, updateOrderStatusServer, Order } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';

// Extended globalThis type to include the orders array
type GlobalWithOrders = typeof globalThis & { orders?: Order[] };

// Server-side localStorage fallback using globalThis
function getServerOrders(): Order[] {
  const g = globalThis as GlobalWithOrders;
  if (g.orders) {
    return g.orders;
  }
  g.orders = [];
  return g.orders;
}

function setServerOrders(orders: Order[]) {
  const g = globalThis as GlobalWithOrders;
  g.orders = orders;
}

function getOrderLocal(orderId: string): Order | undefined {
  const orders = getServerOrders();
  return orders.find((o) => o.id === orderId);
}

function updateOrderStatusLocal(
  orderId: string,
  status: Order['status'],
  paymentChannel?: 'wechat' | 'alipay'
): Order | undefined {
  const orders = getServerOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return undefined;

  const updates: Partial<Order> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }
  if (paymentChannel) {
    updates.payment_channel = paymentChannel;
  }

  orders[index] = { ...orders[index], ...updates };
  setServerOrders(orders);
  return orders[index];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    let order;
    if (supabaseAdmin) {
      order = await getOrderServer(orderId);
    } else {
      order = getOrderLocal(orderId);
    }

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('获取订单失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

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

    if (!status) {
      return NextResponse.json({ error: '缺少更新字段' }, { status: 400 });
    }

    const validStatuses: Order['status'][] = ['pending', 'paid', 'refunded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '无效的订单状态' }, { status: 400 });
    }

    let order;
    if (supabaseAdmin) {
      order = await updateOrderStatusServer(orderId, status, payment_channel);
    } else {
      order = updateOrderStatusLocal(orderId, status, payment_channel);
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
