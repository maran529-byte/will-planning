/**
 * GET /api/affiliate/withdrawals
 *
 * 当前博主的提现记录.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin-auth';
import { getBloggerByUserId, listWithdrawals } from '@/lib/affiliate';

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session.authenticated || !session.user) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: session.reason || '请先登录' },
      { status: session.status || 401 }
    );
  }

  const blogger = await getBloggerByUserId(session.user.id);
  if (!blogger) {
    return NextResponse.json(
      { code: 'NOT_BLOGGER', error: '您还不是博主' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const result = await listWithdrawals({ bloggerId: blogger.id, limit, offset });
  return NextResponse.json({
    success: true,
    withdrawals: result.withdrawals,
    total: result.total,
  });
}
