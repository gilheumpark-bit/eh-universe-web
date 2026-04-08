// @ts-nocheck
import type { Metadata } from "next";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import ErrorReporterInit from "@/components/ErrorReporterInit";
import WebFeaturesInit from "@/components/WebFeaturesInit";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { UnifiedSettingsProvider } from "@/lib/UnifiedSettingsContext";
import { ThemeProvider } from "@/lib/theme-controller";
import { DeferredClientMetrics } from "@/components/DeferredClientMetrics";
import ApiKeyHydrator from "@/components/ApiKeyHydrator";
import { MainContentRegion } from "@/components/MainContentRegion";
import "@/lib/env"; // validate environment variables at startup
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  JetBrains_Mono,
  Space_Grotesk,
  Noto_Sans_KR,
  Cormorant_Garamond,
  Noto_Serif_KR,
} from "next/font/google";

import "./globals.css";
import "./globals-components.css";
import "./globals-animations.css";
import "./globals-utilities.css";

/** Fewer weights = fewer font files and faster first paint (see build-performance-report.txt). */
const ibmPlexMono = IBM_Plex_Mono({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-ibm-plex-mono", display: "swap" });
const ibmPlexSans = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-ibm-plex-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });
const spaceGrotesk = Space_Grotesk({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const notoSansKr = Noto_Sans_KR({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-noto-sans-kr", display: "swap", preload: false });
const cormorantGaramond = Cormorant_Garamond({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  display: "swap",
});
const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1c1a17' },
    { color: '#1c1a17' },
  ],
};

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EH Code Studio',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  title: {
    default: "EH Code Studio — Agentic Coding Engine",
    template: "EH Code Studio | %s",
  },
  description:
    "Next-generation Agentic Coding Engine. AI-integrated development environment for EH-Universe.",
  metadataBase: new URL("https://eh-universe.com"),
  alternates: {
    canonical: "https://eh-universe.com",
  },
  openGraph: {
    title: "EH Code Studio — Agentic Coding Engine",
    description:
      "Next-generation Agentic Coding Engine. AI-integrated development environment for EH-Universe.",
    type: "website",
    url: "https://eh-universe.com",
    images: [{ url: "/images/hero-mina.jpg", width: 1200, height: 630, alt: "EH Code Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EH Code Studio — Agentic Coding Engine",
    description: "Next-generation Agentic Coding Engine. AI-integrated development environment.",
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
    <html
      lang="ko"
      className={`${ibmPlexMono.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${notoSansKr.variable} ${cormorantGaramond.variable} ${notoSerifKr.variable} h-full antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var raw = localStorage.getItem('cs:theme');
                  if (raw !== 'light' && raw !== 'dark' && raw !== 'auto') {
                    var eh = localStorage.getItem('eh-theme');
                    raw = (eh === 'light' || eh === 'dark') ? eh : 'dark';
                  }
                  var resolved;
                  if (raw === 'auto') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  } else {
                    resolved = raw;
                  }
                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.style.colorScheme = resolved;
                  if (resolved === 'dark') document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Resource hints — API endpoints + CDN preconnect */}
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://api.anthropic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip navigation — multi-language */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-9999 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:underline" lang="ko">본문으로 건너뛰기</a>
        {/* Noscript fallback */}
        <noscript>
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>EH Code Studio</h1>
            <p>이 사이트는 JavaScript가 필요합니다. 브라우저 설정에서 JavaScript를 활성화해주세요.</p>
            <p>This site requires JavaScript. Please enable JavaScript in your browser settings.</p>
          </div>
        </noscript>
        <AuthProvider>
          <LangProvider>
            <UnifiedSettingsProvider>
              <ThemeProvider>
                <MainContentRegion>{children}</MainContentRegion>
              </ThemeProvider>
            </UnifiedSettingsProvider>
          </LangProvider>
        </AuthProvider>
        <ErrorReporterInit />
        <WebFeaturesInit />
        <ApiKeyHydrator />
        <StatusIndicator />
        <DeferredClientMetrics />
      </body>
    </html>
  );
}
