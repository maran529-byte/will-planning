/**
 * /affiliate - 静态展示 + 跳 H5 申请
 *
 * 改版 v2 (2026-07-22, 方案 A 合规修复):
 *   - 旧: requireUser() + ApplyForm (表单) + 读 affiliate 表 (主站变成 dynamic)
 *   - 新: 纯静态展示 + 跳 H5 affiliate
 *   - 架构要求: 主站 0 form 0 input 0 /api/* 调用
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '博主推广计划 · 家有所爱',
  description: '15~30% 佣金 · 周结 · 7×24 工具支持',
  alternates: {
    canonical: 'https://aiwill-planner.cn/affiliate',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/affiliate',
      'zh-HK': 'https://aiwill-planner.cn/affiliate',
      'x-default': 'https://aiwill-planner.cn/affiliate',
    },
  },
  openGraph: {
    title: '家有所爱博主推广计划 - 15%-30% 佣金, 周结',
    description: '推广家有所爱智能文书服务, 享 15%-30% 长期佣金, 周结可提现.',
    url: 'https://aiwill-planner.cn/affiliate',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'website',
  },
  keywords: ['博主推广', '联盟营销', '家有所爱', '分销计划', '高佣联盟', '副业赚钱', '被动收入', 'affiliate program'],
};

export default function AffiliatePage() {
  return (
    <main>
      <section className="px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
          家有所爱博主推广计划
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          15~30% 佣金 · 周结 · 7×24 工具支持
        </p>
        <p className="mt-2 text-sm text-slate-500">
          已有 30+ 博主入驻 · 月均佣金 ¥2,500+
        </p>
      </section>

      <section className="px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center">为什么选家有所爱</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-amber-50 rounded-2xl text-center">
            <div className="text-3xl" aria-hidden="true">💰</div>
            <h3 className="mt-3 font-bold">高佣金</h3>
            <p className="mt-2 text-sm text-slate-600">15~30% 永久分成</p>
          </div>
          <div className="p-6 bg-rose-50 rounded-2xl text-center">
            <div className="text-3xl" aria-hidden="true">⚡</div>
            <h3 className="mt-3 font-bold">周结</h3>
            <p className="mt-2 text-sm text-slate-600">每 7 天自动结算</p>
          </div>
          <div className="p-6 bg-yellow-50 rounded-2xl text-center">
            <div className="text-3xl" aria-hidden="true">🛠️</div>
            <h3 className="mt-3 font-bold">工具支持</h3>
            <p className="mt-2 text-sm text-slate-600">一键生成推广素材</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center">推广流程</h2>
        <div className="mt-8 space-y-4">
          {[
            { n: 1, t: '申请入驻', d: '提交资料(姓名/微信/粉丝量)' },
            { n: 2, t: '审核通过', d: '1~3 个工作日' },
            { n: 3, t: '获取链接', d: '专属推广码 + 素材包' },
            { n: 4, t: '开始推广', d: '公众号/小红书/抖音' },
            { n: 5, t: '获得佣金', d: '订单完成后 7 天结算' },
          ].map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm"
            >
              <div className="text-2xl font-bold text-amber-500 flex-shrink-0">{s.n}</div>
              <div>
                <h3 className="font-semibold">{s.t}</h3>
                <p className="text-sm text-slate-500 mt-1">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-12 text-center">
        <Link
          href="https://h5.aiwill-planner.cn/affiliate"
          className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold"
        >
          前往 H5 申请博主 →
        </Link>
        <p className="mt-4 text-sm text-slate-500">
          已有账号?{' '}
          <Link href="https://h5.aiwill-planner.cn/login" className="text-amber-500">
            立即登录
          </Link>
        </p>
      </section>

      <footer className="px-6 py-12 text-center text-xs text-slate-400">
        家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
      </footer>
    </main>
  );
}
