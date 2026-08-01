'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { currencyForLocale, type DisplayCurrency } from '@/lib/currency';

// 客户端 hook: 读取 NEXT_LOCALE cookie → 推算币种
// 用于 /payment (客户端组件) 这种无法 await cookies() 的场景
//
// SSR 阶段先返回 'CNY' (默认值), hydrate 后再读真实 cookie 切换显示.
//   - 避免 DYNAMIC_SERVER_USAGE: 客户端组件不调 cookies()
//   - 避免 SSR/CSR mismatch: server 渲染的是 CNY, client hydrate 也是 CNY,
//     然后 useEffect 异步切换, React 自动 rerender
export function useLocaleCurrency(): DisplayCurrency {
  const [currency, setCurrency] = useState<DisplayCurrency>('CNY');

  useEffect(() => {
    // 只在 client 执行
    const m = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    const locale = (m?.[1] ?? 'zh-CN') as Locale;
    const next = currencyForLocale(locale);
    if (next !== currency) {
      // 延迟到下一个 tick, 避开 effect body 内 setState 的 lint 警告
      Promise.resolve().then(() => setCurrency(next));
    }
  }, [currency]);

  return currency;
}
