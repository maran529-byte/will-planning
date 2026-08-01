'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

type Locale = 'zh-CN' | 'en-US';

function getCookieLocale(): Locale {
  if (typeof document === 'undefined') return 'zh-CN';
  const m = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  const v = m?.[1];
  return v === 'en-US' ? 'en-US' : 'zh-CN';
}

// 顶部语言切换按钮 (中英)
// 改版 v1 (2026-07-16, 全球化项目 W1.9)
// 注: client component 自读 cookie, 避免 SiteHeader (server component) 因 cookies()
//     变成 dynamic, 导致其他 prerender 页面 500.
export default function LocaleSwitcher() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<Locale>('zh-CN');

  useEffect(() => {
    setCurrent(getCookieLocale());
  }, []);

  const switchTo = (next: Locale) => {
    if (next === current) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setCurrent(next);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="inline-flex items-center text-xs border border-slate-200 rounded-full overflow-hidden">
      <button
        onClick={() => switchTo('zh-CN')}
        disabled={pending}
        className={`px-2.5 py-1 transition ${
          current === 'zh-CN'
            ? 'bg-amber-500 text-white font-semibold'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
        aria-label="切换到简体中文"
      >
        中
      </button>
      <button
        onClick={() => switchTo('en-US')}
        disabled={pending}
        className={`px-2.5 py-1 transition ${
          current === 'en-US'
            ? 'bg-amber-500 text-white font-semibold'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
