/**
 * GET  /api/admin/affiliates/withdraw - 列出所有提现申请
 * POST /api/admin/affiliates/withdraw - 不存在, 用 /withdraw/[id] 处理单个
 *
 * 注: 单个审批路由见 /api/admin/affiliates/withdraw/[id]/route.ts
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { listWithdrawals, type WithdrawalStatus } from '@/lib/affiliate';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json(
      { code: auth.reason || 'UNAUTHORIZED', error: '无权限' },
      { status: auth.status || 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as WithdrawalStatus | null;
  const bloggerId = searchParams.get('blogger_id') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const result = await listWithdrawals({
    status: status || undefined,
    bloggerId,
    limit,
    offset,
  });

  return NextResponse.json({
    success: true,
    withdrawals: result.withdrawals,
    total: result.total,
  });
}
