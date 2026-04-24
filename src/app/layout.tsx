import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import ErrorReporterInit from "@/components/ErrorReporterInit";
import WebFeaturesInit from "@/components/WebFeaturesInit";
import A11yCheckInit from "@/components/A11yCheckInit";
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
    title: "EH Universe · Loreguard — 작가 주도형 집필 IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard — 작가 주도형 집필 IDE. EH Universe 플래그십 제품. 집필·검수·번역·출판을 하나의 워크스페이스에서. 한국 웹소설의 해외 진출 OS.",
    ogTitle: "EH Universe · Loreguard — 작가 주도형 집필 IDE",
    ogDescription:
      "Loreguard — EH Universe 플래그십. 작가가 쓰고, NOA가 돕는 집필 IDE. 창작·번역·출판을 하나의 파이프라인으로.",
    twitterDescription: "EH Universe presents Loreguard. 작가가 쓰고, NOA가 돕는다.",
    alt: "Loreguard — 한국 웹소설의 해외 진출 OS",
    jsonLdDescription:
      "Loreguard — 작가 주도형 집필 IDE. 집필·검수·번역·출간을 하나의 워크스페이스에서.",
  },
  en: {
    title: "EH Universe · Loreguard — Writer-first Novel IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard — a writer-first novel IDE by EH Universe. Write, review, translate, and publish in a single workspace. The OS for Korean web novelists going global.",
    ogTitle: "EH Universe · Loreguard — Writer-first Novel IDE",
    ogDescription:
      "Loreguard by EH Universe. A writer-first IDE where NOA assists — creation, translation, and publishing in one pipeline.",
    twitterDescription: "EH Universe presents Loreguard. Writers write; NOA assists.",
    alt: "Loreguard — the OS for Korean web novelists going global",
    jsonLdDescription:
      "Loreguard — a writer-first novel IDE. Write, review, translate, and publish in one workspace.",
  },
  ja: {
    title: "EH Universe · Loreguard — 作家主導型 執筆 IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard — EH Universe が贈る作家主導型の執筆 IDE。執筆・検証・翻訳・出版をひとつのワークスペースで。韓国 Web 小説の海外展開を支える OS。",
    ogTitle: "EH Universe · Loreguard — 作家主導型 執筆 IDE",
    ogDescription:
      "Loreguard by EH Universe。作家が書き、NOA が助ける執筆 IDE。創作・翻訳・出版をひとつのパイプラインで。",
    twitterDescription: "EH Universe presents Loreguard。作家が書き、NOA が助ける。",
    alt: "Loreguard — 韓国 Web 小説の海外展開 OS",
    jsonLdDescription:
      "Loreguard — 作家主導型の執筆 IDE。執筆・検証・翻訳・出版をひとつのワークスペースで。",
  },
  zh: {
    title: "EH Universe · Loreguard — 作家主导的小说 IDE",
    titleTemplate: "Loreguard | %s",
    description:
      "Loreguard — EH Universe 推出的作家主导型小说 IDE。在一个工作室中完成创作、审校、翻译与出版。韩国网文走向世界的 OS。",
    ogTitle: "EH Universe · Loreguard — 作家主导的小说 IDE",
    ogDescription:
      "Loreguard by EH Universe。作家写作，NOA 协助 — 创作、翻译、出版一体化。",
    twitterDescription: "EH Universe 推出 Loreguard。作家创作，NOA 协助。",
    alt: "Loreguard — 韩国网文走向世界的 OS",
    jsonLdDescription:
      "Loreguard — 作家主导的小说 IDE。在一个工作室完成创作、审校、翻译与出版。",
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
      title: "로어가드",
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
      "소설", "AI 소설", "집필", "번역", "웹소설", "IDE",
      "Loreguard", "로어가드", "한국어 번역", "AI IDE",
      "Novel Studio", "Translation Studio", "NOA", "EH Universe",
      "작가 주도형 집필 IDE", "집필 IDE", "writer-first",
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

  // Skip-navigation · noscript 문구는 HTML lang 과 맞춰 렌더.
  const skipNavText: Record<Lang, string> = {
    ko: "본문으로 건너뛰기",
    en: "Skip to main content",
    ja: "本文へスキップ",
    zh: "跳至正文",
  };
  const noscriptCopy: Record<Lang, { headline: string; body: string }> = {
    ko: {
      headline: "로어가드 (Loreguard)",
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
        {/* Skip navigation — language-aware */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-9999 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:underline"
          lang={lang}
        >
          {skipNavText[lang]}
        </a>
        {/* Noscript fallback */}
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
            <h1>{noscriptCopy[lang].headline}</h1>
            <p>{noscriptCopy[lang].body}</p>
            <p>This site requires JavaScript. Please enable JavaScript in your browser settings.</p>
          </div>
        </noscript>
        <AuthProvider>
          <LangProvider>
            <UnifiedSettingsProvider>
              <UserRoleProvider>
                <MainContentRegion>{children}</MainContentRegion>
                <Footer />
                <CookieConsent />
                <TermsUpdateBanner />
              </UserRoleProvider>
            </UnifiedSettingsProvider>
          </LangProvider>
        </AuthProvider>
        <ErrorReporterInit />
        <WebFeaturesInit />
        <A11yCheckInit />
        <ApiKeyHydrator />
        <StatusIndicator />
        <DeferredClientMetrics />
      </body>
    </html>
  );
}
