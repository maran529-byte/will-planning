import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '常见问题 - 家有所爱',
  description: '家有所爱平台常见问题：如何使用、6 类家庭文书的区别、付款与发票、隐私与数据安全、定制服务流程。',
  keywords: '家有所爱FAQ、家庭文书常见问题、婚前协议FAQ、离婚协议FAQ、文书生成',
  alternates: {
    canonical: 'https://aiwill-planner.cn/faq',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/faq',
      'zh-HK': 'https://aiwill-planner.cn/faq',
      'x-default': 'https://aiwill-planner.cn/faq',
    },
  },
};

const FAQ_GROUPS = [
  {
    title: '产品使用',
    items: [
      { q: '家有所爱提供哪些文书？', a: '婚前财产协议、婚内财产协议、离婚协议、子女抚养协议、赠与协议、财富传承（遗嘱）共 6 类。' },
      { q: '一份文书需要多长时间？', a: '系统化问卷约 10 分钟，AI 生成草稿约 1 分钟；定制服务额外 1-3 个工作日由资产规划专业人士 1 对 1 对接。' },
      { q: '生成的文书有法律效力吗？', a: '智能版（¥19.9 起）为参考模板；建议办理公证或由专业律师审核；涉及大额财产建议选择定制服务。' },
    ],
  },
  {
    title: '账户与付款',
    items: [
      { q: '如何注册账号？', a: '在 /register 用邮箱注册，验证后即可登录。无需绑定手机号。' },
      { q: '支持哪些支付方式？', a: '微信支付（虎皮椒）、支付宝；开发票请联系客服。' },
      { q: '定制服务的差异？', a: '复杂场景（跨境 / 股权 / 大额资产 / 再婚多套房产）可走定制服务，由真实资产规划专业人士 1 对 1 对接 + 全程陪伴 + 一次免费修订。详情可在 /contact 留言。' },
    ],
  },
  {
    title: '隐私与数据',
    items: [
      { q: '我的数据存哪里？', a: 'Supabase (PostgreSQL + RLS) 海外节点；PII 字段 AES-256 加密；不向第三方共享。' },
      { q: '你们会拿我的数据训练 AI 吗？', a: '不会。所有问卷数据仅用于生成您的文书，30 天后自动匿名化。详见隐私政策。' },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">常见问题</h1>
      <p className="text-slate-600 mb-8">家有所爱 · 婚前/婚内/离婚/抚养/赠与/传承 6 类家庭文书</p>

      {FAQ_GROUPS.map((group) => (
        <section key={group.title} className="mb-10">
          <h2 className="text-xl font-semibold text-amber-600 mb-4 pb-2 border-b-2 border-amber-200">
            {group.title}
          </h2>
          <div className="space-y-4">
            {group.items.map((item, i) => (
              <details key={i} className="bg-white border border-slate-200 rounded-lg p-4 group">
                <summary className="font-medium cursor-pointer list-none flex items-start">
                  <span className="text-amber-600 mr-2">Q.</span>
                  <span className="flex-1">{item.q}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-slate-700 pl-6 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-12 p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
        <p className="text-slate-700 mb-3">还有问题？</p>
        <a href="/contact" className="inline-block px-6 py-2 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition">
          联系客服 →
        </a>
      </div>
    </div>
  );
}
