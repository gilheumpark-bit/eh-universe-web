// ============================================================
// Code Studio — Bidirectional FS Sync (IndexedDB <-> WebContainer)
// ============================================================

import type { FileNode } from '../../code-studio-types';
import { createWebContainer, type WebContainerInstance } from './webcontainer';

// ============================================================
// PART 1 — Types
// ============================================================

export type SyncFileStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface SyncStatus {
  overall: 'idle' | 'syncing' | 'error';
  lastSyncAt: number | null;
  fileStatuses: Map<string, SyncFileStatus>;
  pendingCount: number;
  conflictCount: number;
}

export interface FileDiff {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  source: 'idb' | 'webcontainer';
}

type SyncListener = (status: SyncStatus) => void;

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SyncStatus,FileDiff

// ============================================================
// PART 2 — Managed Path Detection
// ============================================================

const WC_MANAGED_PATTERNS = [
  /^node_modules\//,
  /^\.next\//,
  /^dist\//,
  /^build\//,
  /^\.cache\//,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
];

function isWCManagedPath(path: string): boolean {
  return WC_MANAGED_PATTERNS.some((p) => p.test(path));
}

// IDENTITY_SEAL: PART-2 | role=path detection | inputs=path | outputs=boolean

// ============================================================
// PART 3 — File Tree Helpers
// ============================================================

function flattenTree(
  nodes: FileNode[],
  prefix = '',
): Array<{ path: string; content: string; id: string }> {
  const out: Array<{ path: string; content: string; id: string }> = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file') out.push({ path: p, content: n.content ?? '', id: n.id });
    if (n.children) out.push(...flattenTree(n.children, p));
  }
  return out;
}

// IDENTITY_SEAL: PART-3 | role=tree helpers | inputs=FileNode[] | outputs=flat files

// ============================================================
// PART 4 — FileSyncManager
// ============================================================

export class FileSyncManager {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: SyncListener[] = [];
  private status: SyncStatus = {
    overall: 'idle',
    lastSyncAt: null,
    fileStatuses: new Map(),
    pendingCount: 0,
    conflictCount: 0,
  };
  private container: WebContainerInstance | null = null;

  subscribe(fn: SyncListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.getStatus());
  }

  getStatus(): SyncStatus {
    return { ...this.status, fileStatuses: new Map(this.status.fileStatuses) };
  }

  async syncToContainer(files: FileNode[]): Promise<void> {
    if (!this.container) {
      this.container = await createWebContainer();
    }
    if (!this.container.isAvailable) return;

    this.status.overall = 'syncing';
    this.notify();

    const flat = flattenTree(files);
    for (const f of flat) {
      if (isWCManagedPath(f.path)) continue;
      try {
        await this.container.writeFile(f.path, f.content);
        this.status.fileStatuses.set(f.path, 'synced');
      } catch {
        this.status.fileStatuses.set(f.path, 'error');
      }
    }

    this.status.overall = 'idle';
    this.status.lastSyncAt = Date.now();
    this.status.pendingCount = [...this.status.fileStatuses.values()].filter((s) => s === 'pending').length;
    this.status.conflictCount = [...this.status.fileStatuses.values()].filter((s) => s === 'conflict').length;
    this.notify();
  }

  async readFromContainer(path: string): Promise<string | null> {
    if (!this.container?.isAvailable) return null;
    try {
      return await this.container.readFile(path);
    } catch {
      return null;
    }
  }

  debouncedSync(files: FileNode[], delayMs = 1000): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.syncToContainer(files);
    }, delayMs);
  }

  startPolling(files: FileNode[], intervalMs = 5000): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      void this.syncToContainer(files);
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  detectDiffs(
    idbFiles: FileNode[],
    wcPaths: string[],
  ): FileDiff[] {
    const flat = flattenTree(idbFiles);
    const idbSet = new Set(flat.map((f) => f.path));
    const wcSet = new Set(wcPaths.filter((p) => !isWCManagedPath(p)));
    const diffs: FileDiff[] = [];

    for (const p of idbSet) {
      if (!wcSet.has(p)) diffs.push({ path: p, type: 'added', source: 'idb' });
    }
    for (const p of wcSet) {
      if (!idbSet.has(p)) diffs.push({ path: p, type: 'added', source: 'webcontainer' });
    }

    return diffs;
  }

  dispose(): void {
    this.stopPolling();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.container?.dispose();
    this.container = null;
  }
}

// IDENTITY_SEAL: PART-4 | role=sync manager | inputs=FileNode[],WebContainer | outputs=SyncStatus
