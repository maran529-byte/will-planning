import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "爱的延续 - 专业婚姻文书在线生成",
  description: "AI智能生成婚姻协议、婚内财产约定、离婚协议、遗嘱等法律文书。专业律师团队审核把关。",
  keywords: "婚前协议, 婚内财产协议, 离婚协议, 遗嘱模板, AI文书生成",
  authors: [{ name: "爱的延续工作室" }],
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
