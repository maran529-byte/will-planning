'use client';

/**
 * SiteUrlClient - 客户端动态校正 canonical / og:url.
 *
 * 背景:
 *   - 同一份 Next.js 服务 aiwill-planner.cn (主站) + h5.aiwill-planner.cn (H5)
 *   - 此前所有页面硬编码 canonical 指向主站, H5 站被搜索引擎判定为"镜像"
 *
 * 解决:
 *   - 在 root layout 注入此组件, 它会在 hydration 后根据 window.location.host
 *     校正 <link rel="canonical"> 和 <meta property="og:url">.
 *   - 这样 SSR 输出不变 (HTML 仍可索引), 客户端实际 href 正确.
 */

import { useEffect } from 'react';

export default function SiteUrlClient() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const host = window.location.host;
    const path = window.location.pathname + window.location.search;
    const isH5 = host.startsWith('h5.') || host.includes(':3001') || host.includes(':3002');
    const base = isH5 ? 'https://h5.aiwill-planner.cn' : 'https://aiwill-planner.cn';
    const url = `${base}${path}`;

    // 1. 校正 canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', url);
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = url;
      document.head.appendChild(link);
    }

    // 2. 校正 og:url
    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', url);
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      meta.setAttribute('content', url);
      document.head.appendChild(meta);
    }
  }, []);

  return null;
}