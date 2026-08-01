import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import {
  getArticleBySlug,
  getAllArticles,
  getCategoryMeta,
  type ArticleCategory,
} from '@/lib/articles';
import { KnowledgeArticle, RelatedArticles, TableOfContents, PrevNextNav } from '@/components/KnowledgeArticle';

const BASE_URL = 'https://aiwill-planner.cn';

// 改版 v10 (2026-07-30, SEO 重复内容治理):
//   老 slug (pre-marriage-property-agreement / divorce-agreement /
//   inheritance-will-types / during-marriage-property / gift-to-children /
//   child-custody-agreement) 与新 slug (prenup-how-to-write /
//   divorce-agreement-how-to-write / inheritance-order-and-ratio 等)
//   主题重叠, 同时 200 会导致 SEO 权重分散.
//   老 slug 访问时 301 重定向到新 slug, 集中权重, 避免重复内容被百度降权.
const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  'pre-marriage-property-agreement': 'prenup-how-to-write',
  'divorce-agreement': 'divorce-agreement-how-to-write',
  'inheritance-will-types': 'inheritance-order-and-ratio',
  'during-marriage-property': 'joint-vs-personal-property-2026',
  'gift-to-children': 'parents-gift-to-married-children',
  'child-custody-agreement': 'child-support-2026-calculator',
  'self-vs-template-vs-lawyer': 'prenup-how-to-write',
  'remarriage-family-property-guide': 'foreign-marriage-2026-guide',
};

export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ category: a.category, slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getArticleBySlug(decodeURIComponent(slug));
  if (!article || article.category !== category) return {};
  const url = `${BASE_URL}/knowledge/${article.category}/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    authors: [{ name: article.author }],
    alternates: { canonical: url },
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
  const decoded = decodeURIComponent(slug);

  // 老 slug → 301 重定向到新 slug (避免 SEO 重复内容)
  const legacyTarget = LEGACY_SLUG_REDIRECTS[decoded];
  if (legacyTarget) {
    const targetArticle = getArticleBySlug(legacyTarget);
    if (targetArticle) {
      redirect(`${BASE_URL}/knowledge/${targetArticle.category}/${targetArticle.slug}`);
    }
  }

  const article = getArticleBySlug(decoded);
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
