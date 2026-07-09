/**
 * articles-server.ts
 *
 * 改版 v3 (2026-07-09): 服务端适配层
 * 将 src/lib/articles.ts 暴露给 server components (RSC).
 */

import { getArticlesByCategory } from './articles';

export interface CategoryArticle {
  slug: string;
  title: string;
  summary?: string;
  dateModified?: string;
}

export async function getCategoryArticles(category: string): Promise<CategoryArticle[]> {
  try {
    const list = getArticlesByCategory(category as any);
    return list.map((a) => ({
      slug: a.slug,
      title: a.title,
      summary: (a as any).summary || (a as any).description,
      dateModified: a.dateModified,
    }));
  } catch {
    return [];
  }
}