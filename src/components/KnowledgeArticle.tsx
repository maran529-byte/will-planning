import Link from 'next/link';
import LegalFooter from './LegalFooter';
import { StructuredData } from './StructuredData';
import { Article, getArticleBySlug, getAdjacentArticles } from '@/lib/articles';

const DOC_TYPE_NAMES: Record<string, { name: string; icon: string; color: string }> = {
  marriage: { name: '婚姻协议书', icon: '💑', color: 'bg-rose-500 hover:bg-rose-600' },
  'marital-property': { name: '婚内财产协议', icon: '🏠', color: 'bg-amber-500 hover:bg-amber-600' },
  divorce: { name: '离婚协议书', icon: '📄', color: 'bg-slate-600 hover:bg-slate-700' },
  'child-custody': { name: '子女抚养协议', icon: '👨‍👩‍👧', color: 'bg-blue-500 hover:bg-blue-600' },
  gift: { name: '赠与协议', icon: '🎁', color: 'bg-emerald-500 hover:bg-emerald-600' },
  will: { name: '财富传承规划', icon: '📜', color: 'bg-purple-500 hover:bg-purple-600' },
};

const COLOR_BG: Record<string, { tag: string; link: string }> = {
  rose: { tag: 'bg-rose-100 text-rose-700', link: 'text-rose-700 hover:text-rose-800' },
  amber: { tag: 'bg-amber-100 text-amber-700', link: 'text-amber-700 hover:text-amber-800' },
  slate: { tag: 'bg-slate-200 text-slate-700', link: 'text-slate-700 hover:text-slate-800' },
  blue: { tag: 'bg-blue-100 text-blue-700', link: 'text-blue-700 hover:text-blue-800' },
  emerald: { tag: 'bg-emerald-100 text-emerald-700', link: 'text-emerald-700 hover:text-emerald-800' },
  purple: { tag: 'bg-purple-100 text-purple-700', link: 'text-purple-700 hover:text-purple-800' },
};

export interface KnowledgeArticleProps {
  article: Article;
  /** 全站绝对 URL (用于 Schema) */
  url: string;
  /** 子组件: TOC / RelatedArticles */
  children?: React.ReactNode;
}

export function KnowledgeArticle({ article, url, children }: KnowledgeArticleProps) {
  const cta = DOC_TYPE_NAMES[article.ctaDocType] ?? DOC_TYPE_NAMES.marriage;
  const palette = COLOR_BG[article.color];
  const breadcrumbItems = [
    { name: '首页', url: '/' },
    { name: '知识中心', url: '/knowledge' },
    { name: article.categoryName, url: `/knowledge/${article.category}` },
    { name: article.title, url: `/knowledge/${article.category}/${article.slug}` },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${article.background}`}>
      {/* 顶部 nav + 面包屑 */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <nav aria-label="面包屑" className="text-sm text-slate-500 flex items-center flex-wrap gap-x-1">
            {breadcrumbItems.map((b, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <span className="mx-1 text-slate-400" aria-hidden>/</span>}
                {i < breadcrumbItems.length - 1 ? (
                  <Link href={b.url} className="hover:text-amber-600 transition">
                    {b.name}
                  </Link>
                ) : (
                  <span className="text-slate-700 truncate max-w-[180px] sm:max-w-none">{b.name}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* 标题区 */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
            <Link
              href={`/knowledge/${article.category}`}
              className={`${palette.tag} px-2 py-0.5 rounded-full font-medium`}
            >
              {article.categoryName}
            </Link>
            <span className="text-slate-400">·</span>
            <time dateTime={article.datePublished} className="text-slate-500">
              发布: {article.datePublished}
            </time>
            {article.dateModified !== article.datePublished && (
              <>
                <span className="text-slate-400">·</span>
                <time dateTime={article.dateModified} className="text-slate-500">
                  更新: {article.dateModified}
                </time>
              </>
            )}
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">阅读 {article.readingMinutes} 分钟</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 leading-tight-cn text-balance">
            {article.title}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn">
            {article.subtitle}
          </p>
        </header>

        {/* GEO 友好摘要 (供 LLM 抽取 + 视障读者) */}
        <aside className="mb-6 bg-white/60 border border-slate-200 rounded-lg p-4">
          <h2 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
            <span aria-hidden>📌 </span>本文摘要
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed-cn">{article.summary}</p>
        </aside>

        {/* 子组件区: TOC + RelatedArticles */}
        {children}

        {/* 正文 (渲染 article.sections) */}
        <article className="prose prose-slate max-w-none text-slate-700 leading-relaxed-cn space-y-6 mt-8">
          {article.sections.map((sec) => (
            <section key={sec.id} id={sec.id} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-800 mb-3 leading-tight-cn">
                {sec.heading}
              </h2>
              <div dangerouslySetInnerHTML={{ __html: sec.body }} />
            </section>
          ))}

          {/* 文末 FAQ */}
          {article.faqs.length > 0 && (
            <section id="faq" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 leading-tight-cn">
                <span aria-hidden>❓ </span>常见问题
              </h2>
              <div className="not-prose space-y-4">
                {article.faqs.map((f, i) => (
                  <details key={i} className="bg-white rounded-lg p-5 shadow-sm group">
                    <summary className="font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between">
                      <span>{f.q}</span>
                      <span
                        className="text-slate-400 group-open:rotate-180 transition-transform"
                        aria-hidden
                      >▾</span>
                    </summary>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed-cn">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* 文末 CTA */}
        <div className="mt-12 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden>{cta.icon}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
            {article.ctaTitle ?? `现在, 10 分钟生成您的${cta.name}`}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed-cn">
            {article.ctaDescription ?? '系统化问卷, 智能生成符合《民法典》的文书草稿. ¥19.9 起, 资产规划专业人士可 1 对 1 审核.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={`/doc-type?type=${article.ctaDocType}&plan=ai`}
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

        {/* 内容来源与审阅 (改版 v10, GEO E-E-A-T 改造) */}
        {(article.sourceCitations?.length || article.reviewedBy) && (
          <aside
            className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6"
            aria-label="内容来源与审阅"
          >
            <h3 className="text-sm font-bold text-slate-700 mb-3 leading-tight-cn flex items-center gap-2">
              <span aria-hidden>📚 </span>内容来源与审阅
            </h3>
            {article.reviewedBy && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed-cn mb-3">
                <strong className="text-slate-800">审阅:</strong> {article.reviewedBy}
              </p>
            )}
            {article.sourceCitations && article.sourceCitations.length > 0 && (
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed-cn">
                <strong className="text-slate-800">法条依据:</strong>
                <ul className="mt-1.5 space-y-1 list-disc list-inside marker:text-amber-500">
                  {article.sourceCitations.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed-cn">
              以上内容由家有所爱工作室编辑并经专业人士通读, 仅作系统化整理, 不构成个案法律意见. 复杂情况建议咨询持牌律师.
            </p>
          </aside>
        )}

        {/* 备案 / 友情提示 */}
        <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed-cn">
          <p>本指南为系统化整理, 不构成法律意见. 复杂情况请咨询专业资产规划人员并办理公证.</p>
          <p className="mt-1">沪ICP备2026020925号-1 · 数据存储于中国大陆腾讯云</p>
        </div>
      </main>

      <LegalFooter />

      {/* SEO / GEO: Article + Breadcrumb + FAQ Schema 三件套 */}
      <StructuredData
        type="article"
        data={{
          headline: article.title,
          description: article.subtitle,
          url,
          datePublished: article.datePublished,
          dateModified: article.dateModified,
          author: article.author,
          reviewedBy: article.reviewedBy,
          sourceCitations: article.sourceCitations,
          category: article.categoryName,
          keywords: article.keywords.join(', '),
        }}
      />
      <StructuredData
        type="breadcrumb"
        data={{
          items: breadcrumbItems.map((b) => ({ name: b.name, url: b.url })),
        }}
      />
      {article.faqs.length > 0 && (
        <StructuredData
          type="faq"
          data={{ faqs: article.faqs }}
        />
      )}
      {/* 改版 v12 (2026-07-08, FIX-021): SpeakableSpecification
          长文页的"摘要节点"指向 aside.summary (GEO 友好摘要) 而非正文首段
          - 让 LLM 抽取摘要时优先拿到本文的 50-200 字 summary
          - 避免误抽取正文中的小标题或装饰段 */}
      <StructuredData
        type="speakable"
        data={{
          xpath: [
            '/html/head/title',
            '/html/body//h1',
            '/html/body//aside[contains(@class,"summary")]//p[1]',
          ],
        }}
      />
    </div>
  );
}

export function RelatedArticles({ slugs }: { slugs: string[] }) {
  const related = slugs
    .map((s) => getArticleBySlug(s))
    .filter((a): a is Article => Boolean(a))
    .slice(0, 3);
  if (related.length === 0) return null;

  return (
    <section className="mt-10 not-prose">
      <h2 className="text-lg font-bold text-slate-800 mb-4 leading-tight-cn">
        <span aria-hidden>📚 </span>相关阅读
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {related.map((r) => {
          const palette = COLOR_BG[r.color];
          return (
            <Link
              key={r.slug}
              href={`/knowledge/${r.category}/${r.slug}`}
              className="block bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-lg p-4 transition group"
            >
              <span className={`${palette.tag} text-xs px-2 py-0.5 rounded-full inline-block mb-2`}>
                {r.categoryName}
              </span>
              <h3 className={`text-sm font-semibold ${palette.link} leading-tight-cn group-hover:underline line-clamp-2`}>
                {r.title}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function TableOfContents({ article }: { article: Article }) {
  if (article.sections.length < 2) return null;
  return (
    <nav aria-label="文章目录" className="mb-6 not-prose">
      <details className="bg-white/60 border border-slate-200 rounded-lg" open>
        <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-slate-700 list-none flex items-center justify-between">
          <span><span aria-hidden>📑 </span>本文目录 ({article.sections.length} 节)</span>
          <span className="text-slate-400" aria-hidden>▾</span>
        </summary>
        <ol className="px-4 pb-3 space-y-1 text-sm">
          {article.sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-slate-600 hover:text-amber-600 transition block py-1"
              >
                {i + 1}. {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}

/**
 * 改版 v11 (2026-06-29, GEO): 同分类内「上文 / 下文」横向导航
 * - 鼓励用户顺着主题深读更多文章, 降低跳出率
 * - 已是首/末篇时, 对应位置显示「已是最新」占位
 */
export function PrevNextNav({ article }: { article: Article }) {
  const { prev, next } = getAdjacentArticles(article.slug);
  if (!prev && !next) return null;
  return (
    <nav
      aria-label="同主题上一篇下一篇"
      className="mt-10 not-prose grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {prev ? (
        <Link
          href={`/knowledge/${prev.category}/${prev.slug}`}
          className="group bg-white border border-slate-200 hover:border-amber-400 hover:shadow-sm rounded-xl p-4 transition"
        >
          <p className="text-xs text-slate-500 mb-1">
            <span aria-hidden>←</span> 上一篇 · {prev.categoryName}
          </p>
          <p className="text-sm font-semibold text-slate-800 leading-tight-cn group-hover:text-amber-700 transition-colors line-clamp-2">
            {prev.title}
          </p>
        </Link>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400">已是该主题最新文章 ↑</p>
        </div>
      )}
      {next ? (
        <Link
          href={`/knowledge/${next.category}/${next.slug}`}
          className="group bg-white border border-slate-200 hover:border-amber-400 hover:shadow-sm rounded-xl p-4 transition text-right"
        >
          <p className="text-xs text-slate-500 mb-1">
            下一篇 · {next.categoryName} <span aria-hidden>→</span>
          </p>
          <p className="text-sm font-semibold text-slate-800 leading-tight-cn group-hover:text-amber-700 transition-colors line-clamp-2">
            {next.title}
          </p>
        </Link>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400">已是该主题最早文章 ↓</p>
        </div>
      )}
    </nav>
  );
}
