/**
 * POST /api/admin/affiliates/withdraw/[id]
 *
 * 管理员: 审批提现 (approved / paid / rejected).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { processWithdrawal } from '@/lib/affiliate';

const processSchema = z.object({
  decision: z.enum(['approved', 'paid', 'rejected']),
  process_note: z.string().max(500).optional(),
  payment_proof_url: z.string().url().optional(),
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

  const { id: withdrawalId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求体非 JSON' },
      { status: 400 }
    );
  }

  const parsed = processSchema.safeParse(body);
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

  if (parsed.data.decision === 'rejected' && !parsed.data.process_note) {
    return NextResponse.json(
      { code: 'NOTE_REQUIRED', error: '拒绝时必须填写处理备注' },
      { status: 400 }
    );
  }

  const result = await processWithdrawal({
    withdrawalId,
    adminId: auth.user.id,
    decision: parsed.data.decision,
    processNote: parsed.data.process_note,
    paymentProofUrl: parsed.data.payment_proof_url,
  });

  if (!result.success) {
    return NextResponse.json(
      { code: 'PROCESS_FAILED', error: result.reason },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    withdrawal: result.withdrawal,
  });
}
