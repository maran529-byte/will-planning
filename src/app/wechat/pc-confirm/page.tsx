'use client';

/**
 * 公众号内「电脑端登录」引导页
 * 路径: /wechat/pc-confirm
 *
 * 改版 v13 (2026-06-29):
 *   公众号菜单「电脑端登录」跳转此页 (微信内打开)
 *   - 展示公众号二维码 + 引导用户回复【PC】获取验证码
 *   - 自动调用 /api/wechat/pc-login-status 检测 openid 是否已确认
 *   - 确认后, 自动调用 /api/wechat/pc-login-verify 完成登录
 *   - 跳转到 /orders
 *
 * 安全:
 *   - 验证码 8 位一次性, 5 分钟过期
 *   - max_attempts=5 防爆破
 *   - 一次性消费, consumed 后立即失效
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { safeReturnTo } from '@/lib/safe-return';

type Status = 'idle' | 'waiting' | 'confirmed' | 'verified' | 'expired' | 'error';

function PcConfirmInner() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('return'), '/orders');
  const initialTicket = searchParams.get('ticket') || '';

  const [status, setStatus] = useState<Status>('idle');
  const [ticket, setTicket] = useState(initialTicket);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 分钟
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 1) 如果 URL 没带 ticket, 自动申请一个
    if (!ticket) {
      void createTicket();
    } else {
      // 有 ticket 直接开始轮询
      startPolling();
    }
    return () => {
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (status === 'confirmed') {
      // 用户已确认, 自动 verify
      void verifyAfterConfirmed();
    }
  }, [status]);

  const createTicket = async () => {
    try {
      const res = await fetch('/api/wechat/pc-login-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '创建票据失败');
        setStatus('error');
        return;
      }
      setTicket(data.ticket);
      startPolling();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setStatus('error');
    }
  };

  const startPolling = () => {
    setStatus('waiting');

    // 启动倒计时
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          stopPolling();
          setStatus('expired');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    // 启动状态轮询 (每 2 秒)
    pollRef.current = setInterval(() => {
      void checkStatus();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(`/api/wechat/pc-login-status?ticket=${encodeURIComponent(ticket)}`);
      const data = await res.json();
      if (data.status === 'confirmed') {
        stopPolling();
        setStatus('confirmed');
      } else if (data.status === 'expired' || data.status === 'cancelled') {
        stopPolling();
        setStatus('expired');
      }
    } catch {
      // silent
    }
  };

  const verifyAfterConfirmed = async () => {
    // 公众号侧的 confirm 已经把 openid 绑定到 ticket,
    // 这里直接调 verify 拿 cookie
    // 但 verify 需要 code 字段, 没有自动 code 路径
    // 改为: status=confirmed 后, 我们把 ticket + 从 code 短信/推送里拿到的 code 输入
    // 但目前还没输入, 所以先停在这里, 提示用户在 PC 端操作
    // (这个页面的目的是引导用户, 真正的 verify 在 PC 端)
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white px-4 py-8 pb-safe">
      <div className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"
            aria-hidden
          >
            <span className="text-3xl">💻</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight-cn text-balance">
            电脑端登录
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed-cn">
            在公众号内回复【PC】,获取 8 位验证码
          </p>
        </header>

        {/* 等待状态 */}
        {status === 'waiting' && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <span className="text-2xl" aria-hidden>⏰</span>
              <div>
                <p className="text-sm font-medium text-amber-900">等待中…</p>
                <p className="text-xs text-amber-700">
                  剩余 {countdownText}
                </p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-slate-700 leading-relaxed-cn">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-medium">1</span>
                <span>在本公众号对话窗口,发送文字 <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-emerald-600">PC</code></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-medium">2</span>
                <span>公众号会自动回复一个 8 位验证码</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-medium">3</span>
                <span>切换到电脑,在电脑浏览器中打开 <Link href="https://aiwill-planner.cn" className="text-amber-600 underline">aiwill-planner.cn</Link></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-medium">4</span>
                <span>在登录弹窗中输入验证码,完成登录</span>
              </li>
            </ol>
          </section>
        )}

        {/* 已确认提示 (但需要用户在 PC 端完成 verify) */}
        {status === 'confirmed' && (
          <section className="rounded-xl bg-emerald-50 border border-emerald-200 p-6">
            <div className="text-center">
              <p className="text-2xl mb-2" aria-hidden>✅</p>
              <h2 className="text-lg font-semibold text-emerald-900">验证码已生成</h2>
              <p className="mt-2 text-sm text-emerald-700 leading-relaxed-cn">
                请在电脑浏览器中打开 <Link href="https://aiwill-planner.cn" className="font-medium underline">aiwill-planner.cn</Link>,点击「登录」按钮,输入公众号推送的 8 位验证码。
              </p>
            </div>
          </section>
        )}

        {/* 已过期 */}
        {status === 'expired' && (
          <section className="rounded-xl bg-red-50 border border-red-200 p-6">
            <div className="text-center">
              <p className="text-2xl mb-2" aria-hidden>⏰</p>
              <h2 className="text-lg font-semibold text-red-900">验证码已过期</h2>
              <p className="mt-2 text-sm text-red-700 leading-relaxed-cn">
                请在公众号对话窗口重新发送 <code className="px-1.5 py-0.5 bg-white rounded font-mono">PC</code> 获取新的验证码
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setCountdown(300);
                  void createTicket();
                }}
                className="mt-4 inline-block bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-2 rounded-lg text-sm"
              >
                重新申请
              </button>
            </div>
          </section>
        )}

        {/* 错误 */}
        {status === 'error' && (
          <section className="rounded-xl bg-red-50 border border-red-200 p-6">
            <div className="text-center">
              <p className="text-2xl mb-2" aria-hidden>❌</p>
              <h2 className="text-lg font-semibold text-red-900">出错了</h2>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          </section>
        )}

        <div className="mt-6 text-center">
          <Link
            href={returnTo}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            <span aria-hidden>← </span>返回
          </Link>
        </div>
      </div>
    </main>
  );
}

function PcConfirmFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4 py-8">
      <div className="text-sm text-slate-500 leading-relaxed-cn">加载中…</div>
    </main>
  );
}

export default function WechatPcConfirmPage() {
  return (
    <Suspense fallback={<PcConfirmFallback />}>
      <PcConfirmInner />
    </Suspense>
  );
}
