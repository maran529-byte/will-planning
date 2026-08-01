'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CustomForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    doc_type: '',
    description: '',
    expected_budget: '',
    expected_timeline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/custom-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'website' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败, 请稍后再试');
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误, 请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white px-4 py-12 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">留言已收到</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed-cn">
            我们将在 24 小时内通过邮件回复您。<br />
            如有紧急需求, 可加客服微信 (家有所爱)。
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white px-4 py-8">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">📮</div>
          <h1 className="text-xl font-bold text-slate-800">定制服务留言</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed-cn">
            19.9 之外的需求 (复杂资产 / 多份文书 / 企业级)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              您的称呼 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              required
              minLength={2}
              maxLength={32}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如: 张先生 / 李女士"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              联系电话 <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              required
              minLength={8}
              maxLength={20}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="手机号或微信"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              邮箱 (选填)
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="doc_type" className="block text-sm font-medium text-slate-700 mb-1">
              文书类型 (选填)
            </label>
            <select
              id="doc_type"
              value={form.doc_type}
              onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              style={{ fontSize: '16px' }}
            >
              <option value="">请选择...</option>
              <option value="婚前财产协议">婚前财产协议</option>
              <option value="婚内财产协议">婚内财产协议</option>
              <option value="离婚协议">离婚协议</option>
              <option value="子女抚养协议">子女抚养协议</option>
              <option value="赠与协议">赠与协议</option>
              <option value="遗嘱/传承">遗嘱/传承</option>
              <option value="多份文书组合">多份文书组合</option>
              <option value="企业/批量">企业/批量</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              需求描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="请简要说明您的家庭情况、资产规模、特殊需求..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              style={{ fontSize: '16px' }}
            />
            <p className="text-xs text-slate-400 mt-1">{form.description.length} / 2000</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expected_budget" className="block text-sm font-medium text-slate-700 mb-1">
                预算 (选填)
              </label>
              <input
                id="expected_budget"
                value={form.expected_budget}
                onChange={(e) => setForm({ ...form, expected_budget: e.target.value })}
                placeholder="如: ¥500-1000"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label htmlFor="expected_timeline" className="block text-sm font-medium text-slate-700 mb-1">
                时间 (选填)
              </label>
              <input
                id="expected_timeline"
                value={form.expected_timeline}
                onChange={(e) => setForm({ ...form, expected_timeline: e.target.value })}
                placeholder="如: 7 天内"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3" role="alert">
              <span aria-hidden>⚠️ </span>{error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-semibold rounded-xl transition-all shadow-md"
          >
            {submitting ? '提交中...' : '提交留言'}
          </button>

          <p className="text-xs text-slate-400 text-center leading-relaxed-cn">
            提交后将自动发送邮件至 330320991@qq.com<br />
            我们 24h 内回复, 您填写的个人信息将严格保密
          </p>
        </form>
      </div>
    </div>
  );
}