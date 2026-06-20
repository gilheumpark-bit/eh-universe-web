// ============================================================
// store.ts — Meta-Context localStorage + memory store.
// ============================================================

import type { MetaDefinition, MetaSnapshot, MetaConflict } from './types';

const STORAGE_KEY = 'loreguard_meta_context_v1';
const MAX_DEFINITIONS = 200; // FIFO cap

function load(): MetaDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MetaDefinition[];
  } catch {
    return [];
  }
}

function save(defs: MetaDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    const limited = defs.slice(-MAX_DEFINITIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch {
    // [C] storage quota — silent
  }
}

export function appendDefinitions(newDefs: MetaDefinition[]): MetaSnapshot {
  if (newDefs.length === 0) return getSnapshot();
  const all = [...load(), ...newDefs];
  save(all);
  return getSnapshot();
}

export function getSnapshot(): MetaSnapshot {
  const all = load();

  // 최신 우선 — 같은 key 면 늦게 등록된 것이 current
  const current: Record<string, MetaDefinition> = {};
  const conflicts: MetaConflict[] = [];
  const sorted = [...all].sort((a, b) => a.timestamp - b.timestamp);

  for (const def of sorted) {
    const k = `${def.kind}:${def.key}`;
    const existing = current[k];
    if (existing && existing.value !== def.value) {
      conflicts.push({
        key: k,
        oldValue: existing.value,
        newValue: def.value,
        oldTurnIdx: existing.turnIdx,
        newTurnIdx: def.turnIdx,
      });
    }
    current[k] = def;
  }

  return { definitions: all, current, conflicts };
}

export function clearMetaContext(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
