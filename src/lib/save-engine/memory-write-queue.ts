// ============================================================
// PART 1 — Types & In-Memory Queue
// ============================================================

export type MemoryWriteReason = 'critical-quota' | 'write-failed';

export interface MemoryWriteEntry {
  key: string;
  payload: string;
  reason: MemoryWriteReason;
  queuedAt: number;
  bytes: number;
}

const memoryWriteQueue = new Map<string, MemoryWriteEntry>();

// ============================================================
// PART 2 — Queue API
// ============================================================

export function queueMemoryWrite(
  key: string,
  payload: string,
  reason: MemoryWriteReason,
  now = Date.now(),
): MemoryWriteEntry {
  const entry: MemoryWriteEntry = {
    key,
    payload,
    reason,
    queuedAt: now,
    bytes: payload.length * 2,
  };
  memoryWriteQueue.set(key, entry);
  return entry;
}

export function getQueuedMemoryWrite(key: string): MemoryWriteEntry | null {
  return memoryWriteQueue.get(key) ?? null;
}

export function getQueuedMemoryWrites(): MemoryWriteEntry[] {
  return Array.from(memoryWriteQueue.values()).sort((left, right) => left.queuedAt - right.queuedAt);
}

export function clearQueuedMemoryWrite(key: string): boolean {
  return memoryWriteQueue.delete(key);
}

export function resetMemoryWriteQueueForTests(): void {
  memoryWriteQueue.clear();
}
