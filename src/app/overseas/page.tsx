// 海外华人专区落地页
// 改版 v1 (2026-07-16, 全球化项目 W1.8)
//
// URL: /overseas (中文站 / 海外访问)
// 设计原则:
//   - 大字告知 "全球华人法律文书工具"
//   - 6 类文书卡片, 中英双语介绍
//   - 强制法律告知在文末 (不可绕过)
//   - 顶部 CTA: 免费生成 19.9 体验

import Link from 'next/link';
import GlobalComplianceConsent from '@/components/GlobalComplianceConsent';
import { getDictionary } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { detectLocaleFromCookie } from '@/lib/i18n';

export const metadata = {
  title: '海外华人法律文书 · 全球华人',
  description:
    '面向海外华人的家事法律文书平台。婚前/婚内/离婚/抚养/赠与/继承 6 类文书, 微信支付, 海外可访问。',
  alternates: {
    canonical: 'https://aiwill-planner.cn/overseas',
  },
};

export const dynamic = 'force-dynamic';

export default async function OverseasPage() {
  const cookieStore = await cookies();
  const locale = detectLocaleFromCookie(cookieStore.get('NEXT_LOCALE')?.value);
  const dict = getDictionary(locale);

  const docs = [
    { key: 'prenup' as const, icon: '💍', href: '/questionnaire?doc=prenup' },
    { key: 'postnup' as const, icon: '🤝', href: '/questionnaire?doc=postnup' },
    { key: 'divorce' as const, icon: '📋', href: '/questionnaire?doc=divorce' },
    { key: 'custody' as const, icon: '👶', href: '/questionnaire?doc=custody' },
    { key: 'gift' as const, icon: '🎁', href: '/questionnaire?doc=gift' },
    { key: 'will' as const, icon: '📜', href: '/questionnaire?doc=will' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10 text-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-4">
          🌏 {dict.overseas.crossBorderBadge}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          {dict.overseas.title}
        </h1>
        <p className="text-lg text-slate-700 mb-8 max-w-2xl mx-auto">
          {dict.overseas.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/questionnaire?doc=prenup"
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-md transition"
          >
            {dict.cta.start} · {dict.cta.payNow}
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium rounded-lg transition"
          >
            {dict.cta.learnMore}
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {locale === 'zh-CN'
            ? '🇺🇸 美国 · 🇬🇧 英国 · 🇸🇬 新加坡 · 🇨🇦 加拿大 · 🇦🇺 澳大利亚 · 🇭🇰 香港 海外华人适用'
            : 'Available for overseas Chinese in US · UK · SG · CA · AU · HK'}
        </p>
      </section>

      {/* 6 类文书卡片 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
          {locale === 'zh-CN' ? '6 类家事法律文书' : '6 Family Legal Documents'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {docs.map((d) => (
            <Link
              key={d.key}
              href={d.href}
              className="group bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md p-6 transition"
            >
              <div className="text-3xl mb-2">{d.icon}</div>
              <div className="font-semibold text-slate-900 group-hover:text-amber-700">
                {dict.doc[d.key]}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {locale === 'zh-CN' ? '立即生成' : 'Generate now'}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 涉外因素说明 */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">
          {locale === 'zh-CN' ? '涉外法律特别约定' : 'Cross-Border Provisions'}
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-5 border border-slate-200">
            <div className="text-2xl mb-2">🌐</div>
            <div className="font-semibold mb-1">{dict.overseas.foreignParty}</div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {locale === 'zh-CN'
                ? '外籍配偶 / 绿卡持有人, 文书附《涉外法律适用法》第 24 条准据法选择'
                : 'Foreign spouse / green card holder, with PRC Law Application Act Art. 24 governing law clause'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-slate-200">
            <div className="text-2xl mb-2">💰</div>
            <div className="font-semibold mb-1">{dict.overseas.foreignAsset}</div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {locale === 'zh-CN'
                ? '境外财产 (房产/股票/股权) 估值 + 报告义务 + 跨境执行提示'
                : 'Overseas assets valuation + reporting + cross-border enforcement'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-slate-200">
            <div className="text-2xl mb-2">🏠</div>
            <div className="font-semibold mb-1">{dict.overseas.foreignResidency}</div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {locale === 'zh-CN'
                ? '海外居住 > 183 天, 文书附跨境执行流程 (海牙 Apostille / 使领馆认证)'
                : 'Overseas residency > 183 days, with Apostille / consular legalization guidance'}
            </p>
          </div>
        </div>
      </section>

      {/* 强制合规告知 */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <GlobalComplianceConsent locale={locale} />
      </section>

      {/* 文书语言 & 支付说明 */}
      <section className="max-w-3xl mx-auto px-4 pb-16 text-center text-xs text-slate-500">
        <p>
          {locale === 'zh-CN'
            ? '本文书语言为简体中文, 适用中华人民共和国法律。境外法律意见请委托当地执业律师。'
            : 'Documents are in Simplified Chinese, governed by PRC law. For foreign legal advice, please consult a local licensed attorney.'}
        </p>
        <p className="mt-2">
          {locale === 'zh-CN'
            ? '支付支持微信扫码 (海外华人可绑定 Visa/Master 信用卡), 商户号主体为中国大陆。'
            : 'Payment via WeChat Pay (overseas Chinese can bind Visa/Master cards). Merchant entity is in mainland China.'}
        </p>
      </section>
    </main>
  );
}
