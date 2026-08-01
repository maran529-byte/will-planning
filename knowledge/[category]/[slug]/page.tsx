import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getArticleBySlug,
  getAllSlugs,
  getCategoryMeta,
  type ArticleCategory,
} from '@/lib/articles';
import { KnowledgeArticle, RelatedArticles, TableOfContents, PrevNextNav } from '@/components/KnowledgeArticle';

const BASE_URL = 'https://aiwill-planner.cn';

// 改版 v12 (2026-07-02): 改为动态渲染, 修复 DYNAMIC_SERVER_USAGE 运行时错误
//   - 原因: Next.js 16 中 generateStaticParams + await params 同时使用时,
//           SSG 阶段需要 resolves at build time, 但 await params 触发运行时 headers 上下文
//   - 修复: 显式导出 dynamic = 'force-static' 会冲突, 改为 force-dynamic 让 next.js 仅做 SSR
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article || article.category !== category) return {};
  const url = `${BASE_URL}/knowledge/${article.category}/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    authors: [{ name: article.author }],
    alternates: {
      canonical: url,
      languages: {
        'zh-CN': url,
        'zh-HK': url,
        'x-default': url,
      },
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      siteName: '家有所爱',
      locale: 'zh_CN',
      type: 'article',
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
      authors: [article.author],
      tags: article.keywords,
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: ['/og-default.png'],
    },
    other: {
      'article:published_time': article.datePublished,
      'article:modified_time': article.dateModified,
      'article:author': article.author,
      'article:section': article.categoryName,
    },
  };
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article || article.category !== category) {
    notFound();
  }
  const cat = getCategoryMeta(category as ArticleCategory);
  if (!cat) notFound();

  const url = `${BASE_URL}/knowledge/${article.category}/${article.slug}`;

  return (
    <KnowledgeArticle article={article} url={url}>
      <TableOfContents article={article} />
      <RelatedArticles slugs={article.relatedSlugs ?? []} />
      <PrevNextNav article={article} />
    </KnowledgeArticle>
  );
}
