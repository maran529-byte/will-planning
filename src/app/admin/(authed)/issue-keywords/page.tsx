import { supabaseAdmin } from "@/lib/supabase-server";
import { timeAgo } from "@/lib/admin-helpers";
import { KeywordActions } from "./KeywordActions";

/**
 * /admin/issue-keywords - 自运营关键词库管理
 *
 * 改版 v1 (2026-07-20):
 *   - 列出所有 is_active=true 的关键词 + 命中次数
 *   - 可新建/编辑/启用/禁用
 *   - 命中次数从 hit_count 列读
 */

export const dynamic = "force-dynamic";

async function loadKeywords() {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("issue_keywords")
    .select("id, keyword_pattern, match_target, default_reward_cents, auto_resolve_message, is_active, hit_count, last_hit_at, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin/issue-keywords] load failed", error);
    return [];
  }
  return data ?? [];
}

export default async function AdminKeywordsPage() {
  const keywords = await loadKeywords();

  return (
    <div className="space-y-4 pb-safe">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
            <span aria-hidden>🤖 </span>自运营关键词库
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            自运营脚本每日 09:00 扫描待审核问题, 命中下方关键词即自动确认 + 发放默认红包
          </p>
        </div>
      </header>

      {/* 新建 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <KeywordActions mode="create" />
      </section>

      {/* 列表 */}
      {keywords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          📭 关键词库为空
        </div>
      ) : (
        <div className="space-y-2">
          {keywords.map((kw) => (
            <article
              key={kw.id}
              className={`bg-white rounded-xl border p-4 ${
                kw.is_active ? "border-slate-200" : "border-slate-200 opacity-60"
              }`}
            >
              <header className="flex items-start justify-between gap-2 mb-2">
                <code className="text-sm font-mono bg-slate-50 px-2 py-1 rounded text-slate-700 flex-1 break-all">
                  {kw.keyword_pattern}
                </code>
                <span
                  className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                    kw.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {kw.is_active ? "启用" : "禁用"}
                </span>
              </header>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>匹配: {kw.match_target}</span>
                <span>默认红包: ¥{(kw.default_reward_cents / 100).toFixed(2)}</span>
                <span>命中次数: <b className="tabular-nums">{kw.hit_count}</b></span>
                {kw.last_hit_at && <span>最近命中: {timeAgo(kw.last_hit_at)}</span>}
              </div>
              {kw.auto_resolve_message && (
                <div className="mt-2 text-xs text-slate-500 italic bg-slate-50 rounded p-2">
                  💬 {kw.auto_resolve_message}
                </div>
              )}
              <div className="mt-3 border-t border-slate-100 pt-2">
                <KeywordActions
                  mode="edit"
                  id={kw.id}
                  initial={{
                    keyword_pattern: kw.keyword_pattern,
                    match_target: kw.match_target,
                    default_reward_cents: kw.default_reward_cents,
                    auto_resolve_message: kw.auto_resolve_message ?? "",
                    is_active: kw.is_active,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
