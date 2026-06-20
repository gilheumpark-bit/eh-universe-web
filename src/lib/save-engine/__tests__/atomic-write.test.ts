// ============================================================
// PART 1 — Setup (fake IDB + memory reset)
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import { performAtomicAppend, estimateEntrySize, toSaveMeta } from '@/lib/save-engine/atomic-write';
import { resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import type { JournalEntry } from '@/lib/save-engine/types';
import { CURRENT_JOURNAL_VERSION, GENESIS } from '@/lib/save-engine/types';

function fakeEntry(id: string): JournalEntry {
  return {
    id,
    clock: { physical: 100, logical: 0, nodeId: 'test' },
    sessionId: 'sess',
    tabId: 'tab',
    projectId: 'p',
    entryType: 'delta',
    parentHash: GENESIS,
    contentHash: `hash-${id}`,
    payload: {
      projectId: 'p',
      ops: [{ op: 'replace', path: '/title', value: id }],
      target: 'manuscript',
      targetId: 'p:t',
      baseContentHash: GENESIS,
    },
    createdBy: 'user',
    journalVersion: CURRENT_JOURNAL_VERSION,
  };
}

beforeEach(() => {
  resetFakeIndexedDB();
  resetDbForTests();
  resetMemoryTierForTests();
});

// ============================================================
// PART 2 — Happy path IDB
// ============================================================

describe('performAtomicAppend — IDB 성공 경로', () => {
  test('정상 append — tier=indexeddb + ok=true', async () => {
    const r = await performAtomicAppend(fakeEntry('01Z'));
    expect(r.ok).toBe(true);
    expect(r.tier).toBe('indexeddb');
    expect(r.entry?.id).toBe('01Z');
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('memory-only tier 강제', async () => {
    const r = await performAtomicAppend(fakeEntry('mem-1'), { tier: 'memory-only' });
    expect(r.ok).toBe(true);
    expect(r.tier).toBe('memory');
  });
});

// ============================================================
// PART 3 — size / meta helpers
// ============================================================

describe('estimateEntrySize / toSaveMeta', () => {
  test('크기 측정 — 0보다 큼', () => {
    expect(estimateEntrySize(fakeEntry('x'))).toBeGreaterThan(0);
  });

  test('toSaveMeta — 반환 필드 채움', async () => {
    const e = fakeEntry('meta-test');
    const r = await performAtomicAppend(e);
    const meta = toSaveMeta(r, e);
    expect(meta.entryId).toBe('meta-test');
    expect(meta.tier).toBe('indexeddb');
    expect(meta.bytes).toBeGreaterThan(0);
  });
});

// ============================================================
// PART 4 — Retry exhaustion (IDB 차단 시 LS fallback 확인)
// ============================================================

describe('performAtomicAppend — IDB 실패 후 폴백', () => {
  test('indexeddb 제거 후 LS 폴백', async () => {
    const original = (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
    (globalThis as unknown as { indexedDB?: unknown }).indexedDB = undefined;
    resetDbForTests();
    try {
      const r = await performAtomicAppend(fakeEntry('fallback-1'));
      expect(r.ok).toBe(true);
      // jsdom 기본 localStorage 사용 가능 → LS tier로 내려감
      expect(['localstorage', 'memory']).toContain(r.tier);
    } finally {
      (globalThis as unknown as { indexedDB?: unknown }).indexedDB = original;
      resetDbForTests();
    }
  });
});
