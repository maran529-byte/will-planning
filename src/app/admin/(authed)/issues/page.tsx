import { supabaseAdmin } from "@/lib/supabase-server";
import { timeAgo } from "@/lib/admin-helpers";
import Link from "next/link";
import { IssueActions } from "./IssueActions";

/**
 * /admin/issues 用户问题审核页
 *
 * 改版 v1 (2026-07-20):
 *   - 列出 user_issues, 默认 status=pending
 *   - 状态过滤 tab: pending / confirmed / auto_resolved / rejected / all
 *   - 每条带"确认发放红包"操作 (含金额选择 ¥1-99)
 *   - 自运营命中的条目带特殊标签 + auto_resolve_note
 */

export const dynamic = "force-dynamic";

type IssueStatus = "pending" | "confirmed" | "auto_resolved" | "rejected" | "closed";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_OPTIONS: Array<{ value: IssueStatus | "all"; label: string }> = [
  { value: "pending", label: "⏳ 待审核" },
  { value: "confirmed", label: "✅ 已采纳" },
  { value: "auto_resolved", label: "🤖 自动采纳" },
  { value: "rejected", label: "❌ 已拒绝" },
  { value: "closed", label: "🔒 已关闭" },
  { value: "all", label: "📋 全部" },
];

async function loadIssues(status: IssueStatus | "all") {
  if (!supabaseAdmin) return { issues: [], total: 0 };
  let q = supabaseAdmin
    .from("user_issues")
    .select(`
      id, user_id, visitor_openid, doc_type, severity, title, description,
      screenshot_url, page_url, status, reward_cents, rewarded_at,
      matched_keyword_id, auto_resolve_note, admin_note,
      created_at, updated_at,
      matched_keyword:issue_keywords!matched_keyword_id(id, keyword_pattern, default_reward_cents, auto_resolve_message)
    `)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    console.error("[admin/issues] load failed", error);
    return { issues: [], total: 0 };
  }
  return { issues: data ?? [], total: data?.length ?? 0 };
}

const SEVERITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-green-50", text: "text-green-700", label: "轻微" },
  normal: { bg: "bg-amber-50", text: "text-amber-700", label: "一般" },
  high: { bg: "bg-orange-50", text: "text-orange-700", label: "严重" },
  critical: { bg: "bg-red-50", text: "text-red-700", label: "紧急" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
  confirmed: { bg: "bg-green-100", text: "text-green-800" },
  auto_resolved: { bg: "bg-blue-100", text: "text-blue-800" },
  rejected: { bg: "bg-red-100", text: "text-red-800" },
  closed: { bg: "bg-slate-100", text: "text-slate-700" },
};

export default async function AdminIssuesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status ?? "pending") as IssueStatus | "all";
  const { issues, total } = await loadIssues(status);

  return (
    <div className="space-y-4 pb-safe">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
        <span aria-hidden>🐛 </span>问题审核 (
        <span className="tabular-nums">{total}</span>)
      </h1>

      {/* 状态过滤 */}
      <nav className="flex flex-wrap gap-2" aria-label="状态过滤">
        {STATUS_OPTIONS.map((opt) => {
          const active = (sp.status ?? "pending") === opt.value;
          return (
            <Link
              key={opt.value}
              href={`/admin/issues?status=${opt.value}`}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                active
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </nav>

      {/* 自运营提示 */}
      <div
        className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800"
        role="status"
        aria-label="自运营提示"
      >
        🤖 <b>自运营机制</b>: 系统每日 09:00 自动扫描待审核问题, 对照
        <Link href="/admin/issue-keywords" className="underline ml-1">关键词库</Link>
        匹配已知问题, 命中后自动确认 + 发放默认红包。匹配报告每日 09:30 邮件发送至 330320991@qq.com。
      </div>

      {/* 列表 */}
      {issues.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          📭 当前没有 {STATUS_OPTIONS.find((o) => o.value === status)?.label} 的问题
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((it) => {
            const sev = SEVERITY_BADGE[it.severity as string] ?? SEVERITY_BADGE.normal;
            const st = STATUS_BADGE[it.status as string] ?? STATUS_BADGE.pending;
            const kw = it.matched_keyword as
              | { id: string; keyword_pattern: string; default_reward_cents: number; auto_resolve_message: string }
              | null;
            return (
              <article
                key={it.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
              >
                {/* 头部: 标题 + 严重度 + 状态 */}
                <header className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-800 text-base leading-tight-cn flex-1">
                    {it.title}
                  </h2>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded text-xs ${sev.bg} ${sev.text}`}>
                      {sev.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${st.bg} ${st.text}`}>
                      {it.status}
                    </span>
                  </div>
                </header>

                {/* 描述 */}
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed-cn">
                  {it.description}
                </p>

                {/* 元信息 */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>📂 {it.doc_type}</span>
                  <span>⏰ {timeAgo(it.created_at as string)}</span>
                  {it.user_id ? (
                    <span className="text-green-700">👤 已登录用户</span>
                  ) : it.visitor_openid ? (
                    <span className="text-slate-500">👥 游客 ({it.visitor_openid.slice(0, 8)}...)</span>
                  ) : null}
                  {it.screenshot_url ? (
                    <a
                      href={it.screenshot_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      🖼️ 截图
                    </a>
                  ) : null}
                  {it.page_url ? (
                    <a
                      href={it.page_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      🔗 出问题页面
                    </a>
                  ) : null}
                </div>

                {/* 自运营匹配信息 */}
                {kw && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 space-y-1">
                    <div>
                      🤖 命中关键词: <b>{kw.keyword_pattern}</b> · 默认红包 ¥
                      {(kw.default_reward_cents / 100).toFixed(2)}
                    </div>
                    {kw.auto_resolve_message && (
                      <div className="text-blue-700">{kw.auto_resolve_message}</div>
                    )}
                    {it.auto_resolve_note && (
                      <div className="text-blue-700">📝 自动备注: {it.auto_resolve_note}</div>
                    )}
                  </div>
                )}

                {/* 已发红包信息 */}
                {(it.status === "confirmed" || it.status === "auto_resolved") &&
                  (it.reward_cents as number) > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs text-green-800">
                      ✅ 已发红包: <b>¥{((it.reward_cents as number) / 100).toFixed(2)}</b>{" "}
                      · {it.rewarded_at && timeAgo(it.rewarded_at as string)}
                    </div>
                  )}

                {/* 管理员备注 */}
                {it.admin_note && (
                  <div className="text-xs text-slate-500 italic">
                    📝 备注: {it.admin_note as string}
                  </div>
                )}

                {/* 操作按钮 (仅 pending 显示) */}
                {it.status === "pending" && (
                  <IssueActions issueId={it.id as string} defaultRewardYuan={it.severity === "critical" ? 20 : it.severity === "high" ? 10 : it.severity === "normal" ? 5 : 2} />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
