import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import ErrorReporterInit from "@/components/ErrorReporterInit";
import ApiKeyHydrator from "@/components/ApiKeyHydrator";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import "@/lib/env"; // validate environment variables at startup
import { IBM_Plex_Mono, IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk, Noto_Sans_KR } from "next/font/google";

import "./globals.css";
import "./globals-components.css";
import "./globals-studio.css";
import "./globals-animations.css";
import "./globals-utilities.css";

const ibmPlexMono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-ibm-plex-mono", display: "swap" });
const ibmPlexSans = IBM_Plex_Sans({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin"], variable: "--font-ibm-plex-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });
const spaceGrotesk = Space_Grotesk({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const notoSansKr = Noto_Sans_KR({ weight: ["300", "400", "500", "700"], subsets: ["latin"], variable: "--font-noto-sans-kr", display: "swap", preload: false });

export const metadata: Metadata = {
  title: {
    default: "EH Universe — A Narrative Engine That Prevents Story Collapse",
    template: "NOA Studio | %s",
  },
  description:
    "66 million years of verified SF universe. Open-source narrative engine EH Rulebook. 200+ article archive.",
  metadataBase: new URL("https://eh-universe.com"),
  alternates: {
    canonical: "https://eh-universe.com",
  },
  openGraph: {
    title: "EH Universe — A Narrative Engine That Prevents Story Collapse",
    description:
      "66 million years of verified SF universe. Open-source narrative engine EH Rulebook.",
    type: "website",
    url: "https://eh-universe.com",
    images: [{ url: "/images/hero-mina.jpg", width: 1200, height: 630, alt: "EH Universe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EH Universe — Narrative Engine",
    description: "66 million years of verified SF universe. Open-source narrative engine.",
    images: ["/images/hero-mina.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-icon", sizes: "180x180", type: "image/png" },
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${ibmPlexMono.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${notoSansKr.variable} h-full antialiased`} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Security headers are applied centrally by src/proxy.ts */}
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-9999 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:underline">본문으로 건너뛰기</a>
        <AuthProvider><LangProvider><div id="main-content">{children}</div></LangProvider></AuthProvider>
        <ErrorReporterInit />
        <ApiKeyHydrator />
        <WebVitalsReporter />
        {/* Analytics is allowed by the central CSP in src/proxy.ts */}
        <Analytics />
      </body>
    </html>
  );
}
