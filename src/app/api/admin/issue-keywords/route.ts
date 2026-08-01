import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/admin/issue-keywords
 * POST /api/admin/issue-keywords
 *
 * 自运营关键词管理:
 *   - action=create: 新建
 *   - action=update: 更新 (body: id)
 *   - action=toggle:  切换 is_active (body: id)
 */

const createSchema = z.object({
  action: z.literal("create"),
  keyword_pattern: z.string().min(2).max(500),
  match_target: z.enum(["title", "description", "both"]).default("both"),
  default_reward_cents: z.number().int().min(100).max(9900),
  auto_resolve_message: z.string().max(500).optional().default(""),
  is_active: z.boolean().default(true),
});

const updateSchema = z.object({
  action: z.literal("update"),
  id: z.string().uuid(),
  keyword_pattern: z.string().min(2).max(500),
  match_target: z.enum(["title", "description", "both"]),
  default_reward_cents: z.number().int().min(100).max(9900),
  auto_resolve_message: z.string().max(500).optional().default(""),
  is_active: z.boolean(),
});

const toggleSchema = z.object({
  action: z.literal("toggle"),
  id: z.string().uuid(),
  is_active: z.boolean(),
});

const schema = z.union([createSchema, updateSchema, toggleSchema]);

export async function GET(_request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ code: auth.reason, error: "无权限" }, { status: auth.status });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ code: "DB_ERROR", error: "数据库未配置" }, { status: 500 });
  }
  const { data, error } = await supabaseAdmin
    .from("issue_keywords")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, keywords: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ code: auth.reason, error: "无权限" }, { status: auth.status });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ code: "DB_ERROR", error: "数据库未配置" }, { status: 500 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", error: "参数错误", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (input.action === "create") {
    const { data, error } = await supabaseAdmin
      .from("issue_keywords")
      .insert({
        keyword_pattern: input.keyword_pattern,
        match_target: input.match_target,
        default_reward_cents: input.default_reward_cents,
        auto_resolve_message: input.auto_resolve_message,
        is_active: input.is_active,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data?.id });
  }

  if (input.action === "update") {
    const { error } = await supabaseAdmin
      .from("issue_keywords")
      .update({
        keyword_pattern: input.keyword_pattern,
        match_target: input.match_target,
        default_reward_cents: input.default_reward_cents,
        auto_resolve_message: input.auto_resolve_message,
        is_active: input.is_active,
      })
      .eq("id", input.id);
    if (error) {
      return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // toggle
  const { error } = await supabaseAdmin
    .from("issue_keywords")
    .update({ is_active: input.is_active })
    .eq("id", input.id);
  if (error) {
    return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
