import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Admin 律师预约列表
 *
 * GET /api/admin/lawyers
 * Query:
 *   - status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
 */

const querySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
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
  const { status, limit, offset } = parsed.data;

  try {
    let query = supabaseAdmin
      .from('lawyer_bookings')
      .select('id, user_id, order_id, lawyer_id, lawyer_name, scheduled_at, duration_minutes, contact_phone, contact_name, notes, status, lawyer_notes, meeting_url, created_at', { count: 'exact' });

    if (status) query = query.eq('status', status);
    query = query.order('scheduled_at', { ascending: true }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json(
        { code: 'DB_ERROR', error: `查询失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookings: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('admin lawyer bookings error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', error: '查询失败' }, { status: 500 });
  }
}
