// ============================================================
// PART 1 — 타입·상수·내부 가드
// 사이드바·캔버스 등 패널 폭(px)을 드래그로 리사이즈하기 위한 순수 헬퍼.
// 음수/NaN/Infinity/비숫자/빈 key 전부 방어. SSR / private mode 안전.
// 절대금지 8파일 import 0. React/DOM 직접 호출 0 — localStorage 만 추상화.
// ============================================================

/** localStorage 키 접두사. 호출 측 key 와 결합되어 최종 키 산출. */
export const KEY_PREFIX = 'noa_desktop_panelw_';

/** 기본 사이드바 폭 (px). 사양 명시값. */
export const DEFAULT_SIDEBAR_WIDTH = 220;

/** 기본 캔버스 폭 (px). 사양 명시값. */
export const DEFAULT_CANVAS_WIDTH = 420;

/** 안전한 localStorage 가용성 체크 — SSR / private mode 양쪽 방어. */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** 숫자 유효성 — NaN/Infinity/비숫자 전부 거부. */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** key 정규화 — 비문자열·빈문자열 방어. 유효 시 prefix 결합 키 반환. */
function storageKey(key: string): string | null {
  if (typeof key !== 'string' || key.length === 0) return null;
  return KEY_PREFIX + key;
}

// ============================================================
// PART 2 — 순수 계산 헬퍼 (clamp / applyDelta)
// 모든 함수는 부수효과 0. 음수/NaN/min>max 경계 가드 내장.
// ============================================================

/**
 * 폭 값을 [min, max] 범위로 클램프.
 * - w/min/max 중 하나라도 비숫자·NaN·Infinity → min 으로 fallback (양수 보장)
 * - min < 0 → 0 으로 보정
 * - max < min → min 으로 보정 (단일점 범위)
 * - 결과는 항상 정수 (소수점 반올림) — 픽셀 단위 일관성 확보
 */
export function clampWidth(w: unknown, min: unknown, max: unknown): number {
  const safeMin = isFiniteNumber(min) ? Math.max(0, min) : 0;
  const safeMaxRaw = isFiniteNumber(max) ? max : safeMin;
  const safeMax = safeMaxRaw < safeMin ? safeMin : safeMaxRaw;
  if (!isFiniteNumber(w)) return Math.round(safeMin);
  if (w < safeMin) return Math.round(safeMin);
  if (w > safeMax) return Math.round(safeMax);
  return Math.round(w);
}

/**
 * 드래그 델타 적용. start + delta 를 [min, max] 로 클램프.
 * - start/delta 가 비숫자·NaN·Infinity → 0 으로 취급
 * - 음수 delta = 좌측/상단 방향 축소
 * - 결과는 항상 정수
 */
export function applyDelta(
  start: unknown,
  delta: unknown,
  min: unknown,
  max: unknown,
): number {
  const safeStart = isFiniteNumber(start) ? start : 0;
  const safeDelta = isFiniteNumber(delta) ? delta : 0;
  return clampWidth(safeStart + safeDelta, min, max);
}

// ============================================================
// PART 3 — 영속 I/O (loadWidth / saveWidth)
// localStorage broken / quota / SSR 모두 흡수. 실패 시 기본값 fallback.
// ============================================================

/**
 * key 의 저장된 폭 로드. 미저장·이상값·SSR → fallback 반환.
 * @param key 패널 식별자 (예: 'sidebar', 'canvas')
 * @param fallback 미저장 시 반환할 기본값 (생략 시 0)
 */
export function loadWidth(key: string, fallback: number = 0): number {
  const safeFallback = isFiniteNumber(fallback) ? Math.max(0, fallback) : 0;
  const sk = storageKey(key);
  if (!sk || !hasStorage()) return Math.round(safeFallback);
  try {
    const raw = window.localStorage.getItem(sk);
    if (raw === null || raw === '') return Math.round(safeFallback);
    const parsed = Number(raw);
    if (!isFiniteNumber(parsed) || parsed < 0) return Math.round(safeFallback);
    return Math.round(parsed);
  } catch {
    // 보안 정책 차단 / parse 예외 — 안전한 fallback
    return Math.round(safeFallback);
  }
}

/**
 * key 의 폭 저장. 음수/NaN/Infinity 는 저장 거부 (no-op).
 * quota 초과·private mode 도 무시.
 */
export function saveWidth(key: string, w: unknown): void {
  const sk = storageKey(key);
  if (!sk || !hasStorage()) return;
  if (!isFiniteNumber(w) || w < 0) return;
  try {
    window.localStorage.setItem(sk, String(Math.round(w)));
  } catch {
    /* quota / private mode — 무시 */
  }
}
