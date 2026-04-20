// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  logEvent,
  getEventLog,
  exportEventLog,
  clearEventLog,
  __resetLocalEventLogForTests,
} from '../local-event-log';

const flush = async (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  resetFakeIndexedDB();
  __resetLocalEventLogForTests();
});

// ============================================================
// PART 2 — 기본 기록/조회
// ============================================================

describe('local-event-log — 기본 기록/조회', () => {
  test('단일 이벤트 기록 → 비동기 조회', async () => {
    logEvent({
      ts: 1_000,
      category: 'save',
      mode: 'shadow',
      outcome: 'success',
      details: { writerMode: 'legacy', durationMs: 5 },
    });
    await flush(60);

    const log = await getEventLog();
    expect(log.length).toBe(1);
    expect(log[0].category).toBe('save');
    expect(log[0].mode).toBe('shadow');
    expect(log[0].outcome).toBe('success');
    expect(log[0].details.durationMs).toBe(5);
    expect(log[0].id).toMatch(/^ev-/);
  });

  test('여러 이벤트 → ts 내림차순', async () => {
    logEvent({ ts: 1, category: 'save', mode: 'off', outcome: 'success', details: {} });
    logEvent({ ts: 2, category: 'recovery', mode: 'shadow', outcome: 'success', details: {} });
    logEvent({ ts: 3, category: 'error', mode: 'on', outcome: 'failure', details: {} });
    await flush(80);

    const log = await getEventLog();
    expect(log.map((e) => e.ts)).toEqual([3, 2, 1]);
  });

  test('filter by category', async () => {
    logEvent({ ts: 1, category: 'save', mode: 'on', outcome: 'success', details: {} });
    logEvent({ ts: 2, category: 'recovery', mode: 'on', outcome: 'success', details: {} });
    logEvent({ ts: 3, category: 'error', mode: 'on', outcome: 'failure', details: {} });
    await flush(80);

    const errors = await getEventLog({ category: 'error' });
    expect(errors.length).toBe(1);
    expect(errors[0].outcome).toBe('failure');
  });

  test('filter by outcome', async () => {
    logEvent({ ts: 1, category: 'save', mode: 'on', outcome: 'success', details: {} });
    logEvent({ ts: 2, category: 'save', mode: 'on', outcome: 'failure', details: {} });
    logEvent({ ts: 3, category: 'save', mode: 'on', outcome: 'degraded', details: {} });
    await flush(80);

    const degraded = await getEventLog({ outcome: 'degraded' });
    expect(degraded.length).toBe(1);
  });

  test('clearEventLog → 전체 삭제', async () => {
    logEvent({ ts: 1, category: 'save', mode: 'on', outcome: 'success', details: {} });
    logEvent({ ts: 2, category: 'error', mode: 'on', outcome: 'failure', details: {} });
    await flush(80);
    expect((await getEventLog()).length).toBe(2);

    await clearEventLog();
    expect((await getEventLog()).length).toBe(0);
  });
});

// ============================================================
// PART 3 — Sanitize (민감정보 방어)
// ============================================================

describe('local-event-log — details sanitize', () => {
  test('문자열 2KB 초과 → [redacted:too-long]', async () => {
    const big = 'x'.repeat(3000);
    logEvent({
      ts: 1,
      category: 'error',
      mode: 'on',
      outcome: 'failure',
      details: { huge: big },
    });
    await flush(50);
    const log = await getEventLog();
    expect(log[0].details.huge).toBe('[redacted:too-long]');
  });

  test('문자열 200자 초과 → 자르기 + 말줄임', async () => {
    const mid = 'a'.repeat(300);
    logEvent({
      ts: 2,
      category: 'error',
      mode: 'on',
      outcome: 'failure',
      details: { msg: mid },
    });
    await flush(50);
    const log = await getEventLog();
    const v = log[0].details.msg as string;
    expect(v.endsWith('…')).toBe(true);
    expect(v.length).toBeLessThanOrEqual(201);
  });

  test('중첩 객체 → "[object]" 플레이스홀더', async () => {
    logEvent({
      ts: 3,
      category: 'error',
      mode: 'on',
      outcome: 'failure',
      details: { deep: { inner: 'hidden' } } as Record<string, unknown>,
    });
    await flush(50);
    const log = await getEventLog();
    expect(log[0].details.deep).toBe('[object]');
  });

  test('배열 → "[array:N]" 플레이스홀더', async () => {
    logEvent({
      ts: 4,
      category: 'error',
      mode: 'on',
      outcome: 'failure',
      details: { arr: [1, 2, 3, 4, 5] },
    });
    await flush(50);
    const log = await getEventLog();
    expect(log[0].details.arr).toBe('[array:5]');
  });

  test('화이트리스트 밖 category/outcome → 폴백', async () => {
    logEvent({
      ts: 5,
      // @ts-expect-error — 화이트리스트 밖 값 주입 테스트
      category: 'unknown',
      mode: 'on',
      // @ts-expect-error — 화이트리스트 밖 outcome 테스트
      outcome: 'weird',
      details: {},
    });
    await flush(50);
    const log = await getEventLog();
    expect(log[0].category).toBe('error');
    expect(log[0].outcome).toBe('failure');
  });
});

// ============================================================
// PART 4 — export JSON
// ============================================================

describe('local-event-log — exportEventLog', () => {
  test('exportEventLog → JSON parse 가능 + schema/events 포함', async () => {
    logEvent({ ts: 100, category: 'save', mode: 'on', outcome: 'success', details: {} });
    await flush(50);

    const json = await exportEventLog();
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe('number');
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.count).toBe(parsed.events.length);
    expect(parsed.events[0].category).toBe('save');
  });
});
