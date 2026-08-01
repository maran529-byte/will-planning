import type { Metadata } from 'next';

/**
 * /payment - 支付订单页 (客户端组件)
 *
 * 本 layout 用于注入 metadata, page.tsx 是 'use client' 不能直接 export const metadata.
 * 支付页是流程页, 搜索引擎无需索引.
 */
export const metadata: Metadata = {
  title: '支付订单 | 家有所爱',
  description: '微信/支付宝扫码支付, 完成后自动解锁文书下载',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/payment',
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

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
