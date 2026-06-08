/**
 * /doc-type - 文书类型选择器
 *
 * 用户旅程: 首页 "开始创建文书" 按钮 → /doc-type (本页面) → /questionnaire?type=xxx
 *
 * 改版 v1 (2026-06-08): 修复首页"立即开始"按钮直跳 /questionnaire 的 bug.
 *  - 之前: 首页所有按钮都直跳 /questionnaire, 不区分文书类型, 默认走 will 问卷
 *  - 现在: 强制走 /doc-type 选择器, 用户明确选择后再进问卷
 *
 * 文书状态:
 *  - ✅ will (遗嘱): /api/generate-will 已实装, 7 模块 25 题完整
 *  - ⏳ 其他 5 类: 问卷开发中, 暂不可填写
 *
 * 设计:
 *  - Server Component (纯展示 + Link, 不需要客户端 JS)
 *  - 支持 ?type=xxx 预选 (从首页卡片跳来时, 高亮已选类型)
 *  - 不可用的类型显示 "问卷开发中" 角标, 不可点击
 */

import Link from 'next/link';
import type { Metadata } from 'next';

// 6 个文书类型 (与首页 src/app/page.tsx:13-62 保持同步)
const DOCUMENT_TYPES = [
  {
    id: 'marriage',
    name: '婚姻协议书',
    description: '明确婚后财产分配、权利义务',
    icon: '💑',
    available: false,
    color: 'rose',
  },
  {
    id: 'marital-property',
    name: '婚内财产协议',
    description: '约定婚姻存续期间财产归属',
    icon: '🏠',
    available: false,
    color: 'amber',
  },
  {
    id: 'divorce',
    name: '离婚协议',
    description: '子女抚养、财产分割协议',
    icon: '📄',
    available: false,
    color: 'slate',
  },
  {
    id: 'child-custody',
    name: '子女抚养协议',
    description: '明确抚养费、探视权安排',
    icon: '👨‍👩‍👧',
    available: false,
    color: 'blue',
  },
  {
    id: 'gift',
    name: '赠与协议',
    description: '房产、财产赠与公证文书',
    icon: '🎁',
    available: false,
    color: 'emerald',
  },
  {
    id: 'will',
    name: '遗嘱',
    description: '遗产分配、继承人指定',
    icon: '⚖️',
    available: true,
    color: 'purple',
  },
] as const;

const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'bg-rose-100 text-rose-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-100 text-amber-600' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'bg-slate-100 text-slate-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-100 text-blue-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600' },
};

export const metadata: Metadata = {
  title: '选择文书类型 | 爱的延续',
  description: '选择您要创建的法律文书类型, 1 分钟进入问卷',
};

interface PageProps {
  searchParams: Promise<{ type?: string; plan?: string }>;
}

export default async function DocTypePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preselectedType = params.type;
  const plan = params.plan || 'ai';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* 顶部 nav */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
            <span aria-hidden>←</span>
            <span>返回首页</span>
          </Link>
          <div className="text-sm text-slate-500">
            第 <span className="font-bold text-amber-600">1</span> / 3 步: 选择文书
          </div>
        </div>
        {/* 进度条 (1/3) */}
        <div className="w-full bg-slate-100 h-1">
          <div className="bg-amber-500 h-1 transition-all" style={{ width: '33.3%' }} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
            请选择您的文书类型
          </h1>
          <p className="text-slate-600 text-base sm:text-lg">
            不同文书对应不同问卷, 请按实际需求选择 (后续可调整)
          </p>
        </div>

        {/* 文书卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {DOCUMENT_TYPES.map((doc) => {
            const colors = colorClasses[doc.color];
            const isPreselected = preselectedType === doc.id;
            const Wrapper = doc.available ? Link : 'div';
            const wrapperProps = doc.available
              ? {
                  href: `/questionnaire?type=${doc.id}&plan=${plan}`,
                  className: `${colors.bg} ${colors.border} border-2 rounded-2xl p-5 sm:p-6 transition-all duration-200 group relative cursor-pointer hover:border-amber-400 hover:shadow-md ${
                    isPreselected ? 'ring-4 ring-amber-400 ring-offset-2' : ''
                  }`,
                }
              : {
                  className: `${colors.bg} ${colors.border} border-2 border-dashed rounded-2xl p-5 sm:p-6 relative opacity-60 cursor-not-allowed`,
                };

            return (
              // @ts-expect-error - dynamic Wrapper (Link | div) with conditional props
              <Wrapper key={doc.id} {...wrapperProps}>
                {isPreselected && (
                  <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    当前选择 ✓
                  </div>
                )}
                {!doc.available && (
                  <div className="absolute -top-3 -right-3 bg-slate-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    问卷开发中
                  </div>
                )}
                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${colors.icon} rounded-xl flex items-center justify-center text-2xl mb-3`}>
                  {doc.icon}
                </div>
                <h3 className={`text-lg font-bold ${colors.text} mb-1`}>
                  {doc.name}
                </h3>
                <p className="text-slate-600 text-sm mb-3 min-h-[40px]">
                  {doc.description}
                </p>
                {doc.available ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-600 font-semibold">¥19.9 起</span>
                    <span className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all">
                      开始填写 →
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    敬请期待 · 可在首页收藏
                  </div>
                )}
              </Wrapper>
            );
          })}
        </div>

        {/* 底部信息 */}
        <div className="mt-10 sm:mt-12 bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-slate-700">
          <div className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <span>💡</span>
            <span>为什么只有「遗嘱」可填写?</span>
          </div>
          <p className="leading-relaxed">
            其他 5 类文书 (婚姻/婚内财产/离婚/抚养/赠与) 的问卷正在开发中。
            您可以先关注公众号 <code className="px-1.5 py-0.5 bg-white rounded text-xs">爱的延续</code> 获取上线通知;
            目前可创建的完整文书类型为「遗嘱」, 7 大模块 25 道题, 约 10-15 分钟完成。
          </p>
        </div>

        {/* 服务承诺 */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center text-xs text-slate-500">
          <span className="flex items-center gap-1">🛡️ 数据加密</span>
          <span className="flex items-center gap-1">📝 AI 即时生成</span>
          <span className="flex items-center gap-1">⚖️ 法律免责声明</span>
        </div>
      </main>
    </div>
  );
}
