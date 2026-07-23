import type { Metadata } from 'next';

/**
 * /questionnaire - 问卷填表页 (客户端组件)
 *
 * 本 layout 仅用于注入 robots=noindex (页面是 'use client',
 * 不能直接 export const metadata).
 * 问卷页要求登录 + 填表流程, 搜索引擎无需索引.
 */
export const metadata: Metadata = {
  title: '智能问卷',
  description: '10 分钟帮您完成婚前/婚内/离婚/抚养/赠与/传承 6 类家庭文书问卷',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/questionnaire',
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

export default function QuestionnaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
