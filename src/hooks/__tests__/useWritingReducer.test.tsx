// ============================================================
// PART 1 — Setup
// ============================================================

import { renderHook, act } from '@testing-library/react';
import {
  useWritingReducer,
  writingUiReducer,
  getInitialWritingUiState,
  type WritingUiState,
  type WritingUiAction,
} from '@/hooks/useWritingReducer';

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});

// ============================================================
// PART 2 — 순수 reducer 계약
// ============================================================

describe('writingUiReducer — 순수 reducer 액션별 전이', () => {
  const base: WritingUiState = {
    isDragOver: false,
    splitView: null,
    showCompletionHint: false,
    draftVersions: [],
    draftVersionIdx: 0,
    novelSelection: null,
  };

  test('SET_DRAG_OVER true/false 토글', () => {
    const on = writingUiReducer(base, { type: 'SET_DRAG_OVER', payload: true });
    expect(on.isDragOver).toBe(true);
    const off = writingUiReducer(on, { type: 'SET_DRAG_OVER', payload: false });
    expect(off.isDragOver).toBe(false);
  });

  test('SET_SPLIT_VIEW reference/chat/null 허용', () => {
    const ref = writingUiReducer(base, { type: 'SET_SPLIT_VIEW', payload: 'reference' });
    expect(ref.splitView).toBe('reference');
    const chat = writingUiReducer(ref, { type: 'SET_SPLIT_VIEW', payload: 'chat' });
    expect(chat.splitView).toBe('chat');
    const off = writingUiReducer(chat, { type: 'SET_SPLIT_VIEW', payload: null });
    expect(off.splitView).toBeNull();
  });

  test('TOGGLE_SPLIT_VIEW null ↔ reference 전환', () => {
    const on = writingUiReducer(base, { type: 'TOGGLE_SPLIT_VIEW' });
    expect(on.splitView).toBe('reference');
    const off = writingUiReducer(on, { type: 'TOGGLE_SPLIT_VIEW' });
    expect(off.splitView).toBeNull();
  });

  test('PUSH_DRAFT_VERSION 누적 + 20 cap', () => {
    let s = base;
    for (let i = 0; i < 25; i++) {
      s = writingUiReducer(s, { type: 'PUSH_DRAFT_VERSION', payload: `v${i}` });
    }
    // cap 20: 마지막 20개 유지, 앞 5개(v0..v4) shift.
    expect(s.draftVersions.length).toBe(20);
    expect(s.draftVersions[0]).toBe('v5');
    expect(s.draftVersions[19]).toBe('v24');
    expect(s.draftVersionIdx).toBe(25);
  });

  test('SET_DRAFT_VERSION_IDX 숫자/함수 둘 다 허용', () => {
    const a = writingUiReducer(base, { type: 'SET_DRAFT_VERSION_IDX', payload: 7 });
    expect(a.draftVersionIdx).toBe(7);
    const b = writingUiReducer(a, { type: 'SET_DRAFT_VERSION_IDX', payload: (prev) => prev + 3 });
    expect(b.draftVersionIdx).toBe(10);
  });

  test('SET_NOVEL_SELECTION 객체/null 왕복', () => {
    const sel = { from: 10, to: 20, text: 'hello', coords: null };
    const a = writingUiReducer(base, { type: 'SET_NOVEL_SELECTION', payload: sel });
    expect(a.novelSelection).toEqual(sel);
    const b = writingUiReducer(a, { type: 'SET_NOVEL_SELECTION', payload: null });
    expect(b.novelSelection).toBeNull();
  });

  test('SET_COMPLETION_HINT 토글', () => {
    const on = writingUiReducer(base, { type: 'SET_COMPLETION_HINT', payload: true });
    expect(on.showCompletionHint).toBe(true);
    const off = writingUiReducer(on, { type: 'SET_COMPLETION_HINT', payload: false });
    expect(off.showCompletionHint).toBe(false);
  });

  test('immutability — 같은 action 반복 시 기존 state 객체는 변하지 않음', () => {
    const prev = { ...base };
    const next = writingUiReducer(base, { type: 'SET_DRAG_OVER', payload: true });
    expect(base).toEqual(prev); // base 미변경
    expect(next).not.toBe(base); // 새 객체
  });

  test('exhaustive switch — 미지원 액션은 never로 좁혀짐 (타입 테스트)', () => {
    // 런타임 캐스팅으로 오동작 여부만 확인 — 정상 reducer는 기본 분기로 폭발하지 않아야 함.
    // 타입 레벨은 TS strict에서 잡힘. 런타임 불량 액션은 never case의 return으로 원본 반환.
    const unknownAction = { type: 'UNKNOWN_ACTION' } as unknown as WritingUiAction;
    // NOTE: exhaustive default는 never 반환 — 실행 시 undefined이지만 strict TS에서는
    // dispatch 단계에서 차단. 여기서는 reducer 방어 동작만 확인.
    expect(() => writingUiReducer(base, unknownAction)).not.toThrow();
  });
});

// ============================================================
// PART 3 — getInitialWritingUiState (SSR / localStorage)
// ============================================================

describe('getInitialWritingUiState', () => {
  test('localStorage 미설정 → splitView = null', () => {
    const s = getInitialWritingUiState();
    expect(s.splitView).toBeNull();
    expect(s.isDragOver).toBe(false);
    expect(s.draftVersions).toEqual([]);
  });

  test('noa_split_view_default = "1" → reference 복원', () => {
    localStorage.setItem('noa_split_view_default', '1');
    const s = getInitialWritingUiState();
    expect(s.splitView).toBe('reference');
  });

  test('noa_split_view_default = "0" → null', () => {
    localStorage.setItem('noa_split_view_default', '0');
    const s = getInitialWritingUiState();
    expect(s.splitView).toBeNull();
  });
});

// ============================================================
// PART 4 — useWritingReducer 훅 (localStorage 싱크 + 이벤트 브리지)
// ============================================================

describe('useWritingReducer — 훅 동작', () => {
  test('초기 렌더 시 splitView = null', () => {
    const { result } = renderHook(() => useWritingReducer());
    expect(result.current.state.splitView).toBeNull();
  });

  test('setSplitView → localStorage "1" 기록', () => {
    const { result } = renderHook(() => useWritingReducer());
    act(() => { result.current.setSplitView('reference'); });
    expect(result.current.state.splitView).toBe('reference');
    expect(localStorage.getItem('noa_split_view_default')).toBe('1');
  });

  test('setSplitView(null) → localStorage "0" 기록', () => {
    const { result } = renderHook(() => useWritingReducer());
    act(() => { result.current.setSplitView('reference'); });
    act(() => { result.current.setSplitView(null); });
    expect(result.current.state.splitView).toBeNull();
    expect(localStorage.getItem('noa_split_view_default')).toBe('0');
  });

  test('toggleSplitView 왕복', () => {
    const { result } = renderHook(() => useWritingReducer());
    act(() => { result.current.toggleSplitView(); });
    expect(result.current.state.splitView).toBe('reference');
    act(() => { result.current.toggleSplitView(); });
    expect(result.current.state.splitView).toBeNull();
  });

  test('noa:toggle-split-view 이벤트 수신 → splitView 토글', () => {
    const { result } = renderHook(() => useWritingReducer());
    expect(result.current.state.splitView).toBeNull();
    act(() => {
      window.dispatchEvent(new CustomEvent('noa:toggle-split-view'));
    });
    expect(result.current.state.splitView).toBe('reference');
    act(() => {
      window.dispatchEvent(new CustomEvent('noa:toggle-split-view'));
    });
    expect(result.current.state.splitView).toBeNull();
  });

  test('pushDraftVersion 연속 호출 + idx 증가', () => {
    const { result } = renderHook(() => useWritingReducer());
    act(() => { result.current.pushDraftVersion('hello'); });
    act(() => { result.current.pushDraftVersion('world'); });
    expect(result.current.state.draftVersions).toEqual(['hello', 'world']);
    expect(result.current.state.draftVersionIdx).toBe(2);
  });

  test('setNovelSelection 왕복', () => {
    const { result } = renderHook(() => useWritingReducer());
    act(() => {
      result.current.setNovelSelection({ from: 0, to: 5, text: 'abc', coords: null });
    });
    expect(result.current.state.novelSelection?.text).toBe('abc');
    act(() => { result.current.setNovelSelection(null); });
    expect(result.current.state.novelSelection).toBeNull();
  });

  test('setDragOver true/false', () => {
    const { result } = renderHook(() => useWritingReducer());
    act(() => { result.current.setDragOver(true); });
    expect(result.current.state.isDragOver).toBe(true);
    act(() => { result.current.setDragOver(false); });
    expect(result.current.state.isDragOver).toBe(false);
  });
});
