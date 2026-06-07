import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Admin 订单列表
 *
 * GET /api/admin/orders
 * Query:
 *   - status: 'pending' | 'paid' | 'refunded' | 'cancelled' (可选)
 *   - plan:   'ai' | 'expert' | 'lawyer' | 'family' (可选)
 *   - limit:  1-200 (默认 50)
 *   - offset: 0+ (默认 0)
 *   - q:      订单号 / openid 模糊搜索 (可选, 服务端用 ilike)
 */

const querySchema = z.object({
  status: z.enum(['pending', 'paid', 'refunded', 'cancelled']).optional(),
  plan: z.enum(['ai', 'expert', 'lawyer', 'family']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().max(64).optional(),
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
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '查询参数不合法', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { status, plan, limit, offset, q } = parsed.data;

  try {
    let query = supabaseAdmin
      .from('orders')
      .select('id, order_no, amount, plan, status, payment_channel, payment_method, paid_at, created_at, openid, will_id', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (plan) query = query.eq('plan', plan);
    if (q) {
      // 订单号 OR openid 模糊
      query = query.or(`order_no.ilike.%${q}%,openid.ilike.%${q}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json(
        { code: 'DB_ERROR', error: `查询失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('admin orders list error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '查询订单失败' },
      { status: 500 }
    );
  }
}
