import type { MetadataRoute } from 'next';

/**
 * PWA / 移动端 manifest.
 * 关键字段: name, short_name, icons, theme_color, start_url, display
 * 注: 完整 PWA 还需要 service worker (不在本任务范围)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '爱的延续 · 智能资产规划',
    short_name: '爱的延续',
    description: 'AI 智能生成符合中国《民法典》的遗嘱与资产规划文书, 资产规划专业人士兜底审核',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#f59e0b',
    lang: 'zh-CN',
    categories: ['finance', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
