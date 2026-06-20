// ============================================================
// PART 1 — Module Header
// ============================================================
//
// subplot-tracker.ts — 서브플롯 dangling 가닥 검증.
//
// foreshadow-tracker 와 분리 — 서브플롯은 명시 마커 [서브플롯-{id}].
// 회수 임계가 떡밥과 다름 (서브플롯은 일반적으로 더 길게 끌고감).
//
// [C] 마커 0 → 위반 0
// [G] foreshadow-tracker 의 RawMarker 추출 패턴 재활용 가능하지만
//     ID 네임스페이스 분리를 위해 자체 패턴
// [K] 단일 책임
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { AxisResult, Violation } from './types';

const SUBPLOT_SETUP = [
  /\[서브플롯-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/g,
  /\[subplot-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/gi,
];

const SUBPLOT_PAYOFF = [
  /\[서브해결-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/g,
  /\[subplot-resolve-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/gi,
];

interface RawMarker {
  id: string;
  episodeId: number;
  charOffset: number;
  context: string;
}

function extractWith(
  text: string,
  episodeId: number,
  patterns: RegExp[],
): RawMarker[] {
  const out: RawMarker[] = [];
  for (const pat of patterns) {
    pat.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      const ctxStart = Math.max(0, m.index - 30);
      const ctxEnd = Math.min(text.length, m.index + m[0].length + 30);
      out.push({
        id: m[1],
        episodeId,
        charOffset: m.index,
        context: text.slice(ctxStart, ctxEnd).replace(/\n/g, ' '),
      });
    }
  }
  return out;
}

export function runSubplotAxis(
  episodes: EpisodeManuscript[] | null | undefined,
): AxisResult {
  const start = Date.now();

  if (!episodes || episodes.length === 0) {
    return {
      axis: 'foreshadow', // 통합 — orchestrator 가 별도 슬롯에 보관
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  const setups: RawMarker[] = [];
  const payoffs: RawMarker[] = [];
  for (const ep of episodes) {
    if (!ep.content) continue;
    setups.push(...extractWith(ep.content, ep.episode, SUBPLOT_SETUP));
    payoffs.push(...extractWith(ep.content, ep.episode, SUBPLOT_PAYOFF));
  }

  if (setups.length === 0) {
    return {
      axis: 'foreshadow',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  const payoffById = new Map<string, RawMarker[]>();
  for (const p of payoffs) {
    const list = payoffById.get(p.id) ?? [];
    list.push(p);
    payoffById.set(p.id, list);
  }

  const lastEp = Math.max(...episodes.map((e) => e.episode));
  const violations: Violation[] = [];

  for (const s of setups) {
    const matches = (payoffById.get(s.id) ?? []).filter((p) => p.episodeId >= s.episodeId);
    if (matches.length === 0) {
      const gap = lastEp - s.episodeId;
      violations.push({
        kind: 'subplot-dangling',
        severity: gap >= 50 ? 'error' : 'warning',
        episodeId: s.episodeId,
        messages: {
          ko: `서브플롯 [${s.id}] 미해결 — EP${s.episodeId} 시작, ${gap}화 경과`,
          en: `Subplot [${s.id}] dangling — opened in EP${s.episodeId}, ${gap} episodes passed`,
          ja: `サブプロット [${s.id}] 未解決`,
          zh: `子情节 [${s.id}] 未解决`,
        },
        jumpTarget: { episodeId: s.episodeId, charOffset: s.charOffset },
        meta: { id: s.id, gap },
      });
    }
  }

  const resolutionRate = setups.length > 0 ? (setups.length - violations.length) / setups.length : 1;
  const score = Math.round(resolutionRate * 100);

  return {
    axis: 'foreshadow',
    score,
    violations,
    durationMs: Date.now() - start,
  };
}
