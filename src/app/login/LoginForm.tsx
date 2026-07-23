'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WechatLoginButton } from '@/components/Wechat/WechatLoginButton';

interface LoginFormProps {
  returnTo: string;
  /**
   * 改版 v15 (2026-07-03): ?intent=login|register
   * - intent=register: 优先手机号验证码 (首次使用手机号即注册, 流程最短)
   * - intent=login:   保持邮箱密码为默认 (老用户路径, 兼容性强)
   */
  intent?: 'login' | 'register';
}

type LoginMethod = 'password' | 'phone' | 'mpqr';

export function LoginForm({ returnTo, intent = 'login' }: LoginFormProps) {
  const router = useRouter();
  // 改版 v15: 注册意图默认切到手机号 tab (首次使用即注册, 体验最顺)
  const [method, setMethod] = useState<LoginMethod>(intent === 'register' ? 'phone' : 'password');

  return (
    <div>
      {/* 登录方式切换 */}
      <div
        role="tablist"
        aria-label="登录方式"
        className="flex bg-slate-100 rounded-lg p-1 mb-5 text-xs"
      >
        <button
          role="tab"
          aria-selected={method === 'password'}
          onClick={() => setMethod('password')}
          className={`flex-1 py-2 font-medium rounded-md transition ${
            method === 'password'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          邮箱密码
        </button>
        <button
          role="tab"
          aria-selected={method === 'phone'}
          onClick={() => setMethod('phone')}
          className={`flex-1 py-2 font-medium rounded-md transition ${
            method === 'phone'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          手机号
        </button>
        <button
          role="tab"
          aria-selected={method === 'mpqr'}
          onClick={() => setMethod('mpqr')}
          className={`flex-1 py-2 font-medium rounded-md transition ${
            method === 'mpqr'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          扫码公众号
        </button>
      </div>

      {method === 'password' ? (
        <PasswordLoginForm returnTo={returnTo} router={router} />
      ) : method === 'phone' ? (
        <PhoneOtpForm returnTo={returnTo} router={router} />
      ) : (
        <MpQrLoginGuide returnTo={returnTo} router={router} />
      )}

      {method !== 'mpqr' && (
        <>
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 absolute">或</span>
          </div>

          <WechatLoginButton
            returnTo={returnTo}
            className="w-full"
            text="微信登录"
          />
        </>
      )}
    </div>
  );
}

// =============================================================================
// 邮箱密码登录 (原 LoginForm)
// =============================================================================

function PasswordLoginForm({
  returnTo,
  router,
}: {
  returnTo: string;
  router: ReturnType<typeof useRouter>;
}) {
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
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误, 请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
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
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
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
          className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3"
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
            alert('忘记密码功能开发中, 请关注微信公众号「家有所爱」后联系客服');
          }}
          className="text-xs text-slate-500 hover:text-amber-600"
        >
          忘记密码?
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// 手机号验证码登录 (改版 v9, 2026-06-28)
// =============================================================================

function PhoneOtpForm({
  returnTo,
  router,
}: {
  returnTo: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    setError(null);
    setInfo(null);
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的中国大陆手机号');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'sms', target: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '发送失败, 请稍后重试');
        return;
      }
      setInfo('验证码已发送, 5 分钟内有效');
      startCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误, 请重试');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效手机号');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位验证码');
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'sms', target: phone.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'SESSION_ISSUE_FAILED') {
          setError(
            '验证码已通过, 但当前 Supabase 版本暂未开启免密登录, 请使用邮箱密码或微信登录',
          );
        } else if (data.remainingAttempts !== undefined && data.remainingAttempts > 0) {
          setError(`${data.error} (还剩 ${data.remainingAttempts} 次机会)`);
        } else {
          setError(data.error || '验证失败, 请重试');
        }
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误, 请重试');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
          手机号
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="请输入 11 位手机号"
          autoComplete="tel"
          inputMode="numeric"
          style={{ fontSize: '16px' }}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-500 mt-1">
          <span aria-hidden>🔒 </span>仅中国大陆手机号, 数据加密存储
        </p>
      </div>

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
          验证码
        </label>
        <div className="flex gap-2">
          <input
            id="code"
            type="text"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6 位数字"
            inputMode="numeric"
            autoComplete="one-time-code"
            style={{ fontSize: '16px' }}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent tabular-nums tracking-widest"
          />
          <button
            type="button"
            onClick={handleSendCode}
            disabled={sending || cooldown > 0}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-sm font-medium rounded-lg transition whitespace-nowrap min-w-[112px]"
          >
            {sending ? '发送中...' : cooldown > 0 ? `${cooldown} 秒后重发` : '获取验证码'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3" role="alert">
          <span aria-hidden>⚠️ </span>{error}
        </div>
      )}
      {info && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3" role="status">
          <span aria-hidden>✅ </span>{info}
        </div>
      )}

      <button
        type="submit"
        disabled={verifying}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition"
      >
        {verifying ? '验证中...' : '登录 / 注册'}
      </button>

      <p className="text-xs text-slate-500 text-center leading-relaxed-cn">
        首次使用手机号将自动注册账号, 继续即表示同意{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
          服务条款
        </a>{' '}与{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
          隐私政策
        </a>
      </p>
    </form>
  );
}

// =============================================================================
// 扫码公众号登录 (改版 v14, 2026-06-30)
// =============================================================================

/**
 * 流程:
 *   1. PC 端展示公众号二维码 (静态)
 *   2. 用户用微信扫码关注公众号
 *   3. 用户在公众号对话窗口手动回复【PC】(或点「我的账户 → 电脑端登录」菜单)
 *   4. 公众号自动推送 8 位验证码
 *   5. 用户把验证码输到下方输入框, 提交完成登录
 *
 * 此处调 /api/wechat/pc-login-ticket 创建一个"无主"ticket, 然后订阅 ticket 的 status,
 * 等 mp-callback 把 openid 填上 + 推送验证码后, 用户输 code 即可登录。
 */
function MpQrLoginGuide({
  returnTo,
  router,
}: {
  returnTo: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // 倒计时
  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [expiresAt]);

  // 轮询 ticket 状态: openid 被填上 → confirmed
  useEffect(() => {
    if (!ticket || confirmed) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/wechat/pc-login-status?ticket=${encodeURIComponent(ticket)}`);
        const data = await res.json();
        if (res.ok && data.status === 'confirmed') {
          setConfirmed(true);
          setInfo('✅ 公众号已确认, 请输入您收到的 8 位验证码');
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (res.ok && (data.status === 'expired' || data.status === 'cancelled')) {
          setError('会话已过期, 请重新创建');
          setTicket(null);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // 忽略单次轮询失败
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ticket, confirmed]);

  const handleStart = async () => {
    setError(null);
    setInfo(null);
    setCode('');
    setConfirmed(false);
    try {
      const res = await fetch('/api/wechat/pc-login-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '创建登录会话失败, 请重试');
        return;
      }
      setTicket(data.ticket);
      setExpiresAt(new Date(data.expiresAt).getTime());
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误, 请重试');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^[A-Z2-9]{8}$/.test(code.toUpperCase())) {
      setError('请输入公众号推送的 8 位验证码 (大写字母+数字)');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/wechat/pc-login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket, code: code.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.remainingAttempts !== undefined && data.remainingAttempts > 0) {
          setError(`${data.error} (还剩 ${data.remainingAttempts} 次机会)`);
        } else {
          setError(data.error || '验证失败, 请重试');
        }
        return;
      }
      router.push(data.returnTo || returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误, 请重试');
    } finally {
      setVerifying(false);
    }
  };

  // 初始态: 显示二维码 + 开始按钮
  if (!ticket) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            用微信扫码关注公众号「家有所爱」
          </p>
          <div className="inline-block p-3 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm">
            <img
              src="/wechat-mp-qr.png"
              alt="扫码关注公众号"
              className="w-44 h-44 object-contain"
            />
          </div>
          <p className="text-xs text-slate-500 mt-3">
            手机微信 → 扫一扫 → 关注公众号
          </p>
        </div>

        <ol className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-sm text-slate-700 leading-relaxed-cn">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-semibold">1</span>
            <span>用手机微信扫上方二维码, 关注公众号「家有所爱」</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-semibold">2</span>
            <span>在公众号对话框回复 <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-emerald-700 font-bold">PC</code> (或点菜单「我的账户 → 电脑端登录」)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-semibold">3</span>
            <span>公众号会自动推送 8 位验证码</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-semibold">4</span>
            <span>点击下方「下一步」开始登录</span>
          </li>
        </ol>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3" role="alert">
            <span aria-hidden>⚠️ </span>{error}
          </div>
        )}

        <button
          type="button"
          onClick={handleStart}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition"
        >
          我已关注公众号, 下一步
        </button>

        <p className="text-xs text-slate-400 text-center">
          还没关注? <a href="https://mp.weixin.qq.com/s/家有所爱" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">公众号主页</a>
        </p>
      </div>
    );
  }

  // 已创建 ticket: 等待 / 验证
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm leading-relaxed-cn">
        <p className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <span>📱</span>
          <span>请在公众号对话框回复【PC】</span>
        </p>
        <p className="text-amber-700 text-xs">
          公众号会自动推送 8 位验证码。验证码 5 分钟内有效, 剩余 <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</strong>
        </p>
      </div>

      {!confirmed && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>等待公众号确认... 请保持公众号窗口打开</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-3">
        <div>
          <label htmlFor="mp-code" className="block text-sm font-medium text-slate-700 mb-1">
            8 位验证码
          </label>
          <input
            id="mp-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))}
            placeholder="例如 D6B8TCTE"
            inputMode="text"
            autoComplete="one-time-code"
            maxLength={8}
            style={{ fontSize: '16px', letterSpacing: '0.2em' }}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tabular-nums"
          />
          <p className="text-xs text-slate-500 mt-1">
            <span aria-hidden>💡 </span>从公众号推送的消息里复制过来 (8 位大写字母+数字)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3" role="alert">
            <span aria-hidden>⚠️ </span>{error}
          </div>
        )}
        {info && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3" role="status">
            <span aria-hidden>✅ </span>{info}
          </div>
        )}

        <button
          type="submit"
          disabled={verifying || !confirmed || secondsLeft === 0}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition"
        >
          {verifying ? '登录中...' : '确认登录'}
        </button>

        {!confirmed && (
          <p className="text-xs text-slate-500 text-center">
            没收到验证码? <button type="button" onClick={handleStart} className="text-amber-600 hover:underline">重新创建会话</button>
          </p>
        )}
      </form>
    </div>
  );
}
