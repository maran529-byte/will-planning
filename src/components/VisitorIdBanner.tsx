'use client';

/**
 * VisitorIdBanner - 顶部首访提示横幅
 *
 * 改版 v2 (Phase 2, 2026-06-07):
 *   - 客户首次访问首页时, 顶部显示「请设置访客编号」横幅
 *   - 拉到 openid 后 (即 bind 完成后回跳), 横幅自动消失
 *   - Phase 4 升级后可在此展示「推广码 + 当前已绑定编号」组合
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function VisitorIdBanner() {
  const [openid, setOpenid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. 拉当前 openid
    fetch('/api/dev/set-openid', { method: 'GET' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.openid) setOpenid(data.openid);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 2. 检查 localStorage 是否已 dismiss (24 小时内不再显示)
    const dismissedAt = localStorage.getItem('visitor_id_banner_dismissed_at');
    if (dismissedAt) {
      const ts = parseInt(dismissedAt, 10);
      if (Date.now() - ts < 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  if (loading) return null;
  if (openid) return null; // 已绑定, 不显示
  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 min-w-0 flex-1">
          <span className="flex-shrink-0">🔖</span>
          <span className="truncate">
            首次访问请先
            <Link href="/wechat/bind" className="font-semibold underline mx-1">
              设置访客编号
            </Link>
            (用于关联订单/草稿)
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('visitor_id_banner_dismissed_at', String(Date.now()));
            setDismissed(true);
          }}
          className="flex-shrink-0 text-amber-700 hover:text-amber-900 text-lg leading-none"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
    </div>
  );
}
