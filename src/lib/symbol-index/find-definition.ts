// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// Go to Definition — 코드 IDE 의 F12 대응.
// Symbol 1개 → SymbolDefinition + UI 점프 좌표 반환.
//
// [C] 미존재 ID → { found: false } (throw X)
// [G] Map.get O(1)
// [K] 단순 lookup — 추가 가공 없음
// ============================================================

import type { SymbolIndex, FindDefinitionResult } from './types';

/**
 * Symbol id → 정의 lookup. UI 측에서 jumpTarget 으로 라우팅.
 */
export function findDefinition(symbolId: string, index: SymbolIndex): FindDefinitionResult {
  const symbol = index.definitions.get(symbolId);
  if (!symbol) return { found: false };
  return { found: true, symbol };
}

// ============================================================
// PART 2 — Surface form lookup
// ============================================================

/**
 * 표면형 → SymbolDefinition lookup.
 * 본문 hover / 더블클릭 → "이 단어의 정의로 점프" 시 사용.
 */
export function findDefinitionBySurface(
  surface: string,
  index: SymbolIndex,
): FindDefinitionResult {
  const symbolId = index.surfaceMap.get(surface.trim());
  if (!symbolId) return { found: false };
  return findDefinition(symbolId, index);
}
