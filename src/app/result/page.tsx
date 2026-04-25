"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ResultData {
  id: string;
  willContent: string;
  plan: string;
  price: number;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const plan = searchParams.get("plan") || "ai";
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentChannel, setPaymentChannel] = useState<'wechat' | 'alipay'>('wechat');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'timeout'>('pending');
  const [orderId, setOrderId] = useState<string>('');
  const [polling, setPolling] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetch(`/api/generate-will?id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          setResult(data);
          setLoading(false);
        })
        .catch(() => {
          setError("加载失败，请重试");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id]);

  // 轮询订单状态
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
        } else if (pollingCount >= 20) {
          setPaymentStatus('timeout');
          setPolling(false);
          clearInterval(pollInterval);
        }
        setPollingCount(prev => prev + 1);
      } catch (err) {
        console.error('轮询失败', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [polling, orderId, pollingCount]);

  const priceMap: Record<string, number> = {
    ai: 19.9,
    lawyer: 999,
    family: 4699,
  };

  const price = priceMap[plan] || 19.9;

  // 处理支付
  const handlePayment = async () => {
    try {
      // 创建订单
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price * 100, // 转为分
          plan,
          will_id: id,
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
      setPollingCount(0);
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-slate-600">正在加载您的遗嘱草稿...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-sm p-8 max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">加载失败</h1>
          <p className="text-slate-600 mb-6">{error || "未找到相关记录"}</p>
          <Link href="/questionnaire" className="inline-block bg-amber-500 text-white px-6 py-3 rounded-lg font-medium">
            重新开始
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-slate-600 hover:text-amber-600 transition">
            ← 返回首页
          </Link>
          <span className="font-semibold text-slate-800">遗嘱草稿</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 成功提示 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h2 className="text-lg font-bold text-green-800">遗嘱草稿已生成</h2>
          </div>
          <p className="text-green-700 text-sm">
            AI已根据您的填写内容生成遗嘱草稿。请仔细阅读内容，如有疑问可预约律师进行1对1审核。
          </p>
        </div>

        {/* 遗嘱预览 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">遗嘱内容预览</h3>
          <div className="prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-96">
              {result.willContent || "（草稿内容）"}
            </pre>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            * 此为AI生成的草稿版本，不具备法律效力。正式签署前请律师审核。
          </p>
        </div>

        {/* 律师审核服务 */}
        {plan === "ai" && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl">👨‍⚖️</div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 mb-1">升级：律师专业审核</h3>
                <p className="text-amber-700 text-sm mb-4">
                  仅需 +¥500，即可获得专业律师1对1视频审核服务，确保遗嘱合法有效
                </p>
                <div className="flex gap-3">
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
                  预约律师审核
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
            <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              <span>📄</span>
              <span>下载PDF</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              <span>📱</span>
              <span>发送到邮箱</span>
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-center text-slate-500 text-sm mb-4">
              订单金额：<span className="font-bold text-slate-800">¥{price}</span>
            </p>
            <button
              onClick={() => {
                setPaymentChannel('wechat');
                handlePayment();
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 rounded-xl transition text-lg mb-3"
            >
              微信支付 ¥{price}
            </button>
            <button
              onClick={() => {
                setPaymentChannel('alipay');
                handlePayment();
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-xl transition text-lg"
            >
              支付宝 ¥{price}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              <Link href="/orders" className="underline hover:text-slate-600">查看我的订单</Link>
            </p>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>如有疑问，请联系客服：📞 400-xxx-xxxx</p>
          <p className="mt-2">工作时间：周一至周五 9:00-18:00</p>
        </div>
      </main>

      {/* 支付二维码弹窗 */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              {paymentStatus === 'paid' ? (
                <>
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-green-600 mb-2">支付成功</h3>
                  <p className="text-slate-600 mb-6">您的订单已支付成功</p>
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
                  <div className="text-6xl mb-4">⏰</div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">支付超时</h3>
                  <p className="text-slate-600 mb-6">请重新发起支付</p>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full bg-slate-500 text-white py-3 rounded-xl font-semibold"
                  >
                    关闭
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    {paymentChannel === 'wechat' ? '微信支付' : '支付宝'}
                  </h3>
                  <div className={`w-48 h-48 mx-auto mb-4 rounded-lg ${paymentChannel === 'wechat' ? 'bg-green-100' : 'bg-blue-100'} flex items-center justify-center`}>
                    {paymentChannel === 'wechat' ? (
                      <svg viewBox="0 0 100 100" className="w-32 h-32">
                        <circle cx="50" cy="50" r="45" fill="#07C160"/>
                        <text x="50" y="58" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">W</text>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-32 h-32">
                        <circle cx="50" cy="50" r="45" fill="#1677FF"/>
                        <text x="50" y="58" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">A</text>
                      </svg>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mb-4">请使用{paymentChannel === 'wechat' ? '微信' : '支付宝'}扫码支付</p>
                  <p className="text-amber-600 font-bold text-lg mb-4">¥{price}</p>
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-500">加载中...</p></div>}>
      <ResultContent />
    </Suspense>
  );
}