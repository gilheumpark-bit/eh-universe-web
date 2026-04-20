// ============================================================
// ergonomics/typography — 장기 집필용 타이포그래피 프리셋
// ============================================================
// 에디터 본문의 font-size / line-height / letter-spacing을 3 프리셋으로 관리.
// CSS 변수를 document.documentElement에 기록 → NovelEditor의 .ProseMirror가 소비.
// localStorage에 선택을 영속화.
//
// 설계 원칙:
//  - 순수 함수 + 단일 side-effect(documentElement + localStorage)로 테스트 용이성 유지.
//  - 프리셋 정의는 readonly 상수 → 런타임 변형 금지.
//  - SSR 안전: window/document 미정의 시 조용히 no-op.
// ============================================================

// ============================================================
// PART 1 — 타입 + 프리셋 정의
// ============================================================

export type TypographyPreset = "comfort" | "compact" | "large";

export interface TypographyTokens {
  /** px 단위 — NovelEditor CSS의 --editor-font-size에 반영 */
  fontSize: number;
  /** 배수 — line-height 단위 없는 값 */
  lineHeight: number;
  /** em 단위 — letter-spacing */
  letterSpacing: number;
}

export const TYPOGRAPHY_PRESETS: Readonly<Record<TypographyPreset, Readonly<TypographyTokens>>> = {
  // 장시간(2~10h) 세션 권장 — 기본값
  comfort: { fontSize: 17, lineHeight: 1.75, letterSpacing: 0.01 },
  // 통독/개요 스크롤 상황 — 한 화면에 더 많은 문단을 담는 용도
  compact: { fontSize: 14, lineHeight: 1.5, letterSpacing: 0 },
  // 접근성 — 저시력/중노년 작가 권장
  large: { fontSize: 20, lineHeight: 1.8, letterSpacing: 0.015 },
};

export const DEFAULT_TYPOGRAPHY_PRESET: TypographyPreset = "comfort";

/** localStorage 키 — 타이포그래피 선호 저장용 */
export const TYPOGRAPHY_LS_KEY = "noa_typography_preset_v1";

// ============================================================
// PART 2 — CSS 변수 적용 (documentElement)
// ============================================================

function isValidPreset(value: unknown): value is TypographyPreset {
  return value === "comfort" || value === "compact" || value === "large";
}

/**
 * CSS 변수 3개를 document.documentElement에 기록.
 * SSR/비브라우저 환경에서 안전하게 no-op.
 */
export function applyTypography(preset: TypographyPreset): void {
  if (typeof document === "undefined") return;
  const tokens = TYPOGRAPHY_PRESETS[preset];
  if (!tokens) return;
  const root = document.documentElement;
  root.style.setProperty("--editor-font-size", `${tokens.fontSize}px`);
  root.style.setProperty("--editor-line-height", `${tokens.lineHeight}`);
  root.style.setProperty("--editor-letter-spacing", `${tokens.letterSpacing}em`);
  root.setAttribute("data-typography-preset", preset);
}

/** localStorage에서 프리셋 로드 — 실패/누락 시 기본값 */
export function loadTypographyPreset(): TypographyPreset {
  if (typeof window === "undefined") return DEFAULT_TYPOGRAPHY_PRESET;
  try {
    const raw = window.localStorage.getItem(TYPOGRAPHY_LS_KEY);
    if (isValidPreset(raw)) return raw;
  } catch {
    /* quota/privacy-mode — silent fallback */
  }
  return DEFAULT_TYPOGRAPHY_PRESET;
}

/** localStorage에 프리셋 저장 — 실패 시 silent */
export function saveTypographyPreset(preset: TypographyPreset): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TYPOGRAPHY_LS_KEY, preset);
  } catch {
    /* quota/privacy-mode — silent */
  }
}

// IDENTITY_SEAL: ergonomics/typography | role=typography-presets | inputs=preset | outputs=css-vars+persistence
