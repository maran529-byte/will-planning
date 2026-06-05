'use client';

/**
 * 公众号账号绑定引导页
 * 路径: /wechat/bind
 *
 * 用途:
 *   - 用户从公众号菜单"账号绑定"跳到 H5 此页
 *   - 提示授权范围, 点"微信登录"即跳 OAuth
 *   - 绑定成功后跳 /wechat/success
 *
 * Dev 模式 (NODE_ENV !== 'production'):
 *   - 额外提供"手动设置 openid"入口, 用于本地测试 openid 隔离逻辑
 *   - 调用 POST /api/dev/set-openid 写入 HTTP-only cookie
 *   - 真实生产环境自动隐藏此区块
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { WechatLoginButton } from '@/components/Wechat/WechatLoginButton';

function WechatBindInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return') || '/orders';
  const [error, setError] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [devOpenid, setDevOpenid] = useState('');
  const [devStatus, setDevStatus] = useState<string | null>(null);
  const [currentOpenid, setCurrentOpenid] = useState<string | null>(null);

  useEffect(() => {
    // NODE_ENV 在客户端是 process.env.NODE_ENV, 通过路径或 .env 注入
    // 用 typeof 保护 SSR, dev 模式仅在 process.env.NODE_ENV === 'development' 时显示
    setIsDev(process.env.NODE_ENV === 'development');

    // 拉取当前 openid (仅 dev 模式有)
    if (process.env.NODE_ENV === 'development') {
      fetch('/api/dev/set-openid', { method: 'GET' }).catch(() => {});
      // 注意: GET 在该路由未实现, 但浏览器不会因为 404 报错 (silent)
      // 实际查 openid 的方法: 后续 GET /api/create-order 拿 authenticated 字段
    }
  }, []);

  const handleDevBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevStatus(null);
    if (!devOpenid.trim()) {
      setError('请输入 openid');
      return;
    }
    try {
      const res = await fetch('/api/dev/set-openid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openid: devOpenid.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '设置失败');
        return;
      }
      setCurrentOpenid(data.openid);
      setDevStatus(`✓ 已设置 openid = ${data.openid}, 1 秒后跳 ${returnTo}`);
      setTimeout(() => {
        window.location.href = returnTo;
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    }
  };

  const handleDevClear = async () => {
    try {
      await fetch('/api/dev/set-openid', { method: 'DELETE' });
      setCurrentOpenid(null);
      setDevOpenid('');
      setDevStatus('✓ 已清除 openid cookie');
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f7fa] to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#07C160]/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#07C160">
              <path d="M8.5 8.5a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2zM12 4C6.5 4 2 7.6 2 12c0 2.5 1.5 4.7 3.7 6.2L5 21l3.5-2c1.1.3 2.3.5 3.5.5 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">绑定微信账号</h1>
          <p className="mt-2 text-sm text-gray-500">
            绑定后可在公众号查看订单、接收客服通知
          </p>
        </header>

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">授权后将获取:</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckIcon />
              <span>您的微信昵称和头像</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon />
              <span>唯一用户标识 (OpenID)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon />
              <span>用于订单关联和客服通知</span>
            </li>
          </ul>
        </section>

        <section className="mb-6 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
          <p className="font-medium">⚠️ 重要提示</p>
          <p className="mt-1 leading-relaxed">
            绑定后您的订单将关联到当前微信账号。请确保在<strong> 自己的微信 </strong>中完成授权。
          </p>
        </section>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <WechatLoginButton
          scope="snsapi_userinfo"
          text="授权并绑定"
          returnTo={`/wechat/success?return=${encodeURIComponent(returnTo)}`}
          onError={(e) => setError(e.message)}
          className="w-full"
        />

        {/* Dev-only: 手动设置 openid */}
        {isDev && (
          <section className="mt-6 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-900">
              <span className="rounded bg-purple-200 px-1.5 py-0.5 text-xs">DEV</span>
              <span>手动设置 openid (仅开发模式)</span>
            </div>
            <p className="mb-3 text-xs text-purple-700">
              用于本地测试用户隔离, 不走真实 OAuth. 生产环境此区块自动隐藏.
            </p>
            <form onSubmit={handleDevBind} className="space-y-2">
              <input
                type="text"
                value={devOpenid}
                onChange={(e) => setDevOpenid(e.target.value)}
                placeholder="例如: dev_user_alice / wx_test_001"
                className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  设置并跳转
                </button>
                <button
                  type="button"
                  onClick={handleDevClear}
                  className="rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm text-purple-700 hover:bg-purple-100"
                >
                  清除
                </button>
              </div>
            </form>
            {currentOpenid && (
              <p className="mt-2 text-xs text-purple-700">
                当前 openid: <code className="bg-purple-100 px-1 rounded">{currentOpenid}</code>
              </p>
            )}
            {devStatus && (
              <p className="mt-2 text-xs text-green-700">{devStatus}</p>
            )}
          </section>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          绑定即同意
          <a href="/privacy" className="mx-1 text-blue-600 hover:underline">
            《隐私政策》
          </a>
          和
          <a href="/terms" className="mx-1 text-blue-600 hover:underline">
            《用户协议》
          </a>
        </p>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← 返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 flex-shrink-0"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="#07C160"
    >
      <path d="M13.5 4.5L6 12L2.5 8.5L3.91 7.09L6 9.17L12.09 3.09L13.5 4.5Z" />
    </svg>
  );
}

function BindFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fa] to-white px-4 py-8">
      <div className="text-sm text-gray-500">正在加载…</div>
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
