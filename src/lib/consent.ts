// ============================================================
// consent — Cookie / storage consent state manager
// ============================================================
// GDPR Art.7 · ePrivacy · K-PIPA §15 — 사용자의 명시적 동의 상태를 중앙 관리.
// 단일 소스: localStorage["eh-cookie-consent"] ∈ {"accepted", "rejected", null}.
//
// 의미:
//   "accepted" → 필수 + 분석 + (향후 마케팅) 전체 동의
//   "rejected" → 필수 저장소만 (기능 필수 — language/session 등)
//   null        → 미결정 (CookieConsent 배너 노출)
//
// 업스트림 모듈 (Sentry/Analytics)은 `hasAnalyticsConsent()` 로 초기화 게이트.
// 소비자: sentry.client.config.ts · (향후) Vercel Analytics · 써드파티 위젯.
// ============================================================

// ============================================================
// PART 1 — Constants
// ============================================================

const STORAGE_KEY = 'eh-cookie-consent';
const CHANGE_EVENT = 'eh:consent-changed';

export type ConsentValue = 'accepted' | 'rejected' | null;

// ============================================================
// PART 2 — Readers (SSR-safe)
// ============================================================

export function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
    return null;
  } catch {
    return null;
  }
}

/** 분석 목적 (Sentry / Vercel Analytics 등) 허용 여부 */
export function hasAnalyticsConsent(): boolean {
  return getConsent() === 'accepted';
}

/** 필수 저장소 — 동의 불필요 (기능 필수, GDPR exempt) */
export function hasEssentialConsent(): boolean {
  return true;
}

/** 배너 노출 필요 여부 — 미결정 상태일 때만 */
export function shouldShowConsentBanner(): boolean {
  return getConsent() === null;
}

// ============================================================
// PART 3 — Writers + event bus
// ============================================================

/**
 * 동의 저장 + 전역 이벤트 발행.
 * 업스트림 모듈은 `window.addEventListener('eh:consent-changed', ...)` 로 수신 가능.
 * Sentry 등 init-at-load 모듈은 페이지 리로드 후 반영 (Sentry SDK 는 런타임 재초기화 비권장).
 */
export function setConsent(value: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { value } }));
  } catch {
    /* localStorage 불가 — private browsing 등 */
  }
}

export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { value: null } }));
  } catch {
    /* noop */
  }
}

// IDENTITY_SEAL: consent | role=consent-state-manager | inputs=localStorage | outputs=boolean guards
