'use client';

/**
 * HeaderAuthButtons - SiteHeader 的客户端登录/注册按钮
 *
 * 改版 v1 (2026-07-11): 改造登录/注册交互
 *   - 旧: <Link href="/login?intent=login"> 跳到独立 /login 页面
 *   - 新: 点击触发 Modal 弹窗, 复用 /login 页面同款 LoginForm 组件
 *     → 邮箱/手机/扫码 公众号 3 个 tab 完整保留
 *     → PC 首页与 H5 首页登录体验一致
 *
 * 设计: Modal 而非侧拉, 移动端也居中展示, 体验跟 /login 页一样
 */

import { useEffect, useState } from 'react';
import { LoginForm } from '@/app/login/LoginForm';

interface HeaderAuthButtonsProps {
  initialIntent?: 'login' | 'register';
}

export function HeaderAuthButtons({ initialIntent = 'login' }: HeaderAuthButtonsProps) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<'login' | 'register'>(initialIntent);

  // ESC 关闭 + 锁滚动
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const openWith = (next: 'login' | 'register') => {
    setIntent(next);
    setOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openWith('login')}
          className="border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => openWith('register')}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
        >
          注册
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 id="auth-modal-title" className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
              {intent === 'register' ? '先注册一个账号' : '欢迎回来'}
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
              {intent === 'register'
                ? '30 秒完成注册, 立即开始生成家庭文书'
                : '登录后可以管理您的草稿、订单和博主推广'}
            </p>

            <LoginForm returnTo="/" intent={intent} />

            <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
              {intent === 'login' ? (
                <>
                  还没有账号?{' '}
                  <button
                    type="button"
                    onClick={() => setIntent('register')}
                    className="text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号?{' '}
                  <button
                    type="button"
                    onClick={() => setIntent('login')}
                    className="text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    直接登录
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}