import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrderServer, getOrdersServer } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';
import { PLAN_IDS, getPriceCents } from '@/lib/pricing';

// Server-side localStorage fallback using globalThis
const SERVER_ORDERS_KEY = 'will_planning_orders_server';

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

function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

function createOrderLocal(data: { amount: number; plan: string; will_id?: string }) {
  const orders = getServerOrders();
  const newOrder = {
    id: crypto.randomUUID(),
    order_no: generateOrderNo(),
    amount: data.amount,
    plan: data.plan,
    status: 'pending',
    will_id: data.will_id,
    created_at: new Date().toISOString(),
  };
  orders.push(newOrder);
  setServerOrders(orders);
  return newOrder;
}

function getOrdersLocal() {
  return getServerOrders();
}

// P0: zod schema for create-order input.
// NOTE: amount is intentionally NOT in the schema — the server looks it up
// from PRICING based on plan. This closes the "client sends amount=1" hole.
const createOrderSchema = z.object({
  plan: z.enum(PLAN_IDS),
  docType: z.string().min(1).max(64),
  answers: z.record(z.string(), z.any()),
  will_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = createOrderSchema.safeParse(json);

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

    const { plan, will_id } = parsed.data;

    // Server-side authoritative price lookup (in 分). The client cannot
    // influence this value.
    const amountCents = getPriceCents(plan);
    if (amountCents === null) {
      return NextResponse.json(
        { code: 'INVALID_PLAN', error: '无效的套餐类型' },
        { status: 400 }
      );
    }

    // Use Supabase if configured, otherwise fallback to server-side memory
    let order;
    if (supabaseAdmin) {
      order = await createOrderServer({ amount: amountCents, plan, will_id });
    } else {
      order = createOrderLocal({ amount: amountCents, plan, will_id });
    }

    if (!order) {
      return NextResponse.json(
        { code: 'INTERNAL_ERROR', error: '创建订单失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Use Supabase if configured, otherwise fallback to server-side memory
    const orders = supabaseAdmin ? await getOrdersServer() : getOrdersLocal();
    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}
