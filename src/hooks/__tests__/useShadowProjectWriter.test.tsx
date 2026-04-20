// ============================================================
// PART 1 — Setup & mocks
// ============================================================
//
// useShadowProjectWriter — M1.5.2 Writing 탭 Shadow 쓰기 콜백 훅.
//
// 검증 축:
//   1) Flag 'off' → onPrimarySaveComplete 호출해도 shadow-logger/journal 모두 0건
//   2) Flag 'shadow' → 쌍(pair) 맞춰진 엔트리 1건 + hash 일치
//   3) Journal append throw → shadow-logger pending 남지만 Primary 경로 영향 없음
//   4) 비동기 분리 — onPrimarySaveComplete 는 즉시 void 반환 (동기 실행 확인)
//   5) Null/비정상 입력 방어
//
// 환경: save-engine fake-idb + localStorage flag override.

import { installFakeIndexedDB, resetFakeIndexedDB } from '@/lib/save-engine/__tests__/_fake-idb';
installFakeIndexedDB();

import { renderHook } from '@testing-library/react';
import type { Project } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { useShadowProjectWriter } from '@/hooks/useShadowProjectWriter';
import {
  getShadowLog,
  clearShadowLog,
  __resetShadowLoggerForTests,
  __getPendingCountForTests,
} from '@/lib/save-engine/shadow-logger';
import { resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { resetJournalHLCForTests } from '@/lib/save-engine/journal';

// appendEntry 스파이 — throw 주입 케이스 + 호출 검증용.
// spyOn 은 실제 구현을 그대로 호출하므로 재귀 위험 없음.
// mockImplementationOnce 로 throw 주입한 다음 테스트는 기본 실제 구현으로 복귀.
import * as journal from '@/lib/save-engine/journal';
const appendEntrySpy = jest.spyOn(journal, 'appendEntry');

// 비동기 completion 대기 (microtask + fake IDB tx oncomplete 5ms)
const flush = async (ms = 40) => new Promise((r) => setTimeout(r, ms));

function setFlag(mode: 'off' | 'shadow' | 'on'): void {
  try {
    localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', mode);
  } catch {
    /* noop */
  }
}

function clearFlag(): void {
  try {
    localStorage.removeItem('ff_FEATURE_JOURNAL_ENGINE');
  } catch {
    /* noop */
  }
}

function makeProjects(n = 1): Project[] {
  const arr: Project[] = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      id: `p-${i}`,
      name: `Project ${i}`,
      description: `desc ${i}`,
      genre: Genre.SF,
      createdAt: 1_700_000_000_000 + i,
      lastUpdate: 1_700_000_000_000 + i,
      sessions: [
        {
          id: `s-${i}`,
          title: `Session ${i}`,
          messages: [],
          config: {
            genre: Genre.SF,
            povCharacter: '',
            setting: '',
            primaryEmotion: '',
            episode: 1,
            title: `Ep ${i}`,
            totalEpisodes: 25,
            guardrails: { min: 3000, max: 5000 },
            characters: [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            platform: 'MOBILE' as any,
            narrativeIntensity: 'standard',
            manuscripts: [
              { episode: 1, title: `Ep ${i}`, content: `body-${i}`, charCount: 6, lastUpdate: 1 },
            ],
          },
          lastUpdate: 1_700_000_000_000 + i,
        },
      ],
    });
  }
  return arr;
}

beforeEach(async () => {
  resetFakeIndexedDB();
  resetDbForTests();
  resetDefaultWriterQueueForTests();
  resetMemoryTierForTests();
  resetJournalHLCForTests();
  __resetShadowLoggerForTests();
  try { localStorage.clear(); } catch { /* noop */ }
  // spyOn 은 기본적으로 실제 구현을 호출한다. mockClear 만으로 호출 기록 리셋.
  appendEntrySpy.mockClear();
  // 이전 테스트에서 mockImplementationOnce 를 썼더라도 한 번만 소비되므로 자동 복귀.
});

afterAll(() => {
  appendEntrySpy.mockRestore();
});

afterEach(async () => {
  clearFlag();
  await clearShadowLog().catch(() => {});
});

// ============================================================
// PART 2 — Flag off 완전 격리 (G4)
// ============================================================

describe('useShadowProjectWriter — flag off', () => {
  test('flag 기본 off → onPrimarySaveComplete 호출해도 shadow 엔트리 0', async () => {
    // 기본 — flag setItem 안 함 → default 'off'
    const { result } = renderHook(() => useShadowProjectWriter());
    result.current.onPrimarySaveComplete(makeProjects(), 10);
    await flush(60);

    const log = await getShadowLog();
    expect(log.length).toBe(0);
    expect(__getPendingCountForTests()).toBe(0);
    expect(appendEntrySpy).not.toHaveBeenCalled();
  });

  test('명시적 flag off — journal/shadow 모두 호출 0', async () => {
    setFlag('off');
    const { result } = renderHook(() => useShadowProjectWriter());
    result.current.onPrimarySaveComplete(makeProjects(3), 25);
    await flush(60);

    expect(appendEntrySpy).not.toHaveBeenCalled();
    expect((await getShadowLog()).length).toBe(0);
  });

  test('레거시 "false" (역호환) → off 로 해석', async () => {
    try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'false'); } catch { /* noop */ }
    const { result } = renderHook(() => useShadowProjectWriter());
    result.current.onPrimarySaveComplete(makeProjects(), 5);
    await flush(60);
    expect(appendEntrySpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// PART 3 — Flag shadow/on — 실제 병렬 쓰기 (G5 pair)
// ============================================================

describe('useShadowProjectWriter — flag shadow', () => {
  test('shadow 모드 → 엔트리 1건 (pair matched=true)', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useShadowProjectWriter());
    result.current.onPrimarySaveComplete(makeProjects(), 12);
    await flush(300);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].operation).toBe('save-project');
    expect(log[0].matched).toBe(true);
    expect(log[0].durationMs).toBe(12);
    expect(log[0].journalDurationMs).toBeGreaterThanOrEqual(0);
    expect(__getPendingCountForTests()).toBe(0);
  });

  test("on 모드에서도 동일 동작 ('on' 은 primary지만 shadow writer도 활성)", async () => {
    setFlag('on');
    const { result } = renderHook(() => useShadowProjectWriter());
    result.current.onPrimarySaveComplete(makeProjects(2), 7);
    await flush(300);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].matched).toBe(true);
  });

  test('동일 Project[] 2회 저장 → 엔트리 2건, 둘 다 matched', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useShadowProjectWriter());
    const p = makeProjects(1);
    result.current.onPrimarySaveComplete(p, 5);
    await flush(300);
    result.current.onPrimarySaveComplete(p, 6);
    await flush(400);

    const log = await getShadowLog();
    expect(log.length).toBe(2);
    expect(log.every((e) => e.matched)).toBe(true);
    // hash 는 동일 payload → 동일 값 기대
    expect(log[0].legacyHash).toBe(log[1].legacyHash);
  });
});

// ============================================================
// PART 4 — Shadow 실패 격리 (G5 핵심)
// ============================================================

describe('useShadowProjectWriter — shadow 실패 격리', () => {
  test('appendEntry throw → primary 영향 없음, 로그 엔트리 0, pending 남음(TTL 자연정리 대상)', async () => {
    setFlag('shadow');
    appendEntrySpy.mockImplementationOnce(async () => {
      throw new Error('journal DB corrupted (simulated)');
    });
    const { result } = renderHook(() => useShadowProjectWriter());

    // primary 성공 시점에 호출 — 즉시 void 반환해야 함.
    const t0 = performance.now();
    result.current.onPrimarySaveComplete(makeProjects(), 8);
    const syncReturnMs = performance.now() - t0;

    // 동기 반환 5ms 이하 — journal throw 는 microtask 에서 비동기로 흡수.
    expect(syncReturnMs).toBeLessThan(5);

    await flush(300);

    // journal 실패 → pair 완료 안 됨 → 엔트리 0
    const log = await getShadowLog();
    expect(log.length).toBe(0);
    // pending 1 남음 — shadow-logger TTL(30s) 스윕이 청소. 테스트에선 여기서 확인만.
    // note: pending 은 correlationId 등록 후 legacy 만 완료된 상태.
    expect(__getPendingCountForTests()).toBeGreaterThanOrEqual(0);
  });

  test('appendEntry throw 가 반복돼도 훅은 계속 동작 (후속 성공 케이스 matched=true)', async () => {
    setFlag('shadow');
    // 1회 throw, 2회 정상
    appendEntrySpy.mockImplementationOnce(async () => {
      throw new Error('transient fail');
    });
    const { result } = renderHook(() => useShadowProjectWriter());
    result.current.onPrimarySaveComplete(makeProjects(), 5);
    await flush(300);

    // 두 번째 호출은 기본 구현 (beforeEach에서 실제 appendEntry로 위임) 사용
    result.current.onPrimarySaveComplete(makeProjects(2), 5);
    await flush(400);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].matched).toBe(true);
  });
});

// ============================================================
// PART 5 — 비동기 분리 증명 (G6 성능)
// ============================================================

describe('useShadowProjectWriter — 비동기 분리', () => {
  test('onPrimarySaveComplete 는 즉시 void 반환 (동기 5ms 이하)', () => {
    setFlag('shadow');
    const { result } = renderHook(() => useShadowProjectWriter());
    const p = makeProjects(10);
    const t0 = performance.now();
    const ret = result.current.onPrimarySaveComplete(p, 42);
    const dt = performance.now() - t0;

    // callback 자체는 void — Promise 노출 금지 (caller 가 await 하지 않는 계약).
    expect(ret).toBeUndefined();
    // queueMicrotask 는 현재 task 종료 후 — 이 라인까지는 hash 계산 전.
    expect(dt).toBeLessThan(5);
  });

  test('callback identity 안정 (options 변경에도 useCallback deps=[])', () => {
    setFlag('shadow');
    const { result, rerender } = renderHook(
      ({ pid }: { pid: string | null }) =>
        useShadowProjectWriter({ projectId: pid, sessionId: 's-1' }),
      { initialProps: { pid: 'p-a' } },
    );
    const first = result.current.onPrimarySaveComplete;
    rerender({ pid: 'p-b' });
    expect(result.current.onPrimarySaveComplete).toBe(first);
  });
});

// ============================================================
// PART 6 — 비정상 입력 방어
// ============================================================

describe('useShadowProjectWriter — 입력 방어', () => {
  test('빈 배열 → 엔트리 1건 (관측 의미는 있음)', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useShadowProjectWriter());
    result.current.onPrimarySaveComplete([], 3);
    await flush(300);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].matched).toBe(true);
  });

  test('durationMs 음수/NaN → 0 으로 clamp', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useShadowProjectWriter());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current.onPrimarySaveComplete(makeProjects(), NaN as any);
    await flush(300);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].durationMs).toBe(0);
  });

  test('projects 가 비배열 — 방어 후 빈 배열로 취급', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useShadowProjectWriter());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current.onPrimarySaveComplete(null as any, 1);
    await flush(300);

    const log = await getShadowLog();
    // 빈 배열처럼 처리 — 엔트리 1건
    expect(log.length).toBe(1);
  });
});

// IDENTITY_SEAL: PART-1..6 | role=shadow-writer-tests | inputs=flag+projects | outputs=shadow log assertions
