'use client';

/**
 * 微信公众号关注入口
 *
 * 改版 v2 (2026-07-03): "微信搜" 按钮包成 weixin:// URL scheme 唤起链接
 *  - 在 PC 端: 用户点击 → 系统尝试唤起微信客户端 (装了微信的话会切到微信)
 *  - 没装微信: 浏览器 noop, 用户可手动扫码
 *  - 不再是只读文字, 提供"点我唤起微信" 的明确 CTA
 *
 * 改版 v3 (2026-07-30): 桌面端兜底
 *  - 检测 navigator.userAgent, 仅在 Mobile/WeChat 环境用 weixin://
 *  - 桌面端显示文字提示 + 二维码图片, 避免无效跳转
 */

import { useEffect, useState } from 'react';

export default function WeChatFollow({
  variant = 'inline',
  mpName = '家有所爱',
  mpSearchKeyword = '家有所爱',
}: {
  variant?: 'inline' | 'card' | 'compact';
  mpName?: string;
  mpSearchKeyword?: string;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent;
    setIsMobile(/MicroMessenger|iPhone|iPad|iPod|Android|Mobile/i.test(ua));
  }, []);

  // 桌面端: 显示文字提示 + 让用户手动扫码 (避免 weixin:// 无效)
  if (!isMobile) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-base">📱</span>
          <span className="text-slate-600">关注公众号</span>
          <span className="font-semibold text-slate-800">「{mpName}」</span>
          <span className="text-slate-400">·</span>
          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-200">
            微信搜 {mpSearchKeyword}
          </span>
          <span className="text-slate-400 text-xs">(手机扫码)</span>
        </div>
      );
    }

    if (variant === 'card') {
      return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 my-8">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <img
                src="/wechat-mp-qr.png?v=20260731"
                alt="扫码关注公众号「家有所爱」"
                className="w-28 h-28 object-contain rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span>📱</span>
                <span>关注公众号「{mpName}」</span>
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-3">
                微信扫码关注公众号, 第一时间获取:
              </p>
              <ul className="text-slate-600 text-sm space-y-1 mb-3">
                <li>· 文书模板更新通知</li>
                <li>· 资产规划小贴士</li>
                <li>· 订单状态实时推送</li>
              </ul>
              <p className="text-emerald-700 text-sm font-medium">
                💡 用手机微信扫一扫左侧二维码, 或搜索「{mpSearchKeyword}」
              </p>
            </div>
          </div>
        </div>
      );
    }

    // inline: 桌面端文字版
    return (
      <div className="flex items-center justify-center gap-3 text-slate-300 text-sm">
        <span className="text-lg">📱</span>
        <span>关注公众号</span>
        <span className="font-semibold text-white">「{mpName}」</span>
        <span className="text-slate-500">·</span>
        <span>微信搜</span>
        <span className="px-2 py-0.5 bg-slate-700 text-slate-200 rounded text-xs">
          {mpSearchKeyword}
        </span>
        <span className="text-slate-400 text-xs">(手机扫码)</span>
      </div>
    );
  }

  // 移动端: 用 weixin:// 唤起微信
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-base">📱</span>
        <span className="text-slate-600">关注公众号</span>
        <span className="font-semibold text-slate-800">「{mpName}」</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">微信搜</span>
        <a
          href="weixin://"
          className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium border border-emerald-200 transition"
          aria-label="唤起微信搜索公众号"
        >
          {mpSearchKeyword}
        </a>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 my-8">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            <img
              src="/wechat-mp-qr.png?v=20260731"
              alt="扫码关注公众号「家有所爱」"
              className="w-28 h-28 object-contain rounded-lg"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span>📱</span>
              <span>关注公众号「{mpName}」</span>
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-3">
              微信扫码关注公众号, 第一时间获取:
            </p>
            <ul className="text-slate-600 text-sm space-y-1 mb-3">
              <li>· 文书模板更新通知</li>
              <li>· 资产规划小贴士</li>
              <li>· 订单状态实时推送</li>
            </ul>
            <a
              href="weixin://"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition"
              aria-label="唤起微信搜索公众号"
            >
              <span aria-hidden>💬</span>
              <span>点我唤起微信 → 搜「{mpSearchKeyword}」</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // inline: 移动端
  return (
    <div className="flex items-center justify-center gap-3 text-slate-300 text-sm">
      <span className="text-lg">📱</span>
      <span>关注公众号</span>
      <span className="font-semibold text-white">「{mpName}」</span>
      <span className="text-slate-500">·</span>
      <span>微信搜</span>
      <a
        href="weixin://"
        className="px-2 py-0.5 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded text-xs transition"
        aria-label="唤起微信搜索公众号"
      >
        {mpSearchKeyword}
      </a>
    </div>
  );
}