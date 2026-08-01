/**
 * /contact - host-aware 渲染
 *
 * 架构 (2026-07-23):
 *   - 主站 host: 跳 H5 卡片 (0 form 0 input)
 *   - H5 host: 真实留言表单
 */

import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { isH5Host } from '@/lib/host';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: '联系客服 - 家有所爱',
  description: '联系家有所爱客服团队: 工作时间 9:00-21:00, 留言后 24h 内回复',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/contact',
  },
  robots: { index: true, follow: true },
};

export default async function ContactPage() {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);

  if (!isH5) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
        <header className="px-6 py-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
            <BrandLogo size="sm" />
          </Link>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">联系客服</h1>
          <p className="text-slate-600 mb-8">工作时间 9:00-21:00 · 留言后 24 小时内回复</p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2" aria-hidden="true">💬</div>
              <div className="font-medium">公众号</div>
              <div className="text-sm text-slate-600 mt-1">微信内回复消息</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2" aria-hidden="true">📧</div>
              <div className="font-medium">邮件</div>
              <a href="mailto:330320991@qq.com" className="text-sm text-amber-600 mt-1 block hover:underline break-all">
                330320991@qq.com
              </a>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2" aria-hidden="true">📋</div>
              <div className="font-medium">常见问题</div>
              <Link href="/faq" className="text-sm text-amber-600 mt-1 block hover:underline">查看 FAQ →</Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-lg">
            <div className="text-5xl mb-4" aria-hidden="true">📩</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">在线留言已迁移到 H5</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed-cn">
              为了给您提供更完善的咨询体验，在线客服与留言表单已迁移到 H5 移动端，请在下方入口提交。
            </p>
            <Link
              href="https://h5.aiwill-planner.cn/contact"
              className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              前往 H5 联系客服 →
            </Link>
            <p className="mt-6 text-xs text-slate-400">
              遇到问题?微信搜 <span className="text-amber-500">家有所爱</span> 联系客服
            </p>
          </div>
        </main>

        <footer className="px-6 py-12 text-center text-xs text-slate-400">
          家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
        </footer>
      </div>
    );
  }

  return <ContactForm />;
}
