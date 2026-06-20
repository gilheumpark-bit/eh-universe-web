// ============================================================
// PART 1 — 타입·상수 (SaveState, AutoSaveSpec, KEY)
// ============================================================
// 자동 저장 + 인디케이터 — 편의 시스템.
// 순수 TS. localStorage 추상화는 허용 (실제 브라우저 호출은 가드).
// 절대금지 8파일 import 0.

/** 저장 상태 4단계 — UI 인디케이터(idle→saving→saved 또는 error) 매핑용. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** 자동 저장 사양 — getValue/setValue 의존성 주입으로 순수성 유지. */
export interface AutoSaveSpec {
  /** localStorage 키 */
  key: string;
  /** 자동 저장 주기 (ms) */
  intervalMs: number;
  /** 테스트 주입용 시계 — 미제공 시 Date.now() */
  now?: () => number;
  /** 현재 값 조회 */
  getValue: () => string;
  /** 값 적용 (로드 시) */
  setValue: (v: string) => void;
}

/** 원고 localStorage 키 — Muvel 흡수 정책에 따른 고정값. */
export const MANUSCRIPT_KEY = 'noa_desktop_manuscript_v1';

// ============================================================
// PART 2 — 순수 판정/라벨 (shouldAutoSave, saveStateLabel)
// ============================================================

/**
 * 자동 저장 트리거 판정.
 * - lastSavedAt null/음수/NaN: false (저장 이력 없거나 비정상 → 호출자가 명시 저장)
 * - intervalMs ≤ 0: false (비활성 가드)
 * - now < lastSavedAt: false (시계 역행 방어)
 * - (now - lastSavedAt) ≥ intervalMs: true
 */
export function shouldAutoSave(
  lastSavedAt: number | null,
  now: number,
  intervalMs: number,
): boolean {
  if (lastSavedAt === null) return false;
  if (!Number.isFinite(lastSavedAt) || lastSavedAt < 0) return false;
  if (!Number.isFinite(now) || now < 0) return false;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return false;
  if (now < lastSavedAt) return false;
  return now - lastSavedAt >= intervalMs;
}

/** SaveState → 한국어 UI 라벨. 미정의 상태도 안전 라벨로 폴백. */
export function saveStateLabel(s: SaveState): string {
  switch (s) {
    case 'idle':
      return '대기';
    case 'saving':
      return '저장 중…';
    case 'saved':
      return '저장됨';
    case 'error':
      return '저장 실패';
    default:
      return '대기';
  }
}

// ============================================================
// PART 3 — 영속화 (loadManuscript, persistManuscript)
// ============================================================

/**
 * 원고 로드.
 * - SSR/비브라우저: null
 * - 미저장/빈 문자열/예외: null
 * - 손상 JSON 가능성 없음 (순수 문자열 저장)
 */
export function loadManuscript(key: string): string | null {
  if (typeof key !== 'string' || key.length === 0) return null;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === '') return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * 원고 저장.
 * - 키 미지정/SSR: false
 * - text null/undefined: false (의도치 않은 삭제 방어)
 * - quota/private mode 예외: false
 * - 성공: true
 */
export function persistManuscript(key: string, text: string): boolean {
  if (typeof key !== 'string' || key.length === 0) return false;
  if (typeof text !== 'string') return false;
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}
