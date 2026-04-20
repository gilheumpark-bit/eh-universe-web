// ============================================================
// PART 1 — Setup & mocks
// ============================================================
//
// [M1.5.5] usePrimaryWriter 검증 — 3-mode 동작 + fallback + downgrade.
//
// 검증 축:
//   (G2)  flag 'off'    → legacy 즉시, 저널 호출 0, WriteResult.mode='legacy'
//   (G4)  flag 'shadow' → legacy 즉시 (shadow 는 별개 훅 담당), mode='legacy'
//   (G4)  flag 'on'     → journal append + legacy Mirror (background)
//   (G5)  flag 'on' + journal throw → legacy fallback 성공 + downgrade 트리거 + journal-error 이벤트
//   (G5)  flag 'on' + journal throw + legacy 도 false → WriteResult.primarySuccess=false (유실 0 은 상위 계약)
//   (G6)  flag 'on' + mirror throw → Primary (journal) 성공 유지
//   (misc) SSR 가드, ref 최신화, 비정상 입력 방어

import { installFakeIndexedDB, resetFakeIndexedDB } from '@/lib/save-engine/__tests__/_fake-idb';
installFakeIndexedDB();

import { renderHook, act } from '@testing-library/react';
import type { Project } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { usePrimaryWriter } from '@/hooks/usePrimaryWriter';
import { JOURNAL_ERROR_EVENT } from '@/hooks/useShadowProjectWriter';
import { resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { resetJournalHLCForTests } from '@/lib/save-engine/journal';

// appendEntry 스파이 — throw 주입 케이스.
// 기본은 실제 구현 호출, 특정 테스트만 mockImplementationOnce 로 throw 주입.
import * as journal from '@/lib/save-engine/journal';
const appendEntrySpy = jest.spyOn(journal, 'appendEntry');

function setFlag(mode: 'off' | 'shadow' | 'on'): void {
  try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', mode); } catch { /* noop */ }
}

function clearFlag(): void {
  try { localStorage.removeItem('ff_FEATURE_JOURNAL_ENGINE'); } catch { /* noop */ }
}

// fake IDB commit 대기 (~30~60ms 로 충분)
const flush = async (ms = 50) => new Promise((r) => setTimeout(r, ms));

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
  try { localStorage.clear(); } catch { /* noop */ }
  appendEntrySpy.mockClear();
});

afterEach(() => {
  clearFlag();
});

afterAll(() => {
  appendEntrySpy.mockRestore();
});

// ============================================================
// PART 2 — Flag 'off' / 'shadow' — legacy passthrough
// ============================================================

describe('usePrimaryWriter — flag off/shadow (legacy passthrough)', () => {
  test('flag 기본 off → legacy 즉시 + journal 호출 0 + mode=legacy', async () => {
    const legacy = jest.fn(() => true);
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects());
    });

    expect(res).not.toBeNull();
    expect(res!.mode).toBe('legacy');
    expect(res!.primarySuccess).toBe(true);
    expect(res!.mirrorSuccess).toBe(true);
    expect(res!.journalEntryId).toBeUndefined();
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(appendEntrySpy).not.toHaveBeenCalled();
  });

  test('flag shadow → legacy Primary (shadow 는 별개 훅 담당), journal 호출 0', async () => {
    setFlag('shadow');
    const legacy = jest.fn(() => true);
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects(2));
    });

    expect(res!.mode).toBe('legacy');
    expect(res!.primarySuccess).toBe(true);
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(appendEntrySpy).not.toHaveBeenCalled();
  });

  test('legacy 실패 (false) → WriteResult.primarySuccess=false (off 모드)', async () => {
    const legacy = jest.fn(() => false);
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));
    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => { res = await result.current.write(makeProjects()); });
    expect(res!.mode).toBe('legacy');
    expect(res!.primarySuccess).toBe(false);
  });

  test('legacy throw → WriteResult.primarySuccess=false (훅 내부 흡수)', async () => {
    const legacy = jest.fn(() => { throw new Error('legacy-boom'); });
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));
    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => { res = await result.current.write(makeProjects()); });
    expect(res!.primarySuccess).toBe(false);
  });

  test('getCurrentMode — flag off/shadow → legacy / flag on → journal', () => {
    const legacy = jest.fn(() => true);
    const { result, rerender } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));
    expect(result.current.getCurrentMode()).toBe('legacy');

    setFlag('shadow');
    rerender();
    expect(result.current.getCurrentMode()).toBe('legacy');

    setFlag('on');
    rerender();
    expect(result.current.getCurrentMode()).toBe('journal');
  });
});

// ============================================================
// PART 3 — Flag 'on' — journal Primary + legacy Mirror
// ============================================================

describe('usePrimaryWriter — flag on (journal Primary + legacy Mirror)', () => {
  test('on 모드 성공 경로 → journal append + legacy Mirror background', async () => {
    setFlag('on');
    const legacy = jest.fn(() => true);
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects(1));
      await flush(80);
    });

    expect(res!.mode).toBe('journal');
    expect(res!.primarySuccess).toBe(true);
    expect(res!.journalEntryId).toBeTruthy();
    expect(typeof res!.journalEntryId).toBe('string');
    expect(appendEntrySpy).toHaveBeenCalledTimes(1);
    // Mirror 는 setTimeout(0) 뒤 실행 — await write 반환까지는 resolve 됨.
    expect(res!.mirrorSuccess).toBe(true);
    expect(legacy).toHaveBeenCalled();
  });

  test('on 모드 — Mirror (legacy) 실패해도 Primary=journal 성공 유지', async () => {
    setFlag('on');
    const legacy = jest.fn(() => false); // mirror 실패
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects());
      await flush(80);
    });

    expect(res!.mode).toBe('journal');
    expect(res!.primarySuccess).toBe(true); // Primary 는 journal 성공
    expect(res!.mirrorSuccess).toBe(false); // mirror 실패 기록
    expect(res!.journalEntryId).toBeTruthy();
  });

  test('on 모드 — Mirror throw → Primary 성공 유지, 에러 로그만', async () => {
    setFlag('on');
    const legacy = jest.fn(() => { throw new Error('mirror-boom'); });
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects());
      await flush(80);
    });

    expect(res!.mode).toBe('journal');
    expect(res!.primarySuccess).toBe(true);
    expect(res!.mirrorSuccess).toBe(false);
  });
});

// ============================================================
// PART 4 — Journal failure → legacy fallback + downgrade trigger
// ============================================================

describe('usePrimaryWriter — journal 실패 복구 (G5 핵심)', () => {
  test('on 모드 + journal throw → legacy fallback 성공 + mode=degraded', async () => {
    setFlag('on');
    // appendEntry throw 주입
    appendEntrySpy.mockImplementationOnce(async () => {
      throw new Error('journal-append-simulated-failure');
    });

    const legacy = jest.fn(() => true);
    const onDowngrade = jest.fn();
    const { result } = renderHook(() =>
      usePrimaryWriter({ legacySaveFn: legacy, onDowngradeNeeded: onDowngrade }),
    );

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects());
      await flush(60);
    });

    expect(res!.mode).toBe('degraded');
    expect(res!.primarySuccess).toBe(true); // legacy fallback 성공
    expect(res!.mirrorSuccess).toBe(true);
    expect(legacy).toHaveBeenCalledTimes(1); // fallback 으로 1회 (mirror 는 journal 실패로 불필요)
    expect(onDowngrade).toHaveBeenCalledTimes(1);
    expect(onDowngrade).toHaveBeenCalledWith(
      expect.stringContaining('journal-primary-failed'),
    );
  });

  test('on 모드 + journal throw → noa:journal-error 이벤트 방송', async () => {
    setFlag('on');
    appendEntrySpy.mockImplementationOnce(async () => {
      throw new Error('journal-boom-2');
    });

    const events: Array<{ operation: string; reason: string; mode: string }> = [];
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (detail) events.push(detail);
    };
    window.addEventListener(JOURNAL_ERROR_EVENT, handler);

    const legacy = jest.fn(() => true);
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    await act(async () => {
      await result.current.write(makeProjects());
      await flush(60);
    });

    window.removeEventListener(JOURNAL_ERROR_EVENT, handler);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].operation).toBe('save-project');
    expect(events[0].mode).toBe('on');
    expect(events[0].reason).toMatch(/journal-boom-2/);
  });

  test('on 모드 + journal throw + legacy 도 false → primarySuccess=false', async () => {
    setFlag('on');
    appendEntrySpy.mockImplementationOnce(async () => {
      throw new Error('journal-down');
    });

    const legacy = jest.fn(() => false); // 동시 실패
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects());
      await flush(60);
    });

    // 둘 다 실패 — 사용자 관점 실패 (상위 계층에서 재시도/복구 책임)
    expect(res!.mode).toBe('degraded');
    expect(res!.primarySuccess).toBe(false);
  });

  test('onDowngradeNeeded 콜백 throw → Primary 결과에 영향 없음', async () => {
    setFlag('on');
    appendEntrySpy.mockImplementationOnce(async () => { throw new Error('j-err'); });

    const legacy = jest.fn(() => true);
    const onDowngrade = jest.fn(() => { throw new Error('cb-boom'); });
    const { result } = renderHook(() =>
      usePrimaryWriter({ legacySaveFn: legacy, onDowngradeNeeded: onDowngrade }),
    );

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      res = await result.current.write(makeProjects());
      await flush(60);
    });

    expect(res!.mode).toBe('degraded');
    expect(res!.primarySuccess).toBe(true);
    expect(onDowngrade).toHaveBeenCalled();
  });
});

// ============================================================
// PART 5 — 비정상 입력 + ref 최신화
// ============================================================

describe('usePrimaryWriter — 입력 방어 + ref 안정성', () => {
  test('비배열 projects → legacy 호출 없이 Primary 성공 (on 모드 snapshot 빈 배열 해석)', async () => {
    setFlag('on');
    const legacy = jest.fn(() => true);
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let res: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res = await result.current.write(null as any);
      await flush(60);
    });
    expect(res!.mode).toBe('journal');
    expect(res!.primarySuccess).toBe(true);
  });

  test('legacySaveFn ref 교체 → 최신 fn 이 호출됨', async () => {
    const fn1 = jest.fn(() => true);
    const fn2 = jest.fn(() => true);
    const { result, rerender } = renderHook(
      ({ fn }: { fn: (p: Project[]) => boolean }) => usePrimaryWriter({ legacySaveFn: fn }),
      { initialProps: { fn: fn1 } },
    );
    // 초기 상태 (off) — fn1 호출
    await act(async () => { await result.current.write(makeProjects()); });
    expect(fn1).toHaveBeenCalled();

    // fn 교체 + useEffect 로 ref 갱신 후 다음 write 는 fn2 호출
    rerender({ fn: fn2 });
    await act(async () => { await result.current.write(makeProjects()); });
    expect(fn2).toHaveBeenCalled();
  });

  test('flag on → off 전환 시 다음 write 는 legacy mode 반영', async () => {
    setFlag('on');
    const legacy = jest.fn(() => true);
    const { result } = renderHook(() => usePrimaryWriter({ legacySaveFn: legacy }));

    let r1: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => { r1 = await result.current.write(makeProjects()); await flush(60); });
    expect(r1!.mode).toBe('journal');

    // flag 전환 → 다음 write 는 legacy
    setFlag('off');
    let r2: Awaited<ReturnType<typeof result.current.write>> | null = null;
    await act(async () => { r2 = await result.current.write(makeProjects()); });
    expect(r2!.mode).toBe('legacy');
    expect(r2!.journalEntryId).toBeUndefined();
  });
});

// IDENTITY_SEAL: PART-1..5 | role=primary-writer-tests | inputs=flag+fns | outputs=WriteResult+events
