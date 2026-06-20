// ============================================================
// ergonomics/ergonomics-settings — M6 토글 공통 저장소
// ============================================================
// 6개 인체공학 옵션을 localStorage 단일 키에 저장하고,
// 훅/설정 UI가 동일 스키마를 공유하도록 한다.
//
// 설계 원칙:
//  - 단일 키 `noa_ergonomics_settings_v1` → 마이그레이션 부담 감소
//  - 읽기/쓰기는 순수 함수 + try/catch (quota/privacy-mode 안전)
//  - SSR 안전: window 미정의 시 기본값 반환
//  - 부분 업데이트는 상위 훅에서 Object.assign으로 합성
// ============================================================

import type { TypographyPreset } from "./typography";

// ============================================================
// PART 1 — 스키마 + 기본값
// ============================================================

export interface ErgonomicsSettings {
  /** 타이포그래피 프리셋 — typography.ts와 공유 */
  typographyPreset: TypographyPreset;
  /** 30분마다 자세 nudge 토스트 — default: on */
  postureNudgeEnabled: boolean;
  /** 90분+ 자동 다이머 — default: on */
  eyeStrainDimmerEnabled: boolean;
  /** StudioStatusBar에 KPM 위젯 표시 — default: off (프라이버시 옵트인) */
  keystrokeHeatmapVisible: boolean;
  /** AI 10초+ 대기 시 손목 풀기 힌트 — default: on */
  wristRestHintEnabled: boolean;
  /** 탭 15분 이탈 후 복귀 nudge — default: off (옵트인) */
  focusDriftEnabled: boolean;
}

export const DEFAULT_ERGONOMICS_SETTINGS: ErgonomicsSettings = {
  typographyPreset: "comfort",
  postureNudgeEnabled: true,
  eyeStrainDimmerEnabled: true,
  keystrokeHeatmapVisible: false,
  wristRestHintEnabled: true,
  focusDriftEnabled: false,
};

export const ERGONOMICS_LS_KEY = "noa_ergonomics_settings_v1";

// ============================================================
// PART 2 — 로드/저장
// ============================================================

function isValidSettings(v: unknown): v is Partial<ErgonomicsSettings> {
  return typeof v === "object" && v !== null;
}

/** localStorage에서 설정 로드 — 일부 키 누락 시 기본값 병합 */
export function loadErgonomicsSettings(): ErgonomicsSettings {
  if (typeof window === "undefined") return { ...DEFAULT_ERGONOMICS_SETTINGS };
  try {
    const raw = window.localStorage.getItem(ERGONOMICS_LS_KEY);
    if (!raw) return { ...DEFAULT_ERGONOMICS_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSettings(parsed)) return { ...DEFAULT_ERGONOMICS_SETTINGS };
    return { ...DEFAULT_ERGONOMICS_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_ERGONOMICS_SETTINGS };
  }
}

/** 전체 덮어쓰기 저장 — 실패 시 silent (quota) */
export function saveErgonomicsSettings(next: ErgonomicsSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ERGONOMICS_LS_KEY, JSON.stringify(next));
  } catch {
    /* quota or privacy-mode — silent */
  }
}

/** 부분 업데이트 — 기존값 + partial 병합 후 저장 + 병합 결과 반환 */
export function updateErgonomicsSettings(
  partial: Partial<ErgonomicsSettings>,
): ErgonomicsSettings {
  const current = loadErgonomicsSettings();
  const next: ErgonomicsSettings = { ...current, ...partial };
  saveErgonomicsSettings(next);
  return next;
}

// IDENTITY_SEAL: ergonomics/settings | role=shared-toggle-store | inputs=partial | outputs=merged-settings
