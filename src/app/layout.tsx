import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import SwRegister from "./sw-register";
import ErrorReporterInit from "@/components/ErrorReporterInit";
import WebFeaturesInit from "@/components/WebFeaturesInit";
import A11yCheckInit from "@/components/A11yCheckInit";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { UnifiedSettingsProvider } from "@/lib/UnifiedSettingsContext";
import { DeferredClientMetrics } from "@/components/DeferredClientMetrics";
import ApiKeyHydrator from "@/components/ApiKeyHydrator";
import GlobalShortcuts from "@/components/GlobalShortcuts";
import { MainContentRegion } from "@/components/MainContentRegion";
import SkipToMainLink from "@/components/SkipToMainLink";
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
// [디자인 피벗 2026-06-09] Loreguard 셸 + 6탭 포팅 CSS (.eh-app 스코프 격리).
import "./loreguard.css";
import "./loreguard-authoring-tabs.css";
import "./loreguard-submission.css";
import "./loreguard-writing-tools.css";
import "./loreguard-writing-responsive.css";
import "./loreguard-writing-bridge.css";
import "./loreguard-plot.css";
import "./loreguard-export-cards.css";
import "./loreguard-revision-direction.css";
import "./loreguard-late-panels.css";
import "./loreguard-overlays.css";
import "./world-simulator.css";

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

// ============================================================
// PART 1 — Language detection (server-side, 2026-04-24)
// ============================================================
// SSR/metadata/JSON-LD 모두 동일한 언어로 렌더되도록 cookie→Accept-Language 체인.
// LangContext(client)가 language 전환 시 eh-lang cookie 동기화 — 서버 재방문 시 반영.

type Lang = "ko" | "en" | "ja" | "zh";

function parseAcceptLanguage(h: string | null): Lang {
  if (!h) return "ko";
  const first = h.split(",")[0]?.toLowerCase() ?? "";
  if (first.startsWith("en")) return "en";
  if (first.startsWith("ja")) return "ja";
  if (first.startsWith("zh")) return "zh";
  return "ko";
}

async function detectServerLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("eh-lang")?.value;
  if (cookieLang === "ko" || cookieLang === "en" || cookieLang === "ja" || cookieLang === "zh") {
    return cookieLang;
  }
  const headerStore = await headers();
  return parseAcceptLanguage(headerStore.get("accept-language"));
}

// ============================================================
// PART 2 — Per-language metadata copy
// ============================================================

const LOCALE_MAP: Record<Lang, string> = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
  zh: "zh_CN",
};

interface LocaleMeta {
  title: string;
  titleTemplate: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  alt: string;
  jsonLdDescription: string;
}

const META_COPY: Record<Lang, LocaleMeta> = {
  ko: {
    title: "EH Universe · Loreguard · 창작 전문 IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard는 창작 전문 IDE입니다. 프로젝트 생성, 세계관, 씬시트, 집필, 퇴고, 번역, 출고를 하나의 워크스페이스에서 관리합니다.",
    ogTitle: "EH Universe · Loreguard · 창작 전문 IDE",
    ogDescription:
      "작가가 방향을 정하고 노아가 과정을 돕는 창작, 번역, 출고 워크스페이스.",
    twitterDescription: "Loreguard · 창작 전문 IDE.",
    alt: "Loreguard · 창작 전문 IDE",
    jsonLdDescription:
      "Loreguard는 프로젝트 생성, 세계관, 씬시트, 집필, 퇴고, 번역, 출고를 하나의 워크스페이스에서 관리하는 창작 전문 IDE입니다.",
  },
  en: {
    title: "EH Universe · Loreguard · Creative IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard is a creative IDE for projects, worldbuilding, scene sheets, writing, revision, translation, and release packages in one workspace.",
    ogTitle: "EH Universe · Loreguard · Creative IDE",
    ogDescription:
      "A workspace where authors direct the work and Noa supports creation, translation, and release.",
    twitterDescription: "Loreguard · Creative IDE.",
    alt: "Loreguard · Creative IDE",
    jsonLdDescription:
      "Loreguard is a creative IDE for projects, worldbuilding, scene sheets, writing, revision, translation, and release packages in one workspace.",
  },
  ja: {
    title: "EH Universe · Loreguard · 創作専門IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard はプロジェクト作成、世界観、シーンシート、執筆、推敲、翻訳、出稿を一つのワークスペースで扱う創作専門IDEです。",
    ogTitle: "EH Universe · Loreguard · 創作専門IDE",
    ogDescription:
      "作者が方向を決め、Noa が創作、翻訳、出稿を支えるワークスペース。",
    twitterDescription: "Loreguard · 創作専門IDE。",
    alt: "Loreguard · 創作専門IDE",
    jsonLdDescription:
      "Loreguard はプロジェクト作成、世界観、シーンシート、執筆、推敲、翻訳、出稿を一つのワークスペースで扱う創作専門IDEです。",
  },
  zh: {
    title: "EH Universe · Loreguard · 创作专业 IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard 是创作专业 IDE，在一个工作区管理项目创建、世界观、场景表、写作、修订、翻译与出库。",
    ogTitle: "EH Universe · Loreguard · 创作专业 IDE",
    ogDescription:
      "作者决定方向，Noa 支持创作、翻译与出库的工作区。",
    twitterDescription: "Loreguard · 创作专业 IDE。",
    alt: "Loreguard · 创作专业 IDE",
    jsonLdDescription:
      "Loreguard 是创作专业 IDE，在一个工作区管理项目创建、世界观、场景表、写作、修订、翻译与出库。",
  },
};

// ============================================================
// PART 3 — generateMetadata (replaces static `metadata` const)
// ============================================================

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectServerLang();
  const copy = META_COPY[lang];
  const locale = LOCALE_MAP[lang];
  const alternateLocales = (Object.keys(LOCALE_MAP) as Lang[])
    .filter((l) => l !== lang)
    .map((l) => LOCALE_MAP[l]);
  const ogImageUrl = `/opengraph-image?l=${lang}`;

  return {
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Loreguard",
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
    title: {
      default: copy.title,
      template: copy.titleTemplate,
    },
    description: copy.description,
    applicationName: "Loreguard",
    keywords: [
      "소설", "창작", "집필", "번역", "웹소설", "IDE",
      "창작 전문 IDE", "Creative IDE", "創作専門IDE", "创作专业 IDE",
      "Creative IDE", "writer IDE", "creator IDE",
      "Loreguard", "로어가드", "한국어 번역", "노아",
      "Creative Studio", "Translation Workspace", "EH Universe",
      "창작 IDE", "집필 IDE", "creator-first",
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
      title: copy.ogTitle,
      description: copy.ogDescription,
      url: SITE_URL,
      siteName: "Loreguard",
      locale,
      alternateLocale: alternateLocales,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: copy.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.twitterDescription,
      images: [ogImageUrl],
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
}

// ============================================================
// PART 4 — JSON-LD builder (lang-aware description)
// ============================================================

function buildJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Loreguard",
    alternateName: ["로어가드", "EH Universe"],
    applicationCategory: "WritingApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: META_COPY[lang].jsonLdDescription,
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
}

// ============================================================
// PART 5 — Root layout (async, cookie-based <html lang>)
// ============================================================

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await detectServerLang();
  const jsonLd = buildJsonLd(lang);

  // noscript 문구는 HTML lang 과 맞춰 렌더. Skip navigation은 클라이언트 언어 전환을 따라간다.
  const noscriptCopy: Record<Lang, { headline: string; body: string }> = {
    ko: {
      headline: "Loreguard",
      body: "이 사이트는 JavaScript가 필요합니다. 브라우저 설정에서 JavaScript를 활성화해주세요.",
    },
    en: {
      headline: "Loreguard",
      body: "This site requires JavaScript. Please enable JavaScript in your browser settings.",
    },
    ja: {
      headline: "Loreguard (ロアガード)",
      body: "このサイトは JavaScript が必要です。ブラウザ設定で JavaScript を有効にしてください。",
    },
    zh: {
      headline: "Loreguard",
      body: "本网站需要 JavaScript。请在浏览器设置中启用 JavaScript。",
    },
  };

  return (
    <html
      lang={lang}
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
        {/* [디자인 피벗 2026-06-09] Pretendard — indigo SaaS 본문 폰트 (한글 작가 친숙). */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* JSON-LD structured data — SoftwareApplication 스키마. 검색엔진 리치 스니펫용.
            [보안] JSON.stringify 결과에 '<' 가 포함되면 `</script>` 로 스크립트 블록이 조기 종료되는
            XSS 경로가 생긴다. buildJsonLd(lang) 결과가 정적 텍스트라 현재는 무해하지만 표준 방어
            (Next.js 공식 가이드와 동일) 를 미리 적용해둔다. `\u003c` 는 JSON 파서에서 정상 디코드. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd)
              .replace(/</g, "\\u003c")
              .replace(/>/g, "\\u003e")
              .replace(/&/g, "\\u0026"),
          }}
        />
        {/* Noscript fallback */}
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
            <h1>{noscriptCopy[lang].headline}</h1>
            <p>{noscriptCopy[lang].body}</p>
            <p>This site requires JavaScript. Please enable JavaScript in your browser settings.</p>
          </div>
        </noscript>
        {/* [P17 루프2 — 2026-06-08] Provider 마운트 순서 — ADR-0002 참조.
            outer → inner: Auth → Lang → UnifiedSettings → UserRole.
            의존성: UnifiedSettings → Lang (i18n 라벨), UserRole → Auth (claims).
            실패 모드: 각 provider 가 graceful degrade (자세히 ADR-0002 §3). */}
        {/* [P8 루프3 — 2026-06-08] RootErrorBoundary — Provider tree throw 시 graceful fallback.
            한 Provider 실패가 전체 앱 crash 로 번지지 않도록 외곽 wrap. componentDidCatch
            logger.error 로 structured emission. ADR-0008 (Error Recovery) 보강. */}
        <RootErrorBoundary treeId="root">
          <AuthProvider>
            <LangProvider initialLang={lang}>
              <UnifiedSettingsProvider>
                <UserRoleProvider>
                  {/* Skip navigation — follows client-side language switching */}
                  <SkipToMainLink />
                  <MainContentRegion>{children}</MainContentRegion>
                  <Footer />
                  <CookieConsent />
                  <TermsUpdateBanner />
                </UserRoleProvider>
              </UnifiedSettingsProvider>
            </LangProvider>
          </AuthProvider>
        </RootErrorBoundary>
        <ErrorReporterInit />
        <WebFeaturesInit />
        <A11yCheckInit />
        <ApiKeyHydrator />
        <GlobalShortcuts />
        <StatusIndicator />
        <DeferredClientMetrics />
        {/* [P9 루프3 — 2026-06-08] PWA service worker registration (prod only). */}
        <SwRegister />
      </body>
    </html>
  );
}
