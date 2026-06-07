import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Admin 用户列表
 *
 * GET /api/admin/users
 * Query:
 *   - role: 'user' | 'lawyer' | 'blogger' | 'admin' (可选)
 *   - q:    邮箱/openid/昵称 模糊 (可选)
 *   - limit / offset
 */

const querySchema = z.object({
  role: z.enum(['user', 'lawyer', 'blogger', 'admin']).optional(),
  q: z.string().max(64).optional(),
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
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '查询参数不合法' },
      { status: 400 }
    );
  }
  const { role, q, limit, offset } = parsed.data;

  try {
    let query = supabaseAdmin
      .from('users')
      .select('id, openid, email, display_name, wechat_nickname, phone, role, status, last_login_at, created_at', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (q) {
      query = query.or(`openid.ilike.%${q}%,email.ilike.%${q}%,display_name.ilike.%${q}%,wechat_nickname.ilike.%${q}%`);
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
      users: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('admin users list error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '查询用户失败' },
      { status: 500 }
    );
  }
}
