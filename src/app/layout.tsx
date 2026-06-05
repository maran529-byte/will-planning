import type { Metadata } from "next";
import LegalFooter from "@/components/LegalFooter";
import "./globals.css";

// 字体策略: 改版后使用 系统字体栈, 避免离线 / 受限网络环境 build 失败.
// (原 next/font/google Geist 在国内 CI / 离线沙箱无法 fetch). 系统字体在中文站
// 体验更佳, 且无 FOIT/CLS, 不需要额外 link/preconnect.
// CSS 变量 --font-geist-sans / --font-geist-mono 在 globals.css 中定义.

export const metadata: Metadata = {
  metadataBase: new URL("https://aiwill-planner.cn"),
  title: {
    default: "爱的延续 · 智能资产规划与遗嘱生成",
    template: "%s | 爱的延续",
  },
  description:
    "AI 智能问卷, 一站生成符合中国《民法典》的遗嘱与资产规划文书, 资产规划专业人士兜底审核. 让爱与财富, 安心传承.",
  keywords: [
    "遗嘱生成",
    "AI遗嘱",
    "在线遗嘱模板",
    "资产规划",
    "资产规划专业人士",
    "数字遗产",
    "民法典遗嘱",
    "继承规划",
  ],
  authors: [{ name: "爱的延续工作室" }],
  robots: "index, follow",
  openGraph: {
    title: "爱的延续 · 智能资产规划与遗嘱生成",
    description:
      "AI 问卷 + 资产规划专业人士兜底, 一站生成合规遗嘱与资产规划文书.",
    type: "website",
    locale: "zh_CN",
    siteName: "爱的延续",
  },
  alternates: {
    canonical: "https://aiwill-planner.cn",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
