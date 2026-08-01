import type { Metadata } from 'next';
import { Suspense } from 'react';
import OAuthClient from './OAuthClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '微信授权 · 家有所爱',
  description: '跳转微信授权,完成后自动返回家有所爱',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/wechat/oauth',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WechatOAuthPage() {
  return (
    <Suspense fallback={<OAuthLoading />}>
      <OAuthClient />
    </Suspense>
  );
}

function OAuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
      <div className="text-center">
        <div className="text-5xl mb-4" aria-hidden>🔄</div>
        <p className="text-slate-600 leading-relaxed-cn">正在准备微信授权...</p>
      </div>
    </div>
  );
}
