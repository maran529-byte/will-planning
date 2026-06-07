/**
 * GET /api/admin/affiliates
 *
 * 管理员: 列出博主申请 (支持 status 过滤).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { listBloggers, type BloggerStatus } from '@/lib/affiliate';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json(
      { code: auth.reason || 'UNAUTHORIZED', error: '无权限' },
      { status: auth.status || 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as BloggerStatus | null;
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const result = await listBloggers({
    status: status || undefined,
    limit,
    offset,
  });

  return NextResponse.json({
    success: true,
    bloggers: result.bloggers,
    total: result.total,
  });
}
