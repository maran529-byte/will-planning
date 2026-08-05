import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Admin 订单自动清理 (改版 v1, 2026-08-05)
 *
 * POST /api/admin/orders/auto-cancel
 * Body: { olderThanMinutes?: number, dryRun?: boolean }  (默认 30 min, 默认 dryRun=true)
 *
 * 目的: pending > N 分钟 自动 cancel, 让 admin stats 真实反映营收.
 * 业务铁律: 营收红线 < ¥200 触发关停风险, 不能让脏 pending 订单虚增 GMV 误判.
 *
 * 安全:
 *   - 仅 admin 可调
 *   - 默认 dryRun=true (只查不改)
 *   - 单次最多 200 单 (避免大事务)
 *   - 已 paid/cancelled/refunded 永不重置
 *   - 幂等 (重复跑同结果)
 */

const DEFAULT_MIN = 30;
const MAX_BATCH = 200;

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}));
  const olderThanMinutes = Number(body?.olderThanMinutes) || DEFAULT_MIN;
  const dryRun = body?.dryRun !== false; // default true
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();

  // 1. 列出待清理订单
  const { data: stale, error: listErr } = await supabaseAdmin
    .from('orders')
    .select('id, order_no, amount, status, created_at')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH);

  if (listErr) {
    return NextResponse.json(
      { code: 'DB_ERROR', error: listErr.message },
      { status: 500 }
    );
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({
      success: true,
      scanned: 0,
      cancelled: 0,
      message: `无 pending > ${olderThanMinutes} 分钟订单`,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      cutoff,
      scanned: stale.length,
      cancelled: 0,
      would_cancel: stale.map((o) => ({
        id: o.id,
        order_no: o.order_no,
        amount: o.amount,
        created_at: o.created_at,
      })),
      hint: '确认无误后传 { dryRun: false } 真正执行',
    });
  }

  // 2. 批量更新 status='cancelled'
  // 注: orders 表当前无 cancel_reason 列, 仅更 status 字段;
  //    auto-cancel 来源可在 admin logs / questionnaire_snapshot 留痕 (后续 migration 扩展).
  const ids = stale.map((o) => o.id);
  const { error: updErr } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'cancelled',
    })
    .in('id', ids)
    .eq('status', 'pending'); // 二次保护

  if (updErr) {
    return NextResponse.json(
      { code: 'UPDATE_ERROR', error: updErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    dryRun: false,
    cutoff,
    scanned: stale.length,
    cancelled: ids.length,
    cancelled_ids: ids,
  });
}