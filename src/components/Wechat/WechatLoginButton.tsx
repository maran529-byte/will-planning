'use client';

/**
 * 微信登录按钮
 *
 * 行为:
 *   1. 生成 CSRF state, 存 sessionStorage
 *   2. 拼装 OAuth URL
 *   3. window.location.href 跳转 (微信内置浏览器会自动唤起授权)
 *
 * 使用:
 *   <WechatLoginButton onError={(err) => ...} />
 *   <WechatLoginButton scope="snsapi_base" text="静默登录" />
 */

import { useState } from 'react';

export type WechatScope = 'snsapi_base' | 'snsapi_userinfo';

export interface WechatLoginButtonProps {
  scope?: WechatScope;
  text?: string;
  className?: string;
  redirectUri?: string;
  onError?: (err: Error) => void;
  // 登录成功后要跳回的路径
  returnTo?: string;
}

export function WechatLoginButton({
  scope = 'snsapi_userinfo',
  text = '微信登录',
  className = '',
  redirectUri,
  onError,
  returnTo = '/',
}: WechatLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    try {
      setLoading(true);

      // 1. 生成 state
      const state = generateState();

      // 2. 存 sessionStorage (回调时校验)
      sessionStorage.setItem('wechat_oauth_state', state);
      if (returnTo) {
        sessionStorage.setItem('wechat_oauth_return', returnTo);
      }

      // 3. 拼 URL (跳转 OAuth, 走 H5 的 /wechat/callback)
      const params = new URLSearchParams({
        scope,
        state,
      });
      if (redirectUri) {
        params.set('redirect_uri', redirectUri);
      }
      window.location.href = `/wechat/callback?${params.toString()}`;
    } catch (e: any) {
      setLoading(false);
      onError?.(e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        'flex items-center justify-center gap-2 rounded-lg bg-[#07C160] hover:bg-[#06B05A] ' +
        'active:bg-[#059A4F] disabled:bg-gray-300 disabled:cursor-not-allowed ' +
        'text-white font-medium px-6 py-3 transition-colors ' +
        className
      }
      aria-label={text}
    >
      <WechatIcon />
      <span>{loading ? '跳转中…' : text}</span>
    </button>
  );
}

function WechatIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8.5 8.5a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2zM12 4C6.5 4 2 7.6 2 12c0 2.5 1.5 4.7 3.7 6.2L5 21l3.5-2c1.1.3 2.3.5 3.5.5 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
    </svg>
  );
}

function generateState(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default WechatLoginButton;
