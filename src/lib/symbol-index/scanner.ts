// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// Symbol Scanner — 본문 텍스트 → SymbolReference[] 추출.
//
// 코드 IDE 의 토큰 스캐너 대응. Aho-Corasick 풀빌드는 과도하므로
// surfaceMap.size 가 작은 경우(≤500) regex alternation 으로 처리 — 작품 단위
// Symbol 수 통계상 충분 (캐릭터 20 + 아이템 50 + 스킬 30 + 월드 100 = 200 미만 표면형).
//
// [C] 빈 텍스트 / 빈 surfaceMap → 빈 array 반환
// [G] 단일 패스 regex.exec — O(text length × |surfaces|) 회피용 alternation
// [K] 정규식 escape 안전, 한글/일어/한자 word boundary 별도 처리 필요 X
// ============================================================

import type { SymbolIndex, SymbolReference } from './types';

// ============================================================
// PART 2 — Regex helpers
// ============================================================

/** RegExp metacharacters escape — 예: "(주인공)" → "\\(주인공\\)" */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * surfaceMap → 단일 alternation regex 빌드.
 * 길이 내림차순 정렬해 가장 긴 매치 우선 (예: "김준호" > "김준").
 */
function buildAlternationRegex(surfaceMap: Map<string, string>): RegExp | null {
  if (surfaceMap.size === 0) return null;
  const surfaces = Array.from(surfaceMap.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  const pattern = `(${surfaces.join('|')})`;
  // global + multiline. 한글/한자/일어는 word boundary 안전 — Latin 만 \b 의미
  return new RegExp(pattern, 'g');
}

// ============================================================
// PART 3 — Public: scanTextForSymbols
// ============================================================

/**
 * 본문 텍스트에서 Symbol 등장 위치 모두 추출.
 *
 * @param text 본문 (해당 episode 의 content 권장)
 * @param index buildSymbolIndex 결과
 * @param episodeId 결과의 episodeId 필드용
 * @param sceneId 선택 — 씬시트 매핑 시 채움
 * @returns SymbolReference[]
 */
export function scanTextForSymbols(
  text: string | null | undefined,
  index: SymbolIndex,
  episodeId: number,
  sceneId?: string,
): SymbolReference[] {
  if (!text || text.length === 0) return [];
  if (index.surfaceMap.size === 0) return [];

  const re = buildAlternationRegex(index.surfaceMap);
  if (!re) return [];

  const refs: SymbolReference[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const surface = match[1];
    const symbolId = index.surfaceMap.get(surface);
    if (!symbolId) continue; // 방어 (정상 동작에선 불가능)
    const charOffset = match.index;
    const ctxStart = Math.max(0, charOffset - 50);
    const ctxEnd = Math.min(text.length, charOffset + surface.length + 50);
    const context = text.slice(ctxStart, ctxEnd).replace(/\n/g, ' ');
    refs.push({
      symbolId,
      episodeId,
      ...(sceneId ? { sceneId } : {}),
      charOffset,
      surfaceForm: surface,
      context,
    });
  }
  return refs;
}

// ============================================================
// PART 4 — Bulk scan helper (모든 episode)
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';

/**
 * 모든 episode 본문 일괄 스캔.
 * Phase B 30번 통합 검증·useSymbolIndex 캐시 빌드 시 사용.
 */
export function scanAllEpisodes(
  episodes: EpisodeManuscript[] | null | undefined,
  index: SymbolIndex,
): SymbolReference[] {
  if (!episodes || episodes.length === 0) return [];
  const out: SymbolReference[] = [];
  for (const ep of episodes) {
    if (!ep.content) continue;
    out.push(...scanTextForSymbols(ep.content, index, ep.episode));
  }
  return out;
}
