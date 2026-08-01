import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getOpenidFromCookie } from "@/lib/cookie";
import { getSupabaseUserIdFromOpenid } from "@/lib/user-mapping";
import { matchLocalKeyword, renderReply, CONTACT_EMAIL } from "@/lib/feedback_auto_reply";

/**
 * POST /api/feedback/submit
 *
 * 用户提交问题/Bug 反馈 (PC + H5 通用).
 *   - 已登录: 自动绑定 user_id (从 openid → user_id 映射)
 *   - 游客: 只存 visitor_openid, 待登录后可由管理员在后台手动关联 user_id
 *
 * 输入校验: 标题 4-80 字, 描述 10-2000 字, severity 在枚举内
 */

const submitSchema = z.object({
  doc_type: z.string().min(1).max(64).optional(),
  severity: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  title: z.string().min(4).max(80),
  description: z.string().min(10).max(2000),
  screenshot_url: z.string().url().max(500).optional().nullable(),
  page_url: z.string().max(500).optional().nullable(),
  user_agent: z.string().max(500).optional().nullable(),
});

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: "SERVER_ERROR", error: "数据库未配置" },
      { status: 500 }
    );
  }

  // 1. 读 cookie
  const openid = await getOpenidFromCookie();

  // 2. 校验 body
  const json = await request.json();
  const parsed = submitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        error: "参数校验失败",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  // 3. 尝试用 openid 解析 user_id (映射表)
  let userId: string | null = null;
  if (openid) {
    try {
      userId = await getSupabaseUserIdFromOpenid(openid);
    } catch {
      userId = null;
    }
  }

  // 4. 去重 (同 openid + 同标题 + 1 小时内只保留 1 条)
  if (openid) {
    const { data: existing } = await supabaseAdmin
      .from("user_issues")
      .select("id")
      .eq("visitor_openid", openid)
      .eq("title", parsed.data.title)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          code: "DUPLICATE",
          error: "1 小时内已有相同标题的反馈, 请勿重复提交",
          issue_id: existing[0].id,
        },
        { status: 409 }
      );
    }
  }

  // 5. 写入 user_issues
  const insertRow: Record<string, unknown> = {
    user_id: userId,
    visitor_openid: openid,
    doc_type: parsed.data.doc_type ?? "general",
    severity: parsed.data.severity,
    title: parsed.data.title,
    description: parsed.data.description,
    screenshot_url: parsed.data.screenshot_url ?? null,
    page_url: parsed.data.page_url ?? null,
    user_agent: parsed.data.user_agent ?? null,
    status: "pending",
  };

  const { data, error } = await supabaseAdmin
    .from("user_issues")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[feedback/submit] insert failed", error);
    return NextResponse.json(
      { code: "DB_ERROR", error: "提交失败, 请稍后再试" },
      { status: 500 }
    );
  }

  // 6. 业务铁律 v1.0: 关键词自动回复 (1 分钟内返结果)
  //   - 命中本地 FALLBACK_KEYWORDS → 立即生成自动回复文案
  //   - 关键信息 (姓名/电话/金额) 自动 redact 模糊处理
  //   - 命中后状态置 auto_replied, 让 admin 跳过人工分配
  const matched = matchLocalKeyword(
    `${parsed.data.title} ${parsed.data.description}`
  );
  let autoReply: string | null = null;
  if (matched) {
    autoReply = renderReply(matched.reply_template, {
      order_id: parsed.data.title.match(/ORD[-_][A-Z0-9]+/i)?.[0] ?? "请补充",
      page_url: parsed.data.page_url ?? undefined,
      created_at: new Date().toISOString().slice(0, 16).replace("T", " "),
      wallet_url: "https://h5.aiwill-planner.cn/wallet-policy",
    });
    try {
      await supabaseAdmin
        .from("user_issues")
        .update({
          status: "auto_replied",
          auto_resolve_note: `[${matched.keyword}] ${autoReply}`,
        })
        .eq("id", data.id);
    } catch (e) {
      console.warn("[feedback/submit] auto_reply update failed:", (e as Error)?.message);
    }
    console.log(
      `[feedback/submit] 自动回复 issue=${data.id} 关键词=${matched.keyword}`
    );
  }

  return NextResponse.json({
    success: true,
    issue_id: data.id,
    user_id: userId,
    auto_reply: autoReply,
    matched_keyword: matched?.keyword ?? null,
    contact_email: CONTACT_EMAIL,
    message: userId
      ? "已收到反馈, 采纳后将自动发放红包到你的余额"
      : "已收到反馈。提示: 登录后反馈可自动关联账号, 采纳后红包将自动发放",
  });
}

/**
 * GET /api/feedback/submit?mine=true
 *
 * 当前用户查询自己提交的所有 issue (用于 /account/issues 页).
 */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ code: "SERVER_ERROR", error: "数据库未配置" }, { status: 500 });
  }
  const openid = await getOpenidFromCookie();
  if (!openid) {
    return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  }
  const userId = await getSupabaseUserIdFromOpenid(openid).catch(() => null);

  const query = supabaseAdmin
    .from("user_issues")
    .select("id, doc_type, severity, title, description, status, reward_cents, rewarded_at, auto_resolve_note, created_at, updated_at, admin_note")
    .order("created_at", { ascending: false })
    .limit(50);

  if (userId) {
    query.or(`user_id.eq.${userId},visitor_openid.eq.${openid}`);
  } else {
    query.eq("visitor_openid", openid);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ code: "DB_ERROR", error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, issues: data ?? [] });
}
