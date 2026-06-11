import Link from 'next/link';
import LegalFooter from './LegalFooter';

/**
 * 通用长文 SEO 内容页骨架 (/guide/*)
 *
 * 设计目标:
 *  - 信息型长文, 1500+ 中文字, 覆盖场景痛点 + 解决方案 + 内链到产品页
 *  - 自动 OG / canonical / 面包屑导航 + 文末 CTA
 *
 * 用法:
 *   <GuideArticle
 *     title="..."
 *     subtitle="..."
 *     background="from-rose-50 to-white"
 *     breadcrumbs={[{name: '首页', url: '/'}, {name: '婚前指南'}]}
 *     ctaDocType="marriage"
 *   >
 *     ...长文内容 (JSX)...
 *   </GuideArticle>
 */
export interface GuideArticleProps {
  /** H1 主标题 */
  title: string;
  /** 副标题/导语 */
  subtitle: string;
  /** 渐变背景色 (Tailwind 类) */
  background?: string;
  /** 面包屑 (最后一个是当前页) */
  breadcrumbs: Array<{ name: string; url?: string }>;
  /** 文末 CTA 跳转的文书类型 (与 document-types.ts 的 id 对应) */
  ctaDocType: string;
  /** CTA 文案 */
  ctaTitle?: string;
  ctaDescription?: string;
  children: React.ReactNode;
}

const DOC_TYPE_NAMES: Record<string, { name: string; icon: string; color: string }> = {
  marriage: { name: '婚姻协议书', icon: '💑', color: 'bg-rose-500 hover:bg-rose-600' },
  'marital-property': { name: '婚内财产协议', icon: '🏠', color: 'bg-amber-500 hover:bg-amber-600' },
  divorce: { name: '离婚协议书', icon: '📄', color: 'bg-slate-600 hover:bg-slate-700' },
  'child-custody': { name: '子女抚养协议', icon: '👨‍👩‍👧', color: 'bg-blue-500 hover:bg-blue-600' },
  gift: { name: '赠与协议', icon: '🎁', color: 'bg-emerald-500 hover:bg-emerald-600' },
  will: { name: '财富传承规划', icon: '📜', color: 'bg-purple-500 hover:bg-purple-600' },
};

export function GuideArticle({
  title,
  subtitle,
  background = 'from-amber-50 via-white to-slate-50',
  breadcrumbs,
  ctaDocType,
  ctaTitle,
  ctaDescription,
  children,
}: GuideArticleProps) {
  const cta = DOC_TYPE_NAMES[ctaDocType] ?? DOC_TYPE_NAMES.marriage;
  return (
    <div className={`min-h-screen bg-gradient-to-b ${background}`}>
      {/* 顶部: 面包屑 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <nav aria-label="面包屑" className="text-sm text-slate-500 flex items-center flex-wrap gap-x-1">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <span className="mx-1 text-slate-400" aria-hidden>/</span>}
                {b.url ? (
                  <Link href={b.url} className="hover:text-amber-600 transition">
                    {b.name}
                  </Link>
                ) : (
                  <span className="text-slate-700">{b.name}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* 标题区 */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 leading-tight-cn text-balance">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn">
            {subtitle}
          </p>
        </header>

        {/* 正文 */}
        <article className="prose prose-slate max-w-none text-slate-700 leading-relaxed-cn space-y-6">
          {children}
        </article>

        {/* 文末 CTA */}
        <div className="mt-12 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden>{cta.icon}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
            {ctaTitle ?? `现在, 10 分钟生成您的${cta.name}`}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed-cn">
            {ctaDescription ?? '系统化问卷, 智能生成符合《民法典》的文书草稿. ¥19.9 起, 资产规划专业人士可 1 对 1 审核.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={`/doc-type?type=${ctaDocType}`}
              className={`inline-block ${cta.color} text-white px-6 py-3 rounded-lg font-medium transition`}
            >
              开始制作{cta.name} →
            </Link>
            <Link
              href="/doc-type"
              className="inline-block bg-white border border-slate-300 hover:border-slate-400 text-slate-700 px-6 py-3 rounded-lg font-medium transition"
            >
              查看全部 6 类文书
            </Link>
          </div>
        </div>

        {/* 备案 / 友情提示 */}
        <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed-cn">
          <p>本指南为系统化整理, 不构成法律意见. 复杂情况请咨询专业资产规划人员并办理公证.</p>
          <p className="mt-1">沪ICP备2026020925号-1 · 数据存储于中国大陆腾讯云</p>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
