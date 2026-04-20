// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  recordPromotion,
  getPromotionHistory,
  clearPromotionHistory,
  __resetPromotionAuditForTests,
} from '../promotion-audit';

const flush = async (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  resetFakeIndexedDB();
  __resetPromotionAuditForTests();
});

// ============================================================
// PART 2 — recordPromotion + getPromotionHistory
// ============================================================

describe('promotion-audit — 기본 기록/조회', () => {
  test('단일 이벤트 기록 → 조회', async () => {
    await recordPromotion({
      ts: 1_700_000_000_000,
      from: 'shadow',
      to: 'on',
      trigger: 'manual',
      reason: 'manual-promote',
    });
    await flush(50);

    const list = await getPromotionHistory();
    expect(list.length).toBe(1);
    expect(list[0].from).toBe('shadow');
    expect(list[0].to).toBe('on');
    expect(list[0].trigger).toBe('manual');
    expect(list[0].id).toMatch(/^pa-/);
  });

  test('여러 이벤트 기록 → 최신 먼저 정렬', async () => {
    await recordPromotion({ ts: 1_000, from: 'off', to: 'shadow', trigger: 'manual', reason: 'a' });
    await recordPromotion({ ts: 2_000, from: 'shadow', to: 'on', trigger: 'auto', reason: 'b' });
    await recordPromotion({ ts: 3_000, from: 'on', to: 'shadow', trigger: 'downgrade', reason: 'c' });
    await flush(100);

    const list = await getPromotionHistory();
    expect(list.length).toBe(3);
    expect(list[0].ts).toBe(3_000);
    expect(list[1].ts).toBe(2_000);
    expect(list[2].ts).toBe(1_000);
  });

  test('filter by trigger', async () => {
    await recordPromotion({ ts: 1, from: 'off', to: 'shadow', trigger: 'manual', reason: 'a' });
    await recordPromotion({ ts: 2, from: 'shadow', to: 'on', trigger: 'auto', reason: 'b' });
    await recordPromotion({ ts: 3, from: 'on', to: 'shadow', trigger: 'downgrade', reason: 'c' });
    await flush(100);

    const downgrades = await getPromotionHistory({ trigger: 'downgrade' });
    expect(downgrades.length).toBe(1);
    expect(downgrades[0].reason).toBe('c');
  });

  test('filter by to mode', async () => {
    await recordPromotion({ ts: 1, from: 'off', to: 'shadow', trigger: 'manual', reason: 'a' });
    await recordPromotion({ ts: 2, from: 'shadow', to: 'on', trigger: 'manual', reason: 'b' });
    await flush(100);

    const to_on = await getPromotionHistory({ to: 'on' });
    expect(to_on.length).toBe(1);
    expect(to_on[0].to).toBe('on');
  });

  test('limit 적용', async () => {
    for (let i = 0; i < 5; i++) {
      await recordPromotion({ ts: i + 1, from: 'shadow', to: 'on', trigger: 'manual', reason: `e${i}` });
    }
    await flush(150);

    const first2 = await getPromotionHistory({ limit: 2 });
    expect(first2.length).toBe(2);
  });

  test('clearPromotionHistory → 전체 삭제', async () => {
    await recordPromotion({ ts: 1, from: 'off', to: 'shadow', trigger: 'manual', reason: 'a' });
    await recordPromotion({ ts: 2, from: 'shadow', to: 'on', trigger: 'auto', reason: 'b' });
    await flush(100);
    expect((await getPromotionHistory()).length).toBe(2);

    await clearPromotionHistory();
    const after = await getPromotionHistory();
    expect(after.length).toBe(0);
  });
});

// ============================================================
// PART 3 — Metrics + reason clipping + 유효성
// ============================================================

describe('promotion-audit — 메타데이터 + 방어', () => {
  test('metrics 저장·복원', async () => {
    await recordPromotion({
      ts: 100,
      from: 'shadow',
      to: 'on',
      trigger: 'manual',
      reason: 'with-metrics',
      metrics: {
        matchRate: 99.95,
        sampleSize: 1200,
        observationHours: 80,
        recentRegressionPct: 0.05,
        p95JournalMs: 12,
      },
    });
    await flush(50);

    const list = await getPromotionHistory();
    expect(list[0].metrics).toBeDefined();
    expect(list[0].metrics?.matchRate).toBe(99.95);
    expect(list[0].metrics?.sampleSize).toBe(1200);
  });

  test('긴 reason 은 500자로 clip', async () => {
    const long = 'x'.repeat(1000);
    await recordPromotion({ ts: 1, from: 'shadow', to: 'on', trigger: 'manual', reason: long });
    await flush(50);

    const list = await getPromotionHistory();
    expect(list[0].reason.length).toBe(500);
  });

  test('ts 미지정/무효 → Date.now() 폴백', async () => {
    const before = Date.now();
    // @ts-expect-error — ts 의도적 무효
    await recordPromotion({ from: 'shadow', to: 'on', trigger: 'manual', reason: 'no-ts' });
    await flush(50);
    const after = Date.now();

    const list = await getPromotionHistory();
    expect(list[0].ts).toBeGreaterThanOrEqual(before);
    expect(list[0].ts).toBeLessThanOrEqual(after);
  });
});
