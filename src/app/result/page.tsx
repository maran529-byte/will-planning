"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDocLabel } from "@/lib/document-types";

interface ResultData {
  id: string;
  willContent: string;
  docContent?: string;        // Day 2: 5 类新文书用 docContent 字段
  plan: string;
  price: number;
  // Batch B (2026-06-09): 需求 #4 - 多次修改
  revisionCount?: number;
  maxRevisions?: number;
  formData?: Record<string, unknown>;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const plan = searchParams.get("plan") || "ai";
  const docType = searchParams.get("docType") || searchParams.get("type") || "will";
  // 改版 v5 (2026-06-09): 用 @/lib/document-types.getDocLabel(), 统一兜底
  const docLabel = getDocLabel(docType);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState("");
  const loading = !result && !error;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentChannel, setPaymentChannel] = useState<'wechat' | 'alipay'>('wechat');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'timeout'>('pending');
  const [orderId, setOrderId] = useState<string>('');
  const [polling, setPolling] = useState(false);

  // Batch B (2026-06-09): 需求 #4 - 修改内容流程
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseNote, setReviseNote] = useState('');  // 用户描述要改什么
  const [reviseFields, setReviseFields] = useState<Record<string, string>>({});  // 用户填的具体字段
  const [reviseSubmitting, setReviseSubmitting] = useState(false);
  const [reviseError, setReviseError] = useState('');

  // Batch B (2026-06-09): 需求 #3 - 过滤统计
  const [filterStats, setFilterStats] = useState<{ dropped: number; total: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    // will 走 /api/generate-will, 其他 5 类走 /api/generate-document?type=xxx
    const endpoint = docType === "will"
      ? `/api/generate-will?id=${id}`
      : `/api/generate-document?type=${docType}&id=${id}`;
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        // 统一 willContent 字段 (新接口返 docContent)
        if (data.docContent && !data.willContent) {
          data.willContent = data.docContent;
        }
        // 兼容旧版 (没有 revisionCount/maxRevisions 字段)
        if (data.revisionCount === undefined) data.revisionCount = 0;
        if (data.maxRevisions === undefined) data.maxRevisions = 3;
        setResult(data);
      })
      .catch(() => {
        setError("加载失败，请重试");
      });
  }, [id, docType]);

  // 改版 v5 (2026-06-09): 修 polling interval 闭包 bug
  // 旧版 useEffect deps 含 pollingCount, 每次 count 变化就 clearInterval + 重启,
  // 造成每个 tick 都被 clear 一次, 后端日志看到一堆"半周期"请求
  // 新版用 useRef 持有 latest 引用, deps 只看 [polling, orderId]
  const pollingCountRef = useRef(0);
  useEffect(() => {
    if (!polling || !orderId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.order?.status === 'paid') {
          setPaymentStatus('paid');
          setPolling(false);
          clearInterval(pollInterval);
          return;
        } else if (pollingCountRef.current >= 20) {
          setPaymentStatus('timeout');
          setPolling(false);
          clearInterval(pollInterval);
          return;
        }
        pollingCountRef.current += 1;
      } catch (err) {
        console.error('轮询失败', err);
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      pollingCountRef.current = 0;
    };
  }, [polling, orderId]);

  const priceMap: Record<string, number> = {
    ai: 19.9,
    expert: 999,
    lawyer: 999,    // 兼容旧 plan
  };

  const price = priceMap[plan] || 19.9;

  // 处理支付
  const handlePayment = useCallback(async () => {
    try {
      // 创建订单 (兼容 will_id 和 doc_id 两种命名)
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price * 100, // 转为分
          plan,
          will_id: id,        // 老字段 (兼容 will)
          doc_id: id,         // 新字段 (5 类新文书)
          doc_type: docType,  // 新字段
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) {
        alert('创建订单失败');
        return;
      }
      setOrderId(orderData.order.id);
      setShowPaymentModal(true);
      setPaymentStatus('pending');
      pollingCountRef.current = 0;
      setPolling(true);

      // 模拟支付回调（5秒后自动成功）
      setTimeout(async () => {
        try {
          await fetch('/api/payment-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_no: orderData.order.order_no,
              status: 'paid',
              payment_channel: paymentChannel,
            }),
          });
        } catch (err) {
          console.error('模拟回调失败', err);
        }
      }, 5000);
    } catch (err) {
      console.error('支付失败', err);
      alert('支付失败，请稍后重试');
    }
  }, [price, plan, id, docType, paymentChannel]);

  // Batch B (2026-06-09): 需求 #4 - 提交修改请求
  const handleRevise = useCallback(async () => {
    if (!reviseNote.trim() && Object.keys(reviseFields).length === 0) {
      setReviseError('请填写修改说明, 或至少修改一个字段');
      return;
    }
    setReviseSubmitting(true);
    setReviseError('');
    try {
      // 把 reviseNote 作为 _instruction 字段传给后端 (后端可选用)
      const payload: Record<string, unknown> = {
        id,
        docType,
        formDataUpdate: {
          ...reviseFields,
          ...(reviseNote.trim() ? { _instruction: reviseNote.trim() } : {}),
        },
      };
      const res = await fetch('/api/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'MAX_REVISIONS_REACHED') {
          setReviseError(data.error || '已达到最大修改次数');
        } else {
          setReviseError(data.error || '修改失败, 请稍后重试');
        }
        return;
      }
      // 成功 → 替换 result 的内容, 关闭弹窗
      setResult((prev) => prev ? {
        ...prev,
        willContent: data.docContent || prev.willContent,
        revisionCount: data.revisionCount,
        maxRevisions: data.maxRevisions,
      } : prev);
      setShowReviseModal(false);
      setReviseNote('');
      setReviseFields({});
      alert(`修改成功! 还可以再修改 ${(data.maxRevisions || 3) - (data.revisionCount || 0)} 次`);
    } catch (err) {
      console.error('修改失败', err);
      setReviseError('网络错误, 请稍后重试');
    } finally {
      setReviseSubmitting(false);
    }
  }, [id, docType, reviseNote, reviseFields]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse" aria-hidden>📋</div>
          <p className="text-slate-600 leading-relaxed-cn">正在加载您的{docLabel}草稿...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center bg-white rounded-2xl shadow-sm p-8 max-w-md">
          <div className="text-4xl mb-4" aria-hidden>❌</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">加载失败</h1>
          <p className="text-slate-600 mb-6 leading-relaxed-cn">{error || "未找到相关记录"}</p>
          <Link href="/questionnaire" className="inline-block bg-amber-500 text-white px-6 py-3 rounded-lg font-medium">
            重新开始
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-slate-600 hover:text-amber-600 transition leading-tight-cn">
            ← 返回首页
          </Link>
          <span className="font-semibold text-slate-800 leading-tight-cn">{docLabel}草稿</span>
          <div className="w-16" aria-hidden />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 成功提示 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl" aria-hidden>✅</span>
            <h2 className="text-lg font-bold text-green-800 leading-tight-cn">{docLabel}草稿已生成</h2>
          </div>
          <p className="text-green-700 text-sm leading-relaxed-cn">
            系统已根据您的填写内容生成{docLabel}草稿。请仔细阅读内容,如有疑问可咨询专业资产规划人员。
          </p>
        </div>

        {/* 文书预览 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 leading-tight-cn">{docLabel}内容预览</h3>
            {/* Batch B (2026-06-09): 需求 #4 - 修改内容按钮 + 剩余次数 badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 leading-tight-cn tabular-nums">
                {result.maxRevisions !== undefined && (
                  <>剩余修改: <span className="font-bold text-amber-600">{(result.maxRevisions - (result.revisionCount || 0))}</span> / {result.maxRevisions} 次</>
                )}
              </span>
              <button
                onClick={() => {
                  setReviseError('');
                  setReviseNote('');
                  setReviseFields({});
                  setShowReviseModal(true);
                }}
                disabled={(result.revisionCount || 0) >= (result.maxRevisions || 3)}
                className="text-sm bg-amber-100 hover:bg-amber-200 disabled:bg-slate-100 disabled:text-slate-400 text-amber-700 px-3 py-1.5 rounded-lg transition leading-tight-cn"
                aria-label="修改内容"
              >
                ✏️ 修改内容
              </button>
            </div>
          </div>
          {/* 合规水印 (v7, 2026-06-19): AI 草稿 / 不具备保障效果 红框 banner
              - 法规: 《生成式人工智能服务管理暂行办法》要求 AI 生成内容可识别
              - PRD §6.1 / ARCH §9.1 明确要求在 result 页顶部强提示 */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-4" role="alert">
            <p className="text-red-800 text-sm font-bold leading-tight-cn">
              ⚠️ AI 草稿,不具备保障效果
            </p>
            <p className="text-red-700 text-xs mt-1 leading-relaxed-cn">
              本文书为 AI 模板化生成参考,不构成法律专业意见。
              正式签署前请咨询专业资产规划人员并办理公证。
            </p>
          </div>
          <div className="prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-96 leading-relaxed-cn">
              {result.willContent || "（草稿内容）"}
            </pre>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed-cn">
            * 本模板为参考草稿,不具备保障效果。正式签署前请专业人士审核。
          </p>
        </div>

        {/* 专家审核服务 */}
        {plan === "ai" && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl" aria-hidden>👨‍⚖️</div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 mb-1 leading-tight-cn">升级:资产规划专业人士审核</h3>
                <p className="text-amber-700 text-sm mb-4 leading-relaxed-cn">
                  仅需 +¥500,即可获得资产规划专业人士1对1视频审核服务,确保文书规范有效
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/book-lawyer', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ willId: id, name: '用户预约', phone: '待填写' }),
                        });
                        const data = await res.json();
                        alert(data.message || '预约成功');
                      } catch {
                        alert('预约失败，请稍后重试');
                      }
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition"
                  >
                    预约专家审核
                  </button>
                  <button className="px-4 py-3 border-2 border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition">
                    稍后再说
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              aria-label="下载 PDF"
            >
              <span aria-hidden>📄</span>
              <span>下载PDF</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              aria-label="发送到邮箱"
            >
              <span aria-hidden>📱</span>
              <span>发送到邮箱</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-center text-slate-500 text-sm mb-4">
              订单金额:<span className="font-bold text-slate-800 tabular-nums">¥{price}</span>
            </p>
            <button
              onClick={() => {
                setPaymentChannel('wechat');
                handlePayment();
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 rounded-xl transition text-lg mb-3"
            >
              <span className="tabular-nums">微信支付 ¥{price}</span>
            </button>
            <button
              onClick={() => {
                setPaymentChannel('alipay');
                handlePayment();
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-xl transition text-lg"
            >
              <span className="tabular-nums">支付宝 ¥{price}</span>
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              <Link href="/orders" className="underline hover:text-slate-600">查看我的订单</Link>
            </p>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-center text-sm text-slate-500 leading-relaxed-cn">
          <p>如有疑问，请联系客服:📞 400-xxx-xxxx</p>
          <p className="mt-2">工作时间:周一至周五 9:00-18:00</p>
        </div>
      </main>

      {/* Batch B (2026-06-09): 需求 #4 - 修改内容弹窗 */}
      {showReviseModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revise-modal-title"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 id="revise-modal-title" className="text-lg font-bold text-slate-800 mb-2 leading-tight-cn">
              ✏️ 修改文书内容
            </h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed-cn">
              您还可以修改 <span className="font-bold text-amber-600 tabular-nums">{(result?.maxRevisions || 3) - (result?.revisionCount || 0)}</span> 次。
              请描述您要修改的内容, 系统将根据您的说明重新生成文书。
            </p>

            {/* 文字说明 */}
            <label className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn">
              修改说明 <span className="text-slate-400 font-normal">(选填, 越具体越准确)</span>
            </label>
            <textarea
              value={reviseNote}
              onChange={(e) => setReviseNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="例如: 把'长子张大明'改为'次子张小明', 把房产估值从500万改为600万"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4 leading-relaxed-cn"
            />

            {/* 字段直接编辑 (至少一个空 formData 字段可填) */}
            {result?.formData && Object.keys(result.formData).length > 0 && (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1 leading-tight-cn">
                  或直接修改字段
                </label>
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {Object.entries(result.formData).slice(0, 6).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-24 truncate" title={key}>{key}</span>
                      <input
                        type="text"
                        value={(reviseFields[key] ?? (typeof val === 'string' ? val : String(val)))}
                        onChange={(e) => setReviseFields((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {reviseError && (
              <p className="text-sm text-red-600 mb-3 leading-relaxed-cn">{reviseError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowReviseModal(false)}
                disabled={reviseSubmitting}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-600 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleRevise}
                disabled={reviseSubmitting}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviseSubmitting ? '重新生成中...' : '提交修改'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center leading-relaxed-cn">
              重新生成通常需要 5-10 秒, 请耐心等待
            </p>
          </div>
        </div>
      )}

      {/* 支付二维码弹窗 */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              {paymentStatus === 'paid' ? (
                <>
                  <div className="text-6xl mb-4" aria-hidden>✅</div>
                  <h3 id="payment-modal-title" className="text-xl font-bold text-green-600 mb-2">支付成功</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed-cn">您的订单已支付成功</p>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      router.push('/orders');
                    }}
                    className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold"
                  >
                    查看订单
                  </button>
                </>
              ) : paymentStatus === 'timeout' ? (
                <>
                  <div className="text-6xl mb-4" aria-hidden>⏰</div>
                  <h3 id="payment-modal-title" className="text-xl font-bold text-slate-700 mb-2">支付超时</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed-cn">请重新发起支付</p>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full bg-slate-500 text-white py-3 rounded-xl font-semibold"
                  >
                    关闭
                  </button>
                </>
              ) : (
                <>
                  <h3
                    id="payment-modal-title"
                    className="text-lg font-bold text-slate-800 mb-4 leading-tight-cn"
                  >
                    {paymentChannel === 'wechat' ? '微信支付' : '支付宝'}
                  </h3>
                  <div
                    className={`w-48 h-48 mx-auto mb-4 rounded-lg ${paymentChannel === 'wechat' ? 'bg-green-100' : 'bg-blue-100'} flex items-center justify-center`}
                    aria-label={`${paymentChannel === 'wechat' ? '微信' : '支付宝'} 支付二维码`}
                  >
                    {paymentChannel === 'wechat' ? (
                      <svg viewBox="0 0 100 100" className="w-32 h-32" aria-hidden>
                        <circle cx="50" cy="50" r="45" fill="#07C160"/>
                        <text x="50" y="58" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">W</text>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-32 h-32" aria-hidden>
                        <circle cx="50" cy="50" r="45" fill="#1677FF"/>
                        <text x="50" y="58" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">A</text>
                      </svg>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">
                    请使用{paymentChannel === 'wechat' ? '微信' : '支付宝'}扫码支付
                  </p>
                  <p className="text-amber-600 font-bold text-lg mb-4 tabular-nums">¥{price}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-600"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => router.push('/orders')}
                      className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl"
                    >
                      查看订单
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-500">加载中...</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
