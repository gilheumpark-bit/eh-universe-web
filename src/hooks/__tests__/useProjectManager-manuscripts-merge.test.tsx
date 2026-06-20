// ============================================================
// PART 1 — Setup & mocks
// ============================================================
//
// [W2-shell #7/#8] StudioShell 의 manuscripts 머지가 setConfig(prev=>...) 위임 위에서
// 동시성·불변성을 지키는지 검증한다.
//
// 두 결함 회귀 (KEYSTONE):
//   #7  editDraft 디바운스 자동저장이 stale currentSession.config.manuscripts 를 2초 뒤
//       통째로 덮어쓰면, 그 사이 같은 세션의 *다른 episode* 를 쓴 AI writer 변경이 유실됐다.
//       → 머지를 setConfig(prev=>...) 안에서 prev.manuscripts 로 수행하면 최신 commit 기준이
//         되어, 다른 episode 의 동시 변경이 보존된다.
//   #8  요약 콜백이 [...prev.manuscripts] 얕은복사 후 target.summary= 로 in-place 변이했다.
//       → map 으로 해당 episode 만 새 객체로 교체해 commit 된 manuscript 객체 오염을 막는다.
//
// 여기서는 StudioShell 의 두 updater 와 *동일한 형태*의 함수를 실제 setConfig 에 통과시켜,
// 머지 로직의 동시성/왕복/불변성 계약을 컴포넌트 렌더 없이 직접 검증한다.

import { act, renderHook } from '@testing-library/react';
import { useProjectManager } from '@/hooks/useProjectManager';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';

jest.mock('@/lib/project-migration', () => {
  const actual = jest.requireActual('@/lib/project-migration');
  return {
    ...actual,
    saveProjects: jest.fn(() => true),
    loadProjects: jest.fn(() => []),
    getStorageUsageBytes: jest.fn(() => 0),
  };
});

beforeEach(() => {
  jest.useFakeTimers();
  try { localStorage.clear(); } catch { /* noop */ }
});

afterEach(() => {
  jest.useRealTimers();
});

function currentConfig(result: { current: ReturnType<typeof useProjectManager> }): StoryConfig {
  return result.current.currentSession!.config;
}

function ms(episode: number, content: string, extra: Partial<EpisodeManuscript> = {}): EpisodeManuscript {
  return {
    episode,
    title: `EP.${episode}`,
    content,
    charCount: content.length,
    lastUpdate: 1,
    ...extra,
  };
}

// StudioShell 디바운스(#7) 머지와 동일한 형태의 updater — 특정 episode 의 content 만 머지.
function mergeDraftUpdater(episode: number, draft: string, now: number) {
  return (prev: StoryConfig): StoryConfig => {
    const prevArr = prev.manuscripts ?? [];
    const idx = prevArr.findIndex(m => m.episode === episode);
    const title = prev.title || `Episode ${episode}`;
    const nextEntry = idx >= 0
      ? { ...prevArr[idx], content: draft, charCount: draft.length, lastUpdate: now }
      : { episode, title, content: draft, charCount: draft.length, lastUpdate: now };
    const nextArr = idx >= 0
      ? prevArr.map((m, i) => i === idx ? nextEntry : m)
      : [...prevArr, nextEntry];
    return { ...prev, manuscripts: nextArr };
  };
}

// StudioShell 요약 콜백(#8) 머지와 동일한 형태의 updater — 특정 episode 의 summary 만 교체.
function summaryUpdater(episode: number, summary: string) {
  return (prev: StoryConfig): StoryConfig => {
    const next = (prev.manuscripts || []).map(m =>
      m.episode === episode ? { ...m, summary } : m,
    );
    return { ...prev, manuscripts: next };
  };
}

// ============================================================
// PART 2 — #7 동시성: 다른 episode 의 동시 변경 보존 (KEYSTONE)
// ============================================================

describe('manuscripts 머지 #7 — 다른 episode 동시 변경 보존', () => {
  test('EP1 디바운스가 발화하기 전 AI writer 가 EP2 를 써도 EP2 가 유실되지 않는다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));
    act(() => { result.current.createNewSession(); });

    // 초기 manuscripts: EP1 만 존재 (작가가 EP1 편집 중).
    act(() => {
      result.current.setConfig(prev => ({ ...prev, manuscripts: [ms(1, 'EP1 초안')] }));
    });

    // (디바운스 스케줄 시점의 stale 스냅샷을 흉내) — 이 시점 prev 에는 EP2 가 없다.
    const staleSnapshot = currentConfig(result);
    expect(staleSnapshot.manuscripts?.some(m => m.episode === 2)).toBe(false);

    // 2초 경과 사이 AI writer 가 EP2 를 commit.
    act(() => {
      result.current.setConfig(prev => ({
        ...prev,
        manuscripts: [...(prev.manuscripts ?? []), ms(2, 'AI writer EP2 본문')],
      }));
    });

    // 이제 디바운스가 발화 — EP1 머지. setConfig(prev=>...) 라 prev = 최신(EP1+EP2).
    act(() => {
      result.current.setConfig(mergeDraftUpdater(1, 'EP1 최종 입력', 999));
    });

    const cfg = currentConfig(result);
    const ep1 = cfg.manuscripts?.find(m => m.episode === 1);
    const ep2 = cfg.manuscripts?.find(m => m.episode === 2);
    // EP1 은 디바운스 입력으로 갱신.
    expect(ep1?.content).toBe('EP1 최종 입력');
    // KEYSTONE: 동시에 들어온 EP2 가 살아있어야 한다 (stale 스냅샷 덮어쓰기였다면 유실).
    expect(ep2).toBeDefined();
    expect(ep2?.content).toBe('AI writer EP2 본문');
  });

  test('같은 tick 에 EP1·EP2 두 디바운스 머지 → 둘 다 반영 (lost update 방지)', () => {
    const { result } = renderHook(() => useProjectManager('KO'));
    act(() => { result.current.createNewSession(); });
    act(() => {
      result.current.setConfig(prev => ({ ...prev, manuscripts: [ms(1, 'a'), ms(2, 'b')] }));
    });

    act(() => {
      result.current.setConfig(mergeDraftUpdater(1, 'EP1-new', 10));
      result.current.setConfig(mergeDraftUpdater(2, 'EP2-new', 11));
    });

    const cfg = currentConfig(result);
    expect(cfg.manuscripts?.find(m => m.episode === 1)?.content).toBe('EP1-new');
    expect(cfg.manuscripts?.find(m => m.episode === 2)?.content).toBe('EP2-new');
    expect(cfg.manuscripts).toHaveLength(2);
  });
});

// ============================================================
// PART 3 — #8 불변성: in-place 변이 없음 + 타 필드 보존
// ============================================================

describe('manuscripts 머지 #8 — 요약 반영 불변성', () => {
  test('summary 반영이 commit 된 manuscript 객체를 in-place 변이하지 않는다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));
    act(() => { result.current.createNewSession(); });
    act(() => {
      result.current.setConfig(prev => ({ ...prev, manuscripts: [ms(1, 'long', { detailedSummary: 'D1' })] }));
    });

    // 머지 직전의 manuscript 객체 참조를 붙잡는다.
    const beforeObj = currentConfig(result).manuscripts![0];

    act(() => {
      result.current.setConfig(summaryUpdater(1, '요약-신규'));
    });

    const afterObj = currentConfig(result).manuscripts![0];
    // 새 객체로 교체돼야 한다 (in-place 였다면 같은 참조).
    expect(afterObj).not.toBe(beforeObj);
    // 붙잡아 둔 이전 객체는 오염되지 않아야 한다 (in-place 였다면 summary 가 박힘).
    expect(beforeObj.summary).toBeUndefined();
    // 새 객체에는 요약이 반영.
    expect(afterObj.summary).toBe('요약-신규');
  });

  test('summary 반영 시 그 외 필드(content·detailedSummary)가 보존된다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));
    act(() => { result.current.createNewSession(); });
    act(() => {
      result.current.setConfig(prev => ({
        ...prev,
        manuscripts: [ms(1, '본문보존', { detailedSummary: '상세보존', charCount: 4 })],
      }));
    });

    act(() => {
      result.current.setConfig(summaryUpdater(1, 'S'));
    });

    const m1 = currentConfig(result).manuscripts!.find(m => m.episode === 1)!;
    expect(m1.content).toBe('본문보존');
    expect(m1.detailedSummary).toBe('상세보존');
    expect(m1.summary).toBe('S');
  });

  test('대상 episode 가 없으면 no-op (다른 episode 불변)', () => {
    const { result } = renderHook(() => useProjectManager('KO'));
    act(() => { result.current.createNewSession(); });
    act(() => {
      result.current.setConfig(prev => ({ ...prev, manuscripts: [ms(1, 'x')] }));
    });

    act(() => {
      result.current.setConfig(summaryUpdater(99, '없는화'));
    });

    const arr = currentConfig(result).manuscripts!;
    expect(arr).toHaveLength(1);
    expect(arr[0].summary).toBeUndefined();
  });
});

// IDENTITY_SEAL: PART-1..3 | role=studioshell-manuscripts-merge-regression | inputs=setConfig(updater) | outputs=manuscripts concurrency+immutability assertions
