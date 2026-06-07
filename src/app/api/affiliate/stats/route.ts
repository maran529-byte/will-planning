/**
 * GET /api/affiliate/stats
 *
 * 当前博主的统计数据 (clicks / conversions / commissions).
 * 内部使用: 供博主 dashboard 客户端轮询 (server component 直接调用 lib, 此 API 作为
 * 备用, 供后续 H5 / 第三方嵌入).
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/admin-auth';
import { getBloggerByUserId, getBloggerDashboard } from '@/lib/affiliate';

export async function GET() {
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

  const dashboard = await getBloggerDashboard(blogger.id);
  if (!dashboard) {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '数据加载失败' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    blogger: dashboard.blogger,
    stats: dashboard.stats,
  });
}
