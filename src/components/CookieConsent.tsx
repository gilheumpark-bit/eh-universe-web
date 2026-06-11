"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { setConsent, shouldShowConsentBanner } from "@/lib/consent";

// ============================================================
// PART 2 — Cookie Consent Banner
// GDPR + ePrivacy + K-PIPA 공통 충족
// 저장소: lib/consent.ts 중앙화. 버튼 → setConsent('accepted'|'rejected').
// [A1 2026-04-24] Sentry/Analytics 는 이 값을 확인해 초기화 — 동의 없으면 init 안 됨.
// ============================================================

export default function CookieConsent() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  // [Z1d 2026-06-11] /studio 가림 해소 — 집필 탭 AI 생성바(wd-input)가 화면 하단 중앙에
  // 위치하는데, 풀-와이드 bottom:0 배너(z-9998)가 이를 덮어 생성바 사용이 막혔다.
  // /studio 에서만 우하단 컴팩트 카드로 전환 (AI 생성바는 센터 컬럼 — 비가림).
  // 동의 흐름·카피·버튼·setConsent 경로는 완전 동일 — 포지셔닝/레이아웃만 분기.
  const pathname = usePathname();
  const isStudio = pathname === "/studio" || pathname?.startsWith("/studio/");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // shouldShowConsentBanner() = 미결정 상태일 때만 true
    if (shouldShowConsentBanner()) {
      // 첫 방문 — 배너 표시 (800ms 지연: LCP 방해 방지)
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setConsent("accepted");
    setVisible(false);
    // Sentry 등 consent-gated 모듈이 다음 로드에서 초기화되도록 안내.
    // (SDK 는 런타임 재초기화 비권장 — 리로드 유도 대신 이벤트만 dispatch)
  };

  const handleReject = () => {
    setConsent("rejected");
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  // [Doc 1 Global P0 + Doc 2 Home mock — 2026-05-12] 우하단 카드 → 하단 풀-와이드 slim bar.
  // 이전: 4/4 surface 동일 우하단 카드 영구 노출 (Doc 1 Global P0). 보라 라벨 + blue CTA (시스템 위반).
  // 새 흐름: bottom:0 left:0 right:0 single-line. amber 단일 CTA. "필수만" ghost. "자세히" link.
  // GDPR + ePrivacy + K-PIPA 충족: setConsent 동작 유지, 다국어 카피 유지.
  // [Z1d] /studio 만 예외 — 우하단 컴팩트 카드 (AI 생성바 비가림). Doc 1 P0 의 문제
  // (영구 노출·보라/blue 위반)는 재발 X: 동의/거절 즉시 소멸 + amber CTA 동일.
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={T({ ko: "쿠키 동의", en: "Cookie Consent", ja: "Cookie同意", zh: "Cookie 同意" })}
      className={
        isStudio
          ? "fixed bottom-4 right-4 z-[9998] w-[calc(100vw-2rem)] max-w-sm bg-bg-primary/95 backdrop-blur-md border border-border rounded-xl shadow-xl px-4 py-3"
          : "fixed bottom-0 left-0 right-0 z-[9998] bg-bg-primary/95 backdrop-blur-md border-t border-border px-4 py-2 md:py-2.5"
      }
      style={{ zIndex: 9998 }}
    >
      <div
        className={
          isStudio
            ? "flex items-start gap-3 flex-wrap"
            : "max-w-7xl mx-auto flex items-center gap-3 md:gap-4 flex-wrap md:flex-nowrap"
        }
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent-amber shrink-0">
          {T({ ko: "Cookies", en: "Cookies", ja: "Cookie", zh: "Cookie" })}
        </span>
        <p className="text-xs md:text-sm text-text-secondary leading-snug flex-1 min-w-0">
          {T({
            ko: "로그인 · 언어 · 원고 저장 목적의 쿠키만 사용합니다. 계속 이용하시면 동의한 것으로 간주됩니다.",
            en: "Loreguard uses cookies only for login, language, and manuscript saving. Continuing to use implies consent.",
            ja: "ログイン・言語・原稿保存目的の Cookie のみ使用します。継続利用で同意とみなします。",
            zh: "仅用于登录、语言、原稿保存的 Cookie。继续使用即视为同意。",
          })}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/privacy"
            className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-text-tertiary hover:text-text-secondary underline min-h-[36px] inline-flex items-center px-2"
          >
            {T({ ko: "자세히", en: "Details", ja: "詳細", zh: "详情" })}
          </Link>
          <button
            onClick={handleReject}
            className="bg-transparent border border-border text-text-secondary px-3 py-1.5 rounded-md text-[10px] md:text-xs font-mono uppercase tracking-wider hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[36px]"
          >
            {T({ ko: "필수만", en: "Essential", ja: "必須のみ", zh: "仅必需" })}
          </button>
          <button
            onClick={handleAccept}
            style={{ color: '#1a1410' }}
            className="bg-accent-amber px-4 py-1.5 rounded-md text-[10px] md:text-xs font-mono uppercase tracking-wider font-semibold hover:bg-accent-amber/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[36px] inline-flex items-center gap-1.5"
          >
            {T({ ko: "동의", en: "Accept", ja: "同意", zh: "同意" })}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: CookieConsent | role=gdpr-cookie-banner | inputs=lang | outputs=banner
