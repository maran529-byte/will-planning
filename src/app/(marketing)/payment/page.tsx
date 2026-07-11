"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PRICING, PLAN_DISPLAY } from "@/lib/config";
import { normalizePlan } from "@/lib/pricing";
import { useABTest } from "@/lib/use-ab-test";

interface Order {
  id: string;
  order_no: string;
  amount: number;
  plan: 'ai' | 'expert' | 'lawyer' | 'family';  // 兼容历史 'lawyer' / 'family'
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paid_at?: string;
  // 改版 v4 (2026-06-08): 扩展 'hupijiao' 通道 (虎皮椒个人微信聚合)
  payment_channel?: 'wechat' | 'alipay' | 'manual' | 'demo' | 'hupijiao';
  created_at: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  // URL ?plan= 支持 'ai' | 'expert' | 旧 'lawyer'; 'family' 已下架 → fallback to 'ai'
  const rawPlan = searchParams.get("plan");
  const normalized = normalizePlan(rawPlan);
  const planParam = normalized ?? 'ai';
  // 兼容 ?will_id= / ?doc_id= / ?order= (deploy-fix 审计: 之前只读 will_id,
  //  导致 /payment?order=xxx 看到「正在创建订单」占位, 实际后续 create-order 拿不到 id)
  const willId = searchParams.get("will_id") || searchParams.get("doc_id") || searchParams.get("order");
  // ?order= 单独表示「继续支付已有订单」 — 此时不再创建新订单, 直接展示订单详情
  const existingOrderId = searchParams.get("order");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showQR, setShowQR] = useState(false);
  // 改版 v4 (2026-06-08): paymentMethod 扩展 'hupijiao' (虎皮椒个人微信聚合, 改为主推通道)
  // 改版 v3: paymentMethod 扩展 'manual' (Phase 1 收款码 + 人工确认)
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | 'manual' | 'hupijiao' | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [timeoutState, setTimeoutState] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false); // manual 模式: 客户点了 "我已支付" 后置 true

  // A/B 测试: 支付 CTA 文案
  const { variant: abVariant, track: abTrack } = useABTest('payment_cta_v1');
  const abCtaText = abVariant === 'B' ? '我已支付, 立省 ¥980'
    : abVariant === 'C' ? '我已支付, 与 1000+ 用户同行'
    : '我已支付 · 请客服确认';

  const planData = planParam === 'expert' ? PRICING.expertReview
    : PRICING.guide;
  // 改版 v10 (2026-06-28): 修 JS ReferenceError, 之前 3 处 priceInYuan
  //   引用但未定义, 整个 /payment 页面崩溃 ("This page couldn't load")
  const priceInYuan = planData.price;

  const createNewOrder = useCallback(async () => {
    setCreating(true);
    try {
      // ?order=xxx 模式: 加载已有订单 (用于「继续支付」「补差价」场景)
      if (existingOrderId) {
        const res = await fetch(`/api/orders/${existingOrderId}`);
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
          return;
        }
        // 订单不存在 → 继续走创建逻辑 (fallback)
      }
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planParam,
          will_id: willId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      }
    } catch (error) {
      console.error('创建订单失败:', error);
    } finally {
      setCreating(false);
      setLoading(false);
    }
  }, [planParam, willId, existingOrderId]);

  useEffect(() => {
    // Defer the create to avoid the setState-in-effect cascading render warning.
    Promise.resolve().then(() => {
      void createNewOrder();
    });
  }, [createNewOrder]);

  // 改版 v4 (2026-06-08): 客户点 "微信支付" 时, 默认走 hupijiao 通道 (虎皮椒收银台跳转)
  //   - 走 hupijiao 通道: 后端构造跳转 URL → window.location 跳到虎皮椒收银台 → 支付完成 → 虎皮椒回调
  //   - 走 manual 通道: 客户看到管理员收款码 → 留言订单号 → 客服人工确认
  //
  // 改版 v3: 客户点 "微信扫码支付" 时, 默认走 manual 模式 (Phase 1)
  // - 即便真实 WECHAT_* 已配, Phase 1 也走 manual
  // - 客户扫码 → 管理员后台 mark paid → 30s 轮询看到状态变化
  const startPayment = async (method: 'wechat' | 'alipay' | 'manual' | 'hupijiao') => {
    setPaymentMethod(method);
    setShowQR(true);
    setPaying(true);
    setTimeoutState(false);
    setAcknowledged(false);

    // 调用 /api/payment 拿二维码 / 跳转 URL
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order?.id,
          order_no: order?.order_no,
          description: planData.name,
          channel: method,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // 改版 v4: hupijiao 通道返回 payment_url, 浏览器直接跳转到虎皮椒收银台
        if (method === 'hupijiao' && data.payment_url) {
          window.location.href = data.payment_url;
          // 不重置 setPaying(false) — 跳转过程中仍处于"支付中"
          return;
        }
        // manual / wechat 通道: 返回 qr_code_url, 在弹窗里显示
        if (data.qr_code_url) {
          setQrCodeUrl(data.qr_code_url);
          setPaymentNote(data.note || null);
        }
      } else {
        console.error('支付初始化失败:', data.error);
      }
    } catch (error) {
      console.error('支付初始化异常:', error);
    }
  };

  // 轮询订单状态
  useEffect(() => {
    if (!paying || !order) return;

    let count = 0;
    // Phase 1 manual 模式: admin 确认可能需要 1-5 分钟, 延长到 5 分钟
    const MAX_POLLS = 300; // 300 * 1s = 5 min
    const pollInterval = setInterval(async () => {
      count += 1;
      try {
        const res = await fetch(`/api/orders/${order.id}`);
        const data = await res.json();

        if (data.success && data.order) {
          if (data.order.status === 'paid') {
            setPaymentSuccess(true);
            setPaying(false);
            clearInterval(pollInterval);
            return;
          } else if (data.order.status === 'cancelled') {
            setPaying(false);
            clearInterval(pollInterval);
            return;
          }
        }
      } catch (error) {
        console.error('轮询订单状态失败:', error);
      }

      if (count >= MAX_POLLS) {
        setTimeoutState(true);
        setPaying(false);
        clearInterval(pollInterval);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [paying, order]);

  // 改版 v3: manual 模式下, 客户点 "我已支付" 不实际调 callback (避免与管理员后台冲突)
  // 仅展示"等待客服确认"提示, 由管理员在 /admin/orders (Phase 3) mark paid
  const handlePayConfirm = async () => {
    setAcknowledged(true);
    // A/B 测试: 跟踪 click 事件
    void abTrack('click', { metadata: { order_no: order?.order_no, plan: planParam } });
    // 注意: 不调用 /api/payment/callback, 由管理员后台 mark paid
  };

  const closeQR = () => {
    setShowQR(false);
    setPaymentMethod(null);
    setQrCodeUrl(null);
    setPaymentNote(null);
    setAcknowledged(false);
  };

  if (loading || creating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4" aria-hidden>⏳</div>
          <p className="text-slate-600 leading-relaxed-cn">正在创建订单...</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4" aria-hidden>🎉</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">支付成功</h1>
          <p className="text-slate-600 mb-6 leading-relaxed-cn">您的订单已支付成功</p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">订单号</span>
              <span className="font-mono text-sm">{order?.order_no}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">套餐</span>
              <span className="text-slate-800 leading-tight-cn">{planData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">金额</span>
              <span className="font-bold text-amber-600 tabular-nums">¥{priceInYuan}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/orders"
              className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition"
            >
              查看订单
            </Link>
            <Link
              href={`/result?id=${willId}&plan=${planParam}`}
              className="block w-full border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl transition"
            >
              返回查看草稿
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={willId ? `/result?id=${willId}&plan=${planParam}` : '/'}
            className="text-slate-600 hover:text-amber-600 transition leading-tight-cn"
          >
            ← 返回
          </Link>
          <h1 className="font-semibold text-slate-800 leading-tight-cn">订单支付</h1>
          <div className="w-16" aria-hidden />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 订单摘要 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 leading-tight-cn">订单详情</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">套餐</span>
              <span className="font-semibold text-slate-800 leading-tight-cn">{planData.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">描述</span>
              <span className="text-slate-700 text-sm leading-relaxed-cn">{planData.description}</span>
            </div>
            {'promo' in planData && planData.promo && (
              <div className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                {planData.promoText ?? '限时优惠'}
              </div>
            )}
          </div>
        </div>

        {/* 订单金额 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">应付金额</span>
            <span className="text-3xl font-bold text-amber-600 tabular-nums">¥{priceInYuan}</span>
          </div>

          {order && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500 font-mono">
              订单号: {order.order_no}
            </div>
          )}
        </div>

        {/* 版本对比表 (改版 v11, 2026-06-28, 提升决策清晰度) */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight-cn">
            <span aria-hidden>⚖️ </span>两版差异, 一表看清
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed-cn">
            根据您的复杂程度选择 — 简单场景选智能版, 复杂场景选专家护航版
          </p>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm leading-tight-cn border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 px-2 font-semibold text-slate-600">功能</th>
                  <th className="py-2 px-2 text-center font-semibold text-slate-700">
                    智能版<br />
                    <span className="text-amber-600 text-base font-bold tabular-nums">¥19.9</span>
                  </th>
                  <th className="py-2 px-2 text-center font-semibold text-amber-700 bg-amber-50 rounded-t-lg">
                    专家护航版<br />
                    <span className="text-amber-600 text-base font-bold tabular-nums">¥999</span>
                    <span className="block text-[10px] font-normal text-amber-600 mt-0.5" aria-label="推荐">
                      ★ 推荐
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-2">系统化问卷</td>
                  <td className="py-2.5 px-2 text-center" aria-label="包含">✅</td>
                  <td className="py-2.5 px-2 text-center bg-amber-50" aria-label="包含">✅</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-2">文书草稿生成</td>
                  <td className="py-2.5 px-2 text-center">✅</td>
                  <td className="py-2.5 px-2 text-center bg-amber-50">✅</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-2">PDF + Word 双格式下载</td>
                  <td className="py-2.5 px-2 text-center">✅</td>
                  <td className="py-2.5 px-2 text-center bg-amber-50">✅</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-2">资产规划专业人士 1 对 1 视频审核</td>
                  <td className="py-2.5 px-2 text-center text-slate-300" aria-label="不包含">—</td>
                  <td className="py-2.5 px-2 text-center bg-amber-50 font-semibold text-amber-700">✅</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-2">关键条款修改建议</td>
                  <td className="py-2.5 px-2 text-center text-slate-300" aria-label="不包含">—</td>
                  <td className="py-2.5 px-2 text-center bg-amber-50 font-semibold text-amber-700">✅</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-2">公证 / 签署指引文档</td>
                  <td className="py-2.5 px-2 text-center text-slate-300" aria-label="不包含">—</td>
                  <td className="py-2.5 px-2 text-center bg-amber-50 font-semibold text-amber-700">✅</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2 text-xs text-slate-500">适合</td>
                  <td className="py-2.5 px-2 text-center text-xs text-slate-500">常见标准场景</td>
                  <td className="py-2.5 px-2 text-center text-xs text-amber-700 bg-amber-50 rounded-b-lg font-medium">
                    跨境 / 股权 / 复杂资产
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {planParam === 'ai' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed-cn">
              <p>
                <span aria-hidden>💡 </span>
                提示: 当前选择的是「智能版」. 如涉及房产 / 股权 / 大额资产, 建议升级到「专家护航版」, 由专业人士 1 对 1 把关.
              </p>
              <Link
                href={`/payment?plan=expert${willId ? `&will_id=${willId}` : ''}`}
                className="text-blue-700 font-semibold hover:underline mt-1 inline-block"
              >
                升级到专家版 →
              </Link>
            </div>
          )}
        </div>

        {/* 支付安全信任标识 (改版 v11, 2026-06-28, 缓解支付环节顾虑) */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-emerald-800">
            <div>
              <div className="text-2xl mb-1" aria-hidden>🔒</div>
              <div className="font-semibold leading-tight-cn">SSL 加密</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">银行级传输</div>
            </div>
            <div>
              <div className="text-2xl mb-1" aria-hidden>🛡️</div>
              <div className="font-semibold leading-tight-cn">持牌支付</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">虎皮椒 / 微信支付</div>
            </div>
            <div>
              <div className="text-2xl mb-1" aria-hidden>↩️</div>
              <div className="font-semibold leading-tight-cn">不满意 7 天退款</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">无理由全额退</div>
            </div>
          </div>
        </div>

        {/* 支付方式选择 - 改版 v4: 主推虎皮椒 (hupijiao), 备选 manual */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight-cn">选择支付方式</h3>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed-cn">
            微信支付 · 实时到账 · 推荐 · 由虎皮椒 (持牌支付机构) 处理
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* 主推: 虎皮椒 (hupijiao) - 改版 v4 */}
            <button
              onClick={() => startPayment('hupijiao')}
              disabled={paying}
              className="flex flex-col items-center gap-2 p-6 border-2 border-emerald-500 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition disabled:opacity-50 relative"
              aria-label="使用微信支付 (推荐, 实时到账)"
            >
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full" aria-hidden>
                推荐
              </div>
              <div className="text-4xl" aria-hidden>💚</div>
              <span className="font-medium text-slate-800 leading-tight-cn">微信支付</span>
              <span className="text-xs text-slate-500">实时到账</span>
            </button>

            {/* 备选: manual 模式 - 收款码 + 人工确认 */}
            <button
              onClick={() => startPayment('manual')}
              disabled={paying}
              className="flex flex-col items-center gap-2 p-6 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
              aria-label="使用扫码支付, 人工确认"
            >
              <div className="text-4xl" aria-hidden>📱</div>
              <span className="font-medium text-slate-800 leading-tight-cn">扫码支付</span>
              <span className="text-xs text-slate-500">人工确认</span>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <Link href="/orders" className="hover:text-slate-600 transition">
              查看订单
            </Link>
            <span>支付即视为同意《服务协议》</span>
          </div>
        </div>

        {/* 支付二维码弹窗 - 改版 v4: hupijiao 模式只显示"跳转中"状态, 然后浏览器自动跳转 */}
        {showQR && paymentMethod === 'hupijiao' && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hupijiao-modal-title"
          >
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
              <div className="animate-spin text-5xl mb-4" aria-hidden>⏳</div>
              <h3 id="hupijiao-modal-title" className="text-lg font-bold text-slate-800 mb-2 leading-tight-cn">
                正在跳转支付
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed-cn">
                将为您打开虎皮椒收银台, 请在微信内完成支付
              </p>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed-cn">
                如未自动跳转, 请检查浏览器是否拦截了弹窗
              </p>
              <button
                onClick={closeQR}
                className="mt-4 w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 支付二维码弹窗 - 改版 v3: 显示管理员收款码 (manual 模式) */}
        {showQR && paymentMethod === 'manual' && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-modal-title"
          >
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="text-center mb-4">
                <h3 id="manual-modal-title" className="text-lg font-bold text-slate-800 leading-tight-cn">扫码支付</h3>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed-cn">请使用微信/支付宝扫描下方二维码</p>
              </div>

              {/* 订单号水印 - 让客户留言时附上, 客服对账 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
                <p className="text-xs text-amber-700 mb-1">请在付款时留言订单号</p>
                <p className="font-mono text-lg font-bold text-amber-800 tabular-nums">{order?.order_no}</p>
              </div>

              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeUrl}
                    alt="支付二维码"
                    className="w-48 h-48 mx-auto bg-white rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin text-4xl mb-2" aria-hidden>⏳</div>
                      <p className="text-xs text-slate-500">加载收款码...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 支付金额醒目展示 */}
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-amber-600 tabular-nums">¥{priceInYuan}</p>
                <p className="text-xs text-slate-500 mt-1">付款后请点下方按钮</p>
              </div>

              {acknowledged ? (
                // 客户已点 "我已支付" - 显示等待确认状态
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2" aria-hidden>⏳</div>
                    <p className="text-blue-700 font-medium text-sm leading-relaxed-cn">已收到您的支付提醒</p>
                    <p className="text-blue-600 text-xs mt-1 leading-relaxed-cn">客服将在数分钟内确认, 页面将自动跳转</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full" aria-hidden></div>
                    <span>正在等待订单确认...</span>
                  </div>
                  <button
                    onClick={closeQR}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
                  >
                    关闭
                  </button>
                </div>
              ) : timeoutState ? (
                <div className="text-center">
                  <div className="text-4xl mb-2" aria-hidden>⏰</div>
                  <p className="text-red-600 font-medium mb-4">支付确认超时</p>
                  <p className="text-slate-500 text-sm mb-4 leading-relaxed-cn">
                    若已支付, 请加客服微信并提供订单号 <span className="font-mono font-bold tabular-nums">{order?.order_no}</span>
                  </p>
                  <button
                    onClick={closeQR}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
                  >
                    重新选择
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handlePayConfirm}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition"
                  >
                    {abCtaText}
                  </button>
                  <button
                    onClick={closeQR}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
                  >
                    取消
                  </button>
                </div>
              )}

              <div className="mt-4 text-center text-xs text-slate-400 leading-relaxed-cn">
                <p>支付即视为同意《服务协议》</p>
                <p className="mt-1">客服微信: 见网站底部</p>
              </div>
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center text-sm text-slate-500 leading-relaxed-cn">
          <p>支付过程中如有疑问, 请联系客服</p>
        </div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-500">加载中...</p>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}