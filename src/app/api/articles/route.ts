/**
 * 列出已发布到 public/articles 的热点文章
 * GET /api/articles?category=divorce&limit=10
 *
 * 改版 v15 (2026-06-30):
 *   - GEO 改造: 社交媒体下线, 文章统一托管在 public/articles/{category}/{slug}.html
 *   - 此接口给 /guide/{category} 页面提供「最新热点文章」侧栏
 *   - 数据源: public/articles/manifest.json (发布脚本同步时写入)
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ARTICLE_BASE = path.join(process.cwd(), 'public', 'articles');
const MANIFEST = path.join(ARTICLE_BASE, 'manifest.json');

interface Manifest {
  [category: string]: string[];
}

export async function GET(request: NextRequest) {
  try {
    const raw = await fs.readFile(MANIFEST, 'utf-8');
    const manifest = JSON.parse(raw) as Manifest;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    const articles: { category: string; slug: string; title: string; url: string }[] = [];

    const categories = category ? [category] : Object.keys(manifest);
    for (const cat of categories) {
      const files = manifest[cat] || [];
      for (const filename of files) {
        // 从文件名推断标题 (去掉 .html, 把 - 替换成空格)
        const title = filename
          .replace(/\.html$/, '')
          .replace(/^[a-z]+-/i, '')  // 去掉 'asian-', 'movie-' 等英文前缀
          .replace(/---[^-]*$/, '')   // 去掉 '---邢台网' 等来源后缀
          .replace(/-/g, ' ')
          .slice(0, 80);

        const slug = encodeURIComponent(filename.replace(/\.html$/, ''));
        articles.push({
          category: cat,
          slug,
          title,
          url: `/articles/${cat}/${filename}`,
        });
      }
    }

    return NextResponse.json({
      count: articles.length,
      articles: articles.slice(0, limit),
    });
  } catch (e) {
    return NextResponse.json(
      { code: 'MANIFEST_NOT_FOUND', error: '文章清单尚未生成' },
      { status: 503 }
    );
  }
}
