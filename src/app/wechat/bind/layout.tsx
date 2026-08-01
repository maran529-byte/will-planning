import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '绑定公众号',
  description: '绑定家有所爱公众号, 同步订单与草稿到微信',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/wechat/bind',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WechatBindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
