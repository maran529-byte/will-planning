import type { Metadata, Viewport } from "next";
import LegalFooter from "@/components/LegalFooter";
import { StructuredData } from "@/components/StructuredData";
import "./globals.css";

// 字体策略: 改版后使用 系统字体栈, 避免离线 / 受限网络环境 build 失败.
// (原 next/font/google Geist 在国内 CI / 离线沙箱无法 fetch). 系统字体在中文站
// 体验更佳, 且无 FOIT/CLS, 不需要额外 link/preconnect.
// CSS 变量 --font-geist-sans / --font-geist-mono 在 globals.css 中定义.

export const metadata: Metadata = {
  metadataBase: new URL("https://aiwill-planner.cn"),
  // 改版 v6 (2026-06-09, 营销定位重塑):
  //   - 主标题从"智能资产规划与遗嘱生成" → "婚姻财产与资产规划智能平台"
  //   - 关键词从"遗嘱/数字遗产/继承规划" → "婚姻协议/婚内财产/离婚/抚养/赠与"
  //   - description 措辞改为"婚前/婚内/离婚/抚养/赠与" 5 类主打 + 传承规划辅助
  //   - 品牌名"爱的延续" 保留 (商标/公众号已用, 不轻易动)
  title: {
    default: "爱的延续 · 婚姻财产与资产规划智能平台",
    template: "%s | 爱的延续",
  },
  description:
    "我们的模板 10 分钟帮您整理好婚姻协议、婚内财产、离婚协议、子女抚养、赠与等家庭法律文书。¥19.9 起, 资产规划专业人士在线审核, 让家庭财产清晰, 婚姻安稳。",
  keywords: [
    "婚姻协议书",
    "婚内财产协议",
    "离婚协议书",
    "子女抚养协议",
    "赠与协议",
    "婚前财产公证",
    "家庭法律文书",
    "家庭财产规划",
    "婚姻协议",
    "在线协议生成",
    "资产规划专业人士",
  ],
  authors: [{ name: "爱的延续工作室" }],
  creator: "爱的延续工作室",
  publisher: "爱的延续工作室",
  robots: "index, follow",
  openGraph: {
    title: "爱的延续 · 婚姻财产与资产规划智能平台",
    description:
      "系统化问卷 + 资产规划专业人士审核, 婚前/婚内/离婚/抚养/赠与 5 类家庭法律文书, ¥19.9 起。",
    type: "website",
    locale: "zh_CN",
    siteName: "爱的延续",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "爱的延续 · 把家庭财产讲清楚",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "爱的延续 · 婚姻财产与资产规划智能平台",
    description: "婚前/婚内/离婚/抚养/赠与 5 类家庭法律文书, ¥19.9 起",
    images: ["/og-default.png"],
  },
  alternates: {
    canonical: "https://aiwill-planner.cn",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  verification: {
    // 百度站长 / Google Search Console 验证, 上线时填
    // google: "xxx",
    // baidu: "xxx",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#92400e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <StructuredData type="organization" />
        <StructuredData type="website" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
