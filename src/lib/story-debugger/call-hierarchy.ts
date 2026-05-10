// ============================================================
// call-hierarchy.ts — 사건 cause→effect 그래프.
//
// 휴리스틱 (Phase 1):
//   - 화별 첫 문장 = 이벤트 라벨
//   - 인접 화 (n → n+1) = sequence edge
//   - "그래서" / "결국" / "때문에" / "탓에" 키워드 → cause edge
//
// LLM 보조는 Phase 2.
//
// [C] 빈 episodes → 빈 그래프 / [G] 단일 패스 / [K] 작은 그래프만
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { CallHierarchy, StoryEventNode, StoryEventEdge } from './types';

const CAUSE_KEYWORDS = ['그래서', '결국', '때문에', '탓에', '덕분에', '그 결과'];

function firstSentence(text: string | undefined): string {
  if (!text) return '';
  const m = text.match(/[^.!?。\n]{5,80}[.!?。]?/);
  return m ? m[0].trim() : text.slice(0, 60).trim();
}

export function buildCallHierarchy(
  episodes: EpisodeManuscript[] | null | undefined,
): CallHierarchy {
  if (!episodes || episodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const sorted = [...episodes].sort((a, b) => a.episode - b.episode);
  const nodes: StoryEventNode[] = sorted.map((ep) => ({
    id: `ep-${ep.episode}`,
    episodeId: ep.episode,
    label: firstSentence(ep.content) || ep.title || `EP${ep.episode}`,
  }));

  const edges: StoryEventEdge[] = [];

  // sequence edges (n → n+1)
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      fromId: nodes[i].id,
      toId: nodes[i + 1].id,
      kind: 'sequence',
    });
  }

  // cause edges — 본문에 키워드 등장 시 직전 화에서 cause edge 추가
  for (let i = 0; i < sorted.length; i++) {
    const ep = sorted[i];
    if (!ep.content) continue;
    for (const kw of CAUSE_KEYWORDS) {
      if (ep.content.includes(kw) && i > 0) {
        edges.push({
          fromId: nodes[i - 1].id,
          toId: nodes[i].id,
          kind: 'cause',
        });
        break; // 화당 1개로 제한 (그래프 폭발 방지)
      }
    }
  }

  return { nodes, edges };
}
