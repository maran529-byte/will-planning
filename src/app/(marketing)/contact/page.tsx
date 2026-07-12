import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '联系客服 - 家有所爱',
  description: '联系家有所爱客服团队：工作时间 9:00-21:00，留言后 24h 内回复；紧急问题请发邮件至 support@aiwill-planner.cn。',
  keywords: '家有所爱客服、家庭法律咨询、资产规划专业人士',
  alternates: {
    canonical: 'https://aiwill-planner.cn/contact',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/contact',
      'zh-HK': 'https://aiwill-planner.cn/contact',
      'x-default': 'https://aiwill-planner.cn/contact',
    },
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">联系客服</h1>
      <p className="text-slate-600 mb-8">工作时间 9:00-21:00 · 留言后 24 小时内回复</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">💬</div>
          <div className="font-medium">公众号</div>
          <div className="text-sm text-slate-600 mt-1">微信内回复消息</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">📧</div>
          <div className="font-medium">邮件</div>
          <a href="mailto:support@aiwill-planner.cn" className="text-sm text-amber-600 mt-1 block hover:underline">
            support@aiwill-planner.cn
          </a>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">📋</div>
          <div className="font-medium">常见问题</div>
          <a href="/faq" className="text-sm text-amber-600 mt-1 block hover:underline">
            查看 FAQ →
          </a>
        </div>
      </div>

      <form
        action="/api/contact"
        method="POST"
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold mb-2">留言咨询</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">您的称呼 *</label>
          <input
            name="name"
            type="text"
            required
            maxLength={40}
            placeholder="如：李女士"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">联系邮箱 *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="example@email.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-slate-500 mt-1">我们会将回复发到此邮箱</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">咨询类型</label>
          <select
            name="topic"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="general">一般咨询</option>
            <option value="pre-marriage">婚前财产</option>
            <option value="during-marriage">婚内财产</option>
            <option value="divorce">离婚协议</option>
            <option value="child-custody">子女抚养</option>
            <option value="gift">赠与</option>
            <option value="inheritance">财富传承</option>
            <option value="expert-review">专家护航服务</option>
            <option value="payment">付款问题</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">详细描述 *</label>
          <textarea
            name="message"
            required
            rows={6}
            maxLength={2000}
            placeholder="请简要描述您的情况或问题（2000 字以内）"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition"
        >
          提交留言
        </button>

        <p className="text-xs text-slate-500 text-center">
          提交即表示您同意我们的 <a href="/privacy" className="text-amber-600 hover:underline">隐私政策</a>
        </p>
      </form>
    </div>
  );
}