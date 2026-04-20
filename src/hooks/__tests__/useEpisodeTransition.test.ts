/**
 * useEpisodeTransition — 에피소드 간 전이 제안 훅 테스트
 * Covers: cliff→hook / foreshadow / tension / dismiss / apply / 가드
 */

import { renderHook, act } from '@testing-library/react';
import {
  useEpisodeTransition,
  buildAllSuggestions,
  buildCliffToHookSuggestion,
  buildForeshadowSuggestion,
  buildTensionContinuitySuggestion,
} from '../useEpisodeTransition';
import type { SceneDirectionData } from '@/lib/studio-types';

// ============================================================
// PART 1 — Pure builder tests
// ============================================================

describe('buildCliffToHookSuggestion', () => {
  test('이전 화 클리프 있으면 제안 생성', () => {
    const prev: SceneDirectionData = {
      cliffhanger: { cliffType: 'crisis-cut', desc: '죽기 직전' },
    };
    const current: SceneDirectionData = {};
    const s = buildCliffToHookSuggestion(1, 2, prev, current);
    expect(s).not.toBeNull();
    expect(s?.field).toBe('hooks');
    expect(s?.reason).toBe('cliff-to-hook');
    expect(s?.fromEpisode).toBe(1);
    expect(s?.toEpisode).toBe(2);
  });

  test('이전 화 클리프 없으면 null', () => {
    const s = buildCliffToHookSuggestion(1, 2, {}, {});
    expect(s).toBeNull();
  });

  test('이미 오프닝 훅 있으면 null (중복 방지)', () => {
    const prev: SceneDirectionData = {
      cliffhanger: { cliffType: 'crisis', desc: '위기' },
    };
    const current: SceneDirectionData = {
      hooks: [{ position: 'opening', hookType: 'shock', desc: 'existing' }],
    };
    const s = buildCliffToHookSuggestion(1, 2, prev, current);
    expect(s).toBeNull();
  });
});

describe('buildForeshadowSuggestion', () => {
  test('미회수 복선 있으면 제안 생성', () => {
    const prev: SceneDirectionData = {
      foreshadows: [
        { planted: '검은 그림자', payoff: '범인 정체', episode: 1, resolved: false },
      ],
    };
    const s = buildForeshadowSuggestion(1, 2, prev, {});
    expect(s).not.toBeNull();
    expect(s?.field).toBe('foreshadows');
    expect(s?.reason).toBe('foreshadow-payoff');
  });

  test('이미 회수된 복선만 있으면 null', () => {
    const prev: SceneDirectionData = {
      foreshadows: [
        { planted: 'a', payoff: 'b', episode: 1, resolved: true },
      ],
    };
    const s = buildForeshadowSuggestion(1, 2, prev, {});
    expect(s).toBeNull();
  });

  test('이번 화에 같은 planted 이미 있으면 스킵', () => {
    const prev: SceneDirectionData = {
      foreshadows: [{ planted: '검은 그림자', payoff: 'p', episode: 1, resolved: false }],
    };
    const current: SceneDirectionData = {
      foreshadows: [{ planted: '검은 그림자', payoff: 'p', episode: 2, resolved: false }],
    };
    const s = buildForeshadowSuggestion(1, 2, prev, current);
    expect(s).toBeNull();
  });
});

describe('buildTensionContinuitySuggestion', () => {
  test('이전 화 텐션 곡선 있으면 제안', () => {
    const prev: SceneDirectionData = {
      tensionCurve: [
        { position: 50, level: 70, label: '중반' },
        { position: 100, level: 90, label: '클라이맥스' },
      ],
    };
    const s = buildTensionContinuitySuggestion(1, 2, prev, {});
    expect(s).not.toBeNull();
    expect(s?.field).toBe('tensionCurve');
    expect(s?.reason).toBe('tension-continuity');
    // startLevel = max(20, 90 - 15) = 75
    const suggested = s?.suggestedValue as Array<{ level: number }>;
    expect(suggested[0].level).toBe(75);
  });

  test('이번 화에 텐션 곡선 이미 있으면 null', () => {
    const prev: SceneDirectionData = {
      tensionCurve: [{ position: 100, level: 90, label: 'l' }],
    };
    const current: SceneDirectionData = {
      tensionCurve: [{ position: 0, level: 20, label: 'start' }],
    };
    const s = buildTensionContinuitySuggestion(1, 2, prev, current);
    expect(s).toBeNull();
  });

  test('이전 화 텐션 곡선 비어있으면 null', () => {
    const s = buildTensionContinuitySuggestion(1, 2, {}, {});
    expect(s).toBeNull();
  });
});

// ============================================================
// PART 2 — buildAllSuggestions
// ============================================================

describe('buildAllSuggestions', () => {
  test('1화 → 빈 배열 (이전 화 없음)', () => {
    const r = buildAllSuggestions(1, {});
    expect(r).toEqual([]);
  });

  test('이전 화 sheet 없으면 빈 배열', () => {
    const r = buildAllSuggestions(2, {});
    expect(r).toEqual([]);
  });

  test('전체 빌더 합산', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: {
        cliffhanger: { cliffType: 'crisis', desc: '클리프' },
        foreshadows: [{ planted: '복선A', payoff: 'p', episode: 1, resolved: false }],
        tensionCurve: [{ position: 100, level: 80, label: 'end' }],
      },
      2: {},
    };
    const r = buildAllSuggestions(2, sheets);
    expect(r.length).toBe(3);
    expect(r.map(s => s.reason).sort()).toEqual([
      'cliff-to-hook',
      'foreshadow-payoff',
      'tension-continuity',
    ]);
  });
});

// ============================================================
// PART 3 — Hook behavior
// ============================================================

describe('useEpisodeTransition hook', () => {
  test('초기 suggestions = 빌드 결과', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { cliffhanger: { cliffType: 'crisis', desc: 'd' } },
    };
    const { result } = renderHook(() =>
      useEpisodeTransition({ currentEpisode: 2, episodeSceneSheets: sheets })
    );
    expect(result.current.suggestions.length).toBe(1);
  });

  test('dismiss → suggestion 제거', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { cliffhanger: { cliffType: 'crisis', desc: 'd' } },
    };
    const { result } = renderHook(() =>
      useEpisodeTransition({ currentEpisode: 2, episodeSceneSheets: sheets })
    );
    const id = result.current.suggestions[0].id;
    act(() => {
      result.current.dismiss(id);
    });
    expect(result.current.suggestions.length).toBe(0);
  });

  test('apply → 머지 가능한 partial 반환 + 자동 dismiss', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { cliffhanger: { cliffType: 'crisis-cut', desc: '죽기 직전' } },
    };
    const { result } = renderHook(() =>
      useEpisodeTransition({ currentEpisode: 2, episodeSceneSheets: sheets })
    );
    const id = result.current.suggestions[0].id;
    let merged: Partial<SceneDirectionData> | null = null;
    act(() => {
      merged = result.current.apply(id);
    });
    expect(merged).not.toBeNull();
    const m = merged as Partial<SceneDirectionData> | null;
    expect(m?.hooks).toBeDefined();
    // 자동 dismiss
    expect(result.current.suggestions.length).toBe(0);
  });

  test('dismissAll → 전부 제거', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: {
        cliffhanger: { cliffType: 'c', desc: 'd' },
        foreshadows: [{ planted: 'p', payoff: 'pp', episode: 1, resolved: false }],
      },
    };
    const { result } = renderHook(() =>
      useEpisodeTransition({ currentEpisode: 2, episodeSceneSheets: sheets })
    );
    expect(result.current.suggestions.length).toBeGreaterThan(0);
    act(() => {
      result.current.dismissAll();
    });
    expect(result.current.suggestions.length).toBe(0);
  });

  test('apply with invalid id → null', () => {
    const sheets: Record<number, SceneDirectionData> = {};
    const { result } = renderHook(() =>
      useEpisodeTransition({ currentEpisode: 1, episodeSceneSheets: sheets })
    );
    let merged: Partial<SceneDirectionData> | null = null;
    act(() => {
      merged = result.current.apply('nonexistent');
    });
    expect(merged).toBeNull();
  });
});
