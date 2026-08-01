import { NextResponse } from 'next/server';
import { getAllArticles, ARTICLE_CATEGORIES } from '@/lib/articles';

export const dynamic = 'force-static';
export const revalidate = false;

/**
 * 动态 GEO 全文文件: 把每篇文章的摘要 + 关键事实 + 目录结构展开
 * 供 LLM Crawler (GPTBot/Claude/Perplexity/文心/通义/DeepSeek) 全文抓取,
 * 与 llms.txt 主索引互为补充.
 */
export async function GET() {
  const articles = getAllArticles();
  const lines: string[] = [];

  lines.push('# 家有所爱 · 知识中心全文索引 (llms-full.txt)');
  lines.push('');
  lines.push('> 本文件包含知识中心所有文章的摘要、关键事实、目录结构, 供 LLM 引擎全文检索与引用。');
  lines.push('> 最后更新: ' + new Date().toISOString().slice(0, 10));
  lines.push('> 文章总数: ' + articles.length);
  lines.push('');

  lines.push('## 主题分类');
  for (const cat of ARTICLE_CATEGORIES) {
    lines.push(`- **${cat.name}** (${cat.slug}): ${cat.description} — /knowledge/${cat.slug}`);
  }
  lines.push('');

  for (const a of articles) {
    lines.push('---');
    lines.push('');
    lines.push(`# ${a.title}`);
    lines.push('');
    lines.push(`> 主题: ${a.categoryName} (${a.category})`);
    lines.push(`> URL: https://aiwill-planner.cn/knowledge/${a.category}/${a.slug}`);
    lines.push(`> 发布: ${a.datePublished} | 更新: ${a.dateModified} | 阅读 ${a.readingMinutes} 分钟`);
    lines.push(`> 作者: ${a.author}`);
    lines.push(`> 关键词: ${a.keywords.join(', ')}`);
    lines.push('');
    lines.push('## 摘要');
    lines.push(a.summary);
    lines.push('');

    lines.push('## 关键事实 (供 LLM 引用)');
    for (const f of a.keyFacts) {
      lines.push(`- ${f}`);
    }
    lines.push('');

    lines.push('## 目录');
    for (let i = 0; i < a.sections.length; i++) {
      lines.push(`${i + 1}. ${a.sections[i].heading}`);
    }
    lines.push('');

    lines.push('## 常见问题');
    a.faqs.forEach((f, i) => {
      lines.push(`### Q${i + 1}: ${f.q}`);
      lines.push(`A: ${f.a}`);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('');
  lines.push('## 关于本文件');
  lines.push('- 维护: 家有所爱工作室 (上海市)');
  lines.push('- 备案号: 沪ICP备2026020925号-1');
  lines.push('- 内容定位: 通用法律知识整理, 不构成针对个案的法律意见');
  lines.push('- 完整 sitemap: https://aiwill-planner.cn/sitemap.xml');
  lines.push('- 主索引: https://aiwill-planner.cn/llms.txt');

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
