// ============================================================
// PART 1 — 타입·상수·내부 가드
// 즐겨찾기·북마크 항목 (탭/컨텍스트/메모/원고 위치).
// ref 기준 중복 차단. at(timestamp) 외부 주입 — 순수성 보존.
// 절대금지 8파일 import 0. 순수 TS — React/DOM 직접 호출 없음.
// localStorage 추상화 (broken/quota 안전).
// ============================================================

/** 즐겨찾기 항목 종류 — UI 분기 + 라우팅에 사용. */
export type FavoriteKind = 'tab' | 'context' | 'memo' | 'manuscript-pos';

/** 즐겨찾기 항목. id 는 호출자 책임. ref 가 중복 식별자 역할. */
export interface Favorite {
  /** 내부 고유 ID (UUID 등 외부 주입). */
  id: string;
  /** 분류 — UI 아이콘·라우팅 분기에 사용. */
  kind: FavoriteKind;
  /** 사용자 표시용 라벨. */
  label: string;
  /** 대상 참조 — 탭 ID / 컨텍스트 키 / 원고 위치 등. 중복 차단 기준. */
  ref: string;
  /** 추가 시각 (epoch ms). 외부 주입 — 순수성·테스트 안정성. */
  at: number;
}

/** localStorage 영속 키. v1 스키마. */
export const KEY = 'noa_desktop_favorites_v1';

/** 허용된 kind 집합 — 검증·정규화에 사용. */
const VALID_KINDS: ReadonlySet<FavoriteKind> = new Set<FavoriteKind>([
  'tab',
  'context',
  'memo',
  'manuscript-pos',
]);

/** kind 유효성 검사 가드 (안전성 [C]). */
function isValidKind(k: unknown): k is FavoriteKind {
  return typeof k === 'string' && VALID_KINDS.has(k as FavoriteKind);
}

/** 안전한 localStorage 가용성 체크 — SSR / private mode 양쪽 방어. */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** 단일 Favorite 정규화 — 잘못된 필드는 null 반환 (안전성 [C]). */
function normalizeOne(input: unknown): Favorite | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  // 필수 필드 모두 검증 — 하나라도 실패 시 폐기
  if (typeof src.id !== 'string' || src.id.length === 0) return null;
  if (!isValidKind(src.kind)) return null;
  if (typeof src.label !== 'string') return null;
  if (typeof src.ref !== 'string' || src.ref.length === 0) return null;
  if (typeof src.at !== 'number' || !Number.isFinite(src.at)) return null;
  return {
    id: src.id,
    kind: src.kind,
    label: src.label,
    ref: src.ref,
    at: src.at,
  };
}

/** 배열 입력을 Favorite[] 로 정규화 — 비배열·잘못된 항목은 폐기. */
function normalizeList(input: unknown): Favorite[] {
  if (!Array.isArray(input)) return [];
  const out: Favorite[] = [];
  for (const item of input) {
    const norm = normalizeOne(item);
    if (norm) out.push(norm);
  }
  return out;
}

// ============================================================
// PART 2 — 영속 I/O (load / save)
// localStorage broken (JSON parse 실패) · quota (setItem 실패) 모두 흡수.
// ============================================================

/** localStorage 에서 즐겨찾기 로드. 실패 시 빈 배열. */
export function loadFavorites(): Favorite[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return normalizeList(JSON.parse(raw));
  } catch {
    // JSON.parse 실패 / 보안 정책 차단 — 무시
    return [];
  }
}

/** 즐겨찾기 배열 저장. null/undefined → 빈 배열 저장. quota 초과 흡수. */
export function saveFavorites(list: Favorite[] | null | undefined): void {
  if (!hasStorage()) return;
  try {
    const safe = normalizeList(list);
    window.localStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    /* quota / private mode — 무시 */
  }
}

// ============================================================
// PART 3 — 순수 함수 (add / remove / filter)
// 입력 배열 불변 — 모든 연산이 새 배열 반환. ref 중복 차단.
// ============================================================

/**
 * 즐겨찾기 추가. ref 중복 시 기존 목록 그대로 반환 (멱등).
 * 잘못된 입력 (null·필드 누락·invalid kind) 도 기존 목록 그대로.
 */
export function addFavorite(
  list: Favorite[] | null | undefined,
  f: Favorite | null | undefined,
): Favorite[] {
  const base = normalizeList(list);
  const norm = normalizeOne(f);
  if (!norm) return base;
  // ref 중복 차단 — 멱등성 보장
  if (base.some((x) => x.ref === norm.ref)) return base;
  return [...base, norm];
}

/**
 * id 로 즐겨찾기 제거. 미존재 id 는 무시 (기존 목록 그대로).
 * 빈 id / 잘못된 입력도 안전 처리.
 */
export function removeFavorite(
  list: Favorite[] | null | undefined,
  id: string,
): Favorite[] {
  const base = normalizeList(list);
  if (typeof id !== 'string' || id.length === 0) return base;
  return base.filter((x) => x.id !== id);
}

/**
 * kind 기준 필터. 잘못된 kind 는 빈 배열 반환 (안전성 [C]).
 */
export function filterByKind(
  list: Favorite[] | null | undefined,
  kind: FavoriteKind,
): Favorite[] {
  if (!isValidKind(kind)) return [];
  const base = normalizeList(list);
  return base.filter((x) => x.kind === kind);
}
