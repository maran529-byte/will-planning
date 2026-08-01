import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';
import { StructuredData } from '@/components/StructuredData';
import {
  ARTICLE_CATEGORIES,
  getAllArticles,
} from '@/lib/articles';

const BASE_URL = 'https://aiwill-planner.cn';

const COLOR_BG: Record<string, { bg: string; border: string; text: string; hover: string; tag: string }> = {
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', hover: 'hover:border-rose-400 hover:bg-rose-100', tag: 'bg-rose-100 text-rose-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:border-amber-400 hover:bg-amber-100', tag: 'bg-amber-100 text-amber-700' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', hover: 'hover:border-slate-400 hover:bg-slate-100', tag: 'bg-slate-200 text-slate-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:border-blue-400 hover:bg-blue-100', tag: 'bg-blue-100 text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hover: 'hover:border-emerald-400 hover:bg-emerald-100', tag: 'bg-emerald-100 text-emerald-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:border-purple-400 hover:bg-purple-100', tag: 'bg-purple-100 text-purple-700' },
};

export const metadata: Metadata = {
  title: '知识中心 - 家庭财产规划深度指南',
  description: '家有所爱知识中心: 婚前/婚内/离婚/抚养/赠与/传承 6 大主题深度长文, 1500+ 字, 覆盖《民法典》核心条款 + 实操模板 + 常见误区. 持续更新, 适用中国大陆法律.',
  keywords: [
    '家庭财产规划', '婚姻协议', '婚内财产', '离婚协议', '子女抚养',
    '赠与协议', '财富传承', '民法典', '家庭文书', '知识中心',
  ],
  alternates: { canonical: `${BASE_URL}/knowledge` },
  openGraph: {
    title: '家有所爱知识中心 - 6 大主题家庭法律深度指南',
    description: '婚前/婚内/离婚/抚养/赠与/传承 6 大主题, 1500+ 字长文, 覆盖《民法典》核心条款.',
    url: `${BASE_URL}/knowledge`,
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function KnowledgeIndex() {
  const articles = getAllArticles();
  const featured = articles.slice(0, 3);
  const recent = articles.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* 顶部 nav */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
            <span aria-hidden>←</span>
            <span>返回首页</span>
          </Link>
          <Link href="/doc-type" className="text-sm text-amber-700 hover:text-amber-800 font-medium">
            直接选文书 →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* 标题区 */}
        <header className="text-center mb-10">
          <span className="inline-block bg-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full mb-3 font-medium">
            <span aria-hidden>📚 </span>家有所爱 · 知识中心
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-800 mb-4 leading-tight-cn text-balance">
            家庭财产规划<br />
            <span className="text-amber-600">深度指南库</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn max-w-2xl mx-auto">
            婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 大主题, {articles.length} 篇深度长文.
            覆盖《民法典》核心条款 + 实操模板 + 常见误区, 适用中国大陆法律.
          </p>
        </header>

        {/* 6 大主题分类卡片 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            <span aria-hidden>🗂️ </span>6 大主题
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ARTICLE_CATEGORIES.map((cat) => {
              const c = COLOR_BG[cat.color];
              const count = articles.filter((a) => a.category === cat.slug).length;
              return (
                <Link
                  key={cat.slug}
                  href={`/knowledge/${cat.slug}`}
                  className={`${c.bg} ${c.border} ${c.hover} border-2 rounded-2xl p-6 transition-all duration-200 group block`}
                  aria-label={`进入 ${cat.name} 知识库`}
                >
                  <div className="text-4xl mb-3" aria-hidden>{cat.icon}</div>
                  <h3 className={`text-xl font-bold ${c.text} mb-2 leading-tight-cn`}>
                    {cat.name}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn min-h-[40px]">
                    {cat.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{count} 篇文章</span>
                    <span className={`${c.text} font-medium group-hover:translate-x-1 transition-transform`}>
                      进入 →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 改版 v11 (2026-06-29) 热门问题板块 - 与分类页 FAQ 互引, GEO 友好
            - 抽 8 篇里最高频问题, 让用户「读一篇问一个」 */}
        <section className="mb-12" aria-labelledby="hot-questions-title">
          <h2 id="hot-questions-title" className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            <span aria-hidden>🔥 </span>用户最常问的 8 个问题
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { q: '婚前协议在法律上有效吗?', cat: 'marriage', slug: 'pre-marriage-property-agreement', label: '婚前财产' },
              { q: '再婚家庭如何安排财产避免纠纷?', cat: 'marriage', slug: 'remarriage-family-property-guide', label: '再婚家庭' },
              { q: '离婚协议必须公证才有效吗?', cat: 'divorce', slug: 'divorce-agreement', label: '离婚协议' },
              { q: '婚后买房一定是共同财产吗?', cat: 'property', slug: 'during-marriage-property', label: '婚内财产' },
              { q: '离婚后子女抚养费标准是多少?', cat: 'custody', slug: 'child-custody-agreement', label: '子女抚养' },
              { q: '把房子赠与子女怎么操作最稳妥?', cat: 'gift', slug: 'gift-to-children', label: '赠与协议' },
              { q: '中国有哪 6 种合法遗嘱形式?', cat: 'inheritance', slug: 'inheritance-will-types', label: '财富传承' },
              { q: 'AI 起草和模板下载、找律师区别?', cat: 'inheritance', slug: 'self-vs-template-vs-lawyer', label: '方案对比' },
            ].map((item, i) => (
              <Link
                key={i}
                href={`/knowledge/${item.cat}/${item.slug}`}
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-sm rounded-xl p-4 transition group flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-7 h-7 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-snug-cn group-hover:text-amber-700 transition-colors">
                    {item.q}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{item.label} →</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 最新文章 (置顶 3 篇) */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
              <span aria-hidden>⭐ </span>精选推荐
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {featured.map((a) => {
                const c = COLOR_BG[a.color];
                return (
                  <Link
                    key={a.slug}
                    href={`/knowledge/${a.category}/${a.slug}`}
                    className={`bg-white ${c.border} ${c.hover} border-2 rounded-2xl p-6 transition-all duration-200 group block`}
                  >
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className={`${c.tag} px-2 py-0.5 rounded-full font-medium`}>
                        {a.categoryName}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{a.readingMinutes} 分钟</span>
                    </div>
                    <h3 className={`text-lg font-bold text-slate-800 mb-2 leading-tight-cn group-hover:${c.text} transition-colors line-clamp-2`}>
                      {a.title}
                    </h3>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn line-clamp-3">
                      {a.summary}
                    </p>
                    <div className="text-sm text-amber-600 font-medium group-hover:translate-x-1 transition-transform">
                      阅读全文 →
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 全部文章列表 */}
        {recent.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
              <span aria-hidden>📖 </span>更多文章
            </h2>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100">
              {recent.map((a) => {
                const c = COLOR_BG[a.color];
                return (
                  <Link
                    key={a.slug}
                    href={`/knowledge/${a.category}/${a.slug}`}
                    className="block p-5 hover:bg-slate-50 transition group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 text-xs">
                          <span className={`${c.tag} px-2 py-0.5 rounded-full`}>
                            {a.categoryName}
                          </span>
                          <time dateTime={a.dateModified} className="text-slate-500">
                            {a.dateModified}
                          </time>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{a.readingMinutes} 分钟</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 leading-tight-cn group-hover:text-amber-600 transition-colors">
                          {a.title}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed-cn line-clamp-2">
                          {a.subtitle}
                        </p>
                      </div>
                      <div className="text-amber-600 text-sm font-medium whitespace-nowrap">
                        阅读 →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 中部 CTA */}
        <div className="bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
            看完指南, 现在开始制作?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed-cn">
            选一个最贴近您当前情况的场景, 系统化问卷 10 分钟生成文书草稿. ¥19.9 起.
          </p>
          <Link
            href="/doc-type"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            立即选文书类型 →
          </Link>
        </div>

        {/* 知识中心介绍 (GEO 友好) */}
        <section className="mt-12 bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 leading-tight-cn">
            <span aria-hidden>💡 </span>关于家有所爱知识中心
          </h2>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed-cn">
            <p>
              家有所爱知识中心是中国大陆家庭财产规划领域的<strong>结构化深度内容库</strong>,
              由家有所爱工作室 (上海市, 沪ICP备2026020925号-1) 整理发布.
            </p>
            <p>
              所有内容基于《中华人民共和国民法典》及相关司法解释, 涵盖婚前财产、婚内财产、离婚协议、
              子女抚养、赠与协议、财富传承 6 大主题, 旨在为公众提供<strong>系统化、可信、易读</strong>的家庭法律知识.
            </p>
            <p>
              <strong>内容定位</strong>: 通用法律知识整理, 不构成针对个案的法律意见.
              涉及不动产/大额资产/复杂家庭关系, 建议咨询专业资产规划人员并办理公证.
            </p>
            <p>
              <strong>更新机制</strong>: 文章标注「发布日期」与「最后更新」, 重大法律修订或新司法解释出台时,
              我们会在 30 天内更新相关内容.
            </p>
          </div>
        </section>

        <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed-cn">
          <p>本知识中心为系统化整理, 不构成法律意见. 复杂情况请咨询专业资产规划人员并办理公证.</p>
          <p className="mt-1">沪ICP备2026020925号-1 · 数据存储于中国大陆腾讯云</p>
        </div>
      </main>

      <LegalFooter />

      <StructuredData
        type="breadcrumb"
        data={{
          items: [
            { name: '首页', url: '/' },
            { name: '知识中心', url: '/knowledge' },
          ],
        }}
      />
      <StructuredData
        type="faq"
        data={{
          faqs: [
            {
              q: '家有所爱知识中心提供什么内容?',
              a: '婚前/婚内/离婚/抚养/赠与/传承 6 大主题的深度长文, 覆盖《民法典》核心条款 + 实操模板 + 常见误区.',
            },
            {
              q: '知识中心的内容是否构成法律意见?',
              a: '不构成. 内容为通用法律知识整理, 涉及不动产/大额资产/复杂家庭关系建议咨询专业资产规划人员并办理公证.',
            },
            {
              q: '内容多久更新一次?',
              a: '文章标注发布日期与最后更新. 重大法律修订或新司法解释出台时, 我们会在 30 天内更新相关内容.',
            },
          ],
        }}
      />
    </div>
  );
}
