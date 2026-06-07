import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Admin 支付事件流水 (支付 webhook 调试用)
 *
 * GET /api/admin/payments
 * Query:
 *   - limit / offset
 *   - channel: alipay_h5 | wechat_h5 | stripe | bank_transfer | free
 *   - order_id: 过滤指定订单
 */

const querySchema = z.object({
  channel: z.enum(['alipay_h5', 'wechat_h5', 'stripe', 'bank_transfer', 'free']).optional(),
  order_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID_REQUEST', error: '查询参数不合法' }, { status: 400 });
  }
  const { channel, order_id, limit, offset } = parsed.data;

  try {
    let query = supabaseAdmin
      .from('payment_events')
      .select('id, order_id, channel, event_type, external_event_id, processed_at, error_message, raw_payload', { count: 'exact' });

    if (channel) query = query.eq('channel', channel);
    if (order_id) query = query.eq('order_id', order_id);
    query = query.order('processed_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json(
        { code: 'DB_ERROR', error: `查询失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('admin payments error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', error: '查询失败' }, { status: 500 });
  }
}
