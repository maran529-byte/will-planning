import Link from 'next/link';

export interface LongFormCTAProps {
  /** 文书类型 id (will | marriage | divorce | ...) */
  docType?: string;
  /** 文书名 (默认: 文书) */
  docName?: string;
  /** 头部图标 emoji */
  icon?: string;
  /** 文案 */
  title?: string;
  description?: string;
  /** 主按钮渐变色 (默认 amber) */
  color?: 'amber' | 'rose' | 'blue' | 'emerald' | 'purple' | 'slate';
}

const COLOR_BG: Record<NonNullable<LongFormCTAProps['color']>, string> = {
  amber: 'bg-amber-500 hover:bg-amber-600',
  rose: 'bg-rose-500 hover:bg-rose-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
  emerald: 'bg-emerald-500 hover:bg-emerald-600',
  purple: 'bg-purple-500 hover:bg-purple-600',
  slate: 'bg-slate-600 hover:bg-slate-700',
};

/**
 * 长文底部 CTA (deploy-fix SEO 转换路径)
 * 用于 guide / methodology / knowledge 等长文页面末尾, 引导用户进入问卷/支付环节.
 */
export function LongFormCTA({
  docType = 'will',
  docName = '文书',
  icon = '📜',
  title,
  description,
  color = 'amber',
}: LongFormCTAProps) {
  const finalTitle = title ?? `现在, 10 分钟生成您的${docName}`;
  const finalDesc = description ?? '系统化问卷 · 智能生成符合《民法典》的文书草稿 · ¥19.9 起 · 资产规划专业人士可 1 对 1 审核';
  const btnCls = COLOR_BG[color];

  return (
    <section
      className="mt-12 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 text-center"
      aria-label="生成文书引导"
    >
      <div className="text-4xl mb-3" aria-hidden>{icon}</div>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
        {finalTitle}
      </h2>
      <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed-cn">
        {finalDesc}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          href={`/doc-type?type=${docType}&plan=ai`}
          className={`inline-block ${btnCls} text-white px-6 py-3 rounded-lg font-medium transition`}
        >
          开始制作{docName} →
        </Link>
        <Link
          href="/pricing"
          className="inline-block bg-white border border-slate-300 hover:border-slate-400 text-slate-700 px-6 py-3 rounded-lg font-medium transition"
        >
          查看定价
        </Link>
      </div>
      <p className="text-xs text-slate-500 mt-4 leading-relaxed-cn">
        <span aria-hidden>🔒 </span>
        SSL 加密 · 7 天无理由退款 · 资产规划专业人士 1 对 1 审核可选
      </p>
    </section>
  );
}
