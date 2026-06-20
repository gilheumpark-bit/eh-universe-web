// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  openJournalDB,
  idbAppendEntry,
  idbGetTip,
  idbGetEntry,
  idbGetEntriesRange,
  idbPutSnapshot,
  idbListSnapshots,
  idbDeleteSnapshot,
  idbSetMeta,
  idbGetMeta,
  idbQuarantineEntry,
  idbListQuarantined,
  isIndexedDBAvailable,
  resetDbForTests,
} from '@/lib/save-engine/indexeddb-adapter';
import type { JournalEntry, SnapshotPayload } from '@/lib/save-engine/types';
import { CURRENT_JOURNAL_VERSION, GENESIS } from '@/lib/save-engine/types';

function fakeEntry(id: string, parentHash = GENESIS): JournalEntry {
  return {
    id,
    clock: { physical: 100, logical: 0, nodeId: 'test' },
    sessionId: 'sess',
    tabId: 'tab',
    projectId: 'proj-1',
    entryType: 'delta',
    parentHash,
    contentHash: `hash-${id}`,
    payload: {
      projectId: 'proj-1',
      ops: [{ op: 'replace', path: '/title', value: id }],
      target: 'manuscript',
      targetId: 'proj-1:ep-1',
      baseContentHash: GENESIS,
    },
    createdBy: 'user',
    journalVersion: CURRENT_JOURNAL_VERSION,
  };
}

beforeEach(() => {
  resetFakeIndexedDB();
  resetDbForTests();
});

// ============================================================
// PART 2 — Availability + open
// ============================================================

describe('indexeddb-adapter availability', () => {
  test('isIndexedDBAvailable — fake 설치 후 true', () => {
    expect(isIndexedDBAvailable()).toBe(true);
  });

  test('openJournalDB — stores 5개 생성', async () => {
    const db = await openJournalDB();
    expect(db).not.toBeNull();
    expect(db!.objectStoreNames.contains('journal')).toBe(true);
    expect(db!.objectStoreNames.contains('snapshots')).toBe(true);
    expect(db!.objectStoreNames.contains('journal_meta')).toBe(true);
    expect(db!.objectStoreNames.contains('journal_quarantine')).toBe(true);
    expect(db!.objectStoreNames.contains('sync_queue')).toBe(true);
  });
});

// ============================================================
// PART 3 — Append + tip round-trip
// ============================================================

describe('idbAppendEntry + tip', () => {
  test('append 후 tip이 해당 엔트리 id로 업데이트', async () => {
    const e = fakeEntry('01HXXX01');
    await idbAppendEntry(e);
    const tip = await idbGetTip();
    expect(tip).toBe('01HXXX01');
  });

  test('반복 append 시 tip 마지막 엔트리로 이동', async () => {
    await idbAppendEntry(fakeEntry('01A'));
    await idbAppendEntry(fakeEntry('01B', 'hash-01A'));
    await idbAppendEntry(fakeEntry('01C', 'hash-01B'));
    expect(await idbGetTip()).toBe('01C');
  });

  test('get by id — 방금 저장한 엔트리 조회', async () => {
    const e = fakeEntry('read-test');
    await idbAppendEntry(e);
    const loaded = await idbGetEntry('read-test');
    expect(loaded?.id).toBe('read-test');
    expect(loaded?.parentHash).toBe(GENESIS);
  });
});

// ============================================================
// PART 4 — Range queries
// ============================================================

describe('idbGetEntriesRange', () => {
  test('전수 조회 — id 오름차순', async () => {
    await idbAppendEntry(fakeEntry('01C'));
    await idbAppendEntry(fakeEntry('01A'));
    await idbAppendEntry(fakeEntry('01B'));
    const all = await idbGetEntriesRange();
    expect(all.map((e) => e.id)).toEqual(['01A', '01B', '01C']);
  });

  test('fromId 경계 포함', async () => {
    await idbAppendEntry(fakeEntry('A'));
    await idbAppendEntry(fakeEntry('B'));
    await idbAppendEntry(fakeEntry('C'));
    const r = await idbGetEntriesRange({ fromId: 'B' });
    expect(r.map((e) => e.id)).toEqual(['B', 'C']);
  });

  test('toId 경계 포함', async () => {
    await idbAppendEntry(fakeEntry('A'));
    await idbAppendEntry(fakeEntry('B'));
    await idbAppendEntry(fakeEntry('C'));
    const r = await idbGetEntriesRange({ toId: 'B' });
    expect(r.map((e) => e.id)).toEqual(['A', 'B']);
  });
});

// ============================================================
// PART 5 — Snapshot store
// ============================================================

describe('snapshot store', () => {
  const snapPayload: SnapshotPayload = {
    schemaVersion: 1,
    projectsCompressed: new Uint8Array([1, 2, 3]),
    rawHash: 'rawhash-abc',
    compression: 'none',
    coversUpToEntryId: '01Z',
  };

  test('put + list + delete', async () => {
    await idbPutSnapshot({ id: 'snap-1', payload: snapPayload, meta: { protected: false, createdAt: Date.now() } });
    await idbPutSnapshot({ id: 'snap-2', payload: snapPayload, meta: { protected: true, createdAt: Date.now() } });
    const all = await idbListSnapshots();
    expect(all).toHaveLength(2);
    await idbDeleteSnapshot('snap-1');
    const after = await idbListSnapshots();
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe('snap-2');
  });
});

// ============================================================
// PART 6 — Meta + quarantine
// ============================================================

describe('meta store', () => {
  test('set + get round-trip', async () => {
    await idbSetMeta('foo', { a: 1 });
    const v = await idbGetMeta<{ a: number }>('foo');
    expect(v?.a).toBe(1);
  });

  test('없는 키는 null', async () => {
    expect(await idbGetMeta('__nope__')).toBeNull();
  });
});

describe('quarantine store', () => {
  test('격리 후 목록 조회', async () => {
    const e = fakeEntry('bad-1');
    await idbQuarantineEntry(e, 'content-hash-mismatch');
    const list = await idbListQuarantined();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('bad-1');
  });
});
