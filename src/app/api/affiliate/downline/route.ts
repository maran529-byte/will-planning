/**
 * GET /api/affiliate/downline
 *
 * 列出当前博主的所有直接下级 (parent_blogger_id = 当前博主).
 * 供 dashboard "我的团队" 板块使用.
 *
 * 返回: { downline: DownlineRow[], total_tier2_cents }
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin-auth';
import { getBloggerByUserId, getDownline } from '@/lib/affiliate';

export async function GET() {
  const session = await requireAuth();
  if (!session.authenticated || !session.user) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: session.reason || '请先登录' },
      { status: session.status || 401 }
    );
  }

  // 1. 查当前用户的博主记录
  const blogger = await getBloggerByUserId(session.user.id);
  if (!blogger) {
    return NextResponse.json(
      { code: 'NOT_A_BLOGGER', error: '您还不是博主' },
      { status: 404 }
    );
  }

  // 2. 列出下级
  const downline = await getDownline(blogger.id);

  // 3. 汇总我从下级拿到的 tier-2 总额
  const totalTier2Cents = downline.reduce((sum, d) => sum + d.tier2_paid_to_me, 0);

  return NextResponse.json({
    downline,
    total_tier2_cents: totalTier2Cents,
    count: downline.length,
  });
}
