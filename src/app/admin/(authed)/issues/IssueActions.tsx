"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * IssueActions - 后台问题审核操作按钮
 *
 * 三个动作:
 *   1. confirm: 采纳 + 发放红包 (管理员输入金额, ¥1-99)
 *   2. reject:  拒绝 (可选填写理由)
 *   3. close:   关闭
 */

interface Props {
  issueId: string;
  defaultRewardYuan: number;
}

export function IssueActions({ issueId, defaultRewardYuan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rewardYuan, setRewardYuan] = useState(defaultRewardYuan);
  const [note, setNote] = useState("");

  const submit = async (action: "confirm" | "reject" | "close") => {
    if (loading) return;
    if (action === "confirm" && (!rewardYuan || rewardYuan < 1)) {
      alert("红包金额必须 ≥ ¥1");
      return;
    }
    if (!confirm(`确认执行"${action === "confirm" ? "采纳并发放" : action === "reject" ? "拒绝" : "关闭"}"操作?`)) {
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = { action, issue_id: issueId };
      if (action === "confirm") {
        body.reward_yuan = rewardYuan;
        if (note.trim()) body.note = note.trim();
      } else if (action === "reject") {
        if (note.trim()) body.reason = note.trim();
      }
      const r = await fetch("/api/admin/issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        alert(`操作失败: ${data.error ?? r.statusText}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert("网络异常");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-100 pt-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-slate-500">红包金额:</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-slate-700">¥</span>
          <input
            type="number"
            min={1}
            max={99}
            step={1}
            value={rewardYuan}
            onChange={(e) => setRewardYuan(Number(e.target.value))}
            className="w-16 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注 (可选)"
          maxLength={200}
          className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => submit("confirm")}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-medium py-2 rounded-lg transition"
        >
          ✅ 采纳并发放
        </button>
        <button
          onClick={() => submit("reject")}
          disabled={loading}
          className="bg-red-100 hover:bg-red-200 disabled:bg-slate-100 text-red-700 text-sm font-medium py-2 px-3 rounded-lg transition"
        >
          ❌ 拒绝
        </button>
        <button
          onClick={() => submit("close")}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 text-slate-600 text-sm font-medium py-2 px-3 rounded-lg transition"
        >
          🔒 关闭
        </button>
      </div>
    </div>
  );
}
