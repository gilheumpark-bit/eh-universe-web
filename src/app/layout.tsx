import type { Metadata } from "next";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import ErrorReporterInit from "@/components/ErrorReporterInit";
import WebFeaturesInit from "@/components/WebFeaturesInit";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { UnifiedSettingsProvider } from "@/lib/UnifiedSettingsContext";
import { DeferredClientMetrics } from "@/components/DeferredClientMetrics";
import ApiKeyHydrator from "@/components/ApiKeyHydrator";
import { MainContentRegion } from "@/components/MainContentRegion";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import TermsUpdateBanner from "@/components/legal/TermsUpdateBanner";
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
import "./globals-studio.css";
import "./globals-animations.css";
import "./globals-utilities.css";

/** Fewer weights = fewer font files and faster first paint (see build-performance-report.txt).
 *  홈/허브는 Plex 2패밀리만 preload. display/serif 계열은 preload: false로 실제 사용 시 lazy. */
const ibmPlexMono = IBM_Plex_Mono({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-ibm-plex-mono", display: "swap" });
const ibmPlexSans = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-ibm-plex-sans", display: "swap" });
// 아래 5개는 편집기/스튜디오/세계관 페이지 진입 시에만 실제 로드되도록 preload 차단
const jetbrainsMono = JetBrains_Mono({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-space-grotesk", display: "swap", preload: false });
const notoSansKr = Noto_Sans_KR({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-noto-sans-kr", display: "swap", preload: false });
const cormorantGaramond = Cormorant_Garamond({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  display: "swap",
  preload: false,
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
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
  ],
};

// [C] env fallback — 도메인 미확정/배포 환경 차이 대응. 기본값은 현행 운영 도메인.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eh-universe.com";

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '로어가드',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  title: {
    default: "로어가드 — 창작에서 번역·출판까지 잇는 집필 OS",
    template: "로어가드 | %s",
  },
  description:
    "로어가드(Loreguard) — AI 소설 집필 스튜디오. 창작부터 번역·출판까지 한 흐름으로. 한국 웹소설의 해외 진출 OS.",
  applicationName: "Loreguard",
  keywords: [
    "소설", "AI 소설", "집필", "번역", "웹소설", "IDE",
    "Loreguard", "로어가드", "한국어 번역", "AI IDE",
    "Novel Studio", "Translation Studio", "NOA", "EH Universe",
  ],
  authors: [{ name: "박길흠", url: "https://github.com/gilheumpark-bit" }],
  creator: "박길흠",
  publisher: "EH Universe",
  category: "Writing Software",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "ko-KR": "/",
      "en-US": "/?lang=en",
      "ja-JP": "/?lang=ja",
      "zh-CN": "/?lang=zh",
    },
  },
  openGraph: {
    title: "로어가드 — 창작에서 번역·출판까지 잇는 집필 OS",
    description:
      "로어가드(Loreguard) — EH의 집필 OS. 창작·번역·출판을 하나의 파이프라인으로.",
    url: SITE_URL,
    siteName: "Loreguard",
    locale: "ko_KR",
    alternateLocale: ["en_US", "ja_JP", "zh_CN"],
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Loreguard — 한국 웹소설의 해외 진출 OS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "로어가드 — 집필 OS",
    description: "창작·번역·출판을 잇는 AI 집필 스튜디오.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // [확인 필요] 실제 Search Console verification code로 교체 필요
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ?? undefined,
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

// ============================================================
// JSON-LD 구조화 데이터 — SoftwareApplication 스키마
// ============================================================
const jsonLdSoftwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Loreguard",
  alternateName: ["로어가드", "EH Universe"],
  applicationCategory: "WritingApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: "소설가를 위한 AI IDE — 집필·검수·번역·출간을 하나의 워크스페이스에서.",
  inLanguage: ["ko", "en", "ja", "zh"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  author: {
    "@type": "Person",
    name: "박길흠",
  },
  publisher: {
    "@type": "Organization",
    name: "EH Universe",
    url: SITE_URL,
  },
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
        {/* Resource hints — API endpoints + CDN preconnect */}
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://api.anthropic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* JSON-LD structured data — SoftwareApplication 스키마. 검색엔진 리치 스니펫용. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApplication) }}
        />
        {/* Skip navigation — multi-language */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-9999 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:underline" lang="ko">본문으로 건너뛰기</a>
        {/* Noscript fallback */}
        <noscript>
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>로어가드 (Loreguard)</h1>
            <p>이 사이트는 JavaScript가 필요합니다. 브라우저 설정에서 JavaScript를 활성화해주세요.</p>
            <p>This site requires JavaScript. Please enable JavaScript in your browser settings.</p>
          </div>
        </noscript>
        <AuthProvider>
          <LangProvider>
            <UnifiedSettingsProvider>
              <MainContentRegion>{children}</MainContentRegion>
              <Footer />
              <CookieConsent />
              <TermsUpdateBanner />
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
