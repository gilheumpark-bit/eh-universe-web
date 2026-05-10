// ============================================================
// state-snapshot.ts — 그 시점 캐릭터 상태 추정.
//
// 휴리스틱 (LLM 없이 결정론):
//   - 본문 누적 스캔 — 캐릭터 이름 등장 + 주변 ±50자 컨텍스트에서 keyword
//   - emotion: 슬픔/기쁨/분노/공포/평온 5종 keyword 매칭
//   - inventory: 캐릭터 명 + "들었다"/"받았다"/"꺼냈다" 패턴 + 명사
//   - knowledge: "알게 되었다"/"발견했다" 패턴 + 명사
//
// LLM 보조는 Phase 2.
//
// [C] 빈 입력 → empty / [G] 단일 패스 / [K] 4 차원만
// ============================================================

import type { Character, EpisodeManuscript } from '@/lib/studio-types';
import type { CharacterVariableState } from './types';

// ============================================================
// PART 1 — Emotion keyword
// ============================================================

const EMOTION_PATTERNS: Array<[string, string[]]> = [
  ['슬픔', ['슬픔', '슬프', '눈물', '울었', '울고', '비통']],
  ['기쁨', ['기쁨', '기뻤', '웃었', '환호', '환희', '행복']],
  ['분노', ['분노', '화났', '격노', '소리쳤', '폭발']],
  ['공포', ['공포', '두려움', '겁이', '비명', '떨었']],
  ['평온', ['평온', '차분', '담담', '고요']],
];

function detectEmotion(text: string): string | undefined {
  for (const [name, keywords] of EMOTION_PATTERNS) {
    if (keywords.some((k) => text.includes(k))) return name;
  }
  return undefined;
}

// ============================================================
// PART 2 — Inventory / Knowledge
// ============================================================

// [Phase B fix — 2026-05-07] non-greedy + 조사 분리 — "검을" → "검" 캡처.
function detectInventory(snippet: string): string[] {
  const out: string[] = [];
  const re = /([가-힣a-zA-Z]{1,15}?)(?:을|를)\s*(?:들었|꺼냈|받았|건네받|얻었)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(snippet)) !== null) {
    if (m[1].length >= 1) out.push(m[1]);
  }
  return Array.from(new Set(out));
}

function detectKnowledge(snippet: string): string[] {
  const out: string[] = [];
  const re = /([가-힣a-zA-Z]{1,30}?)(?:을|를)\s*(?:알게 되|발견했|깨달았)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(snippet)) !== null) {
    if (m[1].length >= 1) out.push(m[1]);
  }
  return Array.from(new Set(out));
}

// ============================================================
// PART 3 — Public API
// ============================================================

/**
 * 특정 시점 (episodeId, paragraphIdx) 까지 누적된 캐릭터 상태 추정.
 */
export function buildCharacterStateAt(
  characters: Character[] | null | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
  upToEpisodeId: number,
  upToParagraphIdx: number = Number.MAX_SAFE_INTEGER,
): CharacterVariableState[] {
  if (!characters || characters.length === 0 || !episodes) return [];

  const validChars = characters.filter((c) => c.name && c.name.length >= 2);
  const states: CharacterVariableState[] = validChars.map((c) => ({
    characterId: c.id,
    characterName: c.name,
    inventory: [],
    knowledge: [],
  }));

  for (const ep of episodes) {
    if (ep.episode > upToEpisodeId) break;
    if (!ep.content) continue;

    // paragraph 분할 (단순 — \n\n 또는 \n)
    const paragraphs = ep.content.split(/\n+/);
    const lastParaIdx = ep.episode === upToEpisodeId
      ? Math.min(upToParagraphIdx, paragraphs.length - 1)
      : paragraphs.length - 1;

    for (let pi = 0; pi <= lastParaIdx; pi++) {
      const para = paragraphs[pi];
      if (!para) continue;

      for (const state of states) {
        const idx = para.indexOf(state.characterName);
        if (idx < 0) continue;
        const ctxStart = Math.max(0, idx - 50);
        const ctxEnd = Math.min(para.length, idx + state.characterName.length + 50);
        const snippet = para.slice(ctxStart, ctxEnd);

        // 최신 emotion 갱신 (덮어쓰기)
        const em = detectEmotion(snippet);
        if (em) state.emotion = em;

        // inventory / knowledge 누적
        for (const item of detectInventory(snippet)) {
          if (!state.inventory!.includes(item)) state.inventory!.push(item);
        }
        for (const k of detectKnowledge(snippet)) {
          if (!state.knowledge!.includes(k)) state.knowledge!.push(k);
        }
      }
    }
  }

  return states;
}
