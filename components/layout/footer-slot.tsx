"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";

export function FooterSlot() {
  const pathname = usePathname();

  if (pathname.startsWith("/join")) {
    return <SiteFooter variant="micro" />;
  }

  if (pathname.startsWith("/admin")) {
    return <SiteFooter variant="micro" />;
  }

  return <SiteFooter />;
}
