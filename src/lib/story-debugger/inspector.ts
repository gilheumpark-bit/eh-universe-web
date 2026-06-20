// ============================================================
// inspector.ts — Variable Inspector.
//
// 변수 종류:
//   - 'characters' → 모든 캐릭터 상태 list
//   - 'character:{name}' → 특정 캐릭터 상태
//   - 'foreshadow' → 누적 떡밥 list
//   - '{characterName}.emotion' / '.inventory' / '.knowledge' → 차원별
//
// [C] 미존재 → found false / [K] 단일 책임
// ============================================================

import type { Character, EpisodeManuscript } from '@/lib/studio-types';
import type { InspectionResult, BreakpointLocation } from './types';
import { buildCharacterStateAt } from './state-snapshot';

export function inspectAt(
  loc: BreakpointLocation,
  variableName: string,
  characters: Character[] | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
): InspectionResult {
  const states = buildCharacterStateAt(characters, episodes, loc.episodeId, loc.paragraphIdx);

  const baseResult = {
    episodeId: loc.episodeId,
    paragraphIdx: loc.paragraphIdx,
    variableName,
  };

  if (variableName === 'characters') {
    return { ...baseResult, found: true, value: states.map((s) => s.characterName) };
  }

  if (variableName === 'foreshadow') {
    if (!episodes) return { ...baseResult, found: false };
    const seen: string[] = [];
    for (const ep of episodes) {
      if (ep.episode > loc.episodeId) break;
      if (!ep.content) continue;
      const matches = ep.content.matchAll(/\[(?:떡밥|복선|foreshadow|setup)-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/gi);
      for (const m of matches) {
        if (!seen.includes(m[1])) seen.push(m[1]);
      }
    }
    return { ...baseResult, found: true, value: seen };
  }

  // character:{name} 또는 {name}.dimension
  if (variableName.startsWith('character:')) {
    const name = variableName.slice('character:'.length);
    const cs = states.find((s) => s.characterName === name);
    if (!cs) return { ...baseResult, found: false };
    return {
      ...baseResult,
      found: true,
      value: {
        emotion: cs.emotion ?? '',
        inventory: (cs.inventory ?? []).join(', '),
        knowledge: (cs.knowledge ?? []).join(', '),
      },
    };
  }

  if (variableName.includes('.')) {
    const [name, dim] = variableName.split('.');
    const cs = states.find((s) => s.characterName === name);
    if (!cs) return { ...baseResult, found: false };
    if (dim === 'emotion') return { ...baseResult, found: true, value: cs.emotion ?? '' };
    if (dim === 'inventory') return { ...baseResult, found: true, value: cs.inventory ?? [] };
    if (dim === 'knowledge') return { ...baseResult, found: true, value: cs.knowledge ?? [] };
  }

  return { ...baseResult, found: false };
}
