"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * /account/issues - 我的问题列表 (用户视角)
 *
 * 改版 v1 (2026-07-20):
 *   - 调用 /api/feedback/submit?mine=true
 *   - 显示审核状态 + 已发红包金额 + 自动修复说明
 */

interface MyIssue {
  id: string;
  doc_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  reward_cents: number;
  rewarded_at: string | null;
  auto_resolve_note: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  pending: { label: "待审核", emoji: "⏳", bg: "bg-yellow-50", text: "text-yellow-700" },
  confirmed: { label: "已采纳", emoji: "✅", bg: "bg-green-50", text: "text-green-700" },
  auto_resolved: { label: "自动采纳", emoji: "🤖", bg: "bg-blue-50", text: "text-blue-700" },
  rejected: { label: "已拒绝", emoji: "❌", bg: "bg-red-50", text: "text-red-700" },
  closed: { label: "已关闭", emoji: "🔒", bg: "bg-slate-50", text: "text-slate-600" },
};

export default function MyIssuesPage() {
  const [issues, setIssues] = useState<MyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedback/submit?mine=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.code === "UNAUTHENTICATED") {
          setError("请先登录");
        } else if (data.success) {
          setIssues(data.issues ?? []);
        } else {
          setError(data.error ?? "加载失败");
        }
      })
      .catch(() => setError("网络异常"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">我的反馈</h1>
            <p className="text-sm text-slate-500 mt-1">
              看到你的问题处理进度和红包记录
            </p>
          </div>
          <Link
            href="/feedback"
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            + 新建
          </Link>
        </header>

        {loading && <div className="text-center py-8 text-slate-400">加载中...</div>}
        {error && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
            <div className="text-3xl" aria-hidden>🔒</div>
            <p className="text-slate-600">{error}</p>
            <Link href="/login" className="text-amber-600 underline text-sm">
              去登录
            </Link>
          </div>
        )}

        {!loading && !error && issues.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="text-4xl" aria-hidden>📭</div>
            <p className="text-slate-500">还没有提交过问题</p>
            <Link
              href="/feedback"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-white text-sm px-6 py-2 rounded-lg transition"
            >
              提交第一个问题
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {issues.map((it) => {
            const st = STATUS_LABEL[it.status] ?? STATUS_LABEL.pending;
            const isRewarded = (it.status === "confirmed" || it.status === "auto_resolved") && it.reward_cents > 0;
            return (
              <article
                key={it.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2"
              >
                <header className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-slate-800 text-sm leading-tight-cn flex-1">
                    {it.title}
                  </h2>
                  <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${st.bg} ${st.text}`}>
                    {st.emoji} {st.label}
                  </span>
                </header>

                <p className="text-xs text-slate-500 line-clamp-2">{it.description}</p>

                {isRewarded && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
                    🎁 已发红包: <b>¥{(it.reward_cents / 100).toFixed(2)}</b>
                    {it.rewarded_at && (
                      <span className="ml-2 text-green-600">
                        · {new Date(it.rewarded_at).toLocaleString("zh-CN")}
                      </span>
                    )}
                  </div>
                )}

                {it.auto_resolve_note && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                    🤖 {it.auto_resolve_note}
                  </div>
                )}

                {it.admin_note && (
                  <div className="text-xs text-slate-500 italic">📝 {it.admin_note}</div>
                )}

                <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
                  📅 {new Date(it.created_at).toLocaleString("zh-CN")}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
