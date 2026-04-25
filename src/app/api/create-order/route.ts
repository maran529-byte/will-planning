import { NextRequest, NextResponse } from 'next/server';
import { createOrderServer, getOrdersServer } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, plan, will_id } = body;

    if (!amount || !plan) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!['ai', 'lawyer', 'family'].includes(plan)) {
      return NextResponse.json(
        { error: '无效的套餐类型' },
        { status: 400 }
      );
    }

    // Use Supabase if configured, otherwise fallback to server-side memory
    let order;
    if (supabaseAdmin) {
      order = await createOrderServer({ amount: Number(amount), plan, will_id });
    } else {
      order = createOrderLocal({ amount: Number(amount), plan, will_id });
    }

    if (!order) {
      return NextResponse.json(
        { error: '创建订单失败' },
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
      { error: '服务器错误' },
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
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}