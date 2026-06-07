/**
 * POST /api/affiliate/apply
 *
 * 申请成为博主.
 * 需登录 (admin_session cookie, 简化版, 与 /admin 共享 Supabase Auth).
 *
 * tier-2 关联: 如果用户访问时带 ?ref=XXX 推广码 (cookie aff_ref 留存),
 * 申请时会自动写入 parent_blogger_id, 成为推荐人 (上级博主) 的下级.
 * Cookie 在申请后清空, 避免后续申请复用 (虽然 1 个用户 1 个博主约束已防止重复).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applyForBlogger } from '@/lib/affiliate';
import { requireAuth } from '@/lib/admin-auth';
import { getRefFromCookie, clearRefCookie } from '@/lib/affiliate-cookie';

const applySchema = z.object({
  display_name: z.string().min(2).max(20),
  contact_phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式错误'),
  bio: z.string().max(200).optional(),
  avatar_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session.authenticated || !session.user) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: session.reason || '请先登录' },
      { status: session.status || 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求体非 JSON' },
      { status: 400 }
    );
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        error: '参数错误',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    );
  }

  // 读上级推广码 (cookie); 不强制, 没带则成为顶级博主
  const parentRefCode = await getRefFromCookie();

  const result = await applyForBlogger({
    userId: session.user.id,
    displayName: parsed.data.display_name,
    contactPhone: parsed.data.contact_phone,
    bio: parsed.data.bio,
    avatarUrl: parsed.data.avatar_url,
    parentRefCode: parentRefCode,
  });

  // 不论成功失败, 都清空 cookie (避免下次意外关联)
  if (parentRefCode) {
    await clearRefCookie();
  }

  if (!result.success) {
    return NextResponse.json(
      { code: 'APPLY_FAILED', error: result.reason },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    blogger: result.blogger,
    has_parent: !!result.blogger?.parent_blogger_id,
  });
}
