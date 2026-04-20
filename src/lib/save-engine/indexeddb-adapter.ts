// ============================================================
// PART 1 — Imports & constants (Spec 12.11 — store 구성)
// ============================================================
//
// IndexedDB 네이티브 래퍼. Dexie 미채택(Spec 12.10 — 번들 절약).
// DB 이름 noa_journal_v1 — 기존 noa_backup과 분리.
// 5 stores: journal, snapshots, journal_meta, journal_quarantine, sync_queue.

import { logger } from '@/lib/logger';
import type { JournalEntry } from './types';

export const DB_NAME = 'noa_journal_v1';
export const DB_VERSION = 1;

export const STORE_JOURNAL = 'journal';
export const STORE_SNAPSHOTS = 'snapshots';
export const STORE_META = 'journal_meta';
export const STORE_QUARANTINE = 'journal_quarantine';
export const STORE_SYNC = 'sync_queue';

export const META_KEY_TIP = 'tip';
export const META_KEY_SCHEMA = 'schemaVersion';
export const META_KEY_HEARTBEAT = 'lastHeartbeat';

// ============================================================
// PART 2 — Availability detection (Spec 5.1.3 fallback 트리거)
// ============================================================

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch (err) {
    logger.warn('save-engine:idb', 'isIndexedDBAvailable threw', err);
    return false;
  }
}

// ============================================================
// PART 3 — DB open & upgrade (Spec 12.11 인덱스 구성)
// ============================================================

/** 단일 DB 인스턴스 캐시. close() 시 null로 복귀. */
let cachedDb: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase | null> | null = null;

/**
 * DB open. 첫 호출 시 upgradeneeded에서 5 stores 생성.
 * 실패 시 null 반환(예: Firefox private mode에서 indexedDB.open이 에러).
 */
export async function openJournalDB(): Promise<IDBDatabase | null> {
  if (cachedDb) return cachedDb;
  if (openPromise) return openPromise;
  if (!isIndexedDBAvailable()) return null;

  openPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_JOURNAL)) {
          const journal = db.createObjectStore(STORE_JOURNAL, { keyPath: 'id' });
          journal.createIndex('by-projectId', 'projectId', { unique: false });
          journal.createIndex('by-type', 'entryType', { unique: false });
          journal.createIndex('by-clock', 'clock.physical', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snap = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
          snap.createIndex('by-entryId', 'payload.coversUpToEntryId', { unique: false });
          snap.createIndex('by-protected', 'meta.protected', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_QUARANTINE)) {
          db.createObjectStore(STORE_QUARANTINE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC)) {
          db.createObjectStore(STORE_SYNC, { keyPath: 'id' });
        }
      };

      req.onsuccess = () => {
        cachedDb = req.result;
        // 사용자가 다른 탭에서 version 변경을 요청하면 close 해야 함
        cachedDb.onversionchange = () => {
          cachedDb?.close();
          cachedDb = null;
        };
        resolve(cachedDb);
      };
      req.onerror = () => {
        logger.warn('save-engine:idb', 'open request.onerror', req.error);
        resolve(null);
      };
      req.onblocked = () => {
        logger.warn('save-engine:idb', 'open request blocked (다른 탭이 구버전 DB 잡고 있음)');
      };
    } catch (err) {
      logger.warn('save-engine:idb', 'open threw synchronously', err);
      resolve(null);
    }
  });

  const result = await openPromise;
  openPromise = null;
  return result;
}

/** 테스트 전용 — 캐시된 DB 닫고 다음 open 시 신규 인스턴스 생성. */
export function resetDbForTests(): void {
  if (cachedDb) {
    try { cachedDb.close(); } catch { /* noop */ }
  }
  cachedDb = null;
  openPromise = null;
}

// ============================================================
// PART 4 — Transaction helpers (Spec 5.1.1)
// ============================================================

/**
 * durability: 'strict' 옵션 지원 여부 감지. Chrome 82+, Safari 17+.
 * 미지원 브라우저는 옵션 무시하고 default(relaxed)로 동작.
 */
function makeTx(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
): IDBTransaction {
  try {
    return db.transaction(stores, mode, { durability: 'strict' } as IDBTransactionOptions);
  } catch {
    return db.transaction(stores, mode);
  }
}

/** Promise 래퍼 — tx.oncomplete/onerror/onabort. tx 내 put은 동기 호출. */
export function runTx<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = makeTx(db, stores, mode);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    let result: T;
    try {
      result = work(tx);
    } catch (err) {
      try { tx.abort(); } catch { /* already aborted */ }
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('idb tx error'));
    tx.onabort = () => reject(tx.error ?? new Error('idb tx aborted'));
  });
}

// ============================================================
// PART 5 — Journal append (Spec 5.1.1 + 6)
// ============================================================

/**
 * 엔트리 append + tip 갱신 — 단일 트랜잭션.
 * 실패 시 tx 자동 rollback (부분 write 없음).
 */
export async function idbAppendEntry(entry: JournalEntry): Promise<void> {
  const db = await openJournalDB();
  if (!db) throw new Error('IndexedDB unavailable');

  await runTx(db, [STORE_JOURNAL, STORE_META], 'readwrite', (tx) => {
    const journal = tx.objectStore(STORE_JOURNAL);
    journal.put(entry);
    const meta = tx.objectStore(STORE_META);
    meta.put({ key: META_KEY_TIP, value: entry.id, updatedAt: Date.now() });
  });
}

export async function idbGetTip(): Promise<string | null> {
  const db = await openJournalDB();
  if (!db) return null;
  return runTx(db, [STORE_META], 'readonly', (tx) => {
    const store = tx.objectStore(STORE_META);
    const req = store.get(META_KEY_TIP);
    return new Promise<string | null>((resolve) => {
      req.onsuccess = () => resolve((req.result?.value as string) ?? null);
      req.onerror = () => resolve(null);
    });
  }).then((p) => p as unknown as Promise<string | null>).then((v) => v);
}

/**
 * id로 엔트리 조회.
 */
export async function idbGetEntry(id: string): Promise<JournalEntry | null> {
  const db = await openJournalDB();
  if (!db) return null;
  return new Promise<JournalEntry | null>((resolve) => {
    try {
      const tx = makeTx(db, [STORE_JOURNAL], 'readonly');
      const req = tx.objectStore(STORE_JOURNAL).get(id);
      req.onsuccess = () => resolve((req.result as JournalEntry) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * id 오름차순 전수 조회. fromId(포함)부터 toId(포함)까지.
 * 둘 다 생략 시 전수.
 */
export async function idbGetEntriesRange(opts?: { fromId?: string; toId?: string }): Promise<JournalEntry[]> {
  const db = await openJournalDB();
  if (!db) return [];

  const range: IDBKeyRange | null = (() => {
    if (opts?.fromId && opts?.toId) return IDBKeyRange.bound(opts.fromId, opts.toId, false, false);
    if (opts?.fromId) return IDBKeyRange.lowerBound(opts.fromId, false);
    if (opts?.toId) return IDBKeyRange.upperBound(opts.toId, false);
    return null;
  })();

  return new Promise<JournalEntry[]>((resolve) => {
    const out: JournalEntry[] = [];
    try {
      const tx = makeTx(db, [STORE_JOURNAL], 'readonly');
      const store = tx.objectStore(STORE_JOURNAL);
      const req = range ? store.openCursor(range) : store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          out.push(cursor.value as JournalEntry);
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

// ============================================================
// PART 6 — Snapshot + meta + quarantine
// ============================================================

export interface SnapshotRecord {
  id: string;
  payload: import('./types').SnapshotPayload;
  meta: { protected: boolean; createdAt: number };
}

export async function idbPutSnapshot(snap: SnapshotRecord): Promise<void> {
  const db = await openJournalDB();
  if (!db) throw new Error('IndexedDB unavailable');
  await runTx(db, [STORE_SNAPSHOTS], 'readwrite', (tx) => {
    tx.objectStore(STORE_SNAPSHOTS).put(snap);
  });
}

export async function idbListSnapshots(): Promise<SnapshotRecord[]> {
  const db = await openJournalDB();
  if (!db) return [];
  return new Promise<SnapshotRecord[]>((resolve) => {
    const out: SnapshotRecord[] = [];
    try {
      const tx = makeTx(db, [STORE_SNAPSHOTS], 'readonly');
      const req = tx.objectStore(STORE_SNAPSHOTS).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          out.push(cursor.value as SnapshotRecord);
          cursor.continue();
        } else resolve(out);
      };
      req.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

export async function idbDeleteSnapshot(id: string): Promise<void> {
  const db = await openJournalDB();
  if (!db) return;
  await runTx(db, [STORE_SNAPSHOTS], 'readwrite', (tx) => {
    tx.objectStore(STORE_SNAPSHOTS).delete(id);
  });
}

export async function idbSetMeta(key: string, value: unknown): Promise<void> {
  const db = await openJournalDB();
  if (!db) throw new Error('IndexedDB unavailable');
  await runTx(db, [STORE_META], 'readwrite', (tx) => {
    tx.objectStore(STORE_META).put({ key, value, updatedAt: Date.now() });
  });
}

export async function idbGetMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await openJournalDB();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    try {
      const tx = makeTx(db, [STORE_META], 'readonly');
      const req = tx.objectStore(STORE_META).get(key);
      req.onsuccess = () => resolve((req.result?.value as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbQuarantineEntry(entry: JournalEntry, reason: string): Promise<void> {
  const db = await openJournalDB();
  if (!db) throw new Error('IndexedDB unavailable');
  await runTx(db, [STORE_QUARANTINE], 'readwrite', (tx) => {
    tx.objectStore(STORE_QUARANTINE).put({ ...entry, _quarantineReason: reason, _quarantinedAt: Date.now() });
  });
}

export async function idbListQuarantined(): Promise<JournalEntry[]> {
  const db = await openJournalDB();
  if (!db) return [];
  return new Promise<JournalEntry[]>((resolve) => {
    const out: JournalEntry[] = [];
    try {
      const tx = makeTx(db, [STORE_QUARANTINE], 'readonly');
      const req = tx.objectStore(STORE_QUARANTINE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) { out.push(cursor.value as JournalEntry); cursor.continue(); }
        else resolve(out);
      };
      req.onerror = () => resolve(out);
    } catch { resolve(out); }
  });
}
