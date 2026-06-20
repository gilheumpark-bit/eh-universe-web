"use client";

// ============================================================
// PART 1 — useWritingReducer: Writing 탭 로컬 상태 클러스터
// ============================================================
//
// M2 Day 6-7 — 의미적으로 관련된 state만 묶음. 무리한 통합 금지.
//
// 묶는 대상 (6개 state → 1 reducer):
//   1. isDragOver           — 파일 드래그 상태
//   2. splitView            — 'chat' | 'reference' | null (localStorage 연동)
//   3. advancedMenuOpen     — 고급 드롭다운 open 상태 (ModeSwitch 이전됨)
//   4. showCompletionHint   — Tab 자동완성 힌트 표시
//   5. draftVersions/idx    — 자동 스냅샷 (300자+ 변경)
//   6. novelSelection       — Tiptap 선택 영역 (InlineActionPopup 연동)
//
// 묶지 않는 대상 (이유):
//   - inlineCompletionEnabled / completionHintShown — localStorage 단독.
//   - sceneWarnings — useSceneWarnings 훅으로 분리됨.
//   - slowWarning — useSlowWarning 훅으로 분리됨.
//   - editDraft / writingMode — StudioShell 상위에서 내려옴 (prop 유지).
//
// [K] `splitView` localStorage 키는 기존 'noa_split_view_default' 유지 — 호환.
// [C] 모든 액션은 타입 리터럴로 좁힘 → exhaustive switch.
// ============================================================

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import type { NovelEditorSelection } from '@/components/studio/NovelEditor';

// ============================================================
// PART 2 — 타입
// ============================================================

export type SplitView = 'chat' | 'reference' | null;

export interface WritingUiState {
  isDragOver: boolean;
  splitView: SplitView;
  showCompletionHint: boolean;
  draftVersions: string[];
  draftVersionIdx: number;
  novelSelection: NovelEditorSelection | null;
}

export type WritingUiAction =
  | { type: 'SET_DRAG_OVER'; payload: boolean }
  | { type: 'SET_SPLIT_VIEW'; payload: SplitView }
  | { type: 'TOGGLE_SPLIT_VIEW' }
  | { type: 'SET_COMPLETION_HINT'; payload: boolean }
  | { type: 'SET_DRAFT_VERSIONS'; payload: string[] }
  | { type: 'PUSH_DRAFT_VERSION'; payload: string }
  | { type: 'SET_DRAFT_VERSION_IDX'; payload: number | ((prev: number) => number) }
  | { type: 'SET_NOVEL_SELECTION'; payload: NovelEditorSelection | null };

// ============================================================
// PART 3 — 초기값 (SSR 안전)
// ============================================================

const SPLIT_VIEW_KEY = 'noa_split_view_default';
const MAX_DRAFT_VERSIONS = 20;

export function getInitialWritingUiState(): WritingUiState {
  // [C] window 미정의(SSR) 안전.
  let splitView: SplitView = null;
  if (typeof window !== 'undefined') {
    try {
      splitView = localStorage.getItem(SPLIT_VIEW_KEY) === '1' ? 'reference' : null;
    } catch {
      // [C] private / quota 에러 무시.
      splitView = null;
    }
  }
  return {
    isDragOver: false,
    splitView,
    showCompletionHint: false,
    draftVersions: [],
    draftVersionIdx: 0,
    novelSelection: null,
  };
}

// ============================================================
// PART 4 — Reducer
// ============================================================

export function writingUiReducer(state: WritingUiState, action: WritingUiAction): WritingUiState {
  switch (action.type) {
    case 'SET_DRAG_OVER':
      return { ...state, isDragOver: action.payload };

    case 'SET_SPLIT_VIEW':
      return { ...state, splitView: action.payload };

    case 'TOGGLE_SPLIT_VIEW':
      return { ...state, splitView: state.splitView ? null : 'reference' };

    case 'SET_COMPLETION_HINT':
      return { ...state, showCompletionHint: action.payload };

    case 'SET_DRAFT_VERSIONS':
      return { ...state, draftVersions: action.payload };

    case 'PUSH_DRAFT_VERSION': {
      // [G] cap MAX_DRAFT_VERSIONS — shift O(n) 허용(n≤20).
      const next = [...state.draftVersions, action.payload];
      if (next.length > MAX_DRAFT_VERSIONS) next.shift();
      return { ...state, draftVersions: next, draftVersionIdx: state.draftVersionIdx + 1 };
    }

    case 'SET_DRAFT_VERSION_IDX': {
      const v = action.payload;
      const next = typeof v === 'function' ? v(state.draftVersionIdx) : v;
      return { ...state, draftVersionIdx: next };
    }

    case 'SET_NOVEL_SELECTION':
      return { ...state, novelSelection: action.payload };

    default: {
      // [C] exhaustive check — 신규 액션 누락 컴파일 에러 유도.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

// ============================================================
// PART 5 — 훅 (localStorage 동기화 + 편의 헬퍼)
// ============================================================

export interface UseWritingReducerReturn {
  state: WritingUiState;
  // 원자 액션
  setDragOver: (v: boolean) => void;
  setSplitView: (v: SplitView) => void;
  toggleSplitView: () => void;
  setCompletionHint: (v: boolean) => void;
  pushDraftVersion: (draft: string) => void;
  setDraftVersionIdx: (v: number | ((prev: number) => number)) => void;
  setNovelSelection: (v: NovelEditorSelection | null) => void;
  // 직접 dispatch가 필요한 경우(테스트/고급)
  dispatch: React.Dispatch<WritingUiAction>;
}

export function useWritingReducer(): UseWritingReducerReturn {
  const [state, dispatch] = useReducer(writingUiReducer, undefined, getInitialWritingUiState);

  // ── localStorage 싱크 (splitView) ──
  // setSplitView / toggle 모두에 영향.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SPLIT_VIEW_KEY, state.splitView ? '1' : '0');
    } catch {
      // [C] quota/private 무시.
    }
  }, [state.splitView]);

  // ── Ctrl+\ 이벤트 브리지 (기존 useStudioKeyboard에서 발송) ──
  useEffect(() => {
    const handleToggle = () => dispatch({ type: 'TOGGLE_SPLIT_VIEW' });
    window.addEventListener('noa:toggle-split-view', handleToggle);
    return () => window.removeEventListener('noa:toggle-split-view', handleToggle);
  }, []);

  // ── 편의 헬퍼 (useCallback 안정) ──
  const setDragOver = useCallback((v: boolean) => dispatch({ type: 'SET_DRAG_OVER', payload: v }), []);
  const setSplitView = useCallback((v: SplitView) => dispatch({ type: 'SET_SPLIT_VIEW', payload: v }), []);
  const toggleSplitView = useCallback(() => dispatch({ type: 'TOGGLE_SPLIT_VIEW' }), []);
  const setCompletionHint = useCallback((v: boolean) => dispatch({ type: 'SET_COMPLETION_HINT', payload: v }), []);
  const pushDraftVersion = useCallback((draft: string) => dispatch({ type: 'PUSH_DRAFT_VERSION', payload: draft }), []);
  const setDraftVersionIdx = useCallback(
    (v: number | ((prev: number) => number)) => dispatch({ type: 'SET_DRAFT_VERSION_IDX', payload: v }),
    [],
  );
  const setNovelSelection = useCallback(
    (v: NovelEditorSelection | null) => dispatch({ type: 'SET_NOVEL_SELECTION', payload: v }),
    [],
  );

  // [G] useMemo: 동일한 state 참조에서 새 객체 생성 방지.
  return useMemo<UseWritingReducerReturn>(
    () => ({
      state,
      setDragOver,
      setSplitView,
      toggleSplitView,
      setCompletionHint,
      pushDraftVersion,
      setDraftVersionIdx,
      setNovelSelection,
      dispatch,
    }),
    [state, setDragOver, setSplitView, toggleSplitView, setCompletionHint, pushDraftVersion, setDraftVersionIdx, setNovelSelection],
  );
}
