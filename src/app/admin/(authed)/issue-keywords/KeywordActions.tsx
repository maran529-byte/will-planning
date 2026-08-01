"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * KeywordActions - 关键词管理操作按钮 (新建/编辑/启用/禁用)
 */

interface Initial {
  keyword_pattern: string;
  match_target: string;
  default_reward_cents: number;
  auto_resolve_message: string;
  is_active: boolean;
}

interface Props {
  mode: "create" | "edit";
  id?: string;
  initial?: Initial;
}

export function KeywordActions({ mode, id, initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pattern, setPattern] = useState(initial?.keyword_pattern ?? "");
  const [target, setTarget] = useState(initial?.match_target ?? "both");
  const [rewardYuan, setRewardYuan] = useState((initial?.default_reward_cents ?? 500) / 100);
  const [msg, setMsg] = useState(initial?.auto_resolve_message ?? "");
  const [active, setActive] = useState(initial?.is_active ?? true);

  const submit = async (action: "create" | "update" | "toggle") => {
    if (loading) return;
    if (action !== "toggle" && !pattern.trim()) {
      alert("请填写关键词");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        action,
        keyword_pattern: pattern.trim(),
        match_target: target,
        default_reward_cents: Math.round(rewardYuan * 100),
        auto_resolve_message: msg.trim(),
        is_active: active,
      };
      if (id) body.id = id;
      const r = await fetch("/api/admin/issue-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        alert(`失败: ${data.error ?? r.statusText}`);
      } else {
        router.refresh();
        if (action === "create") {
          setPattern("");
          setMsg("");
          setRewardYuan(5);
        }
      }
    } catch {
      alert("网络异常");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "create") {
    return (
      <div className="space-y-2">
        <h2 className="font-semibold text-slate-800 text-sm">新增关键词</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="关键词, 多个用 | 分隔"
            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="both">标题+描述</option>
            <option value="title">仅标题</option>
            <option value="description">仅描述</option>
          </select>
          <div className="flex items-center gap-1">
            <span className="text-sm">¥</span>
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              value={rewardYuan}
              onChange={(e) => setRewardYuan(Number(e.target.value))}
              className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => submit("create")}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-sm px-4 py-2 rounded-lg"
          >
            + 新增
          </button>
        </div>
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="自动修复说明 (可选, 用户可见)"
          maxLength={500}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>
    );
  }

  // edit mode (inline)
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        placeholder="关键词"
        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="px-2 py-1 border border-slate-300 rounded text-xs"
        >
          <option value="both">标题+描述</option>
          <option value="title">仅标题</option>
          <option value="description">仅描述</option>
        </select>
        <div className="flex items-center gap-1">
          <span className="text-xs">¥</span>
          <input
            type="number"
            min={1}
            max={99}
            step={1}
            value={rewardYuan}
            onChange={(e) => setRewardYuan(Number(e.target.value))}
            className="w-14 px-1.5 py-1 border border-slate-300 rounded text-xs"
          />
        </div>
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="自动修复说明"
          className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-xs"
        />
        <button
          onClick={() => submit("update")}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs px-3 py-1 rounded"
        >
          保存
        </button>
        <button
          onClick={() => {
            setActive(!active);
            setTimeout(() => submit("toggle"), 0);
          }}
          disabled={loading}
          className={`${
            active
              ? "bg-amber-100 hover:bg-amber-200 text-amber-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          } text-xs px-3 py-1 rounded`}
        >
          {active ? "禁用" : "启用"}
        </button>
      </div>
    </div>
  );
}
