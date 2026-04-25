import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment } from '@/lib/payment';
import { getOrderServer, updateOrderStatusServer } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';

// Server-side localStorage fallback using globalThis
function getServerOrders(): any[] {
  if (typeof globalThis !== 'undefined' && (globalThis as any).orders) {
    return (globalThis as any).orders;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).orders = [];
  }
  return [];
}

function setServerOrders(orders: any[]) {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).orders = orders;
  }
}

function getOrderLocal(orderId: string): any | undefined {
  return getServerOrders().find((o: any) => o.id === orderId);
}

function updateOrderStatusLocal(
  orderId: string,
  status: 'pending' | 'paid' | 'refunded' | 'cancelled'
): any | undefined {
  const orders = getServerOrders();
  const index = orders.findIndex((o: any) => o.id === orderId);
  if (index === -1) return undefined;
  const updates: any = { status };
  if (status === 'paid') updates.paid_at = new Date().toISOString();
  orders[index] = { ...orders[index], ...updates };
  setServerOrders(orders);
  return orders[index];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, channel = 'demo' } = body;

    if (!order_id) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    // Get order details
    let order;
    if (supabaseAdmin) {
      order = await getOrderServer(order_id);
    } else {
      order = getOrderLocal(order_id);
    }

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: '订单状态不允许支付' }, { status: 400 });
    }

    // Plan descriptions for payment
    const planDescriptions = {
      ai: '遗嘱规划 AI 指导服务',
      lawyer: '律师审核服务',
      family: '家族传承综合服务',
    };

    const description = planDescriptions[order.plan] || '遗嘱规划服务';

    // Initiate payment
    const result = await initiatePayment({
      order_id: order.id,
      order_no: order.order_no,
      amount: order.amount,
      description,
      channel,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      payment_url: result.payment_url,
      qr_code_url: result.qr_code_url,
      order_id: result.order_id,
    });
  } catch (error) {
    console.error('发起支付失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
