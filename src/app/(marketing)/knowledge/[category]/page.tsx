import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StructuredData } from '@/components/StructuredData';
import { getCategoryArticles } from '@/lib/articles-server';

/**
 * /knowledge/[category] - 知识中心分类列表页
 *
 * 改版 v3 (2026-07-09): P1-6 修复 (闭环任务 FIX-038)
 * 6 个分类: marriage / property / divorce / custody / gift / inheritance
 *
 * SEO: 自动生成该分类下所有文章的目录 + BreadcrumbList + CollectionPage schema
 */

const CATEGORY_META: Record<string, { name: string; description: string; emoji: string }> = {
  marriage: {
    name: '婚前财产',
    description: '婚前 / 再婚财产清晰化, 让婚姻从坦诚开始',
    emoji: '💍',
  },
  property: {
    name: '婚内财产',
    description: '已婚中产家庭财产规划, 感情稳固的定心丸',
    emoji: '🏠',
  },
  divorce: {
    name: '离婚协议',
    description: '财产分割 / 子女抚养 / 债务安排一站写清',
    emoji: '⚖️',
  },
  custody: {
    name: '子女抚养',
    description: '抚养权 / 抚养费 / 探视权的法律保障',
    emoji: '👶',
  },
  gift: {
    name: '赠与协议',
    description: '父母赠与 / 夫妻赠与 / 股权 / 房产安全过户',
    emoji: '🎁',
  },
  inheritance: {
    name: '财富传承',
    description: '遗嘱 / 信托 / 家族办公室, 让爱与财富安心传承',
    emoji: '🌳',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) return { title: '分类不存在' };

  return {
    title: `${meta.name}知识库`,
    description: meta.description,
    alternates: {
      canonical: `https://aiwill-planner.cn/knowledge/${category}`,
    },
    openGraph: {
      title: `${meta.name} · 家有所爱知识库`,
      description: meta.description,
      url: `https://aiwill-planner.cn/knowledge/${category}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(CATEGORY_META).map((category) => ({ category }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) notFound();

  const articles = await getCategoryArticles(category);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/knowledge"
            className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition"
          >
            <span aria-hidden>←</span>
            <span>知识中心</span>
          </Link>
          <h2 className="text-sm text-slate-500">分类</h2>
          <div className="w-20" aria-hidden />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3" aria-hidden>{meta.emoji}</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
            {meta.name}
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
            {meta.description}
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-slate-500 mb-6">该分类下暂无文章</p>
            <Link
              href="/knowledge"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              返回知识中心
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/knowledge/${category}/${a.slug}`}
                className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 hover:border-amber-300 hover:shadow-md transition"
              >
                <h2 className="text-lg font-bold text-slate-800 mb-2 leading-tight-cn">
                  {a.title}
                </h2>
                {a.summary && (
                  <p className="text-sm text-slate-600 leading-relaxed-cn">
                    {a.summary}
                  </p>
                )}
                <p className="text-xs text-amber-600 mt-3">阅读全文 →</p>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/doc-type"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-3 rounded-2xl transition"
          >
            {meta.emoji} 生成{meta.name}文书
          </Link>
        </div>
      </main>

      <StructuredData
        type="breadcrumb"
        data={{
          items: [
            { name: '首页', url: '/' },
            { name: '知识中心', url: '/knowledge' },
            { name: meta.name, url: `/knowledge/${category}` },
          ],
        }}
      />
    </div>
  );
}
