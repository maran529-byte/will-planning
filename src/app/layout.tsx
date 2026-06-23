import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
  //   - 品牌名: 改版 v7 (2026-06-10) 由 "爱的延续" 改为 "家有所爱", 公众号待手动重命名
  title: {
    default: "家有所爱 · 婚姻财产与资产规划智能平台",
    template: "%s | 家有所爱",
  },
  description:
    "我们的模板 10 分钟帮您整理好婚姻协议、婚内财产、离婚协议、子女抚养、赠与、家庭传承等家庭文书。¥19.9 起, 资产规划专业人士在线陪伴, 让家庭财产清晰, 婚姻安稳。",
  keywords: [
    "婚姻协议书",
    "婚内财产协议",
    "离婚协议书",
    "子女抚养协议",
    "赠与协议",
    "婚前财产公证",
    "家庭文书",
    "家庭财产规划",
    "婚姻协议",
    "在线协议生成",
    "资产规划专业人士",
  ],
  authors: [{ name: "家有所爱工作室" }],
  creator: "家有所爱工作室",
  publisher: "家有所爱工作室",
  robots: "index, follow",
  openGraph: {
    title: "家有所爱 · 婚姻财产与资产规划智能平台",
    description:
      "系统化问卷 + 资产规划专业人士陪伴, 婚前/婚内/离婚/抚养/赠与/传承 6 类家庭文书, ¥19.9 起。",
    type: "website",
    locale: "zh_CN",
    siteName: "家有所爱",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "家有所爱 · 把家庭财产讲清楚",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "家有所爱 · 婚姻财产与资产规划智能平台",
    description: "婚前/婚内/离婚/抚养/赠与/传承 6 类家庭文书, ¥19.9 起",
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
    // 百度站长验证通过 <meta name="baidu-site-verification"> 实现, 见下方 <head>
    google: undefined,
  },
  other: {
    // 百度站长验证 (Next.js 16 改用 other 字段, 避免 baidu 字段类型错误)
    'baidu-site-verification': 'codeva-DtdsXaKMZd,codeva-e5pri3Sh3g',
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
        <meta name="baidu-site-verification" content="codeva-DtdsXaKMZd" />
        <meta name="baidu-site-verification" content="codeva-e5pri3Sh3g" />
        <link rel="alternate" hrefLang="zh-CN" href="https://aiwill-planner.cn/" />
        <link rel="alternate" hrefLang="zh-CN" media="only screen and (max-width: 768px)" href="https://h5.aiwill-planner.cn/" />
        <StructuredData type="organization" />
        <StructuredData type="website" />
        {/* GA4 — 2026-06-23 接入, Measurement ID: G-9XQ3Q29SEK */}
        {process.env.NEXT_PUBLIC_GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA4_ID}');`}
            </Script>
          </>
        )}
        {/* 百度统计 — 2026-06-23 接入, Site ID: 51b33a32b85e6ec0389b80e07e1b5458 */}
        {process.env.NEXT_PUBLIC_BAIDU_TJ_ID && (
          <Script id="baidu-tj-init" strategy="afterInteractive">
            {`var _hmt = _hmt || [];
            (function() {
              var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?${process.env.NEXT_PUBLIC_BAIDU_TJ_ID}";
              var s = document.getElementsByTagName("script")[0];
              s.parentNode.insertBefore(hm, s);
            })();`}
          </Script>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
