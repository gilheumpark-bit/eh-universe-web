// ============================================================
// twentyone-modules/ending-lock-store.ts
// — M2 IDB CRUD wrapper.
// ============================================================

import type { EndingLock } from './types';
import {
  STORE_ENDING_LOCKS,
  putRecord,
  getRecord,
  listByIndex,
  deleteRecord,
} from './idb-store';

/** Save (insert or update) an ending lock. */
export async function saveEndingLock(lock: EndingLock): Promise<EndingLock> {
  return putRecord<EndingLock>(STORE_ENDING_LOCKS, lock);
}

/** Get a single ending lock by ID. */
export async function getEndingLock(id: string): Promise<EndingLock | undefined> {
  return getRecord<EndingLock>(STORE_ENDING_LOCKS, id);
}

/** List all ending locks for a work (typically 1, but supports drafts). */
export async function listEndingLocksByWork(workId: string): Promise<EndingLock[]> {
  return listByIndex<EndingLock>(STORE_ENDING_LOCKS, 'by_work', workId);
}

/** Get the most recent ending lock for a work, or null. */
export async function getActiveEndingLock(workId: string): Promise<EndingLock | null> {
  const all = await listEndingLocksByWork(workId);
  if (all.length === 0) return null;
  // Sort by created_at desc; first = most recent.
  all.sort((a, b) => (b.created_at < a.created_at ? -1 : 1));
  return all[0] ?? null;
}

/** Delete an ending lock. */
export async function removeEndingLock(id: string): Promise<void> {
  return deleteRecord(STORE_ENDING_LOCKS, id);
}
