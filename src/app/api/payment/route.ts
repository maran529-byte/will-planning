import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initiatePayment, PaymentChannel } from '@/lib/payment';
import { getOrderServer, Order } from '@/lib/orders';
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

function getOrderLocal(orderId: string): Order | undefined {
  return getServerOrders().find((o) => o.id === orderId);
}

// P0: zod schema for payment init input.
const initiatePaymentSchema = z.object({
  order_id: z.string().min(1).max(128),
  channel: z.enum(['wechat', 'alipay', 'demo']).default('demo'),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = initiatePaymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'INVALID_REQUEST',
          error: '缺少或无效的参数',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 400 }
      );
    }

    const { order_id, channel } = parsed.data;

    // Get order details
    let order;
    if (supabaseAdmin) {
      order = await getOrderServer(order_id);
    } else {
      order = getOrderLocal(order_id);
    }

    if (!order) {
      return NextResponse.json(
        { code: 'NOT_FOUND', error: '订单不存在' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { code: 'CONFLICT', error: '订单状态不允许支付' },
        { status: 400 }
      );
    }

    // Plan descriptions for payment
    const planDescriptions: Record<string, string> = {
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
      channel: channel as PaymentChannel,
    });

    if (!result.success) {
      return NextResponse.json(
        { code: 'UPSTREAM_ERROR', error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_url: result.payment_url,
      qr_code_url: result.qr_code_url,
      order_id: result.order_id,
    });
  } catch (error) {
    console.error('发起支付失败:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}
