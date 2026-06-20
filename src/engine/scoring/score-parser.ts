// ============================================================
// PART 1 — Module Header
// ============================================================
//
// score-parser.ts — 채점 결과 type + 파싱 + 가중치 종합.
//
// 이전: engine/translation.ts PART 1 (type) + PART 8 (parseScoreResponse).
// 수정: 단일 모듈 — 채점 결과 도메인 격리 (~95 LOC).
//
// 역할:
//   - 4축 (fidelity) / 6축 (experience) 채점 type
//   - LLM JSON 응답 → ChunkScoreDetail 파싱
//   - 가중치 적용 후 overall 산출
//
// [C] JSON 파싱 try/catch 후 fallback 객체 반환 — 항상 안전
// [G] 정적 가중치 — O(1) 산출
// [K] 단일 책임 — 파싱만 (프롬프트 빌더는 scoring-prompt.ts)
// ============================================================

import type { TranslationMode } from './bands';

// ============================================================
// PART 2 — Types
// ============================================================

/** MODE1 채점 — 원문 보존형 */
export interface FidelityScoreDetail {
  overall: number;
  translationese: number;    // 번역투 (낮을수록 좋음)
  fidelity: number;          // 원문 충실도
  naturalness: number;       // 자연스러움
  consistency: number;       // 용어 일관성
}

/** MODE2 채점 — 독자 경험형 (6축) */
export interface ExperienceScoreDetail {
  overall: number;
  immersion: number;         // 독자 몰입도 — 멈추지 않고 읽히는가
  emotionResonance: number;  // 감정 재현도 — 원문이 주는 감정이 살아있는가 (과잉도 감점)
  culturalFit: number;       // 문화 적합도 — 타겟 독자에게 어색함이 없는가
  consistency: number;       // 일관성 — 인명/용어/시점/톤
  groundedness: number;      // 무근거 보강 없음 — 모든 요소가 원문에 근거하는가
  voiceInvisibility: number; // 번역자 투명성 — 번역자의 문학적 목소리가 숨어있는가
}

/** 통합 채점 결과 (모드에 따라 내부 구조 다름) */
export type ChunkScoreDetail = FidelityScoreDetail | ExperienceScoreDetail;

/** 타입 가드 */
export function isFidelityScore(s: ChunkScoreDetail): s is FidelityScoreDetail {
  return 'translationese' in s;
}
export function isExperienceScore(s: ChunkScoreDetail): s is ExperienceScoreDetail {
  return 'immersion' in s && 'groundedness' in s;
}

// ============================================================
// PART 3 — Internal helpers
// ============================================================

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

// ============================================================
// PART 4 — Parsers (모드별)
// ============================================================

export function parseScoreResponse(raw: string, mode: TranslationMode): ChunkScoreDetail {
  if (mode === 'fidelity') return parseFidelityScore(raw);
  return parseExperienceScore(raw);
}

function parseFidelityScore(raw: string): FidelityScoreDetail {
  const fallback: FidelityScoreDetail = {
    overall: 0.5, translationese: 0.5, fidelity: 0.5, naturalness: 0.5, consistency: 1.0,
  };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return fallback;
    const p = JSON.parse(jsonMatch[0]);
    const t = clamp01(p.translationese ?? 0.5);
    const f = clamp01(p.fidelity ?? 0.5);
    const n = clamp01(p.naturalness ?? 0.5);
    const c = clamp01(p.consistency ?? 1.0);
    // 종합: (1-번역투)*0.35 + 충실도*0.30 + 자연스러움*0.25 + 일관성*0.10
    const overall = (1 - t) * 0.35 + f * 0.30 + n * 0.25 + c * 0.10;
    return { overall: round3(overall), translationese: t, fidelity: f, naturalness: n, consistency: c };
  } catch { return fallback; }
}

function parseExperienceScore(raw: string): ExperienceScoreDetail {
  const fallback: ExperienceScoreDetail = {
    overall: 0.5, immersion: 0.5, emotionResonance: 0.5, culturalFit: 0.5,
    consistency: 1.0, groundedness: 0.5, voiceInvisibility: 0.5,
  };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return fallback;
    const p = JSON.parse(jsonMatch[0]);
    const im = clamp01(p.immersion ?? 0.5);
    const er = clamp01(p.emotionResonance ?? 0.5);
    const cf = clamp01(p.culturalFit ?? 0.5);
    const co = clamp01(p.consistency ?? 1.0);
    const gr = clamp01(p.groundedness ?? 0.5);
    const vi = clamp01(p.voiceInvisibility ?? 0.5);
    // 6축 가중치: 몰입*0.22 + 감정재현*0.22 + 문화적합*0.16 + 일관성*0.10 + 무근거*0.15 + 투명성*0.15
    const overall = im * 0.22 + er * 0.22 + cf * 0.16 + co * 0.10 + gr * 0.15 + vi * 0.15;
    return {
      overall: round3(overall), immersion: im, emotionResonance: er,
      culturalFit: cf, consistency: co, groundedness: gr, voiceInvisibility: vi,
    };
  } catch { return fallback; }
}
