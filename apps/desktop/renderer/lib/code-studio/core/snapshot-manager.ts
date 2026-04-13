/**
 * snapshot-manager.ts — File content snapshot for atomic rollback
 *
 * Captures pre-modification state of files so the entire multi-file
 * composition can be reverted if needed.
 */

// ============================================================
// PART 1 — Types
// ============================================================

export interface Snapshot {
  id: string;
  timestamp: number;
  instruction: string;
  files: Map<string, string>; // fileId -> original content
}

// ============================================================
// PART 2 — Manager
// ============================================================

const MAX_SNAPSHOTS = 10;

class SnapshotManagerImpl {
  private snapshots: Snapshot[] = [];

  create(
    fileIds: string[],
    getContent: (id: string) => string | null,
    instruction: string,
  ): Snapshot {
    const files = new Map<string, string>();
    for (const id of fileIds) {
      const content = getContent(id);
      if (content !== null) files.set(id, content);
    }

    const snapshot: Snapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      instruction,
      files,
    };

    this.snapshots.push(snapshot);

    // Prune old snapshots
    while (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  rollback(
    snapshot: Snapshot,
    writeContent: (fileId: string, content: string) => void,
  ): { restoredCount: number } {
    let count = 0;
    for (const [fileId, content] of snapshot.files) {
      writeContent(fileId, content);
      count++;
    }
    return { restoredCount: count };
  }

  getLatest(): Snapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getById(id: string): Snapshot | null {
    return this.snapshots.find((s) => s.id === id) ?? null;
  }

  list(): Array<{ id: string; timestamp: number; instruction: string; fileCount: number }> {
    return this.snapshots.map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      instruction: s.instruction,
      fileCount: s.files.size,
    }));
  }

  prune(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.timestamp > cutoff);
    return before - this.snapshots.length;
  }

  clear(): void {
    this.snapshots = [];
  }
}

export const snapshotManager = new SnapshotManagerImpl();
