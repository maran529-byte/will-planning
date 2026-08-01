'use client';

import { useState } from 'react';

export function ApplyForm() {
  const [displayName, setDisplayName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (displayName.trim().length < 2) {
      setError('显示名至少 2 个字符');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      setError('请输入正确的 11 位手机号');
      return;
    }
    if (bio.length > 200) {
      setError('简介最多 200 字');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          contact_phone: contactPhone.trim(),
          bio: bio.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }
      setSuccess(true);
      // 刷新页面以显示「我的申请」状态
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-emerald-900 font-medium mb-1">申请已提交</p>
        <p className="text-sm text-emerald-700">我们会在 1-2 个工作日内审核, 届时邮件/微信通知您</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-2">📮 申请成为博主</h2>
      <p className="text-sm text-slate-500 mb-6">填写真实信息, 1-2 个工作日内审核</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            显示名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="如: 张规划师 / 财富规划小助手"
            maxLength={20}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            联系手机 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="11 位手机号 (用于结算转账)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            简介 <span className="text-slate-400">(选填, 200 字内)</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            placeholder="如: 5 年财富规划经验, 专注于高净值家庭传承方案..."
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="text-right text-xs text-slate-400 mt-1">{bio.length} / 200</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium"
        >
          {busy ? '提交中...' : '提交申请'}
        </button>

        <p className="text-xs text-slate-400 text-center">
          提交即表示同意《博主合作协议》(结算规则 / 反作弊条款)
        </p>
      </div>
    </form>
  );
}
