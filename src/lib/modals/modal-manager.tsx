"use client";
// ============================================================
// modal-manager — 활성 Loreguard 영역 공용 ModalContext (SharedSurgery-4)
// Shell 류 파일의 9+ modal useState 분산 → 단일 Context 로 통합.
// 어느 modal 이 열렸는지 단일 source. keyboard-manager 와 연동 (modal 중 단축키 자동 suppress).
//
// 의도:
//   - showCommandPalette / showSettings / showShortcuts / confirmState 등 분산 state 통합
//   - 한 번에 1개 modal 만 열림 (모달 스택 미지원 — UX 단순)
//   - openModal/closeModal/replaceModal 3 API
//   - Provider tree: <GradeProvider> <ModalProvider> <Children />  (Modal 안에서 Grade 조회 가능)
//
// [P16 루프2/중급, 2026-06-08] API 정책 명세:
//   - 1.x (현재): 단일 modal 가정. setKeyboardModalState(boolean) 가 keyboard suppress 의 primary API.
//                pushKeyboardModal/popKeyboardModal 은 향후 nested modal 용 secondary API (실험적).
//   - 2.x (proposed): nested modal 활성화 전 ADR 작성 필수. 현재 가정 위반 시 다이얼로그 z-index 충돌 +
//                useEffect cleanup race 등 회귀 위험.
//   - 권장 패턴: openModal('a') → 다른 modal 띄울 땐 replaceModal('b'). 닫기는 closeModal().
//   - 두 modal 이 동시에 보여야 한다면 → 부모/자식 modal 1개에 sub-section 으로 통합.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { setKeyboardModalState } from '@/lib/keyboard/keyboard-manager';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types
// ============================================================

/** Modal ID — 영역별 prefix. 신규 모달 추가 시 여기에. */
export type ModalId =
  // Novel Studio
  | 'studio:command-palette'
  | 'studio:settings'
  | 'studio:api-keys'
  | 'studio:save-slot'
  | 'studio:rename'
  | 'studio:move'
  | 'studio:confirm'
  // Translation Studio
  | 'translation-studio:command-palette'
  | 'translation-studio:settings'
  | 'translation-studio:confirm'
  // Global
  | 'global:confirm';

/**
 * Modal payload — 각 modal 이 받는 데이터.
 * any 사용 금지: 새 modal 은 위 union + 여기 record 에 명시.
 * 미정의 modal 은 빈 객체 허용 (런타임 noop).
 *
 * [priority 10 — 2026-06-08] exhaustiveness:
 *   - 아래 _ModalPayloadsExhaustive type 이 ModalId union 의 모든 키를 ModalPayloads 에 강제.
 *   - 새 ModalId 추가 시 ModalPayloads 에 매핑 누락하면 컴파일 에러.
 *   - Payload 가 없는 modal 은 `Record<string, never>` 로 명시 (런타임 noop, 타입 안전).
 */
export interface ModalPayloads {
  'studio:confirm': { title: string; message: string; onConfirm: () => void };
  'studio:rename': { itemId: string; currentName: string };
  'studio:move': { itemId: string };
  // [rank 19 — 2026-06-07] save-slot · api-keys 도 payload 명시 (둘 다 payload 없음 OK — never 로 막아 type 안전)
  'studio:save-slot': Record<string, never>;
  'studio:api-keys': Record<string, never>;
  'studio:command-palette': Record<string, never>;
  'studio:settings': Record<string, never>;
  'translation-studio:confirm': { title: string; message: string; onConfirm: () => void };
  'translation-studio:command-palette': Record<string, never>;
  'translation-studio:settings': Record<string, never>;
  'global:confirm': { title: string; message: string; onConfirm: () => void };
}

/**
 * [priority 10 — 2026-06-08] Compile-time exhaustiveness assert.
 * 새 ModalId 추가 시 ModalPayloads 에 매핑 누락하면 다음 줄에서 type 에러 발생:
 *   Type 'X' does not satisfy the constraint 'Record<ModalId, ...>'.
 * 이 타입은 빌드 산출물에 없음 — 순수 컴파일 시 검사용.
 */
type _ModalPayloadsExhaustive = {
  [K in ModalId]: ModalPayloads[K extends keyof ModalPayloads ? K : never];
};
// 사용 없음 표시 — type-only assertion. 런타임 영향 0.
export type __ModalPayloadsExhaustiveCheck = _ModalPayloadsExhaustive;

/** Modal state — 현재 열린 modal 또는 null */
export interface ModalState {
  id: ModalId | null;
  payload: unknown;
}

// ============================================================
// PART 2 — Context · Reducer
// ============================================================

type ModalAction =
  | { type: 'open'; id: ModalId; payload?: unknown }
  | { type: 'close' }
  | { type: 'replace'; id: ModalId; payload?: unknown };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'open':    return { id: action.id, payload: action.payload };
    case 'replace': return { id: action.id, payload: action.payload };
    case 'close':   return { id: null, payload: undefined };
    default:        return state;
  }
}

// [priority 10 — 2026-06-08] payload tuple helper:
//   - Record<string, never> (= 빈 payload) → 인자 생략 가능
//   - 명시 payload → 필수
type ModalPayloadArg<K extends ModalId> = K extends keyof ModalPayloads
  ? ModalPayloads[K] extends Record<string, never>
    ? [] | [Record<string, never>]
    : [ModalPayloads[K]]
  : [unknown?];

export interface ModalContextValue {
  state: ModalState;
  /** 새 modal 열기 (이미 열린 게 있으면 덮어쓰기 차단 — replace 사용) */
  openModal: <K extends ModalId>(id: K, ...payload: ModalPayloadArg<K>) => void;
  /** 강제 교체 */
  replaceModal: <K extends ModalId>(id: K, ...payload: ModalPayloadArg<K>) => void;
  /** 닫기 */
  closeModal: () => void;
  /** id 가 현재 열린 modal 인가 */
  isOpen: (id: ModalId) => boolean;
  /**
   * [P4 풀점검 루프 3] openModal 호출 전 미리 가능 여부 확인.
   * 같은 id 이미 열림 OR 다른 modal 없음 → true.
   * 다른 modal 열린 상태 → false (replaceModal 사용 권장).
   */
  canOpenModal: (id: ModalId) => boolean;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// ============================================================
// PART 3 — Provider
// ============================================================

export function ModalProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(modalReducer, { id: null, payload: undefined });
  const stateRef = useRef(state);

  // [rank 10 fix — 2026-06-07] React Rules Violation 수리:
  // ref 를 render 중에 mutate 하면 (`stateRef.current = state`) Concurrent rendering 에서
  // render 가 throw/interrupt 될 때 stale closure 발생. useEffect 로 옮겨 commit 후 동기화.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // modal 열림 상태를 keyboard-manager 에 전달 — 단축키 자동 suppress
  useEffect(() => {
    setKeyboardModalState(state.id !== null);
  }, [state.id]);

  const openModal = useCallback((id: ModalId, payload?: unknown) => {
    if (stateRef.current.id !== null && stateRef.current.id !== id) {
      // [루프 4 P6 — 2026-06-08] silent suppression 해소.
      //   dev: logger.warn 유지.
      //   production: 구조화 log (관측성 인프라가 capture). noa:alert 는 미발화 —
      //   modal 충돌은 코드 버그 (UX 오류 아님) 이므로 사용자 토스트 X.
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('modal-manager', `openModal("${id}") ignored — "${stateRef.current.id}" already open. Use replaceModal to force.`);
      }
      try {
        logger.warn({
          component: 'modal-manager',
          event: 'open_ignored',
          meta: {
            requested_id: id,
            already_open: stateRef.current.id,
            hint: 'Use replaceModal() or canOpenModal() guard before calling.',
          },
        });
      } catch { /* never throw inside callback */ }
      return;
    }
    dispatch({ type: 'open', id, payload });
  }, []);

  const replaceModal = useCallback((id: ModalId, payload?: unknown) => {
    dispatch({ type: 'replace', id, payload });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'close' });
  }, []);

  const isOpen = useCallback((id: ModalId) => stateRef.current.id === id, []);

  // [P4 풀점검 루프 3] canOpenModal — openModal 가능 여부 사전 체크.
  // 같은 modal 재오픈 OR 닫힌 상태 = true. 다른 modal 열림 = false.
  const canOpenModal = useCallback(
    (id: ModalId) => stateRef.current.id === null || stateRef.current.id === id,
    [],
  );

  const value = useMemo<ModalContextValue>(
    () => ({
      state,
      openModal: openModal as ModalContextValue['openModal'],
      replaceModal: replaceModal as ModalContextValue['replaceModal'],
      closeModal,
      isOpen,
      canOpenModal,
    }),
    [state, openModal, replaceModal, closeModal, isOpen, canOpenModal],
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

// ============================================================
// PART 4 — Hooks
// ============================================================

/** Modal Context 사용. Provider 밖에서 호출 시 throw — 경계 명확. */
export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('[modal-manager] useModal must be used within <ModalProvider>');
  }
  return ctx;
}

/** Modal Provider 가 마운트돼 있는지 — 가드용 (예: 데스크탑에서 안전한 fallback) */
export function useModalSafe(): ModalContextValue | null {
  return useContext(ModalContext);
}

/** 특정 modal 이 현재 열림 여부 — 컴포넌트가 자기 자신 렌더 조건 */
export function useModalOpen(id: ModalId): boolean {
  const ctx = useContext(ModalContext);
  return ctx?.state.id === id;
}

/** 특정 modal payload — 타입 안전 추출 */
export function useModalPayload<K extends keyof ModalPayloads>(
  id: K,
): ModalPayloads[K] | null {
  const ctx = useContext(ModalContext);
  if (!ctx || ctx.state.id !== id) return null;
  return ctx.state.payload as ModalPayloads[K];
}
