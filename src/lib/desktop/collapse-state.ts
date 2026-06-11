// ============================================================
// PART 1 — 타입·상수·내부 가드
// 접힘 상태 (사이드바·패널·통계 등) 키-부울 맵.
// 미정의 key 기본 false (펼친 상태). localStorage broken/quota 안전.
// 절대금지 8파일 import 0. 순수 TS — React/DOM 직접 호출 없음.
// ============================================================

/** 키별 접힘 여부. true=접힘, false/미정의=펼침. */
export interface CollapseMap {
  [k: string]: boolean;
}

/** localStorage 영속 키. v1 스키마. */
export const KEY = 'noa_desktop_collapse_v1';

/** 안전한 localStorage 가용성 체크 — SSR / private mode 양쪽 방어. */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** 입력값을 CollapseMap 으로 정규화 — 비객체·null·이상값 모두 빈 맵으로. */
function normalize(input: unknown): CollapseMap {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const src = input as Record<string, unknown>;
  const out: CollapseMap = {};
  for (const k of Object.keys(src)) {
    if (typeof k !== 'string' || k.length === 0) continue;
    // boolean 만 보존, 그 외 값은 무시 (안전성 [C])
    if (typeof src[k] === 'boolean') out[k] = src[k] as boolean;
  }
  return out;
}

// ============================================================
// PART 2 — 영속 I/O (load / save)
// localStorage broken (JSON parse 실패) · quota (setItem 실패) 모두 흡수.
// ============================================================

/** localStorage 에서 접힘 맵 로드. 실패 시 빈 맵. */
export function loadCollapse(): CollapseMap {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return normalize(JSON.parse(raw));
  } catch {
    // JSON.parse 실패 / 보안 정책 차단 — 무시
    return {};
  }
}

/** 접힘 맵 저장. null/undefined → 빈 맵으로 저장. quota 초과 흡수. */
export function saveCollapse(m: CollapseMap | null | undefined): void {
  if (!hasStorage()) return;
  try {
    const safe = normalize(m);
    window.localStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    /* quota / private mode — 무시 */
  }
}

// ============================================================
// PART 3 — 조회·토글 순수 함수
// 미정의 key 는 false (펼친 상태). 입력 맵 불변 — 토글은 새 객체 반환.
// ============================================================

/** key 의 접힘 여부 조회. 미정의 → false (펼친 상태). */
export function isCollapsed(m: CollapseMap | null | undefined, k: string): boolean {
  if (!m || typeof m !== 'object') return false;
  if (typeof k !== 'string' || k.length === 0) return false;
  return m[k] === true;
}

/** key 의 접힘 상태 토글. 새 CollapseMap 반환 (원본 불변). */
export function toggleCollapse(
  m: CollapseMap | null | undefined,
  k: string,
): CollapseMap {
  const base = normalize(m);
  if (typeof k !== 'string' || k.length === 0) return base;
  const next: CollapseMap = { ...base };
  next[k] = !(base[k] === true);
  return next;
}
