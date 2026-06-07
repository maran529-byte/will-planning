/**
 * GET /api/affiliate/me
 *
 * 当前用户的博主申请状态.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin-auth';
import { getBloggerByUserId } from '@/lib/affiliate';

export async function GET() {
  const session = await requireAuth();
  if (!session.authenticated || !session.user) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: session.reason || '请先登录' },
      { status: session.status || 401 }
    );
  }

  const blogger = await getBloggerByUserId(session.user.id);
  return NextResponse.json({
    success: true,
    blogger,
    has_application: !!blogger,
  });
}
