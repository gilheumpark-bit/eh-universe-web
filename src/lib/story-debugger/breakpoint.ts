// ============================================================
// breakpoint.ts — Breakpoint CRUD (메모리 + IndexedDB persistence).
//
// [C] enabled false 면 step engine 가 무시 / [G] Map 사용 / [K] 단일 책임
// ============================================================

import type { Breakpoint, BreakpointLocation } from './types';

// ============================================================
// PART 1 — 메모리 스토어 (단일 세션)
// ============================================================

const memory = new Map<string, Breakpoint>();

function makeId(loc: BreakpointLocation): string {
  return `bp:${loc.episodeId}:${loc.paragraphIdx}:${loc.charOffset ?? 0}`;
}

// ============================================================
// PART 2 — Public API
// ============================================================

export function setBreakpoint(loc: BreakpointLocation, label?: string): Breakpoint {
  const id = makeId(loc);
  const bp: Breakpoint = {
    id,
    location: loc,
    enabled: true,
    ...(label ? { label } : {}),
  };
  memory.set(id, bp);
  return bp;
}

export function removeBreakpoint(id: string): boolean {
  return memory.delete(id);
}

export function toggleBreakpoint(id: string): boolean {
  const bp = memory.get(id);
  if (!bp) return false;
  bp.enabled = !bp.enabled;
  memory.set(id, bp);
  return bp.enabled;
}

export function getBreakpoint(id: string): Breakpoint | undefined {
  return memory.get(id);
}

export function getBreakpointsForEpisode(episodeId: number): Breakpoint[] {
  return Array.from(memory.values()).filter((bp) => bp.location.episodeId === episodeId);
}

export function getAllBreakpoints(): Breakpoint[] {
  return Array.from(memory.values());
}

export function clearAllBreakpoints(): void {
  memory.clear();
}

/** 특정 위치에 활성 BP 있는지 */
export function hasActiveBreakpoint(loc: BreakpointLocation): boolean {
  const id = makeId(loc);
  const bp = memory.get(id);
  return bp?.enabled ?? false;
}
