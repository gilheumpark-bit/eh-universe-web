// ============================================================
// Code Studio — Editor Undo/Redo History
// ============================================================
// 파일 버전 추적, 체크포인트 시스템, 임의 시점 복원.

// ============================================================
// PART 1 — Types & Storage
// ============================================================

export interface HistoryCheckpoint {
  id: string;
  fileId: string;
  content: string;
  timestamp: number;
  label?: string;
}

interface FileHistory {
  checkpoints: HistoryCheckpoint[];
  currentIndex: number;
}

const MAX_CHECKPOINTS = 100;
const histories = new Map<string, FileHistory>();

function getHistory(fileId: string): FileHistory {
  let h = histories.get(fileId);
  if (!h) {
    h = { checkpoints: [], currentIndex: -1 };
    histories.set(fileId, h);
  }
  return h;
}

// IDENTITY_SEAL: PART-1 | role=TypesStorage | inputs=fileId | outputs=FileHistory

// ============================================================
// PART 2 — Checkpoint Operations
// ============================================================

/** Push a new checkpoint (truncates future if mid-history) */
export function pushCheckpoint(fileId: string, content: string, label?: string): void {
  const h = getHistory(fileId);

  // Truncate any future checkpoints beyond current position
  if (h.currentIndex < h.checkpoints.length - 1) {
    h.checkpoints = h.checkpoints.slice(0, h.currentIndex + 1);
  }

  const checkpoint: HistoryCheckpoint = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fileId,
    content,
    timestamp: Date.now(),
    label,
  };

  h.checkpoints.push(checkpoint);
  h.currentIndex = h.checkpoints.length - 1;

  // Trim oldest if over limit
  if (h.checkpoints.length > MAX_CHECKPOINTS) {
    const excess = h.checkpoints.length - MAX_CHECKPOINTS;
    h.checkpoints = h.checkpoints.slice(excess);
    h.currentIndex -= excess;
  }
}

/** Undo: move back one checkpoint */
export function undo(fileId: string): string | null {
  const h = getHistory(fileId);
  if (h.currentIndex <= 0) return null;
  h.currentIndex--;
  return h.checkpoints[h.currentIndex].content;
}

/** Redo: move forward one checkpoint */
export function redo(fileId: string): string | null {
  const h = getHistory(fileId);
  if (h.currentIndex >= h.checkpoints.length - 1) return null;
  h.currentIndex++;
  return h.checkpoints[h.currentIndex].content;
}

/** Rollback to a specific checkpoint by ID */
export function rollbackTo(fileId: string, checkpointId: string): string | null {
  const h = getHistory(fileId);
  const idx = h.checkpoints.findIndex(cp => cp.id === checkpointId);
  if (idx < 0) return null;
  h.currentIndex = idx;
  return h.checkpoints[idx].content;
}

/** Get all checkpoints for a file */
export function getCheckpoints(fileId: string): HistoryCheckpoint[] {
  return getHistory(fileId).checkpoints;
}

/** Get current position info */
export function getHistoryState(fileId: string): { canUndo: boolean; canRedo: boolean; total: number; current: number } {
  const h = getHistory(fileId);
  return {
    canUndo: h.currentIndex > 0,
    canRedo: h.currentIndex < h.checkpoints.length - 1,
    total: h.checkpoints.length,
    current: h.currentIndex,
  };
}

/** Clear history for a file */
export function clearHistory(fileId: string): void {
  histories.delete(fileId);
}

// IDENTITY_SEAL: PART-2 | role=CheckpointOps | inputs=fileId,content | outputs=string|null,HistoryCheckpoint[]
