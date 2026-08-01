'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WechatLoginButton } from '@/components/Wechat/WechatLoginButton';
import { REFERRAL_STORAGE_KEY } from '@/lib/referral';

interface RegisterFormProps {
  returnTo: string;
  refCode?: string | null;
}

export function RegisterForm({ returnTo, refCode }: RegisterFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);

  useEffect(() => {
    if (refCode) {
      try {
        localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
        setRefPreview(refCode);
      } catch {
        setRefPreview(refCode);
      }
    } else {
      try {
        const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (stored) setRefPreview(stored);
      } catch {
        // ignore
      }
    }
  }, [refCode]);

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 8
      ? 1
      : /[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 10
      ? 3
      : 2;
  const strengthLabel = ['', '弱', '中', '强'][passwordStrength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 前端校验
    if (password !== passwordConfirm) {
      setError('两次密码输入不一致');
      return;
    }
    if (password.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (!acceptTerms) {
      setError('请勾选同意服务条款与隐私政策');
      return;
    }

    setBusy(true);
    try {
      const effectiveRef =
        refCode ||
        (() => {
          try {
            return localStorage.getItem(REFERRAL_STORAGE_KEY);
          } catch {
            return null;
          }
        })();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: displayName.trim() || undefined,
          acceptTerms: true,
          ref_code: effectiveRef || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败, 请重试');
        return;
      }

      try {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      } catch {
        // ignore
      }

      if (data.referral_bound && effectiveRef) {
        try {
          sessionStorage.setItem('aiwill_red_packet_bound', '1');
        } catch {
          // ignore
        }
      }

      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误, 请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {refPreview && (
        <div
          className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800 leading-relaxed-cn"
          role="note"
        >
          <span aria-hidden>🎁 </span>
          您通过好友邀请链接注册, 注册成功后将自动获得 <strong>¥2 红包</strong> (可抵扣订单, 单笔订单最多抵 50%)
        </div>
      )}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn"
        >
          邮箱 <span className="text-red-500" aria-label="必填">*</span>
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
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn"
        >
          昵称 <span className="text-slate-400 text-xs font-normal">(选填)</span>
        </label>
        <input
          id="displayName"
          type="text"
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="您希望被如何称呼?"
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn"
        >
          密码 <span className="text-red-500" aria-label="必填">*</span>
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 8 位, 建议字母+数字"
          autoComplete="new-password"
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        {password.length > 0 && (
          <div
            className="mt-1.5 flex items-center gap-2"
            role="status"
            aria-live="polite"
            aria-label={`密码强度: ${strengthLabel}`}
          >
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${strengthColor}`}
                style={{ width: `${(passwordStrength / 3) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 min-w-[24px]">{strengthLabel}</span>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="passwordConfirm"
          className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn"
        >
          确认密码 <span className="text-red-500" aria-label="必填">*</span>
        </label>
        <input
          id="passwordConfirm"
          type="password"
          required
          minLength={8}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="再输入一次"
          autoComplete="new-password"
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <label className="flex items-start gap-2 cursor-pointer pt-2">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
          aria-required="true"
        />
        <span className="text-xs text-slate-600 leading-relaxed-cn">
          我已阅读并同意{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline">服务条款</a>
          {' '}与{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline">隐私政策</a>
        </span>
      </label>
      {!acceptTerms && (
        <p className="text-xs text-slate-500 leading-relaxed-cn -mt-2" role="note">
          请勾选同意条款才能注册
        </p>
      )}

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
        disabled={busy || !acceptTerms}
        aria-disabled={busy || !acceptTerms}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
      >
        {busy ? '注册中...' : '注册'}
      </button>

      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-xs text-slate-400 absolute">或</span>
      </div>

      <WechatLoginButton
        returnTo={returnTo}
        className="w-full"
        text="微信一键注册 (推荐)"
      />
    </form>
  );
}
