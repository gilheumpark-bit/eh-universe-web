// ============================================================
// PART 1 — Module Header
// ============================================================
//
// embedding-cache.ts — 화별 임베딩 IndexedDB 캐시.
//
// 현재 plot-drift 는 휴리스틱 (LLM 임베딩 미사용) — Phase 2 에서 DGX
// embedding endpoint 도입 시 본 캐시 필요. 현 시점은 stub + future-proof API.
//
// [C] window 미존재 / IndexedDB 미지원 → 모든 op no-op 반환
// [G] 단일 connection 재사용
// [K] 인터페이스만 — 구현은 placeholder
// ============================================================

const DB_NAME = 'loreguard_long_arc_embeddings';
const STORE = 'embeddings';
const VERSION = 1;

export interface EmbeddingRecord {
  /** episodeId + manuscriptHash 조합 키 */
  cacheKey: string;
  /** 임베딩 벡터 (Float32Array → number[] 직렬화) */
  vector: number[];
  /** 모델 이름 (예: 'qwen36-embed-v1') */
  model: string;
  /** 생성 시각 ISO */
  createdAt: string;
}

// ============================================================
// PART 2 — Connection helper
// ============================================================

function isSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!isSupported()) return resolve(null);
    const req = window.indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'cacheKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

// ============================================================
// PART 3 — API
// ============================================================

export async function putEmbedding(rec: EmbeddingRecord): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.put(rec);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

export async function getEmbedding(cacheKey: string): Promise<EmbeddingRecord | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.get(cacheKey);
    req.onsuccess = () => resolve((req.result as EmbeddingRecord | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function clearCache(): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

export function buildCacheKey(episodeId: number, manuscriptHash: string): string {
  return `${manuscriptHash}:${episodeId}`;
}
