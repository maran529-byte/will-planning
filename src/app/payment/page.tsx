"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PRICING } from "@/lib/config";

interface Order {
  id: string;
  order_no: string;
  amount: number;
  plan: 'ai' | 'lawyer' | 'family';
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paid_at?: string;
  payment_channel?: 'wechat' | 'alipay';
  created_at: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") || "ai";
  const willId = searchParams.get("will_id");
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);
  const [timeout, setTimeout] = useState(false);

  const planData = planParam === 'lawyer' ? PRICING.lawyerReview 
    : planParam === 'family' ? PRICING.familyHeritage 
    : PRICING.aiGuide;

  const priceInYuan = planData.price;
  const priceInFen = Math.round(priceInYuan * 100);

  useEffect(() => {
    createNewOrder();
  }, []);

  const createNewOrder = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: priceInFen,
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
  };

  const startPayment = async (method: 'wechat' | 'alipay') => {
    setPaymentMethod(method);
    setShowQR(true);
    setPaying(true);
    setTimeout(false);
    setPollingCount(0);
  };

  // 轮询订单状态
  useEffect(() => {
    if (!paying || !order) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`);
        const data = await res.json();
        
        if (data.success && data.order) {
          if (data.order.status === 'paid') {
            setPaymentSuccess(true);
            setPaying(false);
            clearInterval(pollInterval);
          } else if (data.order.status === 'cancelled') {
            setPaying(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('轮询订单状态失败:', error);
      }

      setPollingCount(prev => {
        const next = prev + 1;
        if (next >= 30) { // 30次轮询约30秒
          setTimeout(true);
          setPaying(false);
          clearInterval(pollInterval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [paying, order]);

  const handlePayConfirm = async () => {
    if (!order || !paymentMethod) return;

    try {
      await fetch('/api/payment/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          status: 'paid',
          payment_channel: paymentMethod,
        }),
      });
    } catch (error) {
      console.error('确认支付失败:', error);
    }
  };

  const closeQR = () => {
    setShowQR(false);
    setPaymentMethod(null);
  };

  if (loading || creating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-600">正在创建订单...</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">支付成功</h1>
          <p className="text-slate-600 mb-6">您的订单已支付成功</p>
          
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">订单号</span>
              <span className="font-mono text-sm">{order?.order_no}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">套餐</span>
              <span className="text-slate-800">{planData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">金额</span>
              <span className="font-bold text-amber-600">¥{priceInYuan}</span>
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={willId ? `/result?id=${willId}&plan=${planParam}` : '/'} className="text-slate-600 hover:text-amber-600 transition">
            ← 返回
          </Link>
          <span className="font-semibold text-slate-800">订单支付</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 订单摘要 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">订单详情</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">套餐</span>
              <span className="font-semibold text-slate-800">{planData.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">描述</span>
              <span className="text-slate-700 text-sm">{planData.description}</span>
            </div>
            {planData.perTime && (
              <div className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                按次收费
              </div>
            )}
          </div>
        </div>

        {/* 订单金额 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">应付金额</span>
            <span className="text-3xl font-bold text-amber-600">¥{priceInYuan}</span>
          </div>
          
          {order && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
              订单号: {order.order_no}
            </div>
          )}
        </div>

        {/* 支付方式选择 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">选择支付方式</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => startPayment('wechat')}
              disabled={paying}
              className="flex flex-col items-center gap-2 p-6 border-2 border-green-200 rounded-xl hover:bg-green-50 transition disabled:opacity-50"
            >
              <div className="text-4xl">💚</div>
              <span className="font-medium text-slate-800">微信支付</span>
            </button>
            
            <button
              onClick={() => startPayment('alipay')}
              disabled={paying}
              className="flex flex-col items-center gap-2 p-6 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition disabled:opacity-50"
            >
              <div className="text-4xl">💙</div>
              <span className="font-medium text-slate-800">支付宝</span>
            </button>
          </div>
        </div>

        {/* 支付二维码弹窗 */}
        {showQR && paymentMethod && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {paymentMethod === 'wechat' ? '微信' : '支付宝'}支付
                </h3>
                <p className="text-slate-500 text-sm mt-1">请扫描下方二维码完成支付</p>
              </div>

              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                {/* 模拟二维码图片 */}
                <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📱</div>
                    <p className="text-xs text-slate-500">模拟二维码</p>
                    <p className="text-xs text-slate-400 mt-1">支付 ¥{priceInYuan}</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-slate-500 mb-4">
                支付成功后点击下方按钮确认
              </div>

              {timeout ? (
                <div className="text-center">
                  <div className="text-4xl mb-2">⏰</div>
                  <p className="text-red-600 font-medium mb-4">支付超时</p>
                  <button
                    onClick={closeQR}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
                  >
                    重新选择支付方式
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handlePayConfirm}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition"
                  >
                    我已支付成功
                  </button>
                  <button
                    onClick={closeQR}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
                  >
                    取消
                  </button>
                </div>
              )}

              <div className="mt-4 text-center text-xs text-slate-400">
                <p>模拟环境：无需真实支付</p>
              </div>
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>支付过程中如有疑问，请联系客服</p>
        </div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-500">加载中...</p></div>}>
      <PaymentContent />
    </Suspense>
  );
}