/**
 * /pricing - 价格对比页
 *
 * 改版 v1 (2026-07-08): P0-5 修复. SEO/GEO 友好:
 *  - 智能版 ¥19.9 vs 专家护航版 ¥999 全维度对比表
 *  - 6 类文书分别定价
 *  - 退款规则 + 60 天满意保障(信任锚)
 *  - 4 条 FAQ: 何时选智能版 vs 专家版
 *  - 6 个 Product schema + 1 个 OfferCatalog + FAQPage + BreadcrumbList
 *
 * 文档参考:
 *  - https://schema.org/Product
 *  - https://schema.org/Offer
 *  - https://schema.org/FAQPage
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: '价格对比',
  description: '智能版 ¥19.9 vs 专家护航版 ¥999, 6 类婚姻/家庭文书全维度对比, 含 60 天满意保障',
  alternates: {
    canonical: 'https://aiwill-planner.cn/pricing',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/pricing',
      'zh-HK': 'https://aiwill-planner.cn/pricing',
      'x-default': 'https://aiwill-planner.cn/pricing',
    },
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '家有所爱 · 价格对比',
    description: '智能版 ¥19.9 vs 专家护航版 ¥999, 含 60 天满意保障',
    url: 'https://aiwill-planner.cn/pricing',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: '家有所爱 · 价格对比',
      },
    ],
  },
};

interface DocTypePricing {
  id: string;
  name: string;
  smart: number;
  expert: number;
  description: string;
}

const DOC_TYPE_PRICING: DocTypePricing[] = [
  {
    id: 'will',
    name: '遗嘱(中华遗嘱库范本)',
    smart: 1990,
    expert: 99900,
    description: '法定/自书/代书/公证遗嘱四种, 含财产清单与见证人',
  },
  {
    id: 'pre-marriage',
    name: '婚前财产协议',
    smart: 1990,
    expert: 99900,
    description: '婚前/婚后财产隔离、不动产份额、个人债务归属',
  },
  {
    id: 'during-marriage',
    name: '婚内财产协议',
    smart: 1990,
    expert: 99900,
    description: '婚内财产约定、AA 制、家庭开支分担、债务隔离',
  },
  {
    id: 'divorce',
    name: '离婚协议书',
    smart: 1990,
    expert: 99900,
    description: '民政局协议离婚 + 诉讼离婚双轨条款, 冷静期',
  },
  {
    id: 'gift',
    name: '赠与协议',
    smart: 1990,
    expert: 99900,
    description: '动产/不动产/股权赠与, 区分夫妻共同财产',
  },
  {
    id: 'inheritance',
    name: '遗产继承方案',
    smart: 1990,
    expert: 99900,
    description: '法定继承/遗嘱继承/遗赠扶养协议, 民法典 1133-1144',
  },
];

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

const FAQ_ITEMS = [
  {
    q: '什么时候选智能版 ¥19.9?',
    a: '情况相对简单、双方已协商一致、希望快速拿到一份完整可用的法律文书参考时推荐。10 分钟填写问卷、30 秒生成草稿、PDF 含水印。适合预算敏感、时间紧迫、或只是想先看看法律文书结构与重点条款的当事人。',
  },
  {
    q: '什么时候选专家护航版 ¥999?',
    a: '资产规模较大(单方/双方房产、股权、公司、跨境资产合计 ≥ 300 万)、家庭结构复杂(再婚/继子女/非婚生子女/多代同堂)、有真实争议或潜在诉讼风险时推荐。系统在智能版基础上加 1 对 1 资产规划专业人士审核、3 轮修改建议与签署指引, 含 60 天满意保障。',
  },
  {
    q: '60 天满意保障的具体规则?',
    a: '付款后 60 天内, 如对生成结果不满意、专家未按承诺完成审核、或最终文书您未采纳, 可在 /orders 提交全额退款申请, 2 个工作日内原路退回。仅适用于一次, 不含"主观反悔"。具体流程见 /terms 第 8 条。',
  },
  {
    q: '价格含税吗?能开企业发票吗?',
    a: '页面价格为含税价(已含 6% 增值税普通发票)。如需企业增值税专用发票, 请在 /account 提供企业抬头与税号, 我们 5 个工作日内寄出。',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* 顶部 nav */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition leading-tight-cn"
          >
            <span aria-hidden>←</span>
            <span>返回首页</span>
          </Link>
          <h2 className="text-sm text-slate-500" aria-label="当前页">
            价格对比
          </h2>
          <div className="w-20" aria-hidden />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 text-balance">
            透明定价 · 按场景选择
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed-cn max-w-2xl mx-auto">
            智能版 10 分钟自助, 专家版 1 对 1 审核。6 类文书统一价, 含 60 天满意保障
          </p>
        </div>

        {/* 套餐对比表 */}
        <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-8 mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            智能版 vs 专家护航版
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-3 font-semibold text-slate-700 leading-tight-cn">
                    对比维度
                  </th>
                  <th className="p-3 font-semibold text-amber-600 leading-tight-cn">
                    智能版
                  </th>
                  <th className="p-3 font-semibold text-purple-600 leading-tight-cn">
                    专家护航版
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-700 leading-tight-cn">价格</td>
                  <td className="p-3 text-center font-bold text-amber-600 tabular-nums">
                    ¥19.9
                  </td>
                  <td className="p-3 text-center font-bold text-purple-600 tabular-nums">
                    ¥999
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-700 leading-tight-cn">适用场景</td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    简单/已协商一致
                  </td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    复杂/有争议/大额资产
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-700 leading-tight-cn">交付物</td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    PDF 文书 + 微信小程序
                  </td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    PDF + 微信 + 3 轮修改
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-700 leading-tight-cn">审核</td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    AI 自检 + 模板校验
                  </td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    资产规划专业人士 1 对 1
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-700 leading-tight-cn">生成时间</td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    30 秒
                  </td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    3 个工作日
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700 leading-tight-cn">退款保障</td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    7 天
                  </td>
                  <td className="p-3 text-center text-slate-600 leading-relaxed-cn">
                    60 天满意保障
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 6 类文书价格 */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            6 类文书统一定价
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOC_TYPE_PRICING.map((d) => (
              <article
                key={d.id}
                className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100 hover:border-amber-300 hover:shadow-md transition"
              >
                <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight-cn">
                  {d.name}
                </h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed-cn min-h-[40px]">
                  {d.description}
                </p>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">智能版</span>
                    <span className="font-bold text-amber-600 tabular-nums">
                      ¥{formatPrice(d.smart)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">专家版</span>
                    <span className="font-bold text-purple-600 tabular-nums">
                      ¥{formatPrice(d.expert)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/doc-type?type=${d.id}&plan=ai`}
                  className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl transition"
                >
                  开始填写
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* 信任锚 */}
        <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8 mb-10 border border-amber-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3 leading-tight-cn">
            <span aria-hidden>🛡 </span>60 天满意保障
          </h2>
          <p className="text-slate-700 leading-relaxed-cn mb-4">
            专家护航版付款后 60 天内, 如对最终文书的审核结果不满意、专家未按承诺完成审核、或您最终未采纳本平台生成的文书, 均可申请全额退款。具体流程见{' '}
            <Link
              href="/terms"
              className="text-amber-600 hover:text-amber-700 underline"
            >
              服务条款第 8 条
            </Link>
            。
          </p>
          <p className="text-xs text-slate-500 leading-relaxed-cn">
            * 退款保障仅适用一次, 不含主观反悔; 退款不涵盖已产生的咨询/快递成本
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            关于价格的常见问题
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((f, i) => (
              <details
                key={i}
                className="bg-white rounded-2xl shadow-sm p-5 group"
              >
                <summary className="font-semibold text-slate-800 cursor-pointer leading-tight-cn list-none flex items-center justify-between">
                  <span>{f.q}</span>
                  <span
                    className="text-slate-400 group-open:rotate-180 transition-transform"
                    aria-hidden
                  >
                    ▾
                  </span>
                </summary>
                <p className="text-slate-600 mt-3 leading-relaxed-cn text-sm">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Link
            href="/doc-type"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-10 py-4 rounded-2xl transition text-lg"
          >
            选择文书类型开始
          </Link>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed-cn">
            选错也没关系, 后续随时可调整套餐
          </p>
        </section>
      </main>

      {/* 6 产品 (智能版+专家版 各一条 Product Schema, 也可视为 12 个 Product) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            DOC_TYPE_PRICING.flatMap((d) => [
              {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: `${d.name} · 智能版`,
                description: `智能版: ${d.description}`,
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: formatPrice(d.smart),
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: `https://aiwill-planner.cn/payment?plan=ai&type=${d.id}`,
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: `${d.name} · 专家护航版`,
                description: `专家版: ${d.description}`,
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: formatPrice(d.expert),
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: `https://aiwill-planner.cn/payment?plan=expert&type=${d.id}`,
                },
              },
            ])
          ),
        }}
      />

      <StructuredData
        type="faq"
        data={{
          faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
        }}
      />

      <StructuredData
        type="breadcrumb"
        data={{
          items: [
            { name: '首页', url: '/' },
            { name: '价格对比', url: '/pricing' },
          ],
        }}
      />
    </div>
  );
}
