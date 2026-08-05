import type { Metadata, Viewport } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { FooterSlot } from "@/components/layout/footer-slot";
import { HeaderSlot } from "@/components/layout/header-slot";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = "https://ctimer.c3.com.sv";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CTimer | Una herramienta de C3",
    template: "%s | CTimer",
  },
  description:
    "Cronómetros para competencias, eventos y equipos. Una herramienta de Competitive Coding Club.",
  applicationName: "CTimer",
  generator: "Next.js",
  alternates: { canonical: siteUrl },
  icons: {
    icon: "/brand/logo-c3-claro-con-color.png",
    apple: "/brand/logo-c3-claro-con-color.png",
  },
  openGraph: {
    type: "website",
    locale: "es_SV",
    url: siteUrl,
    siteName: "CTimer",
    title: "CTimer | Una herramienta de C3",
    description:
      "Cronómetros para competencias, eventos y equipos. Una herramienta de Competitive Coding Club.",
    images: [{ url: "/brand/logo-c3-claro-con-color.png", alt: "Logo oficial de C3" }],
  },
  twitter: {
    card: "summary",
    title: "CTimer | Una herramienta de C3",
    description:
      "Cronómetros para competencias, eventos y equipos. Una herramienta de Competitive Coding Club.",
    images: ["/brand/logo-c3-claro-con-color.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F203E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} ${poppins.variable} h-full`}>
      <body className="min-h-full">
        <AuthProvider>
          <HeaderSlot />
          {children}
          <FooterSlot />
        </AuthProvider>
      </body>
    </html>
  );
}
