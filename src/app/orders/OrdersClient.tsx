"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PRICING, PLAN_DISPLAY } from "@/lib/config";

interface Order {
  id: string;
  order_no: string;
  amount: number;
  plan: 'ai' | 'expert' | 'lawyer' | 'family';  // 兼容历史 'lawyer' / 'family'
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paid_at?: string;
  payment_channel?: 'wechat' | 'alipay';
  will_id?: string;
  openid?: string;
  created_at: string;
}

export function OrdersClientRoot() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setAuthenticated(!!data.authenticated);
      }
    } catch (error) {
      console.error('获取订单失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the fetch to avoid the setState-in-effect cascading render warning.
    Promise.resolve().then(() => {
      void fetchOrders();
    });
  }, [fetchOrders]);

  const getStatusBadge = (status: Order['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      refunded: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels = {
      pending: '待支付',
      paid: '已支付',
      refunded: '已退款',
      cancelled: '已取消',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPlanName = (plan: string) => {
    return PLAN_DISPLAY[plan] ?? PRICING.guide.name;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4" aria-hidden>⏳</div>
          <p className="text-slate-600 leading-relaxed-cn">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-slate-600 hover:text-amber-600 transition leading-tight-cn"
          >
            ← 返回首页
          </Link>
          <h1 className="font-bold text-slate-800 text-lg leading-tight-cn">我的订单</h1>
          <div className="w-24" aria-hidden />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4" aria-hidden>📋</div>
            {authenticated ? (
              <>
                <h2 className="text-xl font-bold text-slate-800 mb-2 leading-tight-cn">暂无订单</h2>
                <p className="text-slate-500 mb-6 leading-relaxed-cn">您还没有创建任何订单</p>
                <Link
                  href="/"
                  className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition"
                >
                  立即预订
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-800 mb-2 leading-tight-cn">请先登录</h2>
                <p className="text-slate-500 mb-6 leading-relaxed-cn">
                  选择您方便的登录方式查看订单
                </p>
                <div className="space-y-3">
                  <Link
                    href="/login?return=/orders"
                    className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition text-center"
                  >
                    <span aria-hidden>🔑 </span>立即登录（邮箱密码）
                  </Link>
                  <Link
                    href="/wechat/bind?return=/orders"
                    className="block w-full bg-[#07C160] hover:bg-[#06B05A] text-white font-semibold px-6 py-3 rounded-xl transition text-center"
                  >
                    <span aria-hidden>🔗 </span>绑定微信账号
                  </Link>
                </div>
                <p className="mt-3 text-xs text-slate-400 leading-relaxed-cn">
                  老用户用邮箱密码登录 · 新用户可绑定公众号
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                className="w-full text-left bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                onClick={() => setSelectedOrder(order)}
                aria-label={`订单 ${order.order_no}, ${getPlanName(order.plan)}, 状态 ${order.status}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-mono text-sm text-slate-500 mb-1 tabular-nums">
                      {order.order_no}
                    </div>
                    <div className="font-semibold text-slate-800 leading-tight-cn">
                      {getPlanName(order.plan)}
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 leading-relaxed-cn">
                    {formatDate(order.created_at)}
                  </span>
                  <span className="font-bold text-amber-600 tabular-nums">
                    ¥{(order.amount / 100).toFixed(2)}
                  </span>
                </div>

                {order.will_id && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <Link
                      href={`/result?id=${order.will_id}&plan=${order.plan}`}
                      className="text-sm text-amber-600 hover:text-amber-700 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      查看相关草稿 →
                    </Link>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 订单详情弹窗 */}
        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
          >
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3
                  id="order-modal-title"
                  className="text-lg font-bold text-slate-800 leading-tight-cn"
                >
                  订单详情
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-slate-600 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
                  aria-label="关闭订单详情"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">订单号</span>
                  <span className="font-mono text-sm tabular-nums">{selectedOrder.order_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">套餐</span>
                  <span className="text-slate-800 leading-tight-cn">{getPlanName(selectedOrder.plan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">金额</span>
                  <span className="font-bold text-amber-600 tabular-nums">
                    ¥{(selectedOrder.amount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">状态</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                {selectedOrder.payment_channel && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">支付方式</span>
                    <span className="text-slate-800">
                      {selectedOrder.payment_channel === 'wechat' ? '微信支付' : '支付宝'}
                    </span>
                  </div>
                )}
                {selectedOrder.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">支付时间</span>
                    <span className="text-slate-800 leading-relaxed-cn">{formatDate(selectedOrder.paid_at)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">创建时间</span>
                  <span className="text-slate-800 leading-relaxed-cn">{formatDate(selectedOrder.created_at)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {selectedOrder.status === 'pending' && selectedOrder.will_id && (
                  <Link
                    href={`/payment?plan=${selectedOrder.plan}&will_id=${selectedOrder.will_id}`}
                    className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition text-center"
                  >
                    继续支付
                  </Link>
                )}
                {selectedOrder.status === 'paid' && selectedOrder.will_id && (
                  <Link
                    href={`/result?id=${selectedOrder.will_id}&plan=${selectedOrder.plan}`}
                    className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition text-center"
                  >
                    查看草稿
                  </Link>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        </main>
    </div>
  );
}