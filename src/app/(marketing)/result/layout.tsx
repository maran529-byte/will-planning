import type { Metadata } from 'next';

/**
 * /result - 文书结果页 (客户端组件)
 *
 * 本 layout 用于注入 metadata, page.tsx 是 'use client' 不能直接 export const metadata.
 * 结果页与用户具体草稿 ID 绑定, 无需被搜索引擎索引.
 */
export const metadata: Metadata = {
  title: '文书结果',
  description: '查看/下载您生成的家庭文书, 可导出 PDF/Word',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/result',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
