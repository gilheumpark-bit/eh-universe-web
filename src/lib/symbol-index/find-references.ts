// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// Find All References — 코드 IDE 의 Shift+F12 대응.
// Symbol 1개 → 모든 episode 의 등장 위치 list.
//
// [C] symbolId 미존재 시 totalCount 0 반환 (throw X)
// [G] 단일 패스 — 모든 episode 본문 1회 스캔, 결과를 episode 별 그룹
// [K] scanner 재활용 — 중복 패턴 제거
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { SymbolIndex, SymbolReference, FindReferencesResult } from './types';
import { scanTextForSymbols } from './scanner';

// ============================================================
// PART 2 — Public API
// ============================================================

/**
 * Symbol 1개의 모든 등장 위치 추출.
 *
 * @param symbolId 대상 Symbol id (예: `character:char-abc123`)
 * @param episodes 모든 episode 본문
 * @param index buildSymbolIndex 결과
 * @returns FindReferencesResult — symbolName / totalCount / byEpisode / references
 */
export function findReferences(
  symbolId: string,
  episodes: EpisodeManuscript[] | null | undefined,
  index: SymbolIndex,
): FindReferencesResult {
  const symbol = index.definitions.get(symbolId);
  if (!symbol) {
    return {
      symbolId,
      symbolName: symbolId.split(':').pop() ?? symbolId,
      totalCount: 0,
      byEpisode: new Map(),
      references: [],
    };
  }

  if (!episodes || episodes.length === 0) {
    return {
      symbolId,
      symbolName: symbol.name,
      totalCount: 0,
      byEpisode: new Map(),
      references: [],
    };
  }

  // 모든 episode 1회 스캔 후 symbolId 일치 항목만 필터
  const allRefs: SymbolReference[] = [];
  const byEpisode = new Map<number, SymbolReference[]>();

  for (const ep of episodes) {
    if (!ep.content) continue;
    const epRefs = scanTextForSymbols(ep.content, index, ep.episode).filter(
      (r) => r.symbolId === symbolId,
    );
    if (epRefs.length === 0) continue;
    allRefs.push(...epRefs);
    byEpisode.set(ep.episode, epRefs);
  }

  return {
    symbolId,
    symbolName: symbol.name,
    totalCount: allRefs.length,
    byEpisode,
    references: allRefs,
  };
}

// ============================================================
// PART 3 — Hover Quick Info helper
// ============================================================

import type { HoverInfo } from './types';
import type { Character } from '@/lib/studio-types';

/**
 * Symbol hover 시 quick info — 최근 N화 등장 + 총 횟수 + (캐릭터) 말투 시그니처.
 *
 * @param symbolId 대상 Symbol id
 * @param episodes 모든 episode 본문
 * @param index buildSymbolIndex 결과
 * @param characters 캐릭터 풀 (말투 시그니처 lookup)
 * @param recentLimit 최근 화수 N (기본 5)
 */
export function buildHoverInfo(
  symbolId: string,
  episodes: EpisodeManuscript[] | null | undefined,
  index: SymbolIndex,
  characters: Character[] | undefined,
  recentLimit = 5,
): HoverInfo | null {
  const symbol = index.definitions.get(symbolId);
  if (!symbol) return null;

  const refs = findReferences(symbolId, episodes, index);
  const recentEpisodes = Array.from(refs.byEpisode.keys())
    .sort((a, b) => b - a)
    .slice(0, recentLimit);

  let speechSignature: string | undefined;
  if (symbol.kind === 'character' && characters) {
    const charId = symbol.id.replace(/^character:/, '');
    const c = characters.find((ch) => ch.id === charId);
    if (c?.speechStyle) {
      speechSignature = c.speechStyle.slice(0, 80);
    }
  }

  return {
    symbol,
    recentEpisodes,
    totalReferences: refs.totalCount,
    ...(speechSignature ? { speechSignature } : {}),
  };
}
