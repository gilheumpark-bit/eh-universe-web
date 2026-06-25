// ============================================================
// zen-mode — Zen 집중 모드 상태 모델
// 사이드바·스트립·헤더 가시성 토글 + localStorage 영속.
// 순수 TS. DOM/React 직접 호출 0. 브라우저 가드 적용.
// 절대금지 8파일 import 0.
// ============================================================

// ============================================================
// PART 1 — 타입 + 상수 (역할: 도메인 모델 + 키)
// ============================================================

/** Zen 집중 모드 상태. enabled=true 시 보조 UI 숨김. */
export interface ZenState {
  /** Zen 모드 자체 활성 여부 */
  enabled: boolean;
  /** 사이드바(파일 트리 등) 숨김 */
  hideSidebar: boolean;
  /** 도구 스트립(우측/하단 도구바) 숨김 */
  hideStrip: boolean;
  /** 상단 헤더(탭바·메뉴) 숨김 */
  hideHeader: boolean;
}

/** 비활성 기본값 — 모든 UI 보임. */
export const DEFAULT_ZEN: ZenState = {
  enabled: false,
  hideSidebar: false,
  hideStrip: false,
  hideHeader: false,
};

/** localStorage 키 (v1). */
const KEY = 'noa_desktop_zen_v1';

// ============================================================
// PART 2 — 정규화 (역할: 입력 방어 + 타입 가드)
// ============================================================

/** 임의 입력 → 안전한 ZenState 보정. null/잘못된 형/누락 키 모두 기본값으로. */
export function clampZen(input: Partial<ZenState> | null | undefined): ZenState {
  if (!input || typeof input !== 'object') return { ...DEFAULT_ZEN };
  const b = (v: unknown, fb: boolean): boolean => (typeof v === 'boolean' ? v : fb);
  return {
    enabled: b(input.enabled, DEFAULT_ZEN.enabled),
    hideSidebar: b(input.hideSidebar, DEFAULT_ZEN.hideSidebar),
    hideStrip: b(input.hideStrip, DEFAULT_ZEN.hideStrip),
    hideHeader: b(input.hideHeader, DEFAULT_ZEN.hideHeader),
  };
}

// ============================================================
// PART 3 — 영속 (역할: load/save with 브라우저·JSON 가드)
// ============================================================

/** localStorage에서 ZenState 로드. SSR/손상 시 기본값. */
export function loadZen(): ZenState {
  if (typeof window === 'undefined') return { ...DEFAULT_ZEN };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_ZEN };
    const parsed = JSON.parse(raw) as Partial<ZenState>;
    return clampZen(parsed);
  } catch {
    return { ...DEFAULT_ZEN };
  }
}

/** ZenState를 localStorage에 저장. 저장 전 clamp. SSR/quota는 무시. */
export function saveZen(state: ZenState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(clampZen(state)));
  } catch {
    /* quota/private mode — 무시 */
  }
}

// ============================================================
// PART 4 — 토글 (역할: enabled 토글 시 보조 3 플래그 동기화)
// ============================================================

/**
 * Zen 모드 enabled 토글. enabled 가 false → true 가 되면 보조 3 플래그도 true로,
 * true → false 가 되면 보조 3 플래그도 false로 동기화하여
 * "한 번에 들어가고 한 번에 빠져나오는" UX 의미를 보장한다.
 */
export function toggleZen(state: ZenState | null | undefined): ZenState {
  const current = clampZen(state);
  const next = !current.enabled;
  return {
    enabled: next,
    hideSidebar: next,
    hideStrip: next,
    hideHeader: next,
  };
}
