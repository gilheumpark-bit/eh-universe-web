// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  startShadowWrite,
  recordLegacyComplete,
  completeShadowWrite,
  getShadowLog,
  getMatchRate,
  clearShadowLog,
  __resetShadowLoggerForTests,
  __getPendingCountForTests,
} from '../shadow-logger';

// 짧은 비동기 완료 대기 (FakeTransaction.oncomplete가 setTimeout 5ms)
const flush = async (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  resetFakeIndexedDB();
  __resetShadowLoggerForTests();
});

// ============================================================
// PART 2 — correlationId pairing
// ============================================================

describe('shadow-logger — correlationId pairing', () => {
  test('start → legacy + journal pair → entry 승격', async () => {
    const id = startShadowWrite('save-project', { title: 'demo' });
    expect(id).toMatch(/^cor-/);
    expect(__getPendingCountForTests()).toBe(1);

    recordLegacyComplete(id, 'hash-A', 12);
    // legacy만 완료 → 아직 pending
    expect(__getPendingCountForTests()).toBe(1);

    completeShadowWrite(id, 'hash-A', 15, { title: 'demo' });
    await flush(50);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].matched).toBe(true);
    expect(log[0].legacyHash).toBe('hash-A');
    expect(log[0].journalHash).toBe('hash-A');
    expect(__getPendingCountForTests()).toBe(0);
  });

  test('hash 불일치 → matched=false + diffSummary', async () => {
    const id = startShadowWrite('save-manuscript', { text: 'ABC' });
    recordLegacyComplete(id, 'hash-L', 10);
    completeShadowWrite(id, 'hash-J', 11, { text: 'AB' });
    await flush(50);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].matched).toBe(false);
    expect(log[0].diffSummary).toBeTruthy();
    expect(log[0].diffSummary).toContain('text');
  });

  test('순서 무관 — journal 먼저, legacy 나중', async () => {
    const id = startShadowWrite('save-config');
    completeShadowWrite(id, 'h1', 5);
    expect(__getPendingCountForTests()).toBe(1);
    recordLegacyComplete(id, 'h1', 5);
    await flush(50);

    const log = await getShadowLog();
    expect(log.length).toBe(1);
    expect(log[0].matched).toBe(true);
  });
});

// ============================================================
// PART 3 — Isolation: throw 격리
// ============================================================

describe('shadow-logger — 격리 (throw가 primary 저장 막지 않음)', () => {
  test('존재하지 않는 correlationId에 대한 record — 예외 없이 무시', () => {
    expect(() => recordLegacyComplete('nonexistent', 'h', 1)).not.toThrow();
    expect(() => completeShadowWrite('nonexistent', 'h', 1)).not.toThrow();
    expect(__getPendingCountForTests()).toBe(0);
  });

  test('순환 참조 payload 전달 — 예외 없이 id 반환', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    // summarizePreview가 순환을 잘라냄 — throw 없이 id 반환
    const id = startShadowWrite('save-project', circular);
    expect(id).toMatch(/^cor-/);
  });

  test('indexedDB 없는 환경 시뮬레이션 — getShadowLog 에러 없이 [] 반환', async () => {
    // indexedDB를 일시 해제
    const originalIDB = (globalThis as unknown as { indexedDB: unknown }).indexedDB;
    (globalThis as unknown as { indexedDB: unknown }).indexedDB = undefined;
    __resetShadowLoggerForTests();

    const log = await getShadowLog();
    expect(Array.isArray(log)).toBe(true);
    expect(log.length).toBe(0);

    // 복원
    (globalThis as unknown as { indexedDB: unknown }).indexedDB = originalIDB;
    __resetShadowLoggerForTests();
  });
});

// ============================================================
// PART 4 — Query / filter / match rate
// ============================================================

describe('shadow-logger — 조회·필터·집계', () => {
  async function seed(entries: Array<{
    op: 'save-project' | 'save-manuscript';
    l: string;
    j: string;
  }>) {
    for (const e of entries) {
      const id = startShadowWrite(e.op);
      recordLegacyComplete(id, e.l, 1);
      completeShadowWrite(id, e.j, 1);
      await flush(30); // 충분한 시간 — open(5ms) + tx.oncomplete(5ms) + buffer
    }
    await flush(40);
  }

  test('filter by operation', async () => {
    await seed([
      { op: 'save-project', l: 'A', j: 'A' },
      { op: 'save-manuscript', l: 'B', j: 'B' },
      { op: 'save-project', l: 'C', j: 'X' },
    ]);

    const projects = await getShadowLog({ operation: 'save-project' });
    expect(projects.length).toBe(2);
    expect(projects.every((e) => e.operation === 'save-project')).toBe(true);
  });

  test('filter by matched=false', async () => {
    await seed([
      { op: 'save-project', l: 'A', j: 'A' },
      { op: 'save-project', l: 'B', j: 'X' },
      { op: 'save-project', l: 'C', j: 'Y' },
    ]);
    const un = await getShadowLog({ matched: false });
    expect(un.length).toBe(2);
    expect(un.every((e) => !e.matched)).toBe(true);
  });

  test('limit', async () => {
    await seed([
      { op: 'save-project', l: 'A', j: 'A' },
      { op: 'save-project', l: 'B', j: 'B' },
      { op: 'save-project', l: 'C', j: 'C' },
    ]);
    const first = await getShadowLog({ limit: 2 });
    expect(first.length).toBe(2);
  });

  test('getMatchRate 100% (모두 일치)', async () => {
    await seed([
      { op: 'save-project', l: 'A', j: 'A' },
      { op: 'save-project', l: 'B', j: 'B' },
    ]);
    const rate = await getMatchRate();
    expect(rate).toBe(100);
  });

  test('getMatchRate 50%', async () => {
    await seed([
      { op: 'save-project', l: 'A', j: 'A' },
      { op: 'save-project', l: 'B', j: 'X' },
    ]);
    const rate = await getMatchRate();
    expect(rate).toBeCloseTo(50, 0);
  });

  test('getMatchRate 빈 로그 → 100 (분모 0 가드)', async () => {
    const rate = await getMatchRate();
    expect(rate).toBe(100);
  });

  test('clearShadowLog → 로그 0 + pending 0', async () => {
    await seed([
      { op: 'save-project', l: 'A', j: 'A' },
      { op: 'save-project', l: 'B', j: 'B' },
    ]);
    expect((await getShadowLog()).length).toBeGreaterThan(0);

    // pending에 미완성 추가
    startShadowWrite('save-project');
    expect(__getPendingCountForTests()).toBeGreaterThan(0);

    await clearShadowLog();
    const log = await getShadowLog();
    expect(log.length).toBe(0);
    expect(__getPendingCountForTests()).toBe(0);
  });
});

// ============================================================
// PART 5 — TTL / ordering
// ============================================================

describe('shadow-logger — ordering', () => {
  test('ts 내림차순 반환 (최신 먼저)', async () => {
    const id1 = startShadowWrite('save-project');
    recordLegacyComplete(id1, 'X', 1);
    completeShadowWrite(id1, 'X', 1);
    await flush(50);

    const id2 = startShadowWrite('save-project');
    recordLegacyComplete(id2, 'Y', 1);
    completeShadowWrite(id2, 'Y', 1);
    await flush(50);

    const log = await getShadowLog();
    expect(log.length).toBe(2);
    expect(log[0].ts).toBeGreaterThanOrEqual(log[1].ts);
  });
});
