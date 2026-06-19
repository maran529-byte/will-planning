/**
 * /doc-type - 文书类型选择器
 *
 * 用户旅程: 首页 "开始创建文书" 按钮 → /doc-type (本页面) → /questionnaire?type=xxx
 *
 * 改版 v1 (2026-06-08): 修复首页"立即开始"按钮直跳 /questionnaire 的 bug.
 *  - 之前: 首页所有按钮都直跳 /questionnaire, 不区分文书类型, 默认走 will 问卷
 *  - 现在: 强制走 /doc-type 选择器, 用户明确选择后再进问卷
 *
 * 改版 v5 (2026-06-09): DOCUMENT_TYPES / colorClasses 提取到 @/lib/document-types
 *   - 移除 @ts-expect-error: 用类型化的 render prop 函数替代动态 Wrapper
 *   - 移除内联重复数组 (与 page.tsx 共用 110 行)
 *
 * 文书状态:
 *  - ✅ 6 类全部实装 (will + 5 个新增): /api/generate-will + /api/generate-document?type=xxx
 *  - ✅ 5 类新加 (Day 2 上线): 婚姻/婚内/离婚/抚养/赠与, 各 4-5 模块, 13-17 题
 *
 * 设计:
 *  - Server Component (纯展示 + Link, 不需要客户端 JS)
 *  - 支持 ?type=xxx 预选 (从首页卡片跳来时, 高亮已选类型)
 *  - 不可用的类型显示 "问卷开发中" 角标, 不可点击
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { DOCUMENT_TYPES, COLOR_CLASSES } from '@/lib/document-types';

export const metadata: Metadata = {
  title: '选择文书类型 · 婚姻财产规划 | 家有所爱',
  description: '婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承, 6 类家庭文书, ¥19.9 起, 10 分钟完成',
};

interface PageProps {
  searchParams: Promise<{ type?: string; plan?: string }>;
}

export default async function DocTypePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preselectedType = params.type;
  const plan = params.plan || 'ai';

  // 需求 (2026-06-10): 如果 URL 带 ?type=xxx 且该类型可用, 直接跳到问卷,
  // 不再让用户多一步选择 — 提升转化与连续性。
  // 例: 首页卡片链 /doc-type?type=marriage → 直接进 /questionnaire?type=marriage
  // 例: /account /result 的"再创建"按钮直跳 /questionnaire 也保留 (不带 type)
  if (preselectedType) {
    const found = DOCUMENT_TYPES.find((d) => d.id === preselectedType);
    if (found && found.available) {
      redirect(`/questionnaire?type=${found.id}&plan=${plan}`);
    }
    // 不可用类型 → 落到下方渲染, 仍展示"问卷开发中"角标
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* 顶部 nav */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition"
          >
            <span aria-hidden>←</span>
            <span>返回首页</span>
          </Link>
          <div className="text-sm text-slate-500" aria-label="进度">
            第 <span className="font-bold text-amber-600 tabular-nums">1</span> / 3 步: 选择文书
          </div>
        </div>
        {/* 进度条 (1/3) */}
        <div
          className="w-full bg-slate-100 h-1"
          role="progressbar"
          aria-valuenow={33}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="bg-amber-500 h-1 transition-all" style={{ width: '33.3%' }} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 text-balance">
            选一个最贴近您当前情况的
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed-cn">
            不同场景对应不同问卷, 选错也没关系, 后续随时可调整
          </p>
        </div>

        {/* 文书卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {DOCUMENT_TYPES.map((doc) => {
            const colors = COLOR_CLASSES[doc.color];
            const isPreselected = preselectedType === doc.id;

            // 改版 v5: 改用类型化 conditional, 避免 dynamic Wrapper + @ts-expect-error
            // 之前用 const Wrapper = doc.available ? Link : 'div' 触发 ts-expect-error
            const cardClass = doc.available
              ? `${colors.bg} ${colors.border} border-2 rounded-2xl p-5 sm:p-6 transition-all duration-200 group relative cursor-pointer hover:border-amber-400 hover:shadow-md ${
                  isPreselected ? 'ring-4 ring-amber-400 ring-offset-2' : ''
                }`
              : `${colors.bg} ${colors.border} border-2 border-dashed rounded-2xl p-5 sm:p-6 relative opacity-60 cursor-not-allowed`;

            const cardInner = (
              <>
                {isPreselected && (
                  <div
                    className="absolute -top-3 -right-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md"
                    aria-label="当前选择"
                  >
                    当前选择 ✓
                  </div>
                )}
                {!doc.available && (
                  <div
                    className="absolute -top-3 -right-3 bg-slate-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md"
                    aria-label="问卷开发中"
                  >
                    问卷开发中
                  </div>
                )}
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 ${colors.icon} rounded-xl flex items-center justify-center text-2xl mb-3`}
                  aria-hidden
                >
                  {doc.icon}
                </div>
                <h3 className={`text-lg font-bold ${colors.text} mb-1`}>
                  {doc.name}
                </h3>
                <p className="text-slate-600 text-sm mb-3 min-h-[40px] leading-relaxed-cn">
                  {doc.description}
                </p>
                {doc.available ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-600 font-semibold tabular-nums">¥19.9 起</span>
                    <span className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all">
                      开始填写 →
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    敬请期待 · 可在首页收藏
                  </div>
                )}
              </>
            );

            return doc.available ? (
              <Link
                key={doc.id}
                href={`/questionnaire?type=${doc.id}&plan=${plan}`}
                className={cardClass}
                aria-label={`选择 ${doc.name}, 进入问卷`}
              >
                {cardInner}
              </Link>
            ) : (
              <div
                key={doc.id}
                className={cardClass}
                role="group"
                aria-disabled="true"
                aria-label={`${doc.name} 问卷开发中`}
              >
                {cardInner}
              </div>
            );
          })}
        </div>

        {/* 底部信息 - 改版 v6: 措辞聚焦"婚姻/财产/抚养", 不再提遗嘱 */}
        <div className="mt-10 sm:mt-12 bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-slate-700">
          <div className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <span aria-hidden>✅</span>
            <span>覆盖婚前/婚内/离婚/抚养/赠与/传承 6 大场景</span>
          </div>
          <p className="leading-relaxed-cn">
            全部根据《中华人民共和国民法典》生成专业文书模板, ¥19.9 起。
            复杂情况 (跨境资产 / 股权设计 / 家族信托) 可选 ¥999 专家版,
            资产规划专业人士 1 对 1 视频审核。
            关注公众号 <code className="px-1.5 py-0.5 bg-white rounded text-xs">家有所爱</code> 获取新功能通知。
          </p>
        </div>

        {/* 服务承诺 */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center text-xs text-slate-500">
          <span className="flex items-center gap-1" role="listitem">
            <span aria-hidden>🛡️</span> 数据加密
          </span>
          <span className="flex items-center gap-1" role="listitem">
            <span aria-hidden>📝</span> 即时生成
          </span>
          <span className="flex items-center gap-1" role="listitem">
            <span aria-hidden>📄</span> PDF + Word 双格式
          </span>
        </div>
      </main>
    </div>
  );
}
