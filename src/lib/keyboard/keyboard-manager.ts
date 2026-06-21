// ============================================================
// keyboard-manager — 공용 KeyboardRegistry (SharedSurgery-2)
// Studio 훅과 직접 window.keydown 등록을 단일 dispatch로 통합.
// 영역(area) 가드 + modal-aware suppress + input-focus 자동 무시 + 우선순위.
//
// 의도:
//   - 이 모듈만 window.keydown 리스너 1개 등록 (전역)
//   - 영역별 hook (useStudioKeyboard 등) 은 점진적으로 이 매니저에 위임
//   - 키 충돌 시 우선순위 (priority desc) — 같은 priority 면 등록 순서
//
// React/DOM 의존: useEffect 만. 영역 가드는 pathname 매칭으로 처리.
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
// [P9 루프2 — 2026-06-08] normalizeKeystroke 는 keybinding-audit 에서 사용.
// parseCombo 는 자체 inline normalize (option/cmd/meta 별칭 처리 + ctrl/meta 구분 보존).

// ============================================================
// PART 1 — Types
// ============================================================

// ============================================================
// API 선택 가이드 (P20 루프3 — 2026-06-08)
// ============================================================
// 키 바인딩 등록 API 3종 — 상황에 맞게 선택.
//
//   (1) registerKeyBinding(binding) → unregister()
//        - dynamic / 컴포넌트 밖 / 외부 cleanup 필요.
//        - 예: action-binder, plugin 시스템, lifecycle 이 React 와 무관한 곳.
//        - 반환된 cleanup 함수를 명시적으로 호출해야 함 (누수 위험).
//
//   (2) useKeyboardManager(bindings)
//        - static 배열 / 다중 바인딩 한 번에 등록.
//        - 예: Shell 류 컴포넌트에서 5-10개 단축키 묶음 등록.
//        - bindings reference 변경 시 재등록 (useMemo 권장).
//
//   (3) useKeyBinding(binding)         ★ 일반 컴포넌트에서 권장
//        - 단일 바인딩 + handler 자동 안정화 (ref 사용).
//        - 예: 모달 ESC 닫기, 패널 토글 1개.
//        - 가장 적은 boilerplate. handler 가 매 렌더 바뀌어도 재등록 X.
//
// 결정 트리:
//   - hook (컴포넌트) 안 + 단일 binding → (3) useKeyBinding
//   - hook 안 + 여러 binding 묶음 → (2) useKeyboardManager
//   - hook 밖 (lifecycle 직접 관리) → (1) registerKeyBinding
//
// 예시:
//   // (3) 권장 — 모달 ESC 닫기.
//   useKeyBinding({ keys: 'escape', area: 'studio', handler: closeModal });
//
//   // (2) Shell 다중 바인딩.
//   useKeyboardManager(useMemo(() => [
//     { keys: 'ctrl+p', area: 'studio', handler: openPalette },
//     { keys: 'ctrl+k', area: 'studio', handler: openSearch },
//   ], [openPalette, openSearch]));
//
//   // (1) 외부 cleanup — plugin loader.
//   const unreg = registerKeyBinding({ keys: 'ctrl+shift+x', area: 'global', handler });
//   plugin.onUnload(() => unreg());
// ============================================================

/** 키 바인딩 적용 영역. global 은 어디서나 작동. */
export type KeyArea =
  | 'studio'
  | 'translation-studio'
  | 'desktop'
  | 'global';

export interface KeyBinding {
  /** 키 콤보. 예: "ctrl+p", "ctrl+shift+k", "f1", "escape" */
  keys: string;
  /** 적용 영역 (pathname 기반 가드) */
  area: KeyArea;
  /** 실행 핸들러 */
  handler: (e: KeyboardEvent) => void;
  /** 우선순위 (높을수록 먼저 매칭). 기본 0. */
  priority?: number;
  /** modal 열려있을 때 비활성 (기본 true) */
  disableInModal?: boolean;
  /** input/textarea/contenteditable 안에서도 작동 (기본 false — 모디파이어 없는 키는 자동 무시) */
  allowInInput?: boolean;
  /** 헬프 오버레이 표시용 설명 */
  description?: string;
  /** 등록 ID (debug · unregister) */
  id?: string;
  /**
   * [P11 풀점검 루프 3] 등록 타임스탬프 (내부용).
   * 같은 priority 일 때 tie-breaker — 늦게 등록된 것 우선.
   * registerKeyBinding 가 자동 부여 (외부 지정 불필요).
   */
  _registeredAt?: number;
}

interface ParsedCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

// ============================================================
// PART 2 — Parser · Matcher
// ============================================================

export function parseCombo(keys: string): ParsedCombo {
  // [P9 루프2 — 2026-06-08] 입력 normalize 단계만 단일 normalizeKeystroke 위임 (trim/lowercase/공백제거).
  // 단, ctrl ↔ meta 구분은 보존 — matchesCombo 가 OR 처리하지만, 콜러는 명세를 유지해야 함.
  // normalizeKeystroke 의 cmd→ctrl 매핑이 적용된 결과는 별도 비교용 (keybinding-audit).
  const cleaned = keys.trim().toLowerCase().replace(/\s+/g, '');
  const parts = cleaned.split('+').filter(Boolean);
  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key: parts.filter((p) => !['ctrl', 'control', 'shift', 'alt', 'option', 'meta', 'cmd'].includes(p))[0] ?? '',
  };
}

export function matchesCombo(e: KeyboardEvent, combo: ParsedCombo): boolean {
  // ctrl 과 meta(cmd) 동등 처리 — Mac/Windows 호환
  if (combo.ctrl !== (e.ctrlKey || e.metaKey)) return false;
  if (combo.shift !== e.shiftKey) return false;
  if (combo.alt !== e.altKey) return false;

  const eventKey = (e.key || '').toLowerCase();
  const comboKey = combo.key.toLowerCase();

  if (comboKey.startsWith('f') && /^f\d+$/.test(comboKey)) {
    return eventKey === comboKey;
  }

  const KEY_MAP: Record<string, string> = {
    'space': ' ',
    'enter': 'enter',
    'escape': 'escape',
    'tab': 'tab',
    'backspace': 'backspace',
    'delete': 'delete',
    '`': '`',
    'backquote': '`',
    '?': '?',
    '/': '/',
  };
  const normalized = KEY_MAP[comboKey] ?? comboKey;
  return eventKey === normalized || (e.code || '').toLowerCase() === `key${comboKey}`;
}

// ============================================================
// PART 3 — Area Matcher (pathname 기반)
// ============================================================

/**
 * 현재 pathname 이 binding 의 area 와 일치하는지.
 * global 은 항상 true.
 */
export function isAreaMatch(area: KeyArea, pathname: string): boolean {
  if (area === 'global') return true;
  if (area === 'studio') return pathname.startsWith('/studio');
  if (area === 'translation-studio') return pathname.startsWith('/translation-studio');
  if (area === 'desktop') return pathname.startsWith('/desktop');
  return false;
}

// ============================================================
// PART 4 — Global Registry (singleton, 단일 window 리스너)
// ============================================================

type Bindings = Map<string, KeyBinding>;
const registry: Bindings = new Map();
/**
 * [P11 풀점검 루프 3] 단일 boolean → modalStack (열린 modal id 집합).
 * 빠른 open/close 시 stale read 방어. 비어있으면 modal 없음.
 * setKeyboardModalState(boolean) 호환 유지 — true 면 default token 푸시.
 */
const modalStack: Set<string> = new Set();
const MODAL_DEFAULT_TOKEN = '__modal-default__';
let listenerInstalled = false;

function genId(): string {
  return `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getPathname(): string {
  if (typeof window === 'undefined') return '';
  return window.location?.pathname || '';
}

function isInputTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true;
  return target.isContentEditable === true;
}

/**
 * 단일 keydown 이벤트에 대해 매칭되는 binding 1개를 실행.
 *
 * [priority 8 — 2026-06-08] handler 내 register 호출 시 활성화 타이밍 명세:
 * - dispatch() 시작 시 registry snapshot 을 1번 캡처 — 이후 이 호출에서는 고정.
 * - handler 안에서 registerKeyBinding / pushKeyboardModal 을 호출해도
 *   해당 변경은 이 dispatch 가 아닌 **다음 keydown 이벤트**부터 반영됨.
 * - 같은 키 즉시 활성화가 필요하면: handler 안에서 register 한 뒤
 *   직접 핸들러를 동기 호출하거나, 이벤트를 재발행 (window.dispatchEvent) 할 것.
 * - 일반적으로는 권장하지 않음 — race 가능성. 명시적 API (예: openModal()) 사용을 권장.
 */
function dispatch(e: KeyboardEvent): void {
  if (registry.size === 0) return;

  const pathname = getPathname();
  const inInput = isInputTarget(e.target);
  // [P11 풀점검 루프 3] dispatch 시작 시 modal 상태 스냅샷 + registry snapshot.
  // 핸들러 실행 중 modal 이 열리거나 다른 binding 이 등록돼도 이 dispatch 는 영향 X.
  // → 변경은 다음 keydown 부터 반영 (위 JSDoc 참조).
  const modalOpenSnapshot = modalStack.size > 0;
  const registrySnapshot = Array.from(registry.values());

  // 우선순위 desc 정렬 후 첫 매칭 실행 (preventDefault + stopPropagation)
  const candidates: Array<KeyBinding & { combo: ParsedCombo }> = [];
  for (const b of registrySnapshot) {
    if (b.disableInModal !== false && modalOpenSnapshot) continue;
    if (!isAreaMatch(b.area, pathname)) continue;
    const combo = parseCombo(b.keys);
    if (!matchesCombo(e, combo)) continue;
    // input 안에서 모디파이어 없는 키는 무시 (allowInInput true 면 허용)
    if (inInput && !b.allowInInput && !combo.ctrl && !combo.alt && !combo.meta) continue;
    candidates.push({ ...b, combo });
  }

  if (candidates.length === 0) return;

  // [P11 풀점검 루프 3] priority 동률 시 tie-breaker: 늦게 등록 된 것 우선.
  // 같은 키 다중 등록 시 최신 마운트가 이전 마운트 가림 (LIFO).
  candidates.sort((a, b) => {
    const dp = (b.priority ?? 0) - (a.priority ?? 0);
    if (dp !== 0) return dp;
    return (b._registeredAt ?? 0) - (a._registeredAt ?? 0);
  });
  const top = candidates[0];
  e.preventDefault();
  e.stopPropagation();
  try {
    top.handler(e);
  } catch (err) {
    // [루프 4 P6 — 2026-06-08] silent suppression 해소.
    //   dev: logger.error 유지 (debug 표면).
    //   production: noa:alert event + 구조화 로그 (Sentry/외부 observability 가 collect).
    if (process.env.NODE_ENV !== 'production') {
      logger.error('keyboard-manager', 'handler threw', { bindingId: top.id, error: err });
    }
    // 모든 환경에서 구조화 로그 1줄 — Vercel structured logs / Sentry 캡처용.
    try {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({
        component: 'keyboard-manager',
        event: 'handler_threw',
        meta: {
          binding_id: top.id ?? '(anonymous)',
          binding_keys: top.keys,
          binding_area: top.area,
          error: msg,
        },
      });
    } catch { /* never throw inside catch */ }
    // 사용자 가시 토스트 — production 에서도 발화. noa:alert 리스너 (page.tsx) 가 표시.
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('noa:alert', {
          detail: {
            message: `단축키 처리 중 오류 (${top.keys}). 새로고침 후 다시 시도해 주세요.`,
            variant: 'error',
          },
        }));
      } catch { /* noop */ }
    }
  }
}

function ensureListener(): void {
  if (listenerInstalled || typeof window === 'undefined') return;
  window.addEventListener('keydown', dispatch, true);
  listenerInstalled = true;
}

// ============================================================
// PART 5 — Public API
// ============================================================

/**
 * 키 바인딩 등록. 반환된 함수로 등록 해제.
 * 같은 ID 재등록 시 기존 바인딩 교체.
 *
 * [P11 풀점검 루프 3] _registeredAt 자동 부여 — priority 동률 tie-breaker 용.
 */
export function registerKeyBinding(binding: KeyBinding): () => void {
  ensureListener();
  const id = binding.id || genId();
  registry.set(id, { ...binding, id, _registeredAt: Date.now() });
  return () => { registry.delete(id); };
}

/**
 * modal 열림 상태 전역 설정 — modal 컴포넌트가 mount/unmount 시 호출.
 *
 * [P11 풀점검 루프 3] 내부적으로 modalStack 사용 — 빠른 open/close race 방어.
 * - setKeyboardModalState(true) → 익명 토큰 추가 (이미 있으면 noop)
 * - setKeyboardModalState(false) → modalStack 전체 비움 (기존 거동 유지 — modal-manager 가 1개 modal 가정)
 *
 * 추후 다중 modal 스택 지원 시 pushModal(id) / popModal(id) API 분리 권장.
 */
export function setKeyboardModalState(open: boolean): void {
  if (open) {
    modalStack.add(MODAL_DEFAULT_TOKEN);
  } else {
    modalStack.clear();
  }
}

/**
 * [P11 풀점검 루프 3] 다중 modal 스택용 push/pop API.
 * 향후 nested modal 지원 시 사용. 기존 setKeyboardModalState 와 병행 가능.
 */
export function pushKeyboardModal(id: string): void {
  modalStack.add(id);
}
export function popKeyboardModal(id: string): void {
  modalStack.delete(id);
}

/** 등록된 바인딩 전체 조회 (디버그·헬프 오버레이) */
export function getAllBindings(): KeyBinding[] {
  return Array.from(registry.values());
}

/** 테스트용 — 전체 초기화 */
export function _resetKeyboardRegistry(): void {
  registry.clear();
  modalStack.clear();
}

// ============================================================
// PART 6 — React Hook
// ============================================================

/**
 * 컴포넌트 마운트 동안 키 바인딩 자동 등록·해제.
 * bindings reference 안정성 보장 필요 — useMemo 권장.
 *
 * 사용 예:
 * ```ts
 * useKeyboardManager([
 *   { keys: 'ctrl+p', area: 'studio', handler: () => openPalette() },
 * ]);
 * ```
 */
export function useKeyboardManager(bindings: KeyBinding[]): void {
  useEffect(() => {
    const unregs: Array<() => void> = [];
    for (const b of bindings) {
      unregs.push(registerKeyBinding(b));
    }
    return () => {
      for (const u of unregs) u();
    };
    // bindings reference 변경 시 재등록 — 콜러가 useMemo 로 안정화 권장.
  }, [bindings]);
}

/**
 * 단일 바인딩 등록 헬퍼 (가장 흔한 케이스).
 *
 * [priority 9 — 2026-06-08] deps 완전성:
 *   - handler 는 ref 로 안정화 (콜백 정체성 변동 무시).
 *   - 나머지 구조적 필드는 JSON 직렬화 1 dep 으로 통합 — id/description 포함.
 *   - 변경 의도가 명확: "structural change 시 재등록".
 *
 * 주의:
 *   - bindingKey 직렬화는 KeyBinding 구조 단순 가정 — handler 만 함수,
 *     나머지는 원시값/undefined. 추후 객체 필드 추가 시 직렬화 비결정성 확인.
 *   - 직렬화 비용은 마운트당 1회 + dep 비교 — 무시 가능.
 */
export function useKeyBinding(binding: KeyBinding): void {
  const handlerRef = useRef(binding.handler);
  handlerRef.current = binding.handler;

  // handler 만 ref 로 잡고 나머지는 deps
  const stable = useCallback((e: KeyboardEvent) => handlerRef.current(e), []);

  // [priority 9 — 2026-06-08] id/description 포함 — structural 변경 빠짐 없음.
  const bindingKey = JSON.stringify({
    keys: binding.keys,
    area: binding.area,
    priority: binding.priority ?? 0,
    disableInModal: binding.disableInModal ?? true,
    allowInInput: binding.allowInInput ?? false,
    id: binding.id ?? '',
    description: binding.description ?? '',
  });

  useEffect(() => {
    return registerKeyBinding({ ...binding, handler: stable });
    // bindingKey 가 structural snapshot — handler 는 stable 로 ref 화.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindingKey, stable]);
}
