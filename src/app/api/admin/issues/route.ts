import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/admin/issues?status=pending&limit=50&offset=0
 *
 * 管理员: 列出用户问题.
 *   - status 过滤: pending / confirmed / auto_resolved / rejected / closed
 *   - 不传 status 默认查 pending
 *   - 含 matched_keyword 信息 (join)
 */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ code: auth.reason, error: "无权限" }, { status: auth.status });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ code: "DB_ERROR", error: "数据库未配置" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  let q = supabaseAdmin
    .from("user_issues")
    .select(`
      id, user_id, visitor_openid, doc_type, severity, title, description,
      screenshot_url, page_url, status, reward_cents, rewarded_at, rewarded_by,
      matched_keyword_id, auto_resolve_note, resolved_in_commit, admin_note,
      created_at, updated_at,
      matched_keyword:issue_keywords!matched_keyword_id(id, keyword_pattern, default_reward_cents, auto_resolve_message)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") {
    q = q.eq("status", status);
  }

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    issues: data ?? [],
    total: count ?? data?.length ?? 0,
    offset,
    limit,
  });
}

/**
 * PATCH /api/admin/issues
 *
 * 管理员操作 issue:
 *   - action=confirm: 采纳并发放红包 (body: { issue_id, reward_yuan, note? })
 *   - action=reject: 拒绝 (body: { issue_id, reason })
 *   - action=close:  关闭 (用户撤回) (body: { issue_id })
 */
const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("confirm"),
    issue_id: z.string().uuid(),
    reward_yuan: z.number().min(1).max(99),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    issue_id: z.string().uuid(),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("close"),
    issue_id: z.string().uuid(),
  }),
]);

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ code: auth.reason, error: "无权限" }, { status: auth.status });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ code: "DB_ERROR", error: "数据库未配置" }, { status: 500 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", error: "参数错误", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (input.action === "confirm") {
    const rewardCents = Math.round(input.reward_yuan * 100);
    const { data, error } = await supabaseAdmin.rpc("grant_issue_reward", {
      p_issue_id: input.issue_id,
      p_reward_cents: rewardCents,
      p_granted_by: auth.user.id,
      p_note: input.note ?? null,
    });
    if (error) {
      console.error("[admin/issues/confirm] RPC failed", error);
      return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
    }
    const result = data as { success: boolean; error?: string; detail?: string };
    if (!result.success) {
      return NextResponse.json(
        { code: result.error ?? "GRANT_FAILED", error: result.detail ?? "发放失败" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (input.action === "reject") {
    const { error } = await supabaseAdmin
      .from("user_issues")
      .update({
        status: "rejected",
        admin_note: input.reason ?? "已拒绝",
      })
      .eq("id", input.issue_id);
    if (error) {
      return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // close
  const { error } = await supabaseAdmin
    .from("user_issues")
    .update({ status: "closed" })
    .eq("id", input.issue_id);
  if (error) {
    return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
