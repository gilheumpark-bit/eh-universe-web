// ============================================================
// PART 1 — Types
// ============================================================

export interface FileSnapshot {
  path: string;
  content: string;
}

export interface Snapshot {
  id: string;
  name: string;
  files: FileSnapshot[];
  createdAt: number;
  lastAccessedAt: number;
  agentRole?: string;
  sessionId?: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  lineNumber: number;
  content: string;
}

export interface SnapshotDiff {
  path: string;
  added: number;
  removed: number;
  hunks: DiffLine[];
}

export interface SnapshotManagerConfig {
  maxSnapshots: number;
  dbName: string;
  storeName: string;
}

// ============================================================
// PART 2 — LCS Diff Engine
// ============================================================

/**
 * Build the LCS length table for two arrays of lines.
 * matrix[i][j] = LCS length of a[0..i-1] and b[0..j-1].
 */
function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const matrix: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
}

/**
 * Backtrack through the LCS matrix to produce a list of DiffLine entries.
 */
function backtrackDiff(
  matrix: number[][],
  a: string[],
  b: string[],
): DiffLine[] {
  const result: DiffLine[] = [];
  let i = a.length;
  let j = b.length;
  let lineNum = Math.max(a.length, b.length);

  // Collect in reverse, then flip
  const reversed: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      reversed.push({ type: 'unchanged', lineNumber: lineNum--, content: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      reversed.push({ type: 'added', lineNumber: lineNum--, content: b[j - 1] });
      j--;
    } else {
      reversed.push({ type: 'removed', lineNumber: lineNum--, content: a[i - 1] });
      i--;
    }
  }

  // Reverse and re-number sequentially
  reversed.reverse();
  for (let idx = 0; idx < reversed.length; idx++) {
    result.push({ ...reversed[idx], lineNumber: idx + 1 });
  }

  return result;
}

/**
 * Public helper: split content by newlines and compute a line-level diff.
 */
export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const a = oldContent.split('\n');
  const b = newContent.split('\n');
  const matrix = lcsMatrix(a, b);
  return backtrackDiff(matrix, a, b);
}

// ============================================================
// PART 3 — IndexedDB Persistence
// ============================================================

const DB_VERSION = 1;

function openDB(config: SnapshotManagerConfig): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(config.dbName, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(config.storeName)) {
        db.createObjectStore(config.storeName, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function idbPut(
  db: IDBDatabase,
  storeName: string,
  snapshot: Snapshot,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(snapshot);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('idbPut failed'));
  });
}

function idbGet(
  db: IDBDatabase,
  storeName: string,
  id: string,
): Promise<Snapshot | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as Snapshot | undefined);
    req.onerror = () => reject(req.error ?? new Error('idbGet failed'));
  });
}

function idbGetAll(
  db: IDBDatabase,
  storeName: string,
): Promise<Snapshot[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as Snapshot[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error('idbGetAll failed'));
  });
}

function idbDelete(
  db: IDBDatabase,
  storeName: string,
  id: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('idbDelete failed'));
  });
}

function idbCount(
  db: IDBDatabase,
  storeName: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idbCount failed'));
  });
}

// ============================================================
// PART 4 — SnapshotManager Class
// ============================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const DEFAULT_CONFIG: SnapshotManagerConfig = {
  maxSnapshots: 50,
  dbName: 'noa-snapshots',
  storeName: 'snapshots',
};

export class SnapshotManager {
  private config: SnapshotManagerConfig;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(config?: Partial<SnapshotManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise === null) {
      this.dbPromise = openDB(this.config);
    }
    return this.dbPromise;
  }

  /**
   * Evict least-recently-accessed snapshots when count exceeds maxSnapshots.
   */
  private async evictLRU(db: IDBDatabase): Promise<void> {
    const count = await idbCount(db, this.config.storeName);
    if (count <= this.config.maxSnapshots) return;

    const all = await idbGetAll(db, this.config.storeName);
    // Sort by lastAccessedAt ascending (oldest access first)
    all.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

    const toRemove = count - this.config.maxSnapshots;
    for (let i = 0; i < toRemove && i < all.length; i++) {
      await idbDelete(db, this.config.storeName, all[i].id);
    }
  }

  /**
   * Create a snapshot from current file state.
   * Auto-evicts LRU if over maxSnapshots.
   */
  async createSnapshot(
    name: string,
    files: Record<string, string>,
    meta?: { agentRole?: string; sessionId?: string },
  ): Promise<Snapshot> {
    const db = await this.getDB();
    const now = Date.now();

    const fileSnapshots: FileSnapshot[] = Object.entries(files).map(
      ([path, content]) => ({ path, content }),
    );

    const snapshot: Snapshot = {
      id: generateId(),
      name,
      files: fileSnapshots,
      createdAt: now,
      lastAccessedAt: now,
      agentRole: meta?.agentRole,
      sessionId: meta?.sessionId,
    };

    await idbPut(db, this.config.storeName, snapshot);
    await this.evictLRU(db);

    return snapshot;
  }

  /**
   * Get a snapshot by ID. Updates lastAccessedAt on access.
   */
  async getSnapshot(id: string): Promise<Snapshot | null> {
    const db = await this.getDB();
    const snapshot = await idbGet(db, this.config.storeName, id);
    if (snapshot == null) return null;

    // Touch lastAccessedAt
    snapshot.lastAccessedAt = Date.now();
    await idbPut(db, this.config.storeName, snapshot);

    return snapshot;
  }

  /**
   * List all snapshots, sorted by createdAt descending (newest first).
   */
  async listSnapshots(): Promise<Snapshot[]> {
    const db = await this.getDB();
    const all = await idbGetAll(db, this.config.storeName);
    all.sort((a, b) => b.createdAt - a.createdAt);
    return all;
  }

  /**
   * Delete a snapshot by ID.
   */
  async deleteSnapshot(id: string): Promise<void> {
    const db = await this.getDB();
    await idbDelete(db, this.config.storeName, id);
  }

  /**
   * Compute diff between a snapshot's files and current file state.
   * Returns a SnapshotDiff per file (union of snapshot paths and current paths).
   */
  async diff(
    snapshotId: string,
    currentFiles: Record<string, string>,
  ): Promise<SnapshotDiff[]> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (snapshot === null) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const oldMap = new Map<string, string>();
    for (const f of snapshot.files) {
      oldMap.set(f.path, f.content);
    }

    // Collect all paths from both sides
    const allPaths = new Set<string>(
      Array.from(oldMap.keys()).concat(Object.keys(currentFiles)),
    );

    const diffs: SnapshotDiff[] = [];

    for (const path of Array.from(allPaths)) {
      const oldContent = oldMap.get(path) ?? '';
      const newContent = currentFiles[path] ?? '';

      if (oldContent === newContent) continue;

      const hunks = computeDiff(oldContent, newContent);

      let added = 0;
      let removed = 0;
      for (const h of hunks) {
        if (h.type === 'added') added++;
        if (h.type === 'removed') removed++;
      }

      diffs.push({ path, added, removed, hunks });
    }

    return diffs;
  }

  /**
   * Rollback: returns the file map from the specified snapshot.
   * The caller is responsible for applying these files to the editor state.
   */
  async rollback(snapshotId: string): Promise<Record<string, string>> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (snapshot === null) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const fileMap: Record<string, string> = {};
    for (const f of snapshot.files) {
      fileMap[f.path] = f.content;
    }

    return fileMap;
  }

  /**
   * Export a snapshot as a JSON string for download/transfer.
   */
  async exportSnapshot(id: string): Promise<string> {
    const snapshot = await this.getSnapshot(id);
    if (snapshot === null) {
      throw new Error(`Snapshot not found: ${id}`);
    }

    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Import a snapshot from a JSON string. Assigns a new ID and timestamps.
   */
  async importSnapshot(json: string): Promise<Snapshot> {
    let parsed: Snapshot;
    try {
      parsed = JSON.parse(json) as Snapshot;
    } catch {
      throw new Error('Invalid snapshot JSON');
    }

    // Validate minimum required fields
    if (!Array.isArray(parsed.files) || typeof parsed.name !== 'string') {
      throw new Error('Malformed snapshot: missing "files" array or "name" string');
    }

    const db = await this.getDB();
    const now = Date.now();

    const snapshot: Snapshot = {
      id: generateId(),
      name: parsed.name,
      files: parsed.files,
      createdAt: now,
      lastAccessedAt: now,
      agentRole: parsed.agentRole,
      sessionId: parsed.sessionId,
    };

    await idbPut(db, this.config.storeName, snapshot);
    await this.evictLRU(db);

    return snapshot;
  }
}

// ============================================================
// PART 5 — Default Singleton Export
// ============================================================

export const snapshotManager = new SnapshotManager();

// IDENTITY_SEAL: snapshot-manager | role=file-snapshot-persistence | inputs=files,meta | outputs=Snapshot,SnapshotDiff
