import Link from "next/link";

/**
 * 服务说明 (改版 v4, 2026-07-30)
 *
 * 改版说明:
 *   - v10 (2026-06-29): 智能版 vs 专家护航版
 *   - v3  (2026-07-30): 智能版 vs 定制服务 (¥999 专家版下线, 全站只展示 ¥19.9)
 *   - v4  (2026-07-30): 移除两栏价格对比, 仅展示智能版 ¥19.9 一档 + 复杂场景引导到 /contact 留言 (无价格)
 *
 * 原则: 全站只展示 ¥19.9 一个价格. 不展示"定制服务"价格/对比. 引导用户留言.
 */

const SCENARIOS = [
  { icon: '💍', title: '婚前 / 再婚', desc: '保护婚前个人财产, 约定婚后共有' },
  { icon: '🏠', title: '已婚中产', desc: '明确房产 / 股权 / 存款归属' },
  { icon: '📜', title: '协议离婚', desc: '财产分割 / 子女抚养 / 冷静期' },
  { icon: '👶', title: '子女抚养', desc: '抚养费 / 探视权 / 教育规划' },
  { icon: '🎁', title: '父母赠与', desc: '房产 / 股权 / 大额资产定向传承' },
  { icon: '🕊️', title: '遗嘱 / 传承', desc: '法定继承 / 6 种遗嘱 / 公证' },
];

export function PlanComparisonTable({ defaultType = "will" }: { defaultType?: string }) {
  return (
    <section
      aria-labelledby="plan-section-title"
      className="mt-12 sm:mt-16 scroll-mt-24"
      id="pricing"
    >
      <div className="text-center mb-6">
        <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full mb-2 font-medium">
          <span aria-hidden>💎 </span>统一价 · 一口价
        </span>
        <h2 id="plan-section-title" className="text-2xl sm:text-3xl font-bold text-slate-800 text-balance">
          所有 6 类家庭文书 · 统一 ¥19.9
        </h2>
        <p className="text-slate-600 mt-2 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed-cn">
          系统化生成符合《民法典》的家庭文书, 10 分钟完成, 7 天无理由退款。
        </p>
      </div>

      {/* 6 类场景适用卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {SCENARIOS.map((s) => (
          <div
            key={s.title}
            className="bg-white border border-slate-200 rounded-xl p-4 text-center"
          >
            <div className="text-2xl mb-1" aria-hidden>{s.icon}</div>
            <div className="text-sm font-semibold text-slate-700 mb-1">{s.title}</div>
            <div className="text-xs text-slate-500 leading-tight-cn">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* 价格 + CTA */}
      <div className="max-w-md mx-auto bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-300 rounded-2xl p-6 text-center">
        <div className="text-xs text-amber-700 font-semibold mb-1">限时优惠</div>
        <div className="text-5xl font-bold text-amber-600 tabular-nums mb-2">¥19.9</div>
        <div className="text-xs text-slate-500 mb-5">6 类文书统一价 · 无隐藏费用</div>
        <Link
          href={`/doc-type?type=${defaultType}&plan=ai`}
          className="block w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition"
        >
          立即开始 ¥19.9 →
        </Link>
      </div>

      {/* 复杂场景引导 — 不显示价格, 只引导留言 */}
      <div className="max-w-2xl mx-auto mt-6 bg-white border border-slate-200 rounded-xl p-5 text-center">
        <div className="text-sm font-semibold text-slate-700 mb-1">
          情况复杂? 跨境 / 股权 / 大额资产 / 再婚多套房产
        </div>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed-cn">
          可留言定制服务, 由资产规划专业人士 1 对 1 对接, 24 小时内邮件回复
        </p>
        <Link
          href="/contact"
          className="inline-block px-5 py-2 border-2 border-slate-300 text-slate-700 hover:border-slate-800 hover:bg-slate-800 hover:text-white rounded-lg text-sm font-medium transition"
        >
          📮 留言定制服务
        </Link>
      </div>

      <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed-cn">
        价格透明, 无隐藏费用 · 7 天无理由退款 · 不满意全额退
      </p>
    </section>
  );
}