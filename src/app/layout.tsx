import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import ErrorReporterInit from "@/components/ErrorReporterInit";
import "@/lib/env"; // validate environment variables at startup
import "./globals.css";

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
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* CSP는 next.config.ts headers()에서 관리 — meta 태그 중복 제거 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router layout.tsx applies to all pages */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider><LangProvider>{children}</LangProvider></AuthProvider>
        <ErrorReporterInit />
        <Analytics />
      </body>
    </html>
  );
}
