'use client';

/**
 * 访客编号绑定页 (Phase 2 简化登录)
 * 路径: /wechat/bind
 *
 * 改版 v2 (2026-06-07):
 *   - 跳过公众号 OAuth (订阅号 wx30fe5cd917eb2e7a 不支持 snsapi_userinfo)
 *   - 客户手动输入 4-32 位访客编号, 服务端写入 HTTP-only cookie wx_openid
 *   - 编号作为用户在系统中的唯一标识, 用于订单隔离、博主归因等
 *   - 同一编号绑定的所有订单/草稿可在 /orders 查看
 *
 * 改版 v3 (2026-06-09, UI polish):
 *   - 添加 aria-label / aria-hidden / role="alert" / role="status"
 *   - input 加 style={{ fontSize: '16px' }} 防 iOS 自动放大
 *   - leading-relaxed-cn 中文长文本优化
 *
 * Dev 模式 (NODE_ENV !== 'production'):
 *   - 保留原"手动设置"入口, 但现在是生产主路径
 *
 * 安全:
 *   - 编号校验: 4-32 位, 仅 [a-zA-Z0-9_-]
 *   - HTTP-only cookie: 防 XSS 窃取
 *   - SameSite=Lax: 防 CSRF
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function WechatBindInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return') || '/orders';
  const [error, setError] = useState<string | null>(null);
  const [devOpenid, setDevOpenid] = useState('');
  const [devStatus, setDevStatus] = useState<string | null>(null);
  const [currentOpenid, setCurrentOpenid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 拉取当前 openid (生产也用, 用于展示「已绑定」状态)
    void fetchCurrentOpenid();
  }, []);

  const fetchCurrentOpenid = async () => {
    try {
      const res = await fetch('/api/dev/set-openid', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setCurrentOpenid(data.openid || null);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevStatus(null);

    const trimmed = devOpenid.trim();
    if (trimmed.length < 4) {
      setError('访客编号至少 4 位');
      return;
    }
    if (trimmed.length > 32) {
      setError('访客编号最多 32 位');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('仅支持字母、数字、下划线、连字符');
      return;
    }

    try {
      const res = await fetch('/api/dev/set-openid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openid: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '设置失败');
        return;
      }
      setCurrentOpenid(data.openid);
      setDevStatus(`✓ 已绑定访客编号 = ${data.openid}, 即将跳转...`);
      setTimeout(() => {
        window.location.href = returnTo;
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    }
  };

  const handleClear = async () => {
    if (!confirm('确定要退出当前访客编号? 退出后您将无法查看历史订单。')) return;
    try {
      await fetch('/api/dev/set-openid', { method: 'DELETE' });
      setCurrentOpenid(null);
      setDevOpenid('');
      setDevStatus('✓ 已退出当前访客编号');
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-sm text-slate-500 leading-relaxed-cn">加载中…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 pb-safe">
      <div className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100"
            aria-hidden
          >
            <span className="text-3xl">🔖</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight-cn text-balance">
            设置访客编号
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed-cn">
            用于在本站关联您的订单、草稿和咨询记录
          </p>
        </header>

        {/* 已绑定: 显示当前编号 + 退出按钮 */}
        {currentOpenid && (
          <section
            className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4"
            aria-label="已绑定访客编号"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs text-emerald-700 font-medium mb-1"
                  role="status"
                >
                  <span aria-hidden>✓ </span>当前已绑定
                </p>
                <p className="font-mono text-base text-emerald-900 break-all tabular-nums">
                  {currentOpenid}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="flex-shrink-0 text-xs text-emerald-700 hover:text-emerald-900 underline"
                aria-label="退出当前访客编号"
              >
                退出
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <Link
                href={returnTo}
                className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-lg text-sm transition"
              >
                <span aria-hidden>← </span>返回 {returnTo}
              </Link>
            </div>
          </section>
        )}

        {/* 绑定表单 */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700 mb-3 leading-tight-cn">
            {currentOpenid ? '切换为新编号' : '设置您的访客编号'}
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed-cn">
            推荐使用{' '}
            <span className="font-mono bg-slate-100 px-1 rounded tabular-nums">
              手机后4位 + 4位数字
            </span>{' '}
            (如 alice2024)；
            或任意 4-32 位字母数字组合。请记牢, 后续查询订单需用此编号。
          </p>

          <form onSubmit={handleBind} className="space-y-3">
            <label htmlFor="openid-input" className="sr-only">
              访客编号
            </label>
            <input
              id="openid-input"
              type="text"
              value={devOpenid}
              onChange={(e) => setDevOpenid(e.target.value)}
              placeholder="例如: alice2024 / wx_test_001"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              // 改版 v3 (2026-06-09): 16px 防 iOS 自动放大
              style={{ fontSize: '16px' }}
              inputMode="text"
              aria-describedby="openid-hint"
            />
            <p id="openid-hint" className="text-xs text-slate-400 leading-relaxed-cn">
              4-32 位字母、数字、下划线或连字符
            </p>
            <button
              type="submit"
              disabled={!devOpenid.trim()}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 transition"
            >
              {currentOpenid ? '切换到此编号' : '绑定并继续'}
            </button>
          </form>

          {error && (
            <div
              className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 leading-relaxed-cn"
              role="alert"
            >
              <span aria-hidden>⚠️ </span>{error}
            </div>
          )}

          {devStatus && (
            <div
              className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 leading-relaxed-cn"
              role="status"
              aria-live="polite"
            >
              {devStatus}
            </div>
          )}
        </section>

        {/* 说明 */}
        <section className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 leading-relaxed-cn">
          <p className="font-medium mb-2">
            <span aria-hidden>📌 </span>什么是访客编号?
          </p>
          <p>
            访客编号是您在本站的唯一标识。设置后, 您创建的草稿、订单都将关联到此编号,
            之后用同一浏览器访问即自动识别。
          </p>
          <p className="mt-2">
            <strong>请勿使用真实手机号或身份证号</strong>作为访客编号, 保护个人隐私。
          </p>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed-cn">
          绑定即同意
          <a
            href="/privacy"
            className="mx-1 text-blue-600 hover:underline"
            rel="noopener"
          >
            《隐私政策》
          </a>
          和
          <a
            href="/terms"
            className="mx-1 text-blue-600 hover:underline"
            rel="noopener"
          >
            《用户协议》
          </a>
        </p>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            <span aria-hidden>← </span>返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}

function BindFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-8">
      <div className="text-sm text-slate-500 leading-relaxed-cn">加载中…</div>
    </main>
  );
}

export default function WechatBindPage() {
  return (
    <Suspense fallback={<BindFallback />}>
      <WechatBindInner />
    </Suspense>
  );
}
