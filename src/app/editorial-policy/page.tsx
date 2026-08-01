/**
 * /editorial-policy - 编辑政策页
 *
 * 改版 v1 (2026-07-03): 把 content/editorial-policy.txt 渲染为 Web 页
 *  - 服务端读 .txt 文件, 走 Next.js 16 App Router fs/promises
 *  - 不引入额外 markdown 库, 纯段落渲染 (此文件结构简单, ## 标题 + 列表)
 *  - 路由对外暴露, 同时:
 *    · /editorial-policy       → 渲染后的 Web 页 (人读)
 *    · /editorial-policy.txt   → 原文 (爬虫读) — 走 public/editorial-policy.txt
 *
 * 源文件: /Users/maran/aiwill-planner/content/editorial-policy.txt
 * 部署时: 通过同步脚本拷到 /var/www/aiwill-planner/public/editorial-policy.txt
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';

const POLICY_PATH = path.join(process.cwd(), 'content', 'editorial-policy.txt');

export const metadata: Metadata = {
  title: '编辑政策',
  description:
    '家有所爱编辑政策: 准确性优先, 客观中立, 专业人士通读, 30 天内响应法条变更。',
  alternates: {
    canonical: 'https://aiwill-planner.cn/editorial-policy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface PolicySection {
  /** 渲染后的 HTML 字符串 (含 h2 / ul / ol / p / strong 标签) */
  html: string;
}

async function loadPolicy(): Promise<string> {
  try {
    const raw = await fs.readFile(POLICY_PATH, 'utf-8');
    return raw;
  } catch (err) {
    return `# 编辑政策加载失败\n\n文件路径: ${POLICY_PATH}\n\n错误: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * 把 Markdown-lite 文本 (只支持 ## 一级标题 / 列表 / 段落 / 加粗) 转成 HTML
 *  - 严格白名单标签, 防止 XSS
 *  - 不引入 marked / remark, 减少依赖
 */
function renderPolicy(raw: string): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  for (const line of lines) {
    const t = line.trim();

    // 空行
    if (!t) {
      closeLists();
      continue;
    }

    // 引用块 (>)
    if (t.startsWith('> ')) {
      closeLists();
      const inner = escape(t.slice(2));
      out.push(`<blockquote class="border-l-4 border-slate-300 pl-4 my-4 text-slate-600 italic">${inner}</blockquote>`);
      continue;
    }

    // 二级标题 (## )
    if (t.startsWith('## ')) {
      closeLists();
      const inner = escape(t.slice(3));
      out.push(`<h2 class="text-2xl font-bold text-slate-800 mt-8 mb-4 leading-tight-cn">${inner}</h2>`);
      continue;
    }

    // 三级标题 (### )
    if (t.startsWith('### ')) {
      closeLists();
      const inner = escape(t.slice(4));
      out.push(`<h3 class="text-lg font-semibold text-slate-700 mt-6 mb-2 leading-tight-cn">${inner}</h3>`);
      continue;
    }

    // 无序列表 (- 或 *)
    if (/^[-*]\s+/.test(t)) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul class="list-disc pl-6 my-3 space-y-1 text-slate-700">');
        inUl = true;
      }
      const inner = escape(t.replace(/^[-*]\s+/, ''));
      out.push(`<li class="leading-relaxed-cn">${inner}</li>`);
      continue;
    }

    // 有序列表 (1. 2. 3.)
    if (/^\d+\.\s+/.test(t)) {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol class="list-decimal pl-6 my-3 space-y-1 text-slate-700">');
        inOl = true;
      }
      const inner = escape(t.replace(/^\d+\.\s+/, ''));
      out.push(`<li class="leading-relaxed-cn">${inner}</li>`);
      continue;
    }

    // 表格行 (| ... | ... |) - 极简处理
    if (t.startsWith('|') && t.endsWith('|')) {
      closeLists();
      const cells = t.slice(1, -1).split('|').map((c) => c.trim());
      const cellHtml = cells
        .map((c) => `<td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">${escape(c)}</td>`)
        .join('');
      out.push(`<tr>${cellHtml}</tr>`);
      continue;
    }

    // 表格分隔行 (| --- | --- |) - 跳过
    if (/^\|[\s-:|]+\|$/.test(t)) continue;

    // 段落
    closeLists();
    const inner = escape(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out.push(`<p class="my-3 text-slate-700 leading-relaxed-cn">${inner}</p>`);
  }

  closeLists();
  return out.join('\n');
}

export default async function EditorialPolicyPage() {
  const raw = await loadPolicy();
  const html = renderPolicy(raw);

  return (
    <div className="min-h-screen bg-slate-50">
      <article className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-8">
          <span className="inline-block bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full mb-3 font-medium">
            <span aria-hidden>📋 </span>编辑政策
          </span>
          <h1 className="text-3xl font-bold text-slate-800 mb-3 leading-tight-cn">
            家有所爱 · 编辑政策
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed-cn">
            适用范围: 知识中心 / 幸福指南 / 文书模板 / FAQ / 工具对比 / 方法论 等所有公开内容
          </p>
        </header>

        <div
          className="bg-white rounded-2xl shadow-sm p-8 leading-relaxed-cn"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 leading-relaxed-cn">
          <p>
            <span aria-hidden>📨 </span>
            纠错 / 反馈 / 合作, 请发邮件至{' '}
            <a href="mailto:hello@aiwill-planner.cn" className="underline">
              hello@aiwill-planner.cn
            </a>
          </p>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          原文 (.txt 格式, 供 LLM 抓取):{' '}
          <a
            href="/editorial-policy.txt"
            className="text-amber-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            /editorial-policy.txt
          </a>
        </p>
      </article>
    </div>
  );
}
