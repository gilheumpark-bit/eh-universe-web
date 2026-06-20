// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  createSnapshot,
  restoreSnapshot,
  cleanupOldSnapshots,
  evaluateSnapshotTrigger,
  DEFAULT_COUNT_THRESHOLD,
  DEFAULT_SIZE_THRESHOLD,
  DEFAULT_TIME_THRESHOLD_MS,
  MAX_SNAPSHOTS,
  findLatestSnapshotEntry,
} from '@/lib/save-engine/snapshot';
import { detectAnomaly, countCharacters, ANOMALY_RATIO_THRESHOLD, ANOMALY_PREV_MIN } from '@/lib/save-engine/anomaly-detector';
import { resetDbForTests, idbListSnapshots, idbPutSnapshot } from '@/lib/save-engine/indexeddb-adapter';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { appendInitEntry, resetJournalHLCForTests } from '@/lib/save-engine/journal';
import type { SnapshotPayload } from '@/lib/save-engine/types';

beforeEach(() => {
  resetFakeIndexedDB();
  resetDbForTests();
  resetDefaultWriterQueueForTests();
  resetMemoryTierForTests();
  resetJournalHLCForTests();
  try { localStorage.clear(); } catch { /* noop */ }
});

// ============================================================
// PART 2 — createSnapshot 왕복
// ============================================================

describe('createSnapshot / restoreSnapshot', () => {
  test('작은 프로젝트 — 생성 + rawHash 검증', async () => {
    await appendInitEntry();
    const projects = [{ id: 'p1', title: 'Test', episodes: [] }];
    const r = await createSnapshot({ projects, coversUpToEntryId: 'cov-1' });
    expect(r.entryResult.ok).toBe(true);
    expect(r.rawHash).toHaveLength(64);
    expect(r.uncompressedBytes).toBeGreaterThan(0);

    const list = await idbListSnapshots();
    expect(list.length).toBe(1);
    const restored = await restoreSnapshot(list[0]);
    expect(restored.verified).toBe(true);
    expect(restored.projects).toEqual(projects);
  });

  test('protect=true → meta.protected 설정', async () => {
    await appendInitEntry();
    await createSnapshot({ projects: [], coversUpToEntryId: 'x', protect: true });
    const list = await idbListSnapshots();
    expect(list[0].meta.protected).toBe(true);
  });
});

// ============================================================
// PART 3 — cleanupOldSnapshots
// ============================================================

describe('cleanupOldSnapshots', () => {
  test('keep 개수 초과분 삭제. protected는 제외.', async () => {
    // 25개 snapshot 직접 삽입 (IDB 기록 전용, journal entry 없이)
    for (let i = 0; i < 25; i++) {
      const payload: SnapshotPayload = {
        schemaVersion: 1,
        projectsCompressed: new Uint8Array([i]),
        rawHash: `r${i}`,
        compression: 'none',
        coversUpToEntryId: `cov-${i}`,
      };
      await idbPutSnapshot({
        id: `snap-${i.toString().padStart(3, '0')}`,
        payload,
        meta: { protected: i === 0, createdAt: Date.now() - (25 - i) * 1000 },
      });
    }
    const { deleted } = await cleanupOldSnapshots();
    const remaining = await idbListSnapshots();
    // 25 - MAX_SNAPSHOTS = 5 over, protected 1개 제외 → 4개 삭제
    expect(deleted).toBe(5 - 1);
    expect(remaining.some((s) => s.meta.protected)).toBe(true);
    expect(remaining.length).toBeLessThanOrEqual(MAX_SNAPSHOTS + 1); // +1 protected
  });
});

// ============================================================
// PART 4 — evaluateSnapshotTrigger (Spec 4.1.2)
// ============================================================

describe('evaluateSnapshotTrigger', () => {
  test('manual 강제 → reason=manual', () => {
    const r = evaluateSnapshotTrigger({
      deltaCountSinceLast: 0,
      bytesSinceLast: 0,
      lastSnapshotAt: Date.now(),
      manual: true,
    });
    expect(r.shouldSnapshot).toBe(true);
    expect(r.reason).toBe('manual');
  });

  test('anomaly → reason=anomaly', () => {
    const r = evaluateSnapshotTrigger({
      deltaCountSinceLast: 0,
      bytesSinceLast: 0,
      lastSnapshotAt: Date.now(),
      anomaly: true,
    });
    expect(r.reason).toBe('anomaly');
  });

  test('count 임계 → reason=count', () => {
    const r = evaluateSnapshotTrigger({
      deltaCountSinceLast: DEFAULT_COUNT_THRESHOLD,
      bytesSinceLast: 0,
      lastSnapshotAt: Date.now(),
    });
    expect(r.shouldSnapshot).toBe(true);
    expect(r.reason).toBe('count');
  });

  test('size 임계 → reason=size', () => {
    const r = evaluateSnapshotTrigger({
      deltaCountSinceLast: 0,
      bytesSinceLast: DEFAULT_SIZE_THRESHOLD,
      lastSnapshotAt: Date.now(),
    });
    expect(r.reason).toBe('size');
  });

  test('time 임계(10분) + delta≥1 → reason=time', () => {
    const now = Date.now();
    const r = evaluateSnapshotTrigger({
      deltaCountSinceLast: 1,
      bytesSinceLast: 10,
      lastSnapshotAt: now - DEFAULT_TIME_THRESHOLD_MS - 1000,
      now,
    });
    expect(r.reason).toBe('time');
  });

  test('임계 미달 → shouldSnapshot=false', () => {
    const r = evaluateSnapshotTrigger({
      deltaCountSinceLast: 5,
      bytesSinceLast: 100,
      lastSnapshotAt: Date.now() - 60_000,
    });
    expect(r.shouldSnapshot).toBe(false);
    expect(r.reason).toBe('idle');
  });
});

// ============================================================
// PART 5 — findLatestSnapshotEntry
// ============================================================

describe('findLatestSnapshotEntry', () => {
  test('snapshot 없음 → null', async () => {
    expect(await findLatestSnapshotEntry()).toBeNull();
  });

  test('snapshot 2개 있으면 최신 반환', async () => {
    await appendInitEntry();
    const r1 = await createSnapshot({ projects: [{ id: 'a' }], coversUpToEntryId: 'x1' });
    const r2 = await createSnapshot({ projects: [{ id: 'b' }], coversUpToEntryId: 'x2' });
    const latest = await findLatestSnapshotEntry();
    expect(latest?.id).toBe(r2.snapshotId);
    expect(r1.snapshotId < r2.snapshotId).toBe(true);
  });
});

// ============================================================
// PART 6 — Anomaly detector (Spec 12.6)
// ============================================================

describe('detectAnomaly', () => {
  test('manuscript 아닌 target → 미감지', () => {
    const r = detectAnomaly({ target: 'project', prevChars: 1000, nextChars: 0 });
    expect(r.detected).toBe(false);
    expect(r.reason).toBe('target-mismatch');
  });

  test('prev < 500자 → 미감지', () => {
    const r = detectAnomaly({ target: 'manuscript', prevChars: ANOMALY_PREV_MIN - 1, nextChars: 0 });
    expect(r.detected).toBe(false);
    expect(r.reason).toBe('prev-too-small');
  });

  test('축소율 20% 이상 → 미감지(safe)', () => {
    const r = detectAnomaly({ target: 'manuscript', prevChars: 1000, nextChars: 300 });
    expect(r.detected).toBe(false);
    expect(r.reason).toBe('ratio-safe');
  });

  test('20% 이하 축소 + 조건 만족 → 감지', () => {
    const r = detectAnomaly({ target: 'manuscript', prevChars: 1000, nextChars: 100 });
    expect(r.detected).toBe(true);
    expect(r.payload?.kind).toBe('bulk-delete');
    expect(r.payload?.detail.ratio).toBe(0.1);
    expect(r.ratio).toBeLessThanOrEqual(ANOMALY_RATIO_THRESHOLD);
  });

  test('intentionalReplace=true → 미감지', () => {
    const r = detectAnomaly({
      target: 'manuscript',
      prevChars: 1000,
      nextChars: 10,
      intentionalReplace: true,
    });
    expect(r.detected).toBe(false);
    expect(r.reason).toBe('intentional');
  });
});

describe('countCharacters', () => {
  test('string 길이', () => expect(countCharacters('hello')).toBe(5));
  test('{ body: string }', () => expect(countCharacters({ body: 'abc' })).toBe(3));
  test('{ content: string }', () => expect(countCharacters({ content: 'xyz' })).toBe(3));
  test('null → 0', () => expect(countCharacters(null)).toBe(0));
});
