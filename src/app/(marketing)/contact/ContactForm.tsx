/**
 * ContactForm - H5 端留言表单
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

type Topic =
  | 'general'
  | 'pre-marriage'
  | 'during-marriage'
  | 'divorce'
  | 'child-custody'
  | 'gift'
  | 'inheritance'
  | 'custom-service'    // 改版 v3 (2026-07-30): 取代原 'expert-review', 指向定制服务
  | 'payment'
  | 'other';

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'general', label: '一般咨询' },
  { value: 'pre-marriage', label: '婚前财产' },
  { value: 'during-marriage', label: '婚内财产' },
  { value: 'divorce', label: '离婚协议' },
  { value: 'child-custody', label: '子女抚养' },
  { value: 'gift', label: '赠与' },
  { value: 'inheritance', label: '财富传承' },
  { value: 'custom-service', label: '定制服务 (复杂场景)' },
  { value: 'payment', label: '付款问题' },
  { value: 'other', label: '其他' },
];

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<Topic>('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('请填写您的称呼');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请填写有效邮箱');
      return;
    }
    if (message.trim().length < 10) {
      setError('详细描述至少 10 字');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, topic, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || '提交失败');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="text-6xl mb-4" aria-hidden="true">✅</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">感谢留言</h1>
          <p className="text-slate-600 mb-6">
            我们已收到您的咨询, 将尽快回复您。
          </p>
          <Link
            href="/"
            className="block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-8 pb-safe">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">联系客服</h1>
          <p className="mt-2 text-sm text-slate-500">工作时间 9:00-21:00 · 24h 内回复</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="cf-name" className="block text-sm font-medium text-slate-700 mb-1">您的称呼 *</label>
            <input
              id="cf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={40}
              placeholder="如:李女士"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="cf-email" className="block text-sm font-medium text-slate-700 mb-1">联系邮箱 *</label>
            <input
              id="cf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@email.com"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ fontSize: '16px' }}
            />
            <p className="text-xs text-slate-500 mt-1">我们会将回复发到此邮箱</p>
          </div>

          <div>
            <label htmlFor="cf-topic" className="block text-sm font-medium text-slate-700 mb-1">咨询类型</label>
            <select
              id="cf-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as Topic)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ fontSize: '16px' }}
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cf-msg" className="block text-sm font-medium text-slate-700 mb-1">详细描述 *</label>
            <textarea
              id="cf-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              maxLength={2000}
              placeholder="请简要描述您的情况或问题(2000 字以内)"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              style={{ fontSize: '16px' }}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3" role="alert">
              <span aria-hidden="true">⚠️ </span>{error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition"
          >
            {submitting ? '提交中…' : '提交留言'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            提交即表示您同意我们的
            <Link href="/privacy" className="text-amber-600 hover:underline mx-1">隐私政策</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
