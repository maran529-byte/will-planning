"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * /feedback/success - 提交成功页
 *
 * 改版 v1 (2026-07-20):
 *   - 告知用户 issue_id + 预期审核时长
 *   - 引导查看自己的所有 issue 列表
 */

function SuccessContent() {
  const params = useSearchParams();
  const issueId = params.get("issue");

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 text-center space-y-5">
        <div className="text-6xl" aria-hidden>🎉</div>
        <h1 className="text-2xl font-bold text-slate-800">提交成功!</h1>

        {issueId && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-600 break-all">
            问题编号: {issueId}
          </div>
        )}

        <p className="text-sm text-slate-600 leading-relaxed">
          我们已收到你的反馈, 通常会在 <b className="text-slate-800">24 小时内</b> 处理。<br />
          被采纳后红包将自动发放到你的账户余额。
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 text-left space-y-1">
          <div>📬 审核进度会显示在你的账户里</div>
          <div>💰 红包有效期 180 天</div>
          <div>🔒 仅限站内服务费抵用</div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/account/issues"
            className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-lg transition"
          >
            查看我的问题列表
          </Link>
          <Link
            href="/feedback"
            className="block w-full border border-slate-300 hover:border-slate-400 text-slate-700 font-medium py-2.5 rounded-lg transition"
          >
            再提交一条
          </Link>
          <Link
            href="/"
            className="block w-full text-sm text-slate-500 hover:text-slate-700 py-1"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">加载中...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
