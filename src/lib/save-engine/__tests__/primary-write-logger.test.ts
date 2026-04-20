// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  recordPrimaryWrite,
  getPrimaryWriteLog,
  clearPrimaryWriteLog,
  __resetPrimaryWriteLoggerForTests,
} from '../primary-write-logger';

const flush = async (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  resetFakeIndexedDB();
  __resetPrimaryWriteLoggerForTests();
});

// ============================================================
// PART 2 — 기본 기록/조회
// ============================================================

describe('primary-write-logger — 기본 기록/조회', () => {
  test('단일 엔트리 기록 → 조회', async () => {
    await recordPrimaryWrite({
      ts: 1_700_000_000_000,
      mode: 'journal',
      primarySuccess: true,
      mirrorSuccess: true,
      durationMs: 12,
      journalEntryId: 'entry-abc',
    });
    await flush(50);

    const log = await getPrimaryWriteLog();
    expect(log.length).toBe(1);
    expect(log[0].mode).toBe('journal');
    expect(log[0].primarySuccess).toBe(true);
    expect(log[0].journalEntryId).toBe('entry-abc');
    expect(log[0].id).toMatch(/^pw-/);
  });

  test('여러 엔트리 → ts 내림차순 정렬', async () => {
    await recordPrimaryWrite({ ts: 1_000, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 5 });
    await recordPrimaryWrite({ ts: 2_000, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 10 });
    await recordPrimaryWrite({ ts: 3_000, mode: 'degraded', primarySuccess: true, mirrorSuccess: true, durationMs: 20 });
    await flush(80);

    const log = await getPrimaryWriteLog();
    expect(log.length).toBe(3);
    expect(log[0].ts).toBe(3_000);
    expect(log[1].ts).toBe(2_000);
    expect(log[2].ts).toBe(1_000);
  });

  test('filter by mode', async () => {
    await recordPrimaryWrite({ ts: 1, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 5 });
    await recordPrimaryWrite({ ts: 2, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 10 });
    await recordPrimaryWrite({ ts: 3, mode: 'degraded', primarySuccess: true, mirrorSuccess: true, durationMs: 20 });
    await flush(100);

    const journals = await getPrimaryWriteLog({ mode: 'journal' });
    expect(journals.length).toBe(1);
    expect(journals[0].ts).toBe(2);
  });

  test('limit 적용', async () => {
    for (let i = 0; i < 5; i++) {
      await recordPrimaryWrite({ ts: i + 1, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: i });
    }
    await flush(150);
    const first2 = await getPrimaryWriteLog({ limit: 2 });
    expect(first2.length).toBe(2);
  });

  test('sinceTs / untilTs 범위 필터', async () => {
    await recordPrimaryWrite({ ts: 100, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 5 });
    await recordPrimaryWrite({ ts: 200, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 5 });
    await recordPrimaryWrite({ ts: 300, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 5 });
    await flush(100);

    const mid = await getPrimaryWriteLog({ sinceTs: 150, untilTs: 250 });
    expect(mid.length).toBe(1);
    expect(mid[0].ts).toBe(200);
  });

  test('clearPrimaryWriteLog → 전체 삭제', async () => {
    await recordPrimaryWrite({ ts: 1, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    await recordPrimaryWrite({ ts: 2, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 2 });
    await flush(80);
    expect((await getPrimaryWriteLog()).length).toBe(2);

    await clearPrimaryWriteLog();
    expect((await getPrimaryWriteLog()).length).toBe(0);
  });
});

// ============================================================
// PART 3 — 방어 / 비정상 입력
// ============================================================

describe('primary-write-logger — 방어', () => {
  test('mode 무효값 → "legacy" 폴백', async () => {
    await recordPrimaryWrite({
      ts: 10,
      // @ts-expect-error mode intentionally invalid
      mode: 'alien',
      primarySuccess: true,
      mirrorSuccess: true,
      durationMs: 5,
    });
    await flush(50);
    const log = await getPrimaryWriteLog();
    expect(log[0].mode).toBe('legacy');
  });

  test('primarySuccess 비불리언 → false', async () => {
    await recordPrimaryWrite({
      ts: 11,
      mode: 'journal',
      // @ts-expect-error — 비불리언 입력 방어 테스트
      primarySuccess: 'yes',
      mirrorSuccess: true,
      durationMs: 5,
    });
    await flush(50);
    const log = await getPrimaryWriteLog();
    expect(log[0].primarySuccess).toBe(false);
  });

  test('durationMs 음수/NaN → 0', async () => {
    await recordPrimaryWrite({ ts: 12, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: -5 });
    await recordPrimaryWrite({ ts: 13, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: NaN });
    await flush(50);
    const log = await getPrimaryWriteLog();
    expect(log.every((e) => e.durationMs >= 0)).toBe(true);
  });

  test('ts 미지정 → Date.now 폴백', async () => {
    const before = Date.now();
    await recordPrimaryWrite({
      mode: 'legacy',
      primarySuccess: true,
      mirrorSuccess: true,
      durationMs: 1,
    });
    await flush(50);
    const after = Date.now();

    const log = await getPrimaryWriteLog();
    expect(log[0].ts).toBeGreaterThanOrEqual(before);
    expect(log[0].ts).toBeLessThanOrEqual(after);
  });
});
