'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  returnTo: string;
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登录失败, 请检查邮箱和密码');
        return;
      }

      // 成功 → 跳转到 returnTo (默认 /dashboard)
      router.push(returnTo);
      router.refresh(); // 强制刷新 server component 数据
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误, 请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn"
        >
          邮箱
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          inputMode="email"
          // 改版 v5 (2026-06-09): input-ios-fix = font-size 16px 防止 iOS 自动放大
          // 默认 globals.css 已是 16px, 这里 redundant 但明确化 (input attr vs CSS)
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn"
        >
          密码
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 8 位"
          autoComplete="current-password"
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 leading-relaxed-cn"
          role="alert"
        >
          <span aria-hidden>⚠️ </span>{error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition"
      >
        {busy ? '登录中...' : '登录'}
      </button>

      <div className="text-right">
        <button
          type="button"
          onClick={() => {
            alert('忘记密码功能开发中, 请联系客服微信 wxid_xxx');
          }}
          className="text-xs text-slate-500 hover:text-amber-600"
        >
          忘记密码?
        </button>
      </div>
    </form>
  );
}
