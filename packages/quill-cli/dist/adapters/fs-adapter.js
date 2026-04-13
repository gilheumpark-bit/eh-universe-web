"use strict";
// ============================================================
// CS Quill 🦔 — File System Adapter
// ============================================================
// 웹의 IndexedDB/localStorage → CLI의 로컬 파일시스템.
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeGet = storeGet;
exports.storeSet = storeSet;
exports.storeDelete = storeDelete;
exports.storeKeys = storeKeys;
exports.readFileTree = readFileTree;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.atomicWriteSync = atomicWriteSync;
exports.createBackup = createBackup;
exports.restoreBackup = restoreBackup;
exports.listBackups = listBackups;
exports.safeReadFile = safeReadFile;
exports.safeWriteFile = safeWriteFile;
exports.safeDeleteFile = safeDeleteFile;
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("../core/config");
// ============================================================
// PART 1 — Key-Value Store (localStorage 대체)
// ============================================================
const STORE_DIR = () => (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'store');
function storeGet(key) {
    const path = (0, path_1.join)(STORE_DIR(), `${key}.json`);
    if (!(0, fs_1.existsSync)(path))
        return null;
    try {
        return (0, fs_1.readFileSync)(path, 'utf-8');
    }
    catch {
        return null;
    }
}
function storeSet(key, value) {
    (0, fs_1.mkdirSync)(STORE_DIR(), { recursive: true });
    (0, fs_1.writeFileSync)((0, path_1.join)(STORE_DIR(), `${key}.json`), value, 'utf-8');
}
function storeDelete(key) {
    const path = (0, path_1.join)(STORE_DIR(), `${key}.json`);
    if ((0, fs_1.existsSync)(path))
        (0, fs_1.unlinkSync)(path);
}
function storeKeys() {
    if (!(0, fs_1.existsSync)(STORE_DIR()))
        return [];
    return (0, fs_1.readdirSync)(STORE_DIR())
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
}
const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs']);
function readFileTree(rootPath, maxDepth = 5) {
    function walk(dir, depth) {
        const name = dir.split('/').pop() ?? dir;
        if (depth > maxDepth)
            return { name, type: 'directory', children: [] };
        const children = [];
        try {
            const entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') || IGNORE.has(entry.name))
                    continue;
                const fullPath = (0, path_1.join)(dir, entry.name);
                if (entry.isDirectory()) {
                    children.push(walk(fullPath, depth + 1));
                }
                else {
                    const node = { name: entry.name, type: 'file' };
                    if (/\.(ts|tsx|js|jsx|json|css|html|md)$/.test(entry.name)) {
                        try {
                            node.content = (0, fs_1.readFileSync)(fullPath, 'utf-8');
                        }
                        catch { /* skip */ }
                    }
                    children.push(node);
                }
            }
        }
        catch { /* skip unreadable */ }
        return { name, type: 'directory', children };
    }
    return walk(rootPath, 0);
}
// IDENTITY_SEAL: PART-2 | role=file-tree | inputs=rootPath | outputs=CLIFileNode
// ============================================================
// PART 3 — AI Response Cache
// ============================================================
const CACHE_DIR = () => (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
function cacheGet(hash) {
    const path = (0, path_1.join)(CACHE_DIR(), `${hash}.json`);
    if (!(0, fs_1.existsSync)(path))
        return null;
    try {
        const data = JSON.parse((0, fs_1.readFileSync)(path, 'utf-8'));
        if (Date.now() - data.timestamp > CACHE_TTL_MS) {
            (0, fs_1.unlinkSync)(path);
            return null;
        }
        return data.response;
    }
    catch {
        return null;
    }
}
function cacheSet(hash, response) {
    if (response.length < 20)
        return; // Skip short/error responses
    (0, fs_1.mkdirSync)(CACHE_DIR(), { recursive: true });
    (0, fs_1.writeFileSync)((0, path_1.join)(CACHE_DIR(), `${hash}.json`), JSON.stringify({ timestamp: Date.now(), response }));
}
// IDENTITY_SEAL: PART-3 | role=ai-cache | inputs=hash,response | outputs=string|null
// ============================================================
// PART 4 — Atomic File Write
// ============================================================
/**
 * Write file atomically: write to temp, verify, then rename.
 * Prevents data corruption if the process crashes mid-write.
 */
function atomicWriteSync(filePath, content, encoding = 'utf-8') {
    const dir = (0, path_1.dirname)(filePath);
    (0, fs_1.mkdirSync)(dir, { recursive: true });
    const tmpPath = filePath + '.tmp.' + process.pid + '.' + Date.now();
    try {
        (0, fs_1.writeFileSync)(tmpPath, content, encoding);
        // Verify written content matches
        const written = (0, fs_1.readFileSync)(tmpPath, encoding);
        if (written.length !== content.length) {
            throw new Error(`Atomic write verification failed: expected ${content.length} chars, got ${written.length}`);
        }
        // Atomic rename
        (0, fs_1.renameSync)(tmpPath, filePath);
    }
    catch (err) {
        // Cleanup temp file on failure
        try {
            if ((0, fs_1.existsSync)(tmpPath))
                (0, fs_1.unlinkSync)(tmpPath);
        }
        catch { /* ignore */ }
        throw err;
    }
}
// IDENTITY_SEAL: PART-4 | role=atomic-write | inputs=filePath,content | outputs=void
// ============================================================
// PART 5 — File Backup Manager
// ============================================================
const BACKUP_DIR = () => (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'backups');
const MAX_BACKUPS_PER_FILE = 5;
/**
 * Create a backup of a file before modifying it.
 * Returns the backup path, or null if backup failed.
 */
function createBackup(filePath) {
    if (!(0, fs_1.existsSync)(filePath))
        return null;
    try {
        const backupDir = BACKUP_DIR();
        (0, fs_1.mkdirSync)(backupDir, { recursive: true });
        // Use a safe filename: replace path separators and colons
        const safeName = filePath.replace(/[\\/]/g, '__').replace(/:/g, '_');
        const timestamp = Date.now();
        const backupPath = (0, path_1.join)(backupDir, `${safeName}.${timestamp}`);
        (0, fs_1.copyFileSync)(filePath, backupPath);
        // Prune old backups for this file (keep only MAX_BACKUPS_PER_FILE)
        pruneBackups(safeName);
        return backupPath;
    }
    catch {
        return null;
    }
}
/**
 * Restore the most recent backup of a file.
 * Returns true if restore succeeded.
 */
function restoreBackup(filePath) {
    const backupDir = BACKUP_DIR();
    if (!(0, fs_1.existsSync)(backupDir))
        return false;
    const safeName = filePath.replace(/[\\/]/g, '__').replace(/:/g, '_');
    try {
        const backups = (0, fs_1.readdirSync)(backupDir)
            .filter(f => f.startsWith(safeName + '.'))
            .sort()
            .reverse();
        if (backups.length === 0)
            return false;
        const latestBackup = (0, path_1.join)(backupDir, backups[0]);
        const dir = (0, path_1.dirname)(filePath);
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        (0, fs_1.copyFileSync)(latestBackup, filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * List available backups for a file.
 */
function listBackups(filePath) {
    const backupDir = BACKUP_DIR();
    if (!(0, fs_1.existsSync)(backupDir))
        return [];
    const safeName = filePath.replace(/[\\/]/g, '__').replace(/:/g, '_');
    try {
        return (0, fs_1.readdirSync)(backupDir)
            .filter(f => f.startsWith(safeName + '.'))
            .sort()
            .reverse()
            .map(f => {
            const fullPath = (0, path_1.join)(backupDir, f);
            const tsMatch = f.match(/\.(\d+)$/);
            const timestamp = tsMatch ? parseInt(tsMatch[1], 10) : 0;
            let size = 0;
            try {
                size = (0, fs_1.statSync)(fullPath).size;
            }
            catch { /* skip */ }
            return { path: fullPath, timestamp, size };
        });
    }
    catch {
        return [];
    }
}
function pruneBackups(safeName) {
    const backupDir = BACKUP_DIR();
    try {
        const backups = (0, fs_1.readdirSync)(backupDir)
            .filter(f => f.startsWith(safeName + '.'))
            .sort();
        while (backups.length > MAX_BACKUPS_PER_FILE) {
            const oldest = backups.shift();
            if (oldest) {
                try {
                    (0, fs_1.unlinkSync)((0, path_1.join)(backupDir, oldest));
                }
                catch { /* ignore */ }
            }
        }
    }
    catch { /* ignore */ }
}
// IDENTITY_SEAL: PART-5 | role=backup-manager | inputs=filePath | outputs=backupPath
// ============================================================
// PART 6 — Safe File Operations (error-wrapped)
// ============================================================
/**
 * Read file safely, returning null on any error.
 */
function safeReadFile(filePath, encoding = 'utf-8') {
    try {
        if (!(0, fs_1.existsSync)(filePath))
            return null;
        return (0, fs_1.readFileSync)(filePath, encoding);
    }
    catch {
        return null;
    }
}
/**
 * Write file safely with optional backup. Returns success status.
 */
function safeWriteFile(filePath, content, opts) {
    const encoding = opts?.encoding ?? 'utf-8';
    try {
        let backupPath;
        if (opts?.backup && (0, fs_1.existsSync)(filePath)) {
            backupPath = createBackup(filePath) ?? undefined;
        }
        if (opts?.atomic) {
            atomicWriteSync(filePath, content, encoding);
        }
        else {
            (0, fs_1.mkdirSync)((0, path_1.dirname)(filePath), { recursive: true });
            (0, fs_1.writeFileSync)(filePath, content, encoding);
        }
        return { success: true, backupPath };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
/**
 * Delete file safely, returning success status.
 */
function safeDeleteFile(filePath) {
    try {
        if (!(0, fs_1.existsSync)(filePath))
            return true;
        (0, fs_1.unlinkSync)(filePath);
        return true;
    }
    catch {
        return false;
    }
}
// IDENTITY_SEAL: PART-6 | role=safe-file-ops | inputs=filePath,content | outputs=result
