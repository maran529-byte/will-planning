/**
 * POST /api/admin/affiliates/[id]/review
 *
 * 管理员: 审核博主申请 (approved / rejected).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { reviewBlogger } from '@/lib/affiliate';

const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  commission_rate: z.number().int().min(0).max(5000).optional(),  // basis points, approved 时可指定
  review_note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json(
      { code: auth.reason || 'UNAUTHORIZED', error: '无权限' },
      { status: auth.status || 401 }
    );
  }

  const { id: bloggerId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求体非 JSON' },
      { status: 400 }
    );
  }

  const parsed = reviewSchema.safeParse(body);
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

  if (parsed.data.decision === 'rejected' && !parsed.data.review_note) {
    return NextResponse.json(
      { code: 'NOTE_REQUIRED', error: '拒绝时必须填写审核备注' },
      { status: 400 }
    );
  }

  const result = await reviewBlogger({
    bloggerId,
    adminId: auth.user.id,
    decision: parsed.data.decision,
    commissionRate: parsed.data.commission_rate,
    reviewNote: parsed.data.review_note,
  });

  if (!result.success) {
    return NextResponse.json(
      { code: 'REVIEW_FAILED', error: result.reason },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    blogger: result.blogger,
  });
}
