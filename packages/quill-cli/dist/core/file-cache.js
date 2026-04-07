"use strict";
// ============================================================
// CS Quill 🦔 — File Discovery Cache (LRU + fs.watch)
// ============================================================
// LRU 기반 캐싱 + 파일 변경 감지로 자동 무효화.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedFiles = getCachedFiles;
exports.setCachedFiles = setCachedFiles;
exports.invalidateCache = invalidateCache;
exports.getCacheStats = getCacheStats;
exports.watchAndInvalidate = watchAndInvalidate;
exports.unwatchPath = unwatchPath;
exports.unwatchAll = unwatchAll;
exports.getOrScanFiles = getOrScanFiles;
const fs_1 = require("fs");
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CachedFile,LRUEntry
// ============================================================
// PART 2 — LRU Cache
// ============================================================
const MAX_ENTRIES = 32;
const MAX_MEMORY_MB = 64;
const DEFAULT_TTL = 60_000; // 1분
const _lru = new Map();
let _totalSize = 0;
function estimateSize(files) {
    return files.reduce((sum, f) => sum + f.content.length * 2, 0); // UTF-16 approx
}
function evictLRU() {
    while (_lru.size > MAX_ENTRIES || _totalSize > MAX_MEMORY_MB * 1024 * 1024) {
        const oldest = _lru.keys().next();
        if (oldest.done)
            break;
        const entry = _lru.get(oldest.value);
        if (entry)
            _totalSize -= entry.size;
        _lru.delete(oldest.value);
    }
}
function getCachedFiles(rootPath, ttl = DEFAULT_TTL) {
    const entry = _lru.get(rootPath);
    if (!entry)
        return null;
    if (Date.now() - entry.timestamp > ttl) {
        _totalSize -= entry.size;
        _lru.delete(rootPath);
        return null;
    }
    // Move to end (most recently used)
    _lru.delete(rootPath);
    _lru.set(rootPath, entry);
    return entry.files;
}
function setCachedFiles(rootPath, files) {
    const existing = _lru.get(rootPath);
    if (existing)
        _totalSize -= existing.size;
    const size = estimateSize(files);
    _lru.delete(rootPath); // Remove for re-insertion at end
    _lru.set(rootPath, { key: rootPath, files, timestamp: Date.now(), size });
    _totalSize += size;
    evictLRU();
}
function invalidateCache(rootPath) {
    if (rootPath) {
        const entry = _lru.get(rootPath);
        if (entry)
            _totalSize -= entry.size;
        _lru.delete(rootPath);
    }
    else {
        _lru.clear();
        _totalSize = 0;
    }
}
function getCacheStats() {
    return {
        entries: _lru.size,
        totalSizeMB: Math.round(_totalSize / 1024 / 1024 * 100) / 100,
        keys: [..._lru.keys()],
    };
}
// IDENTITY_SEAL: PART-2 | role=lru-cache | inputs=rootPath,files | outputs=CachedFile[]|null
// ============================================================
// PART 3 — File Watcher (Auto-Invalidation)
// ============================================================
const _watchers = new Map();
const _debounceTimers = new Map();
function watchAndInvalidate(rootPath) {
    if (_watchers.has(rootPath))
        return;
    try {
        const watcher = (0, fs_1.watch)(rootPath, { recursive: true }, (_event, filename) => {
            if (!filename)
                return;
            // Skip node_modules, .git, .next
            if (/node_modules|\.git|\.next|dist/.test(filename))
                return;
            // Skip non-code files
            if (!/\.(ts|tsx|js|jsx|json|css|html|vue|svelte)$/.test(filename))
                return;
            // Debounce: invalidate after 300ms of quiet
            const existing = _debounceTimers.get(rootPath);
            if (existing)
                clearTimeout(existing);
            _debounceTimers.set(rootPath, setTimeout(() => {
                invalidateCache(rootPath);
                _debounceTimers.delete(rootPath);
            }, 300));
        });
        watcher.on('error', () => {
            unwatchPath(rootPath);
        });
        _watchers.set(rootPath, watcher);
    }
    catch {
        // fs.watch not supported or permission denied — silently skip
    }
}
function unwatchPath(rootPath) {
    const watcher = _watchers.get(rootPath);
    if (watcher) {
        watcher.close();
        _watchers.delete(rootPath);
    }
    const timer = _debounceTimers.get(rootPath);
    if (timer) {
        clearTimeout(timer);
        _debounceTimers.delete(rootPath);
    }
}
function unwatchAll() {
    for (const [path] of _watchers) {
        unwatchPath(path);
    }
}
// IDENTITY_SEAL: PART-3 | role=file-watcher | inputs=rootPath | outputs=void
// ============================================================
// PART 4 — Convenience: get-or-scan with auto-watch
// ============================================================
async function getOrScanFiles(rootPath, scanner, opts) {
    const cached = getCachedFiles(rootPath, opts?.ttl);
    if (cached)
        return cached;
    const files = await scanner(rootPath);
    setCachedFiles(rootPath, files);
    if (opts?.autoWatch !== false) {
        watchAndInvalidate(rootPath);
    }
    return files;
}
// IDENTITY_SEAL: PART-4 | role=get-or-scan | inputs=rootPath,scanner | outputs=CachedFile[]
