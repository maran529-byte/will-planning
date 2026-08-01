import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LegalFooter from '@/components/LegalFooter';
import { StructuredData } from '@/components/StructuredData';
import {
  ARTICLE_CATEGORIES,
  getArticlesByCategory,
  getCategoryMeta,
  getAllCategorySlugs,
  type ArticleCategory,
} from '@/lib/articles';

const BASE_URL = 'https://aiwill-planner.cn';

// 改版 v12 (2026-07-02): 与 [slug] 同步, 改为动态渲染
export const dynamic = 'force-dynamic';

const COLOR_BG: Record<string, { bg: string; border: string; text: string; hover: string; tag: string }> = {
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', hover: 'hover:border-rose-400 hover:bg-rose-100', tag: 'bg-rose-100 text-rose-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:border-amber-400 hover:bg-amber-100', tag: 'bg-amber-100 text-amber-700' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', hover: 'hover:border-slate-400 hover:bg-slate-100', tag: 'bg-slate-200 text-slate-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:border-blue-400 hover:bg-blue-100', tag: 'bg-blue-100 text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hover: 'hover:border-emerald-400 hover:bg-emerald-100', tag: 'bg-emerald-100 text-emerald-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:border-purple-400 hover:bg-purple-100', tag: 'bg-purple-100 text-purple-700' },
};

export async function generateStaticParams() {
  return getAllCategorySlugs().map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategoryMeta(category as ArticleCategory);
  if (!cat) return {};
  const url = `${BASE_URL}/knowledge/${cat.slug}`;
  return {
    title: `${cat.name}知识库 - 完整指南与实操解读`,
    description: `${cat.description}. 家有所爱知识中心, 覆盖《民法典》核心条款 + 实操模板 + 常见误区.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${cat.name}知识库 | 家有所爱`,
      description: cat.description,
      url,
      siteName: '家有所爱',
      locale: 'zh_CN',
      type: 'website',
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategoryMeta(category as ArticleCategory);
  if (!cat) notFound();
  const articles = getArticlesByCategory(cat.slug);
  const c = COLOR_BG[cat.color];
  const breadcrumbItems = [
    { name: '首页', url: '/' },
    { name: '知识中心', url: '/knowledge' },
    { name: cat.name, url: `/knowledge/${cat.slug}` },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${c.bg} via-white to-slate-50`}>
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/knowledge" className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
            <span aria-hidden>←</span>
            <span>返回知识中心</span>
          </Link>
          <Link href={`/doc-type?type=${cat.docType}`} className="text-sm text-amber-700 hover:text-amber-800 font-medium">
            直接生成{cat.name}文书 →
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <nav aria-label="面包屑" className="text-sm text-slate-500 mb-6 flex items-center flex-wrap gap-x-1">
          {breadcrumbItems.map((b, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="mx-1 text-slate-400" aria-hidden>/</span>}
              {i < breadcrumbItems.length - 1 ? (
                <Link href={b.url} className="hover:text-amber-600 transition">{b.name}</Link>
              ) : (
                <span className="text-slate-700">{b.name}</span>
              )}
            </span>
          ))}
        </nav>

        <header className="mb-10 text-center">
          <div className="text-5xl mb-3" aria-hidden>{cat.icon}</div>
          <h1 className={`text-3xl sm:text-4xl font-bold ${c.text} mb-3 leading-tight-cn text-balance`}>
            {cat.name}知识库
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn max-w-2xl mx-auto">
            {cat.description}
          </p>
          <p className="text-xs text-slate-500 mt-3">
            {articles.length} 篇深度文章 · 适用中国大陆法律 · 持续更新
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/knowledge/${a.category}/${a.slug}`}
              className={`bg-white ${c.border} ${c.hover} border-2 rounded-2xl p-6 transition-all duration-200 group block`}
            >
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className={`${c.tag} px-2 py-0.5 rounded-full`}>
                  {a.dateModified} 更新
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{a.readingMinutes} 分钟阅读</span>
              </div>
              <h2 className={`text-xl font-bold ${c.text} mb-2 leading-tight-cn group-hover:underline`}>
                {a.title}
              </h2>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn line-clamp-2">
                {a.subtitle}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {a.keywords.slice(0, 4).map((kw) => (
                  <span key={kw} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {kw}
                  </span>
                ))}
              </div>
              <div className={`text-sm ${c.text} font-medium group-hover:translate-x-1 transition-transform`}>
                阅读全文 →
              </div>
            </Link>
          ))}
        </div>

        {/* 跨分类导航 */}
        <section className="mt-12 bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 leading-tight-cn">
            <span aria-hidden>📚 </span>其他主题
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ARTICLE_CATEGORIES.filter((cc) => cc.slug !== cat.slug).map((cc) => {
              const cc2 = COLOR_BG[cc.color];
              return (
                <Link
                  key={cc.slug}
                  href={`/knowledge/${cc.slug}`}
                  className={`${cc2.bg} ${cc2.border} ${cc2.hover} border rounded-lg p-3 text-center transition group`}
                >
                  <div className="text-2xl mb-1" aria-hidden>{cc.icon}</div>
                  <div className={`text-sm font-medium ${cc2.text}`}>{cc.name}</div>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed-cn">
          <p>本知识库为系统化整理, 不构成法律意见. 复杂情况请咨询专业资产规划人员并办理公证.</p>
          <p className="mt-1">沪ICP备2026020925号-1 · 数据存储于中国大陆腾讯云</p>
        </div>
      </main>

      <LegalFooter />

      <StructuredData
        type="breadcrumb"
        data={{ items: breadcrumbItems }}
      />
      <StructuredData
        type="faq"
        data={{
          faqs: [
            {
              q: `${cat.name}相关文书需要多少钱?`,
              a: `家有所爱${cat.name}文书智能版 ¥19.9 起, 系统化问卷 10 分钟生成草稿. 专家护航版 ¥999 含 1 对 1 视频审核.`,
            },
            {
              q: `${cat.name}文书有法律效力吗?`,
              a: '本平台提供的文书为「参考模板」, 经双方签字 (或公证) 后具备法律效力. 涉及不动产/大额资产建议办理公证.',
            },
          ],
        }}
      />
    </div>
  );
}
