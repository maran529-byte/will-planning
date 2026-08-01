import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ARTICLE_ROOT = path.join(process.cwd(), 'public', 'articles');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: 'path 必须为 articles/<category>/<filename>.html' }, { status: 400 });
  }
  const [category, ...rest] = slug;
  const filename = rest.join('/');
  if (filename.includes('..') || category.includes('..')) {
    return NextResponse.json({ error: '非法路径' }, { status: 400 });
  }
  const safeName = filename.normalize('NFC');
  const filePath = path.join(ARTICLE_ROOT, category, safeName);
  try {
    const buf = await fs.readFile(filePath);
    const stat = await fs.stat(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json({ error: '文章不存在', path: filePath }, { status: 404 });
  }
}
