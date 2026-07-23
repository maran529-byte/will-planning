"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PRICING, PLAN_DISPLAY } from "@/lib/config";

interface Order {
  id: string;
  order_no: string;
  amount: number;
  plan: "ai" | "expert" | "lawyer" | "family";
  status: "pending" | "paid" | "refunded" | "cancelled";
  paid_at?: string;
  payment_channel?: "wechat" | "alipay" | "manual" | "demo" | "hupijiao";
  will_id?: string;
  created_at: string;
}

export function OrderDetailClientRoot() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params?.id ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        setNeedsLogin(true);
        setError(data?.error ?? "请先登录");
        return;
      }
      if (!res.ok || data.error) {
        setError(data?.error ?? "订单不存在或已过期");
        return;
      }
      setOrder(data.order);
    } catch (e) {
      setError("网络异常,请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void fetchOrder();
    });
  }, [fetchOrder]);

  const getPlanName = (plan: string) =>
    PLAN_DISPLAY[plan] ?? PRICING.guide.name;

  const getStatusBadge = (status: Order["status"]) => {
    const styles: Record<Order["status"], string> = {
      pending: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
      refunded: "bg-purple-100 text-purple-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const labels: Record<Order["status"], string> = {
      pending: "待支付",
      paid: "已支付",
      refunded: "已退款",
      cancelled: "已取消",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/orders")}
            className="text-slate-600 hover:text-amber-600 transition leading-tight-cn"
            aria-label="返回订单列表"
          >
            ← 返回订单
          </button>
          <span className="font-bold text-slate-800 text-lg leading-tight-cn">
            订单详情
          </span>
          <div className="w-24" aria-hidden />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin text-4xl mb-4" aria-hidden>
              ⏳
            </div>
            <p className="text-slate-600 leading-relaxed-cn">加载中...</p>
          </div>
        ) : needsLogin ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4" aria-hidden>
              🔐
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 leading-tight-cn">
              请先登录
            </h2>
            <p className="text-slate-500 mb-6 leading-relaxed-cn">
              出于隐私保护,订单详情仅本人可见。
            </p>
            <div className="space-y-3">
              <Link
                href={`/login?return=/orders/${orderId}`}
                className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition text-center"
              >
                <span aria-hidden>🔑 </span>立即登录(邮箱密码)
              </Link>
              <Link
                href={`/wechat/bind?return=/orders/${orderId}`}
                className="block w-full bg-[#07C160] hover:bg-[#06B05A] text-white font-semibold px-6 py-3 rounded-xl transition text-center"
              >
                <span aria-hidden>🔗 </span>绑定微信账号
              </Link>
            </div>
          </div>
        ) : error || !order ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4" aria-hidden>
              📭
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 leading-tight-cn">
              {error ?? "订单不存在"}
            </h2>
            <p className="text-slate-500 mb-6 leading-relaxed-cn">
              该订单可能已过期或不属于您当前账号。
            </p>
            <Link
              href="/orders"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              查看我的订单
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-xl font-bold text-slate-800 leading-tight-cn">
                  {getPlanName(order.plan)} · 订单详情
                </h1>
                {getStatusBadge(order.status)}
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">订单号</dt>
                  <dd className="font-mono tabular-nums text-slate-800">
                    {order.order_no}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">套餐</dt>
                  <dd className="text-slate-800 leading-tight-cn">
                    {getPlanName(order.plan)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">金额</dt>
                  <dd className="font-bold text-amber-600 tabular-nums">
                    ¥{(order.amount / 100).toFixed(2)}
                  </dd>
                </div>
                {order.payment_channel && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">支付方式</dt>
                    <dd className="text-slate-800 leading-tight-cn">
                      {order.payment_channel === "wechat"
                        ? "微信支付"
                        : order.payment_channel === "alipay"
                          ? "支付宝"
                          : order.payment_channel === "hupijiao"
                            ? "虎皮椒(微信聚合)"
                            : order.payment_channel === "manual"
                              ? "客服手动确认"
                              : "测试通道"}
                    </dd>
                  </div>
                )}
                {order.paid_at && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">支付时间</dt>
                    <dd className="text-slate-800 leading-relaxed-cn">
                      {formatDate(order.paid_at)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">创建时间</dt>
                  <dd className="text-slate-800 leading-relaxed-cn">
                    {formatDate(order.created_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 space-y-3">
                {order.status === "pending" && order.will_id && (
                  <Link
                    href={`/payment?plan=${order.plan}&will_id=${order.will_id}`}
                    className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition text-center"
                  >
                    继续支付
                  </Link>
                )}
                {order.status === "paid" && order.will_id && (
                  <Link
                    href={`/result?id=${order.will_id}&plan=${order.plan}`}
                    className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition text-center"
                  >
                    查看文书草稿
                  </Link>
                )}
                <button
                  onClick={() => router.push("/orders")}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition"
                >
                  返回订单列表
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
