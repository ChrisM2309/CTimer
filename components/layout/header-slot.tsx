"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";

export function HeaderSlot() {
  const pathname = usePathname();

  if (pathname.startsWith("/join")) return null;
  return <SiteHeader />;
}
