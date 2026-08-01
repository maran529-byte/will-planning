import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import LegalFooter from "@/components/LegalFooter";

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
      <LegalFooter />
    </>
  );
}
