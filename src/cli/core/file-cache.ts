// ============================================================
// CS Quill 🦔 — File Discovery Cache
// ============================================================
// 파일 탐색 결과를 메모리에 캐싱. ���은 세션에서 반복 탐색 방지.

// ============================================================
// PART 1 — Cache
// ============================================================

interface CacheEntry {
  files: Array<{ path: string; relativePath: string; content: string; language: string }>;
  timestamp: number;
  rootPath: string;
}

let _cache: CacheEntry | null = null;
const CACHE_TTL = 10000; // 10초 (watch 모드 고려)

export function getCachedFiles(rootPath: string): CacheEntry['files'] | null {
  if (!_cache) return null;
  if (_cache.rootPath !== rootPath) return null;
  if (Date.now() - _cache.timestamp > CACHE_TTL) { _cache = null; return null; }
  return _cache.files;
}

export function setCachedFiles(rootPath: string, files: CacheEntry['files']): void {
  _cache = { files, timestamp: Date.now(), rootPath };
}

export function invalidateCache(): void {
  _cache = null;
}

// IDENTITY_SEAL: PART-1 | role=file-cache | inputs=rootPath | outputs=files|null
