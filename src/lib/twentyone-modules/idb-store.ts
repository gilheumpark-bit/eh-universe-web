// ============================================================
// twentyone-modules/idb-store.ts
// — Single IndexedDB connection for the 21-Module Authoring System.
//
// DB: `loreguard_21modules` v1
// Stores (9):
//   1. ending_locks         (M2)
//   2. glossary_entries     (M4)
//   3. timeline_events      (M5)
//   4. info_release_rows    (M6)
//   5. speech_profiles      (M8)
//   6. relation_edges       (M9)
//   7. beats                (M11)
//   8. foreshadow_threads   (M12)
//   9. platform_profiles    (M18 — read-only cache, populated by commercial license loader)
//
// Isolation §1:
//   - Separated from `loreguard_creative_process` DB (Authorship Journal data).
//   - Separated from save-engine IDB (manuscript).
//
// Pattern: mirrors creative-process/idb-store.ts (single cached connection, SSR-safe).
// ============================================================

const DB_NAME = 'loreguard_21modules';
const DB_VERSION = 1;

export const STORE_ENDING_LOCKS = 'ending_locks';
export const STORE_GLOSSARY_ENTRIES = 'glossary_entries';
export const STORE_TIMELINE_EVENTS = 'timeline_events';
export const STORE_INFO_RELEASE_ROWS = 'info_release_rows';
export const STORE_SPEECH_PROFILES = 'speech_profiles';
export const STORE_RELATION_EDGES = 'relation_edges';
export const STORE_BEATS = 'beats';
export const STORE_FORESHADOW_THREADS = 'foreshadow_threads';
export const STORE_PLATFORM_PROFILES = 'platform_profiles';

export type StoreName =
  | typeof STORE_ENDING_LOCKS
  | typeof STORE_GLOSSARY_ENTRIES
  | typeof STORE_TIMELINE_EVENTS
  | typeof STORE_INFO_RELEASE_ROWS
  | typeof STORE_SPEECH_PROFILES
  | typeof STORE_RELATION_EDGES
  | typeof STORE_BEATS
  | typeof STORE_FORESHADOW_THREADS
  | typeof STORE_PLATFORM_PROFILES;

// ============================================================
// PART 2 — Connection cache (SSR-safe)
// ============================================================

let cachedDB: IDBDatabase | null = null;
let cachedPromise: Promise<IDBDatabase> | null = null;

/**
 * Get a connection to the 21-modules DB. First call creates schema.
 */
export function openTwentyOneModulesDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available (SSR)'));
  }

  if (cachedDB) return Promise.resolve(cachedDB);
  if (cachedPromise) return cachedPromise;

  cachedPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // M2 — Ending Locks
      if (!db.objectStoreNames.contains(STORE_ENDING_LOCKS)) {
        const s = db.createObjectStore(STORE_ENDING_LOCKS, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_lock_level', 'lock_level', { unique: false });
      }

      // M4 — Glossary Entries
      if (!db.objectStoreNames.contains(STORE_GLOSSARY_ENTRIES)) {
        const s = db.createObjectStore(STORE_GLOSSARY_ENTRIES, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_status', 'status', { unique: false });
        s.createIndex('by_entity_type', 'entity_type', { unique: false });
      }

      // M5 — Timeline Events
      if (!db.objectStoreNames.contains(STORE_TIMELINE_EVENTS)) {
        const s = db.createObjectStore(STORE_TIMELINE_EVENTS, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_axis', 'timeline_axis', { unique: false });
        s.createIndex('by_status', 'status', { unique: false });
      }

      // M6 — Info Release Rows
      if (!db.objectStoreNames.contains(STORE_INFO_RELEASE_ROWS)) {
        const s = db.createObjectStore(STORE_INFO_RELEASE_ROWS, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_audience_at', 'audience_at', { unique: false });
        s.createIndex('by_lock_level', 'lock_level', { unique: false });
      }

      // M8 — Speech Profiles
      if (!db.objectStoreNames.contains(STORE_SPEECH_PROFILES)) {
        const s = db.createObjectStore(STORE_SPEECH_PROFILES, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_character', 'character_id', { unique: false });
      }

      // M9 — Relation Edges
      if (!db.objectStoreNames.contains(STORE_RELATION_EDGES)) {
        const s = db.createObjectStore(STORE_RELATION_EDGES, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_source', 'source_char', { unique: false });
        s.createIndex('by_edge_type', 'edge_type', { unique: false });
      }

      // M11 — Beats
      if (!db.objectStoreNames.contains(STORE_BEATS)) {
        const s = db.createObjectStore(STORE_BEATS, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_category', 'category', { unique: false });
      }

      // M12 — Foreshadow Threads
      if (!db.objectStoreNames.contains(STORE_FORESHADOW_THREADS)) {
        const s = db.createObjectStore(STORE_FORESHADOW_THREADS, { keyPath: 'id' });
        s.createIndex('by_work', 'work_id', { unique: false });
        s.createIndex('by_status', 'status', { unique: false });
        s.createIndex('by_setup_ep', 'setup_ep', { unique: false });
      }

      // M18 — Platform Profiles (commercial license cache)
      if (!db.objectStoreNames.contains(STORE_PLATFORM_PROFILES)) {
        const s = db.createObjectStore(STORE_PLATFORM_PROFILES, { keyPath: 'platform_id' });
        s.createIndex('by_market', 'market', { unique: false });
      }
    };

    req.onsuccess = () => {
      cachedDB = req.result;
      resolve(req.result);
    };

    req.onerror = () => {
      cachedPromise = null;
      reject(req.error ?? new Error('openTwentyOneModulesDB failed'));
    };

    req.onblocked = () => {
      cachedPromise = null;
      reject(new Error('openTwentyOneModulesDB blocked (other tab open?)'));
    };
  });

  return cachedPromise;
}

// ============================================================
// PART 3 — Store helpers
// ============================================================

export async function getStore(
  name: StoreName,
  mode: IDBTransactionMode = 'readonly',
): Promise<IDBObjectStore> {
  const db = await openTwentyOneModulesDB();
  const tx = db.transaction(name, mode);
  return tx.objectStore(name);
}

export function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDBRequest failed'));
  });
}

// ============================================================
// PART 4 — Generic CRUD helpers (used by all 9 module-specific stores)
// ============================================================

/** Insert or update a record by its keyPath. */
export async function putRecord<T>(storeName: StoreName, record: T): Promise<T> {
  const store = await getStore(storeName, 'readwrite');
  await promisifyRequest(store.put(record as IDBValidKey extends never ? T : T));
  return record;
}

/** Get a record by key. Returns undefined if missing. */
export async function getRecord<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const store = await getStore(storeName, 'readonly');
  const result = await promisifyRequest(store.get(key));
  return result as T | undefined;
}

/** Delete by key. Returns true if existed. */
export async function deleteRecord(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  await promisifyRequest(store.delete(key));
}

/** List records by an index value. */
export async function listByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const store = await getStore(storeName, 'readonly');
  const index = store.index(indexName);
  const out: T[] = [];
  return new Promise((resolve, reject) => {
    const req = index.openCursor(IDBKeyRange.only(value));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        out.push(cursor.value as T);
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error ?? new Error('listByIndex failed'));
  });
}

/** List all records in a store. */
export async function listAll<T>(storeName: StoreName): Promise<T[]> {
  const store = await getStore(storeName, 'readonly');
  return promisifyRequest(store.getAll()) as Promise<T[]>;
}

// ============================================================
// PART 5 — Test utilities
// ============================================================

/** Reset the cached connection — used in tests to swap in fake-indexeddb. */
export function _resetCachedDB(): void {
  if (cachedDB) {
    try { cachedDB.close(); } catch { /* noop */ }
  }
  cachedDB = null;
  cachedPromise = null;
}
