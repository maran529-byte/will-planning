/**
 * FeedbackForm - H5 端反馈表单
 *
 * 改版 v3 (2026-07-23): 主站只展示合规卡片, H5 端真实表单
 * 功能够: 选择问题类别 + 严重程度 + 描述 + 截图/复现步骤, 调 /api/feedback/submit
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type Category =
  | 'login'
  | 'questionnaire'
  | 'payment'
  | 'document'
  | 'download'
  | 'affiliate'
  | 'other';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'login', label: '登录/注册问题' },
  { value: 'questionnaire', label: '问卷填写' },
  { value: 'payment', label: '支付/订单' },
  { value: 'document', label: '文书内容' },
  { value: 'download', label: '下载/导出' },
  { value: 'affiliate', label: '博主/佣金' },
  { value: 'other', label: '其他' },
];

const SEVERITIES: { value: Severity; label: string; reward: string }[] = [
  { value: 'low', label: '轻微', reward: '¥5 红包' },
  { value: 'medium', label: '一般', reward: '¥10 红包' },
  { value: 'high', label: '严重', reward: '¥30 红包' },
  { value: 'critical', label: '紧急', reward: '¥50 红包' },
];

export function FeedbackForm() {
  const [category, setCategory] = useState<Category>('other');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reproduceSteps, setReproduceSteps] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.length < 4) {
      setError('请输入简短标题（至少 4 个字符）');
      return;
    }
    if (!description.trim() || description.length < 10) {
      setError('请详细描述问题（至少 10 个字符）');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          severity,
          title: title.trim(),
          description: description.trim(),
          reproduce_steps: reproduceSteps.trim(),
          contact: contact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '提交失败');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">感谢反馈</h1>
          <p className="text-slate-600 mb-6">
            我们已收到您的问题, 24 小时内会联系您。
          </p>
          <p className="text-sm text-amber-600 font-medium mb-8">
            红包奖励将在 1-3 个工作日发放
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
          <div className="text-5xl mb-3" aria-hidden="true">📮</div>
          <h1 className="text-2xl font-bold text-slate-900">问题反馈</h1>
          <p className="mt-2 text-sm text-slate-500">
            提交可获得 <span className="text-amber-500 font-semibold">¥5~¥50</span> 红包
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <div>
            <label htmlFor="fb-category" className="block text-sm font-medium text-slate-700 mb-2">问题类别</label>
            <select
              id="fb-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
              style={{ fontSize: '16px' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">严重程度</label>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITIES.map((s) => (
                <label
                  key={s.value}
                  className={`cursor-pointer flex flex-col items-center justify-center p-2 rounded-xl border-2 transition ${
                    severity === s.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={s.value}
                    checked={severity === s.value}
                    onChange={() => setSeverity(s.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{s.reward}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fb-title" className="block text-sm font-medium text-slate-700 mb-1">简要标题 *</label>
            <input
              id="fb-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="一句话概括问题"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="fb-desc" className="block text-sm font-medium text-slate-700 mb-1">详细描述 *</label>
            <textarea
              id="fb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              maxLength={2000}
              placeholder="请描述您遇到的问题现象"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="fb-reproduce" className="block text-sm font-medium text-slate-700 mb-1">复现步骤</label>
            <textarea
              id="fb-reproduce"
              value={reproduceSteps}
              onChange={(e) => setReproduceSteps(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="选填 · 如何复现这个问题"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="fb-contact" className="block text-sm font-medium text-slate-700 mb-1">联系方式</label>
            <input
              id="fb-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={60}
              placeholder="选填 · 邮箱 / 微信号, 便于回复"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {submitting ? '提交中…' : '提交反馈'}
          </button>

          <p className="text-xs text-slate-400 text-center">
            提交即表示同意我们处理此反馈以改进服务
          </p>
        </form>
      </div>
    </div>
  );
}
