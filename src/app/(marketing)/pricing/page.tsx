/**
 * /pricing - 统一价格介绍页 (业务铁律 v1.0 · 2026-07-24)
 *
 * 改版说明:
 *   - 旧: 多价格对比 (¥19.9 vs ¥999)
 *   - 新: 单一价格 ¥19.9 (工作室 2026-07-24 批准)
 *   - 6 类文书 (婚前/婚内/离婚/抚养/赠与/传承) 全部统一价
 *   - 定制服务请通过 /custom 留言
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '统一价格 ¥19.9 · 婚前/婚内/离婚/抚养/赠与/传承 6 类文书 · 家有所爱',
  description: '所有 6 类家庭文书统一 ¥19.9, 7 天无理由退款, 30 天内免费修改。复杂场景可留言定制服务。',
  alternates: {
    canonical: 'https://aiwill-planner.cn/pricing',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '统一价格 ¥19.9 · 6 类家庭文书',
    description: '所有文书 ¥19.9, 7 天无理由退款。复杂场景可留言定制服务。',
    type: 'website',
  },
};

const DOC_TYPES = [
  { icon: '💍', name: '婚前财产协议', desc: '保护婚前个人财产与婚后共有财产边界' },
  { icon: '🏠', name: '婚内财产协议', desc: '约定婚后收入分配与重大资产归属' },
  { icon: '📜', name: '离婚协议', desc: '离婚财产分割 / 子女抚养 / 债务安排' },
  { icon: '👶', name: '子女抚养协议', desc: '抚养费 / 探望权 / 教育医疗安排' },
  { icon: '🎁', name: '赠与协议', desc: '房产/股权/现金赠与子女, 含税费与撤销条款' },
  { icon: '🕊️', name: '财富传承 / 遗嘱', desc: '法定继承 / 遗嘱信托 / 隔代传承' },
];

const PROMISES = [
  { icon: '💰', title: '统一价格', desc: '¥19.9 含所有 6 类文书, 无隐藏费用' },
  { icon: '🔄', title: '7 天无理由退款', desc: '不满意全额退款, 不问理由' },
  { icon: '✏️', title: '30 天免费修改', desc: '文书生成后 30 天内, 无限次微调' },
  { icon: '🔒', title: 'PII 字段加密', desc: '敏感字段 AES-256 加密存储, 不向第三方共享' },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-block px-4 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium mb-6">
          业务铁律 v1.0 · 2026-07-24
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
          所有文书, 一口价
          <span className="block text-amber-600 mt-2">¥ 19.9</span>
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed-cn">
          婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 类家庭文书, 全部统一价格。
          无会员等级, 无功能阉割, 一次付费, 文书到家。
        </p>
        <Link
          href="https://h5.aiwill-planner.cn/questionnaire"
          className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all"
        >
          立即开始 ¥19.9 →
        </Link>
      </section>

      {/* 6 类文书 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">
          📚 6 类文书, 一律 ¥19.9
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOC_TYPES.map((doc) => (
            <div
              key={doc.name}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 border border-slate-100"
            >
              <div className="text-4xl mb-3">{doc.icon}</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{doc.name}</h3>
              <p className="text-sm text-slate-600 leading-relaxed-cn">{doc.desc}</p>
              <div className="mt-4 text-amber-600 font-bold tabular-nums">¥ 19.9</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 个承诺 */}
      <section className="max-w-6xl mx-auto px-4 py-12 bg-white/50 rounded-3xl">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">
          ✨ 我们的承诺
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROMISES.map((p) => (
            <div key={p.title} className="text-center p-4">
              <div className="text-3xl mb-2">{p.icon}</div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">{p.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed-cn">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 红包提示 */}
      <section className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">🎁</div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            自动红包 ¥2-¥10 随机
          </h3>
          <p className="text-sm text-slate-600 mb-3 leading-relaxed-cn">
            完成问卷 / 订单支付 / 分享注册 / 反馈采纳, 自动获得红包<br />
            订单结算时使用, 最高抵 50% 订单金额, 30 天有效
          </p>
          <Link
            href="https://h5.aiwill-planner.cn/register"
            className="inline-block text-sm text-rose-600 hover:text-rose-700 font-medium"
          >
            立即注册, 各得 ¥2 →
          </Link>
        </div>
      </section>

      {/* 定制服务留言 — 不展示价格 */}
      <section className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="bg-slate-100 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-3">
            情况复杂? 需要 19.9 之外的定制?
          </h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed-cn">
            跨境资产 / 多份文书 / 企业级 / 再婚多套房产 / 大额传承等复杂场景,<br />
            可留言定制服务。资产规划专业人士 1 对 1 对接, 24 小时内邮件回复。
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium"
          >
            📮 留言定制服务
          </Link>
          <p className="text-xs text-slate-500 mt-3">
            联系邮箱: 330320991@qq.com
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">常见问题</h2>
        <div className="space-y-4">
          <details className="bg-white rounded-xl p-4 shadow-sm">
            <summary className="font-semibold cursor-pointer">为什么统一 ¥19.9?</summary>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed-cn">
              我们用 AI 自动生成 6 类家庭文书, 边际成本接近零。统一价格让选择更简单, 不必为"哪类文书更贵"纠结。
              复杂定制 (多份组合 / 企业级) 通过定制服务单独报价。
            </p>
          </details>
          <details className="bg-white rounded-xl p-4 shadow-sm">
            <summary className="font-semibold cursor-pointer">¥19.9 含税吗?</summary>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed-cn">
              含税。需要发票请在订单完成后申请, 电子发票免费, 纸质发票 ¥10 工本费。
            </p>
          </details>
          <details className="bg-white rounded-xl p-4 shadow-sm">
            <summary className="font-semibold cursor-pointer">退款规则?</summary>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed-cn">
              7 天内不满意全额退款, 无理由。路径: 我的订单 → 选择订单 → 申请退款。
              退款通过原支付渠道退回, 1-3 个工作日到账。
            </p>
          </details>
          <details className="bg-white rounded-xl p-4 shadow-sm">
            <summary className="font-semibold cursor-pointer">文书有法律效力吗?</summary>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed-cn">
              我们的模板由专业律师团队根据《民法典》起草, 涵盖必备条款。
              但文书最终是否被法院采信, 取决于具体案情和当地公证。建议大额资产 / 复杂家庭关系办理公证。
            </p>
          </details>
        </div>
      </section>

      {/* 备案 */}
      <div className="text-center py-8 text-xs text-slate-400">
        家有所爱工作室 © 2026 · 沪ICP备2026020925号-1 · 沪公网安备 31011502406720 号
      </div>
    </main>
  );
}