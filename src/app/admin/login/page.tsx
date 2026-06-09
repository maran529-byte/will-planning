'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * /admin/login - 管理员登录页
 *
 * 改版 v3 (2026-06-09, fix '加载中...' stuck state):
 *   - 不再用 useSearchParams() (会触发 Next.js 16 BAILOUT_TO_CLIENT_SIDE_RENDERING)
 *   - 改为 useEffect 读 window.location.search → 表单可完整 SSR, 首屏直接可见
 *   - 改版 v2 (2026-06-09, UI polish):
 *       - input 加 style={{ fontSize: '16px' }} 防 iOS 自动放大
 *       - input 加 inputMode / autoComplete
 *       - label 用 htmlFor 关联 id
 *       - error 区域加 role="alert"
 *       - leading-tight-cn / leading-relaxed-cn 中文排版
 *       - 卡片加 pb-safe
 */

export default function AdminLoginPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState('/admin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 客户端 mount 后读 ?return=, 避免 useSearchParams 触发 SSR bail-out
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const ret = sp.get('return');
    if (ret && ret.startsWith('/') && !ret.startsWith('//')) {
      setReturnTo(ret);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }
      // 跳回 returnTo
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4 pb-safe">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20"
            aria-hidden
          >
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight-cn text-balance">
            管理员后台
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed-cn">
            aiwill-planner 内部使用
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl bg-slate-800/80 backdrop-blur p-6 border border-slate-700 space-y-4"
          aria-label="管理员登录表单"
        >
          <div>
            <label
              htmlFor="admin-email"
              className="block text-sm font-medium text-slate-300 mb-1 leading-tight-cn"
            >
              邮箱
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@aiwill.local"
              inputMode="email"
              // 改版 v2 (2026-06-09): 16px 防 iOS 自动放大
              style={{ fontSize: '16px' }}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-slate-300 mb-1 leading-tight-cn"
            >
              密码
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="≥8 位"
              minLength={8}
              // 改版 v2 (2026-06-09): 16px 防 iOS 自动放大
              style={{ fontSize: '16px' }}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {error && (
            <div
              className="rounded-lg bg-red-900/30 border border-red-700 p-3 text-sm text-red-300 leading-relaxed-cn"
              role="alert"
            >
              <span aria-hidden>⚠️ </span>{error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 transition focus-ring-visible"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed-cn">
          <Link href="/" className="hover:text-slate-300 focus-ring-visible">
            <span aria-hidden>← </span>返回首页
          </Link>
        </p>
      </div>
    </main>
  );
}
