import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '家有所爱 vs 传统律师 · 6 维度对比',
  description: '智能文书 vs 传统律师 6 维度对比：价格、速度、隐私、合规、修改、售后。婚前/婚内/离婚/抚养/赠与/传承 6 类家庭文书。',
  keywords: '智能文书对比, 律师 vs 模板, 婚前协议对比, 离婚协议对比, 家有所爱对比',
  alternates: {
    canonical: 'https://aiwill-planner.cn/compare',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/compare',
      'zh-HK': 'https://aiwill-planner.cn/compare',
      'x-default': 'https://aiwill-planner.cn/compare',
    },
  },
  openGraph: {
    title: '家有所爱 vs 传统律师 · 6 维度对比',
    description: '智能文书 ¥19.9 起 vs 传统律师 ¥3000+ · 6 维度全解',
    url: 'https://aiwill-planner.cn/compare',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: '家有所爱 vs 传统律师' }],
  },
};

const ROWS = [
  {
    dim: '💰 价格',
    ai: '¥19.9 起（智能版）/ 定制服务根据复杂度单独报价（在 /contact 留言）',
    lawyer: '¥3,000 ~ ¥30,000（按文书类型 + 复杂度）',
    verdict: '智能版仅为律师的 1/150；定制服务按复杂度单独报价',
  },
  {
    dim: '⏱️ 速度',
    ai: '8 分钟问卷 + 1 分钟生成',
    lawyer: '3 ~ 15 个工作日（含 1~3 次面谈）',
    verdict: '智能文书快 100 倍，适合有标准化需求的家庭',
  },
  {
    dim: '🔒 隐私',
    ai: '问卷在线填写，PII 字段 AES-256 加密；不向律所/同行暴露家庭细节',
    lawyer: '需当面陈述，部分律所将案情用于同行培训或案例库',
    verdict: '对隐私敏感 / 涉及家族财富的家庭, 智能文书更安心',
  },
  {
    dim: '⚖️ 合规',
    ai: '依据《民法典》§1049 / §1065 / §1076-1078 / §1084-1086 / §657-660 / §1134-1142 起草',
    lawyer: '律师结合判例与地方法院倾向性, 可处理跨境 / 股权 / 信托复杂情形',
    verdict: '常见 6 类场景智能版已覆盖; 复杂情形请选择定制服务或委托当地律师',
  },
  {
    dim: '✏️ 修改',
    ai: '30 天内无限次微调, 系统重新生成',
    lawyer: '修改按次收费（¥500 ~ ¥2000 / 次），需重新预约',
    verdict: '智能文书修改成本几乎为零',
  },
  {
    dim: '🛡️ 售后',
    ai: '7 天无理由退款 + 微信公众号客服 + 签署指引文档',
    lawyer: '口头承诺, 无统一退款标准',
    verdict: '智能文书有标准化售后保障, 律师依赖个人关系',
  },
];

const SCENARIOS = [
  { tag: '✅ 推荐智能版', desc: '婚前/再婚财产清晰化 · 标准婚内财产安排 · 双方无未成年子女的和平离婚 · 单套房产定向赠与子女 · 标准遗嘱' },
  { tag: '🤝 推荐智能 + 公证', desc: '涉及 1 套以上房产 / 较大金额存款 / 公司股权 / 跨境资产, 建议智能版出稿 + 当地公证处办理' },
  { tag: '👨‍⚖️ 推荐定制服务', desc: '再婚家庭双方均有子女 · 一方有外籍身份 · 家族信托 / 保险金信托设计 · 复杂股权代持安排' },
  { tag: '⚠️ 必须委托当地律师', desc: '已发生诉讼 / 对方已委托律师 / 涉刑事风险 / 涉跨境执行 (海牙 Apostille / 使领馆认证)' },
];

export default function ComparePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          家有所爱 vs 传统律师 · 6 维度对比
        </h1>
        <p className="text-slate-600 leading-relaxed-cn max-w-2xl mx-auto">
          婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 类家庭文书, 智能生成 vs 委托律师,
          6 个维度全面对比, 帮助您根据家庭情况选择最适合的方式。
        </p>
      </header>

      {/* 对比表格 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">6 维度对比表</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-xl shadow-sm overflow-hidden text-sm">
            <thead className="bg-amber-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-800 w-24">维度</th>
                <th className="text-left px-4 py-3 font-semibold text-amber-700">家有所爱智能文书</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">传统律师事务所</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-800">结论</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.dim} className="border-t border-slate-200">
                  <td className="px-4 py-4 font-medium text-slate-800 align-top">{r.dim}</td>
                  <td className="px-4 py-4 text-slate-700 align-top">{r.ai}</td>
                  <td className="px-4 py-4 text-slate-700 align-top">{r.lawyer}</td>
                  <td className="px-4 py-4 text-slate-600 align-top text-xs">{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 场景选择 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">怎么选？4 类家庭场景</h2>
        <div className="space-y-4">
          {SCENARIOS.map((s) => (
            <div key={s.tag} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="font-semibold text-slate-900 mb-2">{s.tag}</div>
              <p className="text-sm text-slate-600 leading-relaxed-cn">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">不确定该选哪一类?</h2>
        <p className="text-slate-600 mb-6 leading-relaxed-cn">
          从 6 类常见家庭文书开始, ¥19.9 起 · 10 分钟完成
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/doc-type"
            className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md transition"
          >
            查看 6 类文书 →
          </Link>
          <Link
            href="/knowledge"
            className="inline-block px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium rounded-lg transition"
          >
            先读深度指南
          </Link>
        </div>
      </section>

      {/* 友情提示 */}
      <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed-cn">
        <p>本对比基于 2026 年 7 月中国大陆家庭法律服务市场公开信息整理, 不构成法律意见。</p>
        <p className="mt-1">复杂情况请咨询专业资产规划人员并办理公证。</p>
        <p className="mt-1">沪ICP备2026020925号-1 · 数据存储于 Supabase 海外节点</p>
      </div>
    </div>
  );
}