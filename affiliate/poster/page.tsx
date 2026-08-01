import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/admin-auth';
import { getBloggerByUserId } from '@/lib/affiliate';
import PosterEditor from './PosterEditor';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '推广海报',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function PosterPage() {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.user) {
    redirect('/affiliate');
  }

  const blogger = await getBloggerByUserId(auth.user.id);
  if (!blogger) {
    redirect('/affiliate');
  }
  if (blogger.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">海报功能尚未开放</h1>
          <p className="text-sm text-slate-600 mb-4">
            您的博主申请当前状态: <span className="font-mono text-amber-600">{blogger.status}</span>
            <br />
            通过审核后即可生成专属推广海报
          </p>
          <Link
            href="/affiliate/dashboard"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            ← 返回工作台
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/affiliate/dashboard"
            className="text-sm text-slate-600 hover:text-amber-600 transition"
          >
            ← 返回工作台
          </Link>
          <div className="text-sm text-slate-500">
            推广码: <code className="font-mono font-bold text-amber-600">{blogger.ref_code}</code>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">📱 推广海报</h1>
        <p className="text-sm text-slate-600 mb-6">
          选一个模板, 一键生成专属推广海报. 扫码即可追踪到您的推广链接.
        </p>

        <PosterEditor
          refCode={blogger.ref_code || ''}
          displayName={blogger.display_name || '博主'}
          commissionRate={blogger.commission_rate}
        />
      </div>
    </div>
  );
}
