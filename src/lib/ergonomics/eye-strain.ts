// ============================================================
// ergonomics/eye-strain — 장시간 세션 시 자동 다이머 엔진
// ============================================================
// 연속 집필 90분/180분 임계를 지나면 "저녁 모드" 레벨을 올린다.
// 기존 UnifiedSettingsContext의 blueLightFilter 토글은 별개 — 이 모듈은
// data-eye-strain-level 속성을 documentElement에 기록해 전용 CSS가
// 단계별 warm filter를 적용한다.
//
// 설계 원칙:
//  - 순수 함수로 computeLevel(elapsedMs) 분리 → 시간 기반 테스트 독립성
//  - applyEyeStrainLevel()은 documentElement에만 side-effect
//  - 사용자 수동 오버라이드를 존중 (levelOverride 파라미터)
// ============================================================

// ============================================================
// PART 1 — 임계/타입
// ============================================================

/** 레벨 0: 정상, 1: 90분+ warm, 2: 180분+ warm+dim */
export type EyeStrainLevel = 0 | 1 | 2;

/** 90분 (ms) — 레벨 1 임계 */
export const EYE_STRAIN_L1_MS = 90 * 60 * 1000;
/** 180분 (ms) — 레벨 2 임계 */
export const EYE_STRAIN_L2_MS = 180 * 60 * 1000;

export const MAX_EYE_STRAIN_LEVEL: EyeStrainLevel = 2;

// ============================================================
// PART 2 — 레벨 계산 (순수 함수)
// ============================================================

/**
 * 연속 세션 경과 ms로부터 권장 레벨 산출.
 * 음수/Non-finite → 0. Cap at MAX_EYE_STRAIN_LEVEL.
 */
export function computeEyeStrainLevel(elapsedMs: number): EyeStrainLevel {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (elapsedMs >= EYE_STRAIN_L2_MS) return 2;
  if (elapsedMs >= EYE_STRAIN_L1_MS) return 1;
  return 0;
}

/**
 * 사용자가 수동으로 더 낮게/높게 설정했다면 그 값을 우선.
 * levelOverride === null → 자동 레벨 반환.
 */
export function resolveEyeStrainLevel(
  elapsedMs: number,
  levelOverride: EyeStrainLevel | null,
): EyeStrainLevel {
  if (levelOverride !== null) return levelOverride;
  return computeEyeStrainLevel(elapsedMs);
}

// ============================================================
// PART 3 — DOM side-effect
// ============================================================

/**
 * documentElement에 data-eye-strain-level 속성 기록.
 * CSS는 globals.css의 [data-eye-strain-level="1"/"2"] 셀렉터로 warm filter 적용.
 * SSR/비브라우저 환경에서 안전하게 no-op.
 */
export function applyEyeStrainLevel(level: EyeStrainLevel): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (level === 0) {
    root.removeAttribute("data-eye-strain-level");
  } else {
    root.setAttribute("data-eye-strain-level", String(level));
  }
}

// IDENTITY_SEAL: ergonomics/eye-strain | role=session-dimmer | inputs=elapsedMs | outputs=level+data-attr
