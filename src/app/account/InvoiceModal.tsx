'use client';

import { useState } from 'react';
import type { Order } from '@/lib/orders';

interface Props {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

type InvoiceType = 'personal' | 'company';

export default function InvoiceModal({ order, onClose, onSuccess }: Props) {
  const [type, setType] = useState<InvoiceType>('personal');
  const [title, setTitle] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError(type === 'personal' ? '请填写姓名' : '请填写公司名称');
      return;
    }
    if (type === 'company' && !taxId.trim()) {
      setError('请填写公司税号');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      setError('请填写正确的邮箱地址');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/account/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          invoice_type: type,
          title: title.trim(),
          tax_id: type === 'company' ? taxId.trim() : undefined,
          amount_cents: order.amount,
          contact_email: email.trim(),
          contact_phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }
      alert('申请已提交, 我们会在 1-3 个工作日内开具并发送至您的邮箱');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-800 mb-1">📑 申请发票</h3>
        <p className="text-xs text-slate-500 mb-4">
          订单号: <span className="font-mono">{order.order_no}</span> · 金额:{' '}
          <span className="font-bold text-amber-600">¥{(order.amount / 100).toFixed(2)}</span>
        </p>

        <div className="space-y-4">
          {/* 类型选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">发票类型</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'personal', l: '👤 个人' },
                { v: 'company', l: '🏢 公司' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setType(opt.v as InvoiceType)}
                  className={`py-2.5 rounded-lg text-sm font-medium border-2 ${
                    type === opt.v
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* 抬头 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {type === 'personal' ? '姓名' : '公司名称'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'personal' ? '张三' : '上海某某有限公司'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 税号 (公司必填) */}
          {type === 'company' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                公司税号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="91310115XXXXXXXX2X"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                一般纳税人 18 位 / 小规模纳税人 15-21 位
              </p>
            </div>
          )}

          {/* 邮箱 (必填) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              接收发票邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 手机 (可选) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              联系电话 <span className="text-slate-400">(可选)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="仅在紧急时联系"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            ⓵ 提交后 1-3 个工作日内开具
            <br />
            ⓶ 电子发票将以 PDF 发送至您填写的邮箱
            <br />
            ⓷ 如需纸质发票, 联系客服单独申请
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-medium"
            >
              {busy ? '提交中...' : '提交申请'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
