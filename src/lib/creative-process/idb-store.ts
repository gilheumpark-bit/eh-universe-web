// ============================================================
// IndexedDB Store — 단일 connection (creative_process DB)
// ============================================================
//
// 격리: save-engine 의 IndexedDB 와 분리. 별도 DB (`loreguard_creative_process`).
// event-recorder / source-recorder / report-builder 가 공유.
//
// 사상 정합:
//   - 5차 §2 "장부는 자동 쌓임" — append-only 보장
//   - 8차 §7.1 기록 권력 — 위변조 어려운 IndexedDB 저장
// ============================================================

// ============================================================
// PART 1 — DB 메타
// ============================================================

const DB_NAME = 'loreguard_creative_process';
const DB_VERSION = 1;

export const STORE_EVENTS = 'creative_events';
export const STORE_SOURCES = 'creative_sources';
export const STORE_CERTIFICATES = 'creative_certificates';

export type StoreName =
  | typeof STORE_EVENTS
  | typeof STORE_SOURCES
  | typeof STORE_CERTIFICATES;

// ============================================================
// PART 2 — Connection 캐시
// ============================================================
//
// 단일 연결 재사용. SSR-safe.

let cachedDB: IDBDatabase | null = null;
let cachedPromise: Promise<IDBDatabase> | null = null;

/**
 * IndexedDB 연결 획득.
 * 첫 호출 시 onupgradeneeded 에서 3 store + 인덱스 생성.
 */
export function openCreativeProcessDB(): Promise<IDBDatabase> {
  // [C] SSR 가드
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available (SSR)'));
  }

  if (cachedDB) return Promise.resolve(cachedDB);
  if (cachedPromise) return cachedPromise;

  cachedPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const events = db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
        events.createIndex('by_projectId', 'projectId', { unique: false });
        events.createIndex('by_episodeId', 'episodeId', { unique: false });
        events.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SOURCES)) {
        const sources = db.createObjectStore(STORE_SOURCES, { keyPath: 'id' });
        sources.createIndex('by_projectId', 'projectId', { unique: false });
        sources.createIndex('by_sourceType', 'sourceType', { unique: false });
        sources.createIndex('by_importedAt', 'importedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CERTIFICATES)) {
        const certs = db.createObjectStore(STORE_CERTIFICATES, { keyPath: 'id' });
        certs.createIndex('by_projectId', 'projectId', { unique: false });
        certs.createIndex('by_generatedAt', 'generatedAt', { unique: false });
      }
    };

    req.onsuccess = () => {
      cachedDB = req.result;
      resolve(req.result);
    };

    req.onerror = () => {
      cachedPromise = null;
      reject(req.error ?? new Error('openCreativeProcessDB failed'));
    };

    req.onblocked = () => {
      cachedPromise = null;
      reject(new Error('openCreativeProcessDB blocked (other tab open?)'));
    };
  });

  return cachedPromise;
}

// ============================================================
// PART 3 — Store 헬퍼
// ============================================================

/**
 * Store 트랜잭션 + objectStore 반환.
 *
 * @param name 3 store 중 1
 * @param mode 'readonly' | 'readwrite'
 */
export async function getStore(
  name: StoreName,
  mode: IDBTransactionMode = 'readonly',
): Promise<IDBObjectStore> {
  const db = await openCreativeProcessDB();
  const tx = db.transaction(name, mode);
  return tx.objectStore(name);
}

/**
 * IDBRequest 를 Promise 로 래핑.
 */
export function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDBRequest failed'));
  });
}

/**
 * IDBTransaction 완료 Promise.
 */
export function promisifyTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDBTransaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IDBTransaction aborted'));
  });
}

// ============================================================
// PART 4 — 테스트·디버그용
// ============================================================

/**
 * 연결 캐시 초기화 (테스트에서 fake-indexeddb 갈아끼울 때).
 */
export function _resetCachedDB(): void {
  if (cachedDB) {
    try { cachedDB.close(); } catch { /* noop */ }
  }
  cachedDB = null;
  cachedPromise = null;
}
