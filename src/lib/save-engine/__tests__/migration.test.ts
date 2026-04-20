// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import {
  migrateLegacyProjects,
  hasLegacyProjects,
  isAlreadyMigrated,
  rollbackMigrationMarker,
  LS_KEY_LEGACY_PROJECTS,
  LS_KEY_MIGRATED_MARKER,
} from '@/lib/save-engine/migration';
import { resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { resetJournalHLCForTests, readAllEntries } from '@/lib/save-engine/journal';

beforeEach(() => {
  resetFakeIndexedDB();
  resetDbForTests();
  resetDefaultWriterQueueForTests();
  resetMemoryTierForTests();
  resetJournalHLCForTests();
  try { localStorage.clear(); } catch { /* noop */ }
});

// ============================================================
// PART 2 — State checks
// ============================================================

describe('migration — 상태 체크', () => {
  test('레거시 키 없음 → no-legacy', async () => {
    const r = await migrateLegacyProjects();
    expect(r.performed).toBe(false);
    expect(r.reason).toBe('no-legacy');
  });

  test('이미 마이그레이션된 상태 → already-migrated', async () => {
    localStorage.setItem(LS_KEY_LEGACY_PROJECTS, '[]');
    localStorage.setItem(LS_KEY_MIGRATED_MARKER, new Date().toISOString());
    const r = await migrateLegacyProjects();
    expect(r.reason).toBe('already-migrated');
  });

  test('hasLegacyProjects / isAlreadyMigrated', () => {
    expect(hasLegacyProjects()).toBe(false);
    expect(isAlreadyMigrated()).toBe(false);
    localStorage.setItem(LS_KEY_LEGACY_PROJECTS, '[]');
    expect(hasLegacyProjects()).toBe(true);
  });
});

// ============================================================
// PART 3 — 완전 마이그레이션 플로우
// ============================================================

describe('migration — 완료 플로우', () => {
  test('begin → snapshot → commit + marker 세팅', async () => {
    const legacy = JSON.stringify([{ id: 'p1', title: 'legacy-project' }]);
    localStorage.setItem(LS_KEY_LEGACY_PROJECTS, legacy);

    const r = await migrateLegacyProjects();
    expect(r.performed).toBe(true);
    expect(r.reason).toBe('completed');
    expect(r.snapshotEntryId).toBeTruthy();

    // marker 설정 확인
    expect(localStorage.getItem(LS_KEY_MIGRATED_MARKER)).toBeTruthy();

    // journal에 migration(begin/commit) + snapshot 기록 확인
    const entries = await readAllEntries();
    const beginCount = entries.filter((e) => e.entryType === 'migration' && (e.payload as { phase: string }).phase === 'begin').length;
    const commitCount = entries.filter((e) => e.entryType === 'migration' && (e.payload as { phase: string }).phase === 'commit').length;
    const snapCount = entries.filter((e) => e.entryType === 'snapshot').length;
    expect(beginCount).toBe(1);
    expect(commitCount).toBe(1);
    expect(snapCount).toBe(1);
  });
});

// ============================================================
// PART 4 — 롤백
// ============================================================

describe('migration — rollback marker', () => {
  test('rollbackMigrationMarker → marker 제거, 원본 레거시는 유지', async () => {
    const legacy = JSON.stringify([{ id: 'p1' }]);
    localStorage.setItem(LS_KEY_LEGACY_PROJECTS, legacy);
    await migrateLegacyProjects();
    expect(localStorage.getItem(LS_KEY_MIGRATED_MARKER)).toBeTruthy();

    rollbackMigrationMarker();
    expect(localStorage.getItem(LS_KEY_MIGRATED_MARKER)).toBeNull();
    expect(localStorage.getItem(LS_KEY_LEGACY_PROJECTS)).toBe(legacy);
  });
});
