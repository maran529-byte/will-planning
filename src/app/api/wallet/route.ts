import { NextRequest, NextResponse } from "next/server";
import { getOpenidFromCookie } from "@/lib/cookie";
import { getSupabaseUserIdFromOpenid } from "@/lib/user-mapping";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/wallet
 *
 * 当前用户钱包余额 + 最近 20 条流水.
 *   - 未登录 → balance=0, recent=[]
 *   - 已登录但无钱包记录 → balance=0
 */
export async function GET(_request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ code: "DB_ERROR", error: "数据库未配置" }, { status: 500 });
  }
  const openid = await getOpenidFromCookie();
  if (!openid) {
    return NextResponse.json({ success: true, balance_cents: 0, total_earned_cents: 0, recent: [] });
  }

  const userId = await getSupabaseUserIdFromOpenid(openid).catch(() => null);
  if (!userId) {
    return NextResponse.json({ success: true, balance_cents: 0, total_earned_cents: 0, recent: [] });
  }

  // 1. 读余额
  const { data: wallet } = await supabaseAdmin
    .from("user_wallets")
    .select("balance_cents, total_earned_cents, total_consumed_cents, total_expired_cents")
    .eq("user_id", userId)
    .maybeSingle();

  // 2. 读最近 20 条流水
  const { data: tx } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id, type, amount_cents, ref_issue_id, ref_order_id, expires_at, expired_at, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // 3. 读即将过期的余额 (30 天内)
  const { data: expiring } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount_cents, expires_at")
    .eq("user_id", userId)
    .eq("type", "reward")
    .is("expired_at", null)
    .gt("expires_at", new Date().toISOString())
    .lte("expires_at", new Date(Date.now() + 30 * 86400_000).toISOString());

  const expiringSoon = (expiring ?? []).reduce(
    (sum, r) => sum + (r.amount_cents ?? 0),
    0
  );

  return NextResponse.json({
    success: true,
    balance_cents: wallet?.balance_cents ?? 0,
    total_earned_cents: wallet?.total_earned_cents ?? 0,
    total_consumed_cents: wallet?.total_consumed_cents ?? 0,
    total_expired_cents: wallet?.total_expired_cents ?? 0,
    expiring_soon_cents: expiringSoon,
    recent: tx ?? [],
  });
}
