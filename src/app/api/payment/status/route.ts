import { NextRequest, NextResponse } from 'next/server';
import { getOrderServer } from '@/lib/orders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    const order = await getOrderServer(orderId);

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
