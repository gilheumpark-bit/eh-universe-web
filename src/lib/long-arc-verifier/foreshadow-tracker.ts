// ============================================================
// PART 1 — Module Header
// ============================================================
//
// foreshadow-tracker.ts — 떡밥/복선 추적.
//
// 마커 패턴 (작가가 본문에 명시):
//   [떡밥-{id}]   — 한국어 setup
//   [복선-{id}]   — 한국어 setup (복선)
//   [회수-{id}]   — payoff
//   [foreshadow-{id}] / [payoff-{id}] — 영어
//
// 본문에서 마커 추출 → setup/payoff 매칭 → 미회수 list / 회수 거리 통계.
//
// [C] 마커 0개 → 위반 0
// [G] 단일 패스 — 모든 episode regex.exec
// [K] 마커 안에 ID 추출만 — 의미 분석 X
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { AxisResult, ForeshadowMarker, Violation } from './types';

// ============================================================
// PART 2 — Marker extraction
// ============================================================

// [Phase B fix — 2026-05-07] 한글/한자/일본어 떡밥 ID 매칭 허용.
// ID 클래스: ASCII alphanumeric + 한글 + 한자 + 일본어 hiragana/katakana + _ -
const ID_CLASS = '[a-zA-Z0-9_\\-가-힣一-龥ぁ-んァ-ン]';

const SETUP_PATTERNS = [
  new RegExp(`\\[떡밥-(${ID_CLASS}{1,30})\\]`, 'g'),
  new RegExp(`\\[복선-(${ID_CLASS}{1,30})\\]`, 'g'),
  new RegExp(`\\[foreshadow-(${ID_CLASS}{1,30})\\]`, 'gi'),
  new RegExp(`\\[setup-(${ID_CLASS}{1,30})\\]`, 'gi'),
];

const PAYOFF_PATTERNS = [
  new RegExp(`\\[회수-(${ID_CLASS}{1,30})\\]`, 'g'),
  new RegExp(`\\[payoff-(${ID_CLASS}{1,30})\\]`, 'gi'),
  new RegExp(`\\[resolve-(${ID_CLASS}{1,30})\\]`, 'gi'),
];

interface RawMarker {
  id: string;
  episodeId: number;
  charOffset: number;
  surface: string;
  context: string;
  type: 'setup' | 'payoff';
}

function extractMarkers(text: string, episodeId: number, isSetup: boolean): RawMarker[] {
  const out: RawMarker[] = [];
  const patterns = isSetup ? SETUP_PATTERNS : PAYOFF_PATTERNS;
  for (const pat of patterns) {
    pat.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      const id = m[1];
      const ctxStart = Math.max(0, m.index - 30);
      const ctxEnd = Math.min(text.length, m.index + m[0].length + 30);
      out.push({
        id,
        episodeId,
        charOffset: m.index,
        surface: m[0],
        context: text.slice(ctxStart, ctxEnd).replace(/\n/g, ' '),
        type: isSetup ? 'setup' : 'payoff',
      });
    }
  }
  return out;
}

// ============================================================
// PART 3 — Axis runner
// ============================================================

export interface ForeshadowOptions {
  /** 미회수 임계 거리 (몇 화 이상 미회수 시 error) — 기본 30 */
  unresolvedErrorThreshold?: number;
}

export function runForeshadowAxis(
  episodes: EpisodeManuscript[] | null | undefined,
  options: ForeshadowOptions = {},
): AxisResult {
  const start = Date.now();
  const errorThreshold = options.unresolvedErrorThreshold ?? 30;

  if (!episodes || episodes.length === 0) {
    return {
      axis: 'foreshadow',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  // 1. 마커 전수 추출
  const allSetups: RawMarker[] = [];
  const allPayoffs: RawMarker[] = [];
  for (const ep of episodes) {
    if (!ep.content) continue;
    allSetups.push(...extractMarkers(ep.content, ep.episode, true));
    allPayoffs.push(...extractMarkers(ep.content, ep.episode, false));
  }

  if (allSetups.length === 0) {
    return {
      axis: 'foreshadow',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  // 2. ID 매칭 — 가장 빠른 setup ↔ 가장 빠른 payoff
  const payoffById = new Map<string, RawMarker[]>();
  for (const p of allPayoffs) {
    const list = payoffById.get(p.id) ?? [];
    list.push(p);
    payoffById.set(p.id, list);
  }

  const markers: ForeshadowMarker[] = allSetups.map((s) => {
    const payoffs = (payoffById.get(s.id) ?? []).sort((a, b) => a.episodeId - b.episodeId);
    const firstPayoff = payoffs.find((p) => p.episodeId >= s.episodeId);
    return {
      id: s.id,
      setupEpisode: s.episodeId,
      setupCharOffset: s.charOffset,
      setupContext: s.context,
      payoffEpisode: firstPayoff?.episodeId,
      payoffCharOffset: firstPayoff?.charOffset,
      payoffContext: firstPayoff?.context,
      resolutionDistance:
        firstPayoff?.episodeId !== undefined
          ? firstPayoff.episodeId - s.episodeId
          : undefined,
      type: 'foreshadow',
    };
  });

  // 3. 위반 — 미회수 또는 임계 초과
  const violations: Violation[] = [];
  const lastEpisode = Math.max(...episodes.map((e) => e.episode));
  for (const m of markers) {
    if (!m.payoffEpisode) {
      const gap = lastEpisode - m.setupEpisode;
      const severity: Violation['severity'] = gap >= errorThreshold ? 'error' : 'warning';
      violations.push({
        kind: 'foreshadow-unresolved',
        severity,
        episodeId: m.setupEpisode,
        messages: {
          ko: `떡밥 [${m.id}] 미회수 — EP${m.setupEpisode} 에서 시작, ${gap}화 경과`,
          en: `Foreshadow [${m.id}] unresolved — set up in EP${m.setupEpisode}, ${gap} episodes passed`,
          ja: `伏線 [${m.id}] 未回収`,
          zh: `伏笔 [${m.id}] 未回收`,
        },
        jumpTarget: { episodeId: m.setupEpisode, charOffset: m.setupCharOffset },
        meta: { id: m.id, gap, type: m.type },
      });
    }
  }

  const totalSetups = allSetups.length;
  const resolved = markers.filter((m) => m.payoffEpisode !== undefined).length;
  const resolutionRate = totalSetups > 0 ? resolved / totalSetups : 1;
  const score = Math.round(resolutionRate * 100);

  return {
    axis: 'foreshadow',
    score,
    violations,
    durationMs: Date.now() - start,
  };
}

/** 마커 raw 추출 (UI Ledger 패널용) */
export function extractAllForeshadowMarkers(
  episodes: EpisodeManuscript[] | null | undefined,
): ForeshadowMarker[] {
  if (!episodes || episodes.length === 0) return [];
  const allSetups: RawMarker[] = [];
  const allPayoffs: RawMarker[] = [];
  for (const ep of episodes) {
    if (!ep.content) continue;
    allSetups.push(...extractMarkers(ep.content, ep.episode, true));
    allPayoffs.push(...extractMarkers(ep.content, ep.episode, false));
  }
  const payoffById = new Map<string, RawMarker[]>();
  for (const p of allPayoffs) {
    const list = payoffById.get(p.id) ?? [];
    list.push(p);
    payoffById.set(p.id, list);
  }
  return allSetups.map((s) => {
    const payoffs = (payoffById.get(s.id) ?? []).sort((a, b) => a.episodeId - b.episodeId);
    const first = payoffs.find((p) => p.episodeId >= s.episodeId);
    return {
      id: s.id,
      setupEpisode: s.episodeId,
      setupCharOffset: s.charOffset,
      setupContext: s.context,
      payoffEpisode: first?.episodeId,
      payoffCharOffset: first?.charOffset,
      payoffContext: first?.context,
      resolutionDistance:
        first?.episodeId !== undefined ? first.episodeId - s.episodeId : undefined,
      type: 'foreshadow',
    };
  });
}
