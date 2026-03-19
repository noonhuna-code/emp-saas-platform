import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Instrument_Serif } from "next/font/google";
import { AnalyticsPlaceholder } from "@/components/analytics-placeholder";
import { Footer } from "@/components/footer";
import { MotionOrchestrator } from "@/components/motion-orchestrator";
import { Navbar } from "@/components/navbar";
import { absoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: siteConfig.url
  },
  icons: {
    icon: "/brand/emp-favicon.svg"
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    url: siteConfig.url,
    type: "website",
    images: [
      {
        url: absoluteUrl(siteConfig.ogImage),
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} social preview`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [absoluteUrl("/twitter-image")]
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className="scroll-smooth" lang="en">
      <body className={`${manrope.variable} ${instrumentSerif.variable} antialiased`}>
        <AnalyticsPlaceholder />
        <MotionOrchestrator />
        <a
          className="pointer-events-none fixed left-4 top-4 z-[100] -translate-y-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white opacity-0 focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none"
          href="#main-content"
        >
          Skip to content
        </a>
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1" id="main-content">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
