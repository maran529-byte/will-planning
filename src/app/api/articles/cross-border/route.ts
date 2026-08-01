/**
 * 跨境 GEO 文章专用 API (W2.2)
 *
 * GET /api/articles/cross-border?doc_type=prenup&limit=10
 *
 * 返回 50 篇海外华人长尾 GEO 文章的真实标题 + 关键词
 * 数据源: /public/articles/cross-border/_articles_meta.json (由 cross_border_generator.py 生成)
 *
 * 设计原因:
 *   - /api/articles 用文件名推断标题 (regex), 不适合 cb01 这种纯 ID 文件名
 *   - 本接口直接读 _articles_meta.json, 提供真实标题 + 关键词
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const META_FILE = path.join(
  process.cwd(),
  'public',
  'articles',
  'cross-border',
  '_articles_meta.json'
);

interface ArticleMeta {
  id: string;
  title: string;
  doc_type: string;
  keywords: string[];
  url: string;
}

interface MetaFile {
  generated_at: string;
  doc_type_labels: Record<string, string>;
  articles: ArticleMeta[];
}

export async function GET(request: NextRequest) {
  try {
    const raw = await fs.readFile(META_FILE, 'utf-8');
    const meta = JSON.parse(raw) as MetaFile;

    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('doc_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    let articles = meta.articles;
    if (docType) {
      articles = articles.filter((a) => a.doc_type === docType);
    }

    return NextResponse.json({
      count: articles.length,
      total: meta.articles.length,
      by_doc_type: meta.articles.reduce((acc: Record<string, number>, a) => {
        acc[a.doc_type] = (acc[a.doc_type] || 0) + 1;
        return acc;
      }, {}),
      doc_type_labels: meta.doc_type_labels,
      articles: articles.slice(0, limit).map((a) => ({
        id: a.id,
        title: a.title,
        doc_type: a.doc_type,
        doc_type_label: meta.doc_type_labels[a.doc_type] || a.doc_type,
        keywords: a.keywords,
        url: `/articles/cross-border/${a.id}.html`,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { code: 'META_NOT_FOUND', error: '跨境文章清单尚未生成' },
      { status: 503 }
    );
  }
}
