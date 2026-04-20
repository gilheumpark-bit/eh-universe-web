// ============================================================
// PART 1 — Tier routing (Spec 5.1 / 7.2)
// ============================================================
//
// IDB primary. 실패 시 LS fallback. LS마저 불가면 memory tier.
// 각 tier는 동일한 append/read 인터페이스 제공.

import { logger } from '@/lib/logger';
import type { JournalEntry } from './types';
import {
  idbAppendEntry,
  idbGetEntriesRange,
  idbGetEntry,
  idbGetTip,
  isIndexedDBAvailable,
} from './indexeddb-adapter';
import {
  isLocalStorageAvailable,
  lsAppendEntry,
  lsCleanupStaleTmp,
  lsGetEntriesRange,
  lsGetEntry,
  lsGetTip,
} from './localstorage-adapter';

export type StorageTier = 'indexeddb' | 'localstorage' | 'memory';

// ============================================================
// PART 2 — Memory fallback (Spec 7.2: all paths failed)
// ============================================================

/** Memory-only tier — 탭 생존 기간만 유지, 새로고침 시 소실. */
const memoryStore = new Map<string, JournalEntry>();
let memoryTip: string | null = null;

function memAppend(entry: JournalEntry): void {
  memoryStore.set(entry.id, entry);
  memoryTip = entry.id;
}
function memGetTip(): string | null { return memoryTip; }
function memGetEntry(id: string): JournalEntry | null { return memoryStore.get(id) ?? null; }
function memList(): JournalEntry[] {
  return Array.from(memoryStore.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** 테스트 전용. */
export function resetMemoryTierForTests(): void {
  memoryStore.clear();
  memoryTip = null;
}

// ============================================================
// PART 3 — Router append (Spec 5.1 tier 순서)
// ============================================================

export interface AppendOutcome {
  tier: StorageTier;
  ok: boolean;
  error?: Error;
}

export interface RouterOptions {
  /** 'indexeddb-only' | 'indexeddb-then-localstorage' (default) | 'memory-only' */
  tier?: 'indexeddb-only' | 'indexeddb-then-localstorage' | 'memory-only';
}

/**
 * append 시도.
 * - idb-only: IDB만 시도, 실패 시 throw.
 * - idb-then-ls (default): IDB 실패 시 LS.
 * - memory-only: 어떤 disk 레이어도 건드리지 않음 (private mode 경고 UX 전용).
 *
 * IDB 실패 후 LS로 fallback했을 때 LS도 실패하면 memory로 마지막 fallback.
 */
export async function routerAppendEntry(
  entry: JournalEntry,
  options: RouterOptions = {},
): Promise<AppendOutcome> {
  const mode = options.tier ?? 'indexeddb-then-localstorage';

  if (mode === 'memory-only') {
    memAppend(entry);
    return { tier: 'memory', ok: true };
  }

  // IDB 시도
  if (isIndexedDBAvailable()) {
    try {
      await idbAppendEntry(entry);
      return { tier: 'indexeddb', ok: true };
    } catch (err) {
      logger.warn('save-engine:router', 'idb append 실패', err);
      if (mode === 'indexeddb-only') {
        return { tier: 'indexeddb', ok: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
      // else fallthrough to LS
    }
  }

  // LS 폴백
  if (isLocalStorageAvailable()) {
    try {
      await lsAppendEntry(entry);
      return { tier: 'localstorage', ok: true };
    } catch (err) {
      logger.warn('save-engine:router', 'ls append 실패', err);
      // 마지막 fallback: memory
      memAppend(entry);
      return { tier: 'memory', ok: true, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  // 모든 disk 레이어 불가 → memory
  memAppend(entry);
  return { tier: 'memory', ok: true };
}

// ============================================================
// PART 4 — Router read (tip / entry / range)
// ============================================================

/**
 * tip 조회. 우선 IDB → LS → memory.
 * 3-tier에 값이 다를 경우 primary(IDB) 우선.
 */
export async function routerGetTip(): Promise<{ tier: StorageTier; tipId: string | null }> {
  if (isIndexedDBAvailable()) {
    try {
      const tip = await idbGetTip();
      if (tip) return { tier: 'indexeddb', tipId: tip };
    } catch (err) {
      logger.warn('save-engine:router', 'idbGetTip 실패', err);
    }
  }
  if (isLocalStorageAvailable()) {
    const tip = lsGetTip();
    if (tip) return { tier: 'localstorage', tipId: tip };
  }
  if (memoryTip) return { tier: 'memory', tipId: memGetTip() };
  return { tier: 'memory', tipId: null };
}

export async function routerGetEntry(id: string): Promise<JournalEntry | null> {
  if (isIndexedDBAvailable()) {
    try {
      const e = await idbGetEntry(id);
      if (e) return e;
    } catch { /* fallthrough */ }
  }
  if (isLocalStorageAvailable()) {
    const e = lsGetEntry(id);
    if (e) return e;
  }
  return memGetEntry(id);
}

export async function routerListEntries(opts?: { fromId?: string; toId?: string }): Promise<{ tier: StorageTier; entries: JournalEntry[] }> {
  if (isIndexedDBAvailable()) {
    try {
      const entries = await idbGetEntriesRange(opts);
      if (entries.length > 0) return { tier: 'indexeddb', entries };
    } catch { /* fallthrough */ }
  }
  if (isLocalStorageAvailable()) {
    const entries = lsGetEntriesRange().filter((e) => {
      if (opts?.fromId && e.id < opts.fromId) return false;
      if (opts?.toId && e.id > opts.toId) return false;
      return true;
    });
    if (entries.length > 0) return { tier: 'localstorage', entries };
  }
  const entries = memList().filter((e) => {
    if (opts?.fromId && e.id < opts.fromId) return false;
    if (opts?.toId && e.id > opts.toId) return false;
    return true;
  });
  return { tier: 'memory', entries };
}

/**
 * 부팅 시 한 번 실행. LS tmp 키 청소.
 */
export function routerBootCleanup(): void {
  try { lsCleanupStaleTmp(); } catch { /* noop */ }
}
