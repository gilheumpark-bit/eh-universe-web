// ============================================================
// PART 1 — Imports & Types (Previous Episode Extractor)
// ============================================================
//
// 이전 화 자동 요약 추출 — 감사 구멍 #2 해결.
// 현재 pipeline.ts:1074는 사용자가 명시적으로 previousContent를 줘야만 주입.
// 이 모듈은 StoryConfig.manuscripts에서 자동으로 추출하여 폴백 제공.
//
// 모드:
//   - 'tail': 마지막 N자 (기본 400) — 정확한 직전 맥락
//   - 'summary': manuscript.summary 또는 sceneDirection.writerNotes — 토큰 절약
//
// [C] 빈 manuscripts 가드, currentEpisode <= 1 가드
// [G] 단일 패스 슬라이싱
// [K] 순수 함수 — pipeline.ts에서 호출만

import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';

export interface PreviousEpisodeOptions {
  /** 추출 모드 — tail은 마지막 N자, summary는 요약 우선 */
  mode?: 'tail' | 'summary';
  /** tail 모드 최대 글자수 (기본 400) */
  maxChars?: number;
}

export interface ExtractedPreviousEpisode {
  /** 추출된 텍스트 — 빈 문자열이면 추출 실패 */
  text: string;
  /** 출처 화수 */
  sourceEpisode: number;
  /** 출처 종류 */
  sourceType: 'tail' | 'summary' | 'detailedSummary' | 'writerNotes' | 'none';
}

// ============================================================
// PART 2 — Manuscript locator
// ============================================================

/**
 * 현재 화 직전의 manuscript를 찾음. 없으면 null.
 * manuscripts에 episode 필드가 있는 것을 가정.
 */
function findPreviousManuscript(
  manuscripts: EpisodeManuscript[] | undefined,
  currentEpisode: number
): EpisodeManuscript | null {
  if (!manuscripts || manuscripts.length === 0) return null;
  // 현재보다 작은 화 중 가장 큰 episode
  const candidates = manuscripts.filter(m => m.episode < currentEpisode);
  if (candidates.length === 0) return null;
  return candidates.reduce((acc, m) => (m.episode > acc.episode ? m : acc), candidates[0]);
}

// ============================================================
// PART 3 — Main extractor
// ============================================================

/**
 * 이전 화 요약 추출. 우선순위:
 *   1. mode='summary' → detailedSummary > summary > writerNotes > tail 폴백
 *   2. mode='tail' → content 마지막 N자
 *
 * 빈 결과는 호출부에서 무시하여 자동 주입 안 함.
 */
export function extractPreviousEpisodeSummary(
  config: StoryConfig,
  options?: PreviousEpisodeOptions
): ExtractedPreviousEpisode {
  const mode = options?.mode ?? 'summary';
  const maxChars = Math.max(50, options?.maxChars ?? 400);
  const currentEpisode = config.episode ?? 1;

  // Guard: 첫 화 또는 manuscripts 없음
  if (currentEpisode <= 1) {
    return { text: '', sourceEpisode: 0, sourceType: 'none' };
  }

  const prev = findPreviousManuscript(config.manuscripts, currentEpisode);
  if (!prev) {
    // manuscripts 없을 때 episodeSceneSheets의 writerNotes를 폴백
    const sheets = config.episodeSceneSheets;
    if (sheets && sheets.length > 0) {
      const prevSheet = sheets
        .filter(s => s.episode < currentEpisode)
        .sort((a, b) => b.episode - a.episode)[0];
      const notes = prevSheet?.directionSnapshot?.writerNotes;
      if (notes && notes.trim()) {
        return {
          text: notes.slice(0, maxChars).trim(),
          sourceEpisode: prevSheet.episode,
          sourceType: 'writerNotes',
        };
      }
    }
    return { text: '', sourceEpisode: 0, sourceType: 'none' };
  }

  if (mode === 'tail') {
    const content = (prev.content ?? '').trim();
    if (!content) {
      return { text: '', sourceEpisode: prev.episode, sourceType: 'none' };
    }
    return {
      text: content.slice(-maxChars),
      sourceEpisode: prev.episode,
      sourceType: 'tail',
    };
  }

  // mode='summary' — 우선순위 체인
  if (prev.detailedSummary && prev.detailedSummary.trim()) {
    return {
      text: prev.detailedSummary.slice(0, maxChars).trim(),
      sourceEpisode: prev.episode,
      sourceType: 'detailedSummary',
    };
  }
  if (prev.summary && prev.summary.trim()) {
    return {
      text: prev.summary.slice(0, maxChars).trim(),
      sourceEpisode: prev.episode,
      sourceType: 'summary',
    };
  }
  // 요약 모드인데 요약이 없으면 tail로 폴백
  const content = (prev.content ?? '').trim();
  if (!content) {
    return { text: '', sourceEpisode: prev.episode, sourceType: 'none' };
  }
  return {
    text: content.slice(-maxChars),
    sourceEpisode: prev.episode,
    sourceType: 'tail',
  };
}

// IDENTITY_SEAL: previous-episode-extractor | role=previous ep auto-extract | inputs=config+options | outputs=ExtractedPreviousEpisode
