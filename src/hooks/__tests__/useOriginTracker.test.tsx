// ============================================================
// PART 1 — Setup
// ============================================================

import { renderHook, act } from '@testing-library/react';
import { useOriginTracker } from '@/hooks/useOriginTracker';
import { getOrigin, isTaggedField, unwrap } from '@/lib/origin-migration';
import type { SceneDirectionData, SceneDirectionDataV2 } from '@/lib/studio-types';

// ============================================================
// PART 2 — 기본 호출 + V1 자동 마이그레이션
// ============================================================

describe('useOriginTracker — V1 auto-migration', () => {
  test('markAsUser auto-migrates V1 → V2', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = { writerNotes: 'plain' };
    let next!: SceneDirectionDataV2;
    act(() => {
      next = result.current.markAsUser(v1, 'writerNotes');
    });
    expect(next._originVersion).toBe(2);
    expect(isTaggedField(next.writerNotes)).toBe(true);
    expect(unwrap(next.writerNotes!)).toBe('plain');
  });

  test('returns V2 unchanged for missing field', () => {
    const { result } = renderHook(() => useOriginTracker());
    let next!: SceneDirectionDataV2;
    act(() => {
      next = result.current.markAsUser({ _originVersion: 2 } as SceneDirectionDataV2, 'writerNotes');
    });
    expect(next.writerNotes).toBeUndefined();
  });
});

// ============================================================
// PART 3 — 4종 origin 마킹
// ============================================================

describe('useOriginTracker — 4 origin markers', () => {
  test('markAsUser sets origin = USER', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = { writerNotes: 'note' };
    let next!: SceneDirectionDataV2;
    act(() => {
      next = result.current.markAsUser(v1, 'writerNotes');
    });
    expect(getOrigin(next.writerNotes!).origin).toBe('USER');
  });

  test('markAsTemplate sets origin = TEMPLATE + reference id', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = { plotStructure: 'three-act' };
    let next!: SceneDirectionDataV2;
    act(() => {
      next = result.current.markAsTemplate(v1, 'plotStructure', undefined, 'preset-default');
    });
    expect(getOrigin(next.plotStructure!).origin).toBe('TEMPLATE');
    expect(getOrigin(next.plotStructure!).sourceReferenceId).toBe('preset-default');
  });

  test('markAsEngineSuggest sets origin = ENGINE_SUGGEST', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = {
      hooks: [{ position: 'opening', hookType: 'shock', desc: 'wow' }],
    };
    let next!: SceneDirectionDataV2;
    act(() => {
      next = result.current.markAsEngineSuggest(v1, 'hooks', 0, 'transition-1-2');
    });
    expect(getOrigin(next.hooks![0]).origin).toBe('ENGINE_SUGGEST');
    expect(getOrigin(next.hooks![0]).sourceReferenceId).toBe('transition-1-2');
  });

  test('markAsEngineDraft sets origin = ENGINE_DRAFT', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = {
      cliffhanger: { cliffType: 'shock', desc: 'unconfirmed' },
    };
    let next!: SceneDirectionDataV2;
    act(() => {
      next = result.current.markAsEngineDraft(v1, 'cliffhanger');
    });
    expect(getOrigin(next.cliffhanger!).origin).toBe('ENGINE_DRAFT');
  });
});

// ============================================================
// PART 4 — 승격 플로우 (acceptEngineContent)
// ============================================================

describe('useOriginTracker — acceptEngineContent', () => {
  test('promotes ENGINE_DRAFT → USER + records edit history', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = { writerNotes: 'draft text' };
    let withDraft!: SceneDirectionDataV2;
    let promoted!: SceneDirectionDataV2;
    act(() => {
      withDraft = result.current.markAsEngineDraft(v1, 'writerNotes');
      promoted = result.current.acceptEngineContent(withDraft, 'writerNotes');
    });
    expect(getOrigin(promoted.writerNotes!).origin).toBe('USER');
    expect(getOrigin(promoted.writerNotes!).editedBy).toHaveLength(1);
    expect(getOrigin(promoted.writerNotes!).editedBy?.[0].origin).toBe('USER');
  });

  test('promotes ENGINE_SUGGEST array element → USER', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = {
      hooks: [{ position: 'opening', hookType: 'shock', desc: 'wow' }],
    };
    let withSuggest!: SceneDirectionDataV2;
    let promoted!: SceneDirectionDataV2;
    act(() => {
      withSuggest = result.current.markAsEngineSuggest(v1, 'hooks', 0);
      promoted = result.current.acceptEngineContent(withSuggest, 'hooks', 0);
    });
    expect(getOrigin(promoted.hooks![0]).origin).toBe('USER');
  });

  test('no-op if already USER (no history churn)', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = { writerNotes: 'mine' };
    let asUser!: SceneDirectionDataV2;
    let again!: SceneDirectionDataV2;
    act(() => {
      asUser = result.current.markAsUser(v1, 'writerNotes');
      again = result.current.acceptEngineContent(asUser, 'writerNotes');
    });
    expect(getOrigin(again.writerNotes!).editedBy ?? []).toHaveLength(0);
  });
});

// ============================================================
// PART 5 — Edit history retrieval
// ============================================================

describe('useOriginTracker — getEditHistory', () => {
  test('returns empty array for missing field', () => {
    const { result } = renderHook(() => useOriginTracker());
    const history = result.current.getEditHistory({ _originVersion: 2 } as SceneDirectionDataV2, 'writerNotes');
    expect(history).toEqual([]);
  });

  test('returns history after promotion', () => {
    const { result } = renderHook(() => useOriginTracker());
    const v1: SceneDirectionData = { writerNotes: 'x' };
    let promoted!: SceneDirectionDataV2;
    act(() => {
      const draft = result.current.markAsEngineDraft(v1, 'writerNotes');
      promoted = result.current.acceptEngineContent(draft, 'writerNotes');
    });
    const history = result.current.getEditHistory(promoted, 'writerNotes');
    expect(history).toHaveLength(1);
    expect(history[0].origin).toBe('USER');
    expect(typeof history[0].at).toBe('number');
  });
});
