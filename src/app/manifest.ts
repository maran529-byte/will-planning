import type { MetadataRoute } from 'next';

/**
 * PWA / 移动端 manifest.
 * 关键字段: name, short_name, icons, theme_color, start_url, display
 * 注: 完整 PWA 还需要 service worker (不在本任务范围)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '家有所爱 · 婚姻财产与资产规划',
    short_name: '家有所爱',
    description: '面向婚前 / 婚内 / 离婚 / 抚养 / 赠与 5 类家庭场景的智能文书平台, 资产规划专业人士兜底审核',
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
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
