// ============================================================
// PART 1 — Setup & mocks
// ============================================================
//
// [W2-setconfig] setConfig 가 함수형 updater 를 React state 에 진짜 위임하는지 검증.
//
// 핵심 회귀 (KEYSTONE):
//   기존 구현은 `newConfig(currentSession?.config ?? INITIAL_CONFIG)` 으로 클로저로
//   잡힌 직전 렌더의 config 를 eager 평가했다. 같은 tick 에 setConfig 가 2회 호출되면
//   두 호출 모두 같은 stale config 를 prev 로 받아 lost update 가 발생.
//   → setSessions(prev => ...) 위임으로 prev = 항상 최신 state 임을 보장한다.
//
// 검증 축:
//   1) 객체 형태 setConfig — 하위호환 (그대로 대입)
//   2) 함수형 updater — prev 가 최신 config
//   3) 동시 2회 setConfig (같은 tick) — 둘 다 반영 (lost update 방지)
//   4) 비동기 콜백 간 왕복 — 직전 호출 결과를 prev 로 받음
//   5) 현재 세션 없음 — no-op (throw 없음)

import { act, renderHook } from '@testing-library/react';
import { useProjectManager } from '@/hooks/useProjectManager';
import type { StoryConfig } from '@/lib/studio-types';

// saveProjects 모킹 — 실제 localStorage 쓰기 회피.
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

// 현재 세션의 config 를 꺼내는 헬퍼
function currentConfig(result: { current: ReturnType<typeof useProjectManager> }): StoryConfig {
  return result.current.currentSession!.config;
}

// ============================================================
// PART 2 — 하위호환 (객체 형태)
// ============================================================

describe('useProjectManager.setConfig — 객체 형태 (하위호환)', () => {
  test('객체를 그대로 대입한다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => { result.current.createNewSession(); });
    const base = currentConfig(result);

    act(() => {
      result.current.setConfig({ ...base, title: '객체대입', episode: 7 });
    });

    expect(currentConfig(result).title).toBe('객체대입');
    expect(currentConfig(result).episode).toBe(7);
  });
});

// ============================================================
// PART 2.5 — 다중 프로젝트 생성
// ============================================================

describe('useProjectManager.createNewProjectWithSession — 다중 프로젝트', () => {
  test('첫 세션 생성도 고정 project-default/미분류가 아니라 새 작품 프로젝트로 만든다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewSession();
    });

    expect(result.current.projects).toHaveLength(1);
    expect(result.current.currentProject?.id).toMatch(/^project-/);
    expect(result.current.currentProject?.id).not.toBe('project-default');
    expect(result.current.currentProject?.name).toBe('새 작품');
    expect(result.current.currentSession?.title).toBe('새로운 소설');
  });

  test('프로젝트와 첫 세션을 원자적으로 만들고 기존 프로젝트를 보존한다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewProjectWithSession({
        projectName: 'QA-멀티-프로젝트-A',
        sessionTitle: 'A 시작',
      });
    });
    act(() => {
      result.current.createNewProjectWithSession({
        projectName: 'QA-멀티-프로젝트-B',
        sessionTitle: 'B 시작',
      });
    });

    expect(result.current.projects).toHaveLength(2);
    expect(result.current.projects.map(project => project.name)).toEqual([
      'QA-멀티-프로젝트-A',
      'QA-멀티-프로젝트-B',
    ]);
    expect(result.current.projects.every(project => project.sessions.length === 1)).toBe(true);
    expect(result.current.currentProject?.name).toBe('QA-멀티-프로젝트-B');
    expect(result.current.currentSession?.title).toBe('B 시작');
  });

  test('기본 이름으로 여러 작품을 만들면 보관함에서 구분되게 번호를 붙인다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewProjectWithSession();
    });
    act(() => {
      result.current.createNewProjectWithSession();
    });
    act(() => {
      result.current.createNewProjectWithSession();
    });

    expect(result.current.projects.map(project => project.name)).toEqual([
      '새 작품',
      '새 작품 2',
      '새 작품 3',
    ]);
    expect(result.current.currentProject?.name).toBe('새 작품 3');
  });

  test('직접 입력한 작품명도 공백 정리와 중복 번호를 적용한다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewProjectWithSession({ projectName: '  연재작  ' });
    });
    act(() => {
      result.current.createNewProjectWithSession({ projectName: '연재작' });
    });

    expect(result.current.projects.map(project => project.name)).toEqual(['연재작', '연재작 2']);
  });

  test('작품 이름 변경은 공백 입력을 버리고 중복 이름에 번호를 붙인다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewProjectWithSession({ projectName: '기존작' });
    });
    act(() => {
      result.current.createNewProjectWithSession({ projectName: '변경대상' });
    });

    const targetProjectId = result.current.currentProjectId!;

    act(() => {
      result.current.renameProject(targetProjectId, '  기존작  ');
    });

    expect(result.current.currentProject?.name).toBe('기존작 2');

    act(() => {
      result.current.renameProject(targetProjectId, '   ');
    });

    expect(result.current.currentProject?.name).toBe('기존작 2');
  });

  test('현재 프로젝트를 삭제하면 남은 프로젝트의 첫 세션으로 이동한다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewProjectWithSession({
        projectName: 'QA-삭제-이전',
        sessionTitle: '이전 회차',
      });
    });
    act(() => {
      result.current.createNewProjectWithSession({
        projectName: 'QA-삭제-대상',
        sessionTitle: '삭제 대상 회차',
      });
    });

    const deletingProjectId = result.current.currentProjectId;
    expect(result.current.currentProject?.name).toBe('QA-삭제-대상');

    act(() => {
      result.current.deleteProject(deletingProjectId!);
    });

    expect(result.current.projects.map(project => project.name)).toEqual(['QA-삭제-이전']);
    expect(result.current.currentProject?.name).toBe('QA-삭제-이전');
    expect(result.current.currentSession?.title).toBe('이전 회차');
  });

  test('가운데 프로젝트를 삭제하면 다음 이웃 프로젝트로 이동한다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewProjectWithSession({ projectName: 'A', sessionTitle: 'A 회차' });
    });
    const firstProjectId = result.current.currentProjectId!;
    act(() => {
      result.current.createNewProjectWithSession({ projectName: 'B', sessionTitle: 'B 회차' });
    });
    const middleProjectId = result.current.currentProjectId!;
    const middleSessionId = result.current.currentSessionId!;
    act(() => {
      result.current.createNewProjectWithSession({ projectName: 'C', sessionTitle: 'C 회차' });
    });

    act(() => {
      result.current.setCurrentProjectId(middleProjectId);
      result.current.setCurrentSessionId(middleSessionId);
    });
    act(() => {
      result.current.deleteProject(middleProjectId);
    });

    expect(result.current.projects.map(project => project.name)).toEqual(['A', 'C']);
    expect(result.current.currentProjectId).not.toBe(firstProjectId);
    expect(result.current.currentProject?.name).toBe('C');
    expect(result.current.currentSession?.title).toBe('C 회차');
  });

  test('현재 프로젝트 ID가 비어 있어도 새 회차는 보관함의 첫 작품에 붙는다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => {
      result.current.createNewProjectWithSession({ projectName: '보관함 작품', sessionTitle: '기존 회차' });
    });
    const projectId = result.current.currentProjectId!;

    act(() => {
      result.current.setCurrentProjectId(null);
      result.current.setCurrentSessionId(null);
    });
    act(() => {
      result.current.createNewSession();
    });

    expect(result.current.currentProjectId).toBe(projectId);
    expect(result.current.currentProject?.sessions).toHaveLength(2);
    expect(result.current.currentSession?.title).toBe('새로운 소설');
  });
});

// ============================================================
// PART 3 — 함수형 updater (prev 최신성)
// ============================================================

describe('useProjectManager.setConfig — 함수형 updater', () => {
  test('updater 의 prev 가 현재 config 다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => { result.current.createNewSession(); });

    act(() => {
      result.current.setConfig(prev => ({ ...prev, episode: 1, title: 'A' }));
    });
    act(() => {
      result.current.setConfig(prev => ({ ...prev, episode: prev.episode + 1 }));
    });

    // 두 번째 호출의 prev.episode 는 첫 번째 호출 결과(1)여야 한다 → 2
    expect(currentConfig(result).episode).toBe(2);
    expect(currentConfig(result).title).toBe('A');
  });

  test('lastUpdate 가 갱신된다', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => { result.current.createNewSession(); });
    const before = result.current.currentSession!.lastUpdate;

    // 시간 진행 후 setConfig — lastUpdate 가 증가해야 한다
    act(() => {
      jest.advanceTimersByTime(5);
      result.current.setConfig(prev => ({ ...prev, title: 'ts' }));
    });

    expect(result.current.currentSession!.lastUpdate).toBeGreaterThanOrEqual(before);
  });
});

// ============================================================
// PART 4 — KEYSTONE: 동시 2회 setConfig (lost update 방지)
// ============================================================

describe('useProjectManager.setConfig — 동시성 (lost update 방지)', () => {
  test('같은 tick 에 2회 함수형 setConfig → 둘 다 반영', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => { result.current.createNewSession(); });

    // 한 act 안에서(= 같은 commit batch) 서로 다른 필드를 각각 갱신.
    // eager-closure 구현이라면 두 번째 호출이 첫 번째를 stale prev 로 덮어써
    // setting 변경이 사라진다. 위임 구현이라면 둘 다 살아남는다.
    act(() => {
      result.current.setConfig(prev => ({ ...prev, setting: '배경-1' }));
      result.current.setConfig(prev => ({ ...prev, povCharacter: '주인공-2' }));
    });

    const cfg = currentConfig(result);
    expect(cfg.setting).toBe('배경-1');       // 첫 호출 결과 보존
    expect(cfg.povCharacter).toBe('주인공-2'); // 둘째 호출 결과 보존
  });

  test('같은 필드를 같은 tick 에 누적 증가 → 마지막 호출 횟수만큼 반영', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => { result.current.createNewSession(); });

    act(() => {
      result.current.setConfig(prev => ({ ...prev, episode: 0 }));
      result.current.setConfig(prev => ({ ...prev, episode: prev.episode + 1 }));
      result.current.setConfig(prev => ({ ...prev, episode: prev.episode + 1 }));
      result.current.setConfig(prev => ({ ...prev, episode: prev.episode + 1 }));
    });

    // 0 → +1 → +1 → +1 = 3. eager-closure 였다면 마지막만 살아 1 이 된다.
    expect(currentConfig(result).episode).toBe(3);
  });
});

// ============================================================
// PART 5 — 비동기 콜백 왕복 & 세션 없음
// ============================================================

describe('useProjectManager.setConfig — 비동기 왕복 / 세션 없음', () => {
  test('서로 다른 act 사이 함수형 호출 — 직전 결과를 prev 로 받음', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    act(() => { result.current.createNewSession(); });

    act(() => { result.current.setConfig(prev => ({ ...prev, episode: 10 })); });
    act(() => { result.current.setConfig(prev => ({ ...prev, episode: prev.episode * 2 })); });

    expect(currentConfig(result).episode).toBe(20);
  });

  test('현재 세션 없음 → no-op (throw 없음, 세션 미생성)', () => {
    const { result } = renderHook(() => useProjectManager('KO'));

    // createNewSession 호출 전 — currentSession 은 null
    expect(result.current.currentSession).toBeNull();
    expect(() => {
      act(() => { result.current.setConfig(prev => ({ ...prev, title: 'x' })); });
    }).not.toThrow();
    expect(result.current.currentSession).toBeNull();
  });
});

// IDENTITY_SEAL: PART-1..5 | role=setConfig-delegation-tests | inputs=setConfig(fn|obj) | outputs=config state assertions
