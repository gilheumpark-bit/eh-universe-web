// ============================================================
// ui-preferences.ts — M8 UX balance helper
// 누구라도 재사용할 수 있는 얇은 localStorage 래퍼.
// 단일 키 → boolean on/off (주로 "accordion 펼침 상태" 보존용).
// ============================================================
// 설계 원칙
// - SSR-safe: typeof window 가드
// - 저장 실패(quota exceeded / 사파리 private mode) 시 silent no-op
// - 기본값은 "접힘(false)" — 작가가 원할 때만 펼친다 (progressive disclosure)
// - key는 "m8:<surface>.<detail>" 형태로 컨벤션 통일
// ============================================================

export type UIPrefKey = string;

/** ============================================================
 *  PART 1 — 저수준 read/write
 *  ============================================================ */
const NAMESPACE = "m8:";

/** 값을 읽는다. 실패하면 fallback을 반환. */
export function readUIPref(key: UIPrefKey, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(NAMESPACE + key);
    if (raw === null) return fallback;
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
    return fallback;
  } catch {
    // quota / 사파리 private 등 — silent no-op
    return fallback;
  }
}

/** 값을 저장한다. 실패하면 silent no-op. */
export function writeUIPref(key: UIPrefKey, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAMESPACE + key, value ? "1" : "0");
  } catch {
    // silent no-op — 기능이 작동 안 하는 것보다 오류 없는 게 낫다
  }
}

/** ============================================================
 *  PART 2 — 의미 있는 상수 키 목록 (M8에서 사용하는 것만)
 *  ============================================================ */
export const UI_PREF_KEYS = {
  /** SessionSection — M6 ergonomics 서브 그룹 펼침 상태. 기본 false. */
  sessionErgoOpen: "session.ergonomics.open",
  /** SessionSection — 통계·고급 (KPM/focus-drift) 서브 그룹. 기본 false. */
  sessionStatsOpen: "session.stats.open",
  /** AdvancedSection — 엔진 내부 파라미터 블록. 기본 false. */
  advancedEngineOpen: "advanced.engine.open",
  /** SceneSheet — 고급 설정 details 블록. 기본 false. */
  sceneSheetAdvancedOpen: "scenesheet.advanced.open",
} as const;

export type KnownUIPrefKey = (typeof UI_PREF_KEYS)[keyof typeof UI_PREF_KEYS];

// IDENTITY_SEAL: ui-preferences | role=m8-uiprefs | inputs=key+fallback | outputs=boolean+void
