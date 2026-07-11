import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  // marketing pages inherit root layout metadata
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {/* LegalFooter 已由 app/layout.tsx 提供, 此处不再重复渲染
          (改版 v3, 2026-07-11: 修复 footer 在 marketing 页出现 2 次的 bug) */}
    </>
  );
}
