// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  appendEntry,
  appendInitEntry,
  readAllEntries,
  verifyJournal,
  resetJournalHLCForTests,
} from '@/lib/save-engine/journal';
import { resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { GENESIS } from '@/lib/save-engine/types';

beforeEach(() => {
  resetFakeIndexedDB();
  resetDbForTests();
  resetDefaultWriterQueueForTests();
  resetMemoryTierForTests();
  resetJournalHLCForTests();
  try { localStorage.clear(); } catch { /* noop */ }
});

// ============================================================
// PART 2 — appendEntry — chain integrity
// ============================================================

describe('appendEntry — 체인 연결', () => {
  test('첫 엔트리는 parentHash = GENESIS', async () => {
    const r = await appendInitEntry();
    expect(r.ok).toBe(true);
    expect(r.entry?.parentHash).toBe(GENESIS);
  });

  test('후속 엔트리는 이전 contentHash 를 parentHash로 참조', async () => {
    const init = await appendInitEntry();
    const second = await appendEntry({
      entryType: 'delta',
      payload: {
        projectId: 'p1',
        ops: [{ op: 'replace', path: '/t', value: 'X' }],
        target: 'manuscript',
        targetId: 'p1:e1',
        baseContentHash: GENESIS,
      },
      createdBy: 'user',
      projectId: 'p1',
    });
    expect(second.ok).toBe(true);
    expect(second.entry?.parentHash).toBe(init.entry!.contentHash);
  });

  test('n개 append 후 verifyJournal ok', async () => {
    await appendInitEntry();
    for (let i = 0; i < 5; i++) {
      await appendEntry({
        entryType: 'delta',
        payload: {
          projectId: 'p1',
          ops: [{ op: 'add', path: `/k${i}`, value: i }],
          target: 'manuscript',
          targetId: 'p1:e1',
          baseContentHash: GENESIS,
        },
        createdBy: 'user',
        projectId: 'p1',
      });
    }
    const r = await verifyJournal();
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(6);
  });
});

// ============================================================
// PART 3 — HLC monotonic
// ============================================================

describe('HLC monotonic clock', () => {
  test('각 append의 clock.physical 단조 증가(또는 logical 증가)', async () => {
    await appendInitEntry();
    await appendInitEntry();
    await appendInitEntry();
    const all = await readAllEntries();
    for (let i = 1; i < all.length; i++) {
      const prev = all[i - 1];
      const cur = all[i];
      const strictlyAfter =
        cur.clock.physical > prev.clock.physical ||
        (cur.clock.physical === prev.clock.physical && cur.clock.logical > prev.clock.logical);
      expect(strictlyAfter).toBe(true);
    }
  });
});

// ============================================================
// PART 4 — readAll
// ============================================================

describe('readAllEntries', () => {
  test('id 오름차순 반환', async () => {
    await appendInitEntry();
    await appendInitEntry();
    const all = await readAllEntries();
    expect(all.length).toBe(2);
    expect(all[0].id < all[1].id).toBe(true);
  });
});
