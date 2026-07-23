import type { Metadata } from 'next';

/**
 * /orders - 我的订单页 (客户端组件)
 *
 * 本 layout 用于注入 metadata, page.tsx 是 'use client' 不能直接 export const metadata.
 * 订单页是登录后的私有页面, 搜索引擎无需索引.
 */
export const metadata: Metadata = {
  title: '我的订单',
  description: '查看历史订单, 导出 PDF/Word, 申请发票',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/orders',
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

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
