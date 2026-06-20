// ============================================================
// IndexedDB Storage Layer — localStorage 한계 돌파
// ============================================================
// localStorage: ~5MB / IndexedDB: 디스크의 50%+
// 번역 메모리, 프로젝트, 세그먼트, 대용량 데이터 저장

const DB_NAME = 'eh-universe';
const DB_VERSION = 1;

// ── Store Names ──
export const STORES = {
  TM: 'translation-memory',
  SEGMENTS: 'translation-segments',
  PROJECTS: 'projects',
  MANUSCRIPTS: 'manuscripts',
  GLOSSARY: 'glossary',
  SETTINGS: 'settings',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// ── DB Instance ──
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          // TM에 언어 인덱스
          if (name === STORES.TM) {
            store.createIndex('by-target-lang', 'targetLang', { unique: false });
            store.createIndex('by-source', 'source', { unique: false });
          }
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// ── Generic CRUD ──

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbCount(store: StoreName): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(store: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 배치 삽입 (트랜잭션 1회) */
export async function idbPutBatch<T extends { id: string }>(store: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const item of items) os.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 인덱스 기반 검색 (TM 용) */
export async function idbGetByIndex<T>(
  store: StoreName,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const index = tx.objectStore(store).index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

/** DB 전체 크기 추정 (bytes) */
export async function idbEstimateSize(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage || 0, quota: est.quota || 0 };
  }
  return { usage: 0, quota: 0 };
}

/** localStorage → IndexedDB 마이그레이션 헬퍼 */
export async function migrateFromLocalStorage(
  localKey: string,
  store: StoreName,
  transform: (raw: string) => Array<{ id: string; [k: string]: unknown }>,
): Promise<number> {
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return 0;
    const items = transform(raw);
    await idbPutBatch(store, items as Array<{ id: string }>);
    localStorage.removeItem(localKey);
    return items.length;
  } catch {
    return 0;
  }
}
