"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDocLabel, getSigningGuide } from "@/lib/document-types";

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
  // 兼容 ?id= / ?order= / ?will_id= 三种命名 (deploy-fix 审计: 之前只读 id, 导致
  //  /result?order=xxx 看到「加载失败」)
  const id = searchParams.get("id") || searchParams.get("order") || searchParams.get("will_id");
  const plan = searchParams.get("plan") || "ai";
  const docType = searchParams.get("docType") || searchParams.get("type") || "will";
  // 改版 v5 (2026-06-09): 用 @/lib/document-types.getDocLabel(), 统一兜底
  const docLabel = getDocLabel(docType);
  const [result, setResult] = useState<ResultData | null>(null);
  // 改版 v10 (2026-06-28): 初始 error 派生自 id, 无 id 时直接展示错误
  const [error, setError] = useState(() => id ? "" : "缺少草稿 ID, 请先完成问卷生成草稿");
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
    // 改版 v10 (2026-06-28): 无 id 参数直接置 error, 避免永远 loading
    // 注: 无 id 时 setError 改在 useState 初始值中派生, 避免 effect 内 setState
    if (!id) return;
    // will 走 /api/generate-will, 其他 5 类走 /api/generate-document?type=xxx
    const endpoint = docType === "will"
      ? `/api/generate-will?id=${id}`
      : `/api/generate-document?type=${docType}&id=${id}`;
    fetch(endpoint)
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, data }) => {
        // 修复 (2026-07-10): API 返 { code: "NOT_FOUND", error: ... } 时必须展示错误,
        //   否则用户会看到假的"草稿已生成"页面 (data 不是 result 结构)
        if (data.error || data.code === "NOT_FOUND" || !ok) {
          setError(data.error || "草稿不存在或已过期, 请重新生成");
          return;
        }
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
    expert: 999,    // 改版 v3 (2026-07-30): 历史 expert 订单仍可继续支付, 但新用户 UI 看不到
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
          <div className="prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-96 leading-relaxed-cn">
              {result.willContent || "（草稿内容）"}
            </pre>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed-cn">
            * 本模板为参考草稿,不具备保障效果。正式签署前请专业人士审核。
          </p>
        </div>

        {/* 合规审查 #5: 签署指引卡片 — 防止用户直接打印签名导致形式要件瑕疵 */}
        {(() => {
          const guide = getSigningGuide(docType);
          if (!guide) return null;
          return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-6 mb-6 border-2 border-blue-200" role="region" aria-label="签署指引">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl" aria-hidden>📋</span>
                <h3 className="text-lg font-bold text-blue-900 leading-tight-cn">签署指引 (法律形式要件)</h3>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full ml-auto">{guide.lawRef}</span>
              </div>
              {guide.alert && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-800 px-3 py-2 rounded text-sm mb-3 leading-relaxed-cn" role="alert">
                  {guide.alert}
                </div>
              )}
              <div className="bg-white/70 rounded-lg p-3 mb-4 text-sm text-slate-700 leading-relaxed-cn">
                <span className="font-semibold text-blue-800">公证建议: </span>{guide.notarization}
              </div>
              <ol className="space-y-3">
                {guide.steps.map((step) => (
                  <li key={step.order} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center">
                      {step.order}
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="font-semibold text-slate-800 text-sm leading-tight-cn">{step.title}</p>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed-cn">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-blue-200 leading-relaxed-cn">
                * 文书下载后, 请严格按上述步骤完成签署。形式要件不齐将导致文书无效。
              </p>
            </div>
          );
        })()}

        {/* 定制服务入口 (改版 v4, 2026-07-30): 合并 ¥999 专家版 + 定制服务留言, 不展示价格 */}
        {plan === "ai" && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl" aria-hidden>💎</div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 mb-1 leading-tight-cn">复杂场景? 留言定制服务</h3>
                <p className="text-amber-700 text-sm mb-4 leading-relaxed-cn">
                  跨境 / 股权 / 大额资产 / 再婚多套房产等复杂场景, 可留言定制服务, 由资产规划专业人士 1 对 1 对接, 24 小时内邮件回复.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contact"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition text-center"
                  >
                    留言定制服务
                  </Link>
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
              onClick={() => {
                if (!id) {
                  alert('请先生成文书');
                  return;
                }
                // 付费检查: ai 计划也能下载 (营销策略), 但提示定制服务
                const tip = plan === 'ai' ? '\n\n(智能版含核心条款, 复杂场景可走定制服务)' : '';
                if (!confirm(`即将下载 PDF${tip}\n确认继续？`)) return;
                window.location.href = `/api/doc/${id}/download`;
              }}
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

          {/* 改版 v3 (2026-07-30) 跨服务分享/升级 CTA
              - 用户支付意愿强时给「微信好友」「定制服务」入口
              - 「分享给律师」解决用户「我想让人帮我看看」的诉求 */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: `${docLabel}草稿`, text: '我用家有所爱生成了一份家庭财产文书, 你也试试', url: window.location.href });
                } else {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('链接已复制, 粘贴到微信分享给好友');
                }
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition"
              aria-label="分享给微信好友"
            >
              <span aria-hidden>💬</span>
              <span>微信好友</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('链接已复制, 发给律师/公证员帮您核对');
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition"
              aria-label="发给律师核对"
            >
              <span aria-hidden>👨‍⚖️</span>
              <span>给律师看</span>
            </button>
            {plan === "ai" ? (
              <Link
                href="/contact"
                className="flex items-center justify-center gap-1.5 px-2 py-2 border border-amber-300 bg-amber-50 rounded-lg text-xs text-amber-700 hover:bg-amber-100 transition"
                aria-label="了解定制服务"
              >
                <span aria-hidden>💎</span>
                <span>定制服务</span>
              </Link>
            ) : (
              <Link
                href="/orders"
                className="flex items-center justify-center gap-1.5 px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition"
                aria-label="查看订单"
              >
                <span aria-hidden>📋</span>
                <span>我的订单</span>
              </Link>
            )}
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
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 rounded-xl transition text-lg mb-3 flex items-center justify-center gap-2"
            >
              <span className="text-xl" aria-hidden>💚</span>
              <span className="tabular-nums">微信支付 ¥{price}</span>
            </button>
            <button
              onClick={() => {
                setPaymentChannel('alipay');
                handlePayment();
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-xl transition text-lg flex items-center justify-center gap-2"
            >
              <span className="text-xl" aria-hidden>💙</span>
              <span className="tabular-nums">支付宝 ¥{price}</span>
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              <Link href="/orders" className="underline hover:text-slate-600">查看我的订单</Link>
            </p>

            {/* 改版 v11 (2026-06-29) 安全徽章 - 支付前最后一公里打消疑虑
                - SSL/TLS: 浏览器地址栏小锁
                - 微信支付官方: 腾讯财付通, 资金不经过家有所爱
                - 7 天退款: 显眼承诺 */}
            <div className="mt-5 pt-4 border-t border-dashed border-slate-200">
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1" title="全程 HTTPS / TLS 1.3">
                  <span aria-hidden>🔒</span>
                  <span>SSL 加密</span>
                </span>
                <span className="flex items-center gap-1" title="微信支付官方通道">
                  <span aria-hidden>✅</span>
                  <span>微信支付官方</span>
                </span>
                <span className="flex items-center gap-1" title="7 天无理由退款">
                  <span aria-hidden>💰</span>
                  <span>7 天无理由退款</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed-cn">
                资金由腾讯财付通 / 支付宝托管, 不经过家有所爱账户
              </p>
            </div>
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

export function ResultClientRoot() {
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
