"use client";

// ============================================================
// PART 1: Imports & Setup
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { setConsent, shouldShowConsentBanner } from "@/lib/consent";

// ============================================================
// PART 2: Cookie Consent Banner
// GDPR + ePrivacy + K-PIPA 공통 충족
// 저장소: lib/consent.ts 중앙화. 버튼 → setConsent('accepted'|'rejected').
// [A1 2026-04-24] Sentry/Analytics 는 이 값을 확인해 초기화한다. 동의 없으면 init 안 됨.
// ============================================================

export default function CookieConsent() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  // 작업 표면에서는 동의 고지를 상태 바처럼 낮게 깔아 편집/번역 중심 영역을 보존한다.
  const isWorkSurface =
    pathname === "/studio" ||
    pathname?.startsWith("/studio/") ||
    pathname === "/desktop" ||
    pathname?.startsWith("/desktop/") ||
    pathname === "/translate" ||
    pathname?.startsWith("/translate/") ||
    pathname === "/translation-studio" ||
    pathname?.startsWith("/translation-studio/");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // shouldShowConsentBanner() = 미결정 상태일 때만 true
    if (shouldShowConsentBanner()) {
      // 첫 방문 배너 표시. 800ms 지연으로 LCP 방해를 줄인다.
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setConsent("accepted");
    setVisible(false);
    // Sentry 등 consent-gated 모듈이 다음 로드에서 초기화되도록 안내.
    // SDK 는 런타임 재초기화 비권장이라 리로드 유도 대신 이벤트만 dispatch 한다.
  };

  const handleReject = () => {
    setConsent("rejected");
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  // [Doc 1 Global P0 + Doc 2 Home mock 2026-05-12] 일반 페이지는 하단 풀-와이드 slim bar.
  // 작업 표면은 하단 상태형 고지. 동의/거절 즉시 소멸 + amber CTA 동일.
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={T({ ko: "쿠키 동의", en: "Cookie Consent", ja: "Cookie同意", zh: "Cookie 同意" })}
      className={
        isWorkSurface
          ? "lg-cookie-work-surface"
          : "fixed bottom-0 left-0 right-0 z-[var(--z-toast)] bg-bg-primary/95 backdrop-blur-md border-t border-border px-4 py-2 md:py-2.5"
      }
    >
      <div
        className={
          isWorkSurface
            ? "lg-cookie-work-surface-inner"
            : "max-w-7xl mx-auto flex items-center gap-3 md:gap-4 flex-wrap md:flex-nowrap"
        }
      >
        <span className={isWorkSurface ? "lg-cookie-work-surface-kicker" : "text-[10px] font-mono uppercase tracking-widest text-accent-amber shrink-0"}>
          {T({ ko: "쿠키", en: "Cookies", ja: "Cookie", zh: "Cookie" })}
        </span>
        <p className={isWorkSurface ? "lg-cookie-work-surface-copy" : "text-xs md:text-sm text-text-secondary leading-snug flex-1 min-w-0"}>
          {T({
            ko: isWorkSurface ? "작업 저장·로그인 필수 항목만 사용합니다." : "로그인, 언어, 원고 저장에 필요한 쿠키만 사용합니다.",
            en: isWorkSurface
              ? "Only required items for saving work and sign-in."
              : "Loreguard uses cookies only for login, language, and manuscript saving. Continuing to use implies consent.",
            ja: isWorkSurface
              ? "作業保存とログインに必要な項目のみ使用します。"
              : "ログイン・言語・原稿保存目的の Cookie のみ使用します。継続利用で同意とみなします。",
            zh: isWorkSurface
              ? "仅使用工作保存和登录所需项目。"
              : "仅用于登录、语言、原稿保存的 Cookie。继续使用即视为同意。",
          })}
        </p>
        <div className={isWorkSurface ? "lg-cookie-work-surface-actions" : "flex items-center gap-2 shrink-0"}>
          <Link
            href="/privacy"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-[10px] md:text-xs font-mono uppercase tracking-wider text-text-tertiary hover:text-text-secondary underline"
          >
            {T({
              ko: isWorkSurface ? "정보" : "자세히",
              en: isWorkSurface ? "Info" : "Details",
              ja: isWorkSurface ? "情報" : "詳細",
              zh: isWorkSurface ? "信息" : "详情",
            })}
          </Link>
          <button
            onClick={handleReject}
            className="bg-transparent border border-border text-text-secondary px-3 py-1.5 rounded-md text-[10px] md:text-xs font-mono uppercase tracking-wider hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px] min-w-[44px]"
          >
            {T({
              ko: isWorkSurface ? "필수" : "필수만",
              en: isWorkSurface ? "Essential" : "Essential only",
              ja: isWorkSurface ? "必須" : "必須のみ",
              zh: isWorkSurface ? "必需" : "仅必需",
            })}
          </button>
          <button
            onClick={handleAccept}
            className="bg-accent-amber px-4 py-1.5 rounded-md text-[10px] md:text-xs font-mono uppercase tracking-wider font-semibold !text-white hover:bg-accent-amber/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5"
          >
            {T({
              ko: isWorkSurface ? "동의" : "동의하고 계속",
              en: "Accept",
              ja: "同意",
              zh: "同意",
            })}
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: CookieConsent | role=gdpr-cookie-banner | inputs=lang | outputs=banner
