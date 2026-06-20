// ============================================================
// PART 1 — Module Header
// ============================================================
//
// studio-bridge.ts — Loreguard Studio (집필) ↔ Translation Studio 양방향 동기화.
//
// 시장 분석 4차 §4 §6 + IR 보고서 "Cross-border Novel IDE":
//   "한국 작가 → 세계 / 해외 작가 → 한국·아시아"
//   원고·세계관·인물·용어집·복선 등 동기화.
//
// 두 방향:
//   1) Studio → Translation: 완성된 episode 를 Translation 의 chapter 로 import.
//   2) Translation → Studio: 번역본 (Faithful 또는 Market) 을 Studio 검수 모드로 import.
//
// 의존성 격리: dynamic import 로 양 모듈 격리.
// ChapterEntry / EpisodeManuscript 양 타입은 직접 의존 X — 최소 인터페이스로 정의.
//
// [C] silent fail — 한쪽 모듈 부재해도 다른 쪽 영향 X
// [G] dynamic import — bundle 분리
// [K] 단방향 함수 2개 export
// ============================================================

import type { ChapterEntry } from '@/types/translator';

// ============================================================
// PART 2 — Types (최소 interface)
// ============================================================

/** Studio episode minimal shape — 의존 회피 위해 최소 형식. */
export interface StudioEpisodeMinimal {
  id?: string;
  title: string;
  content: string;
  episodeNumber?: number;
  status?: string;
}

export interface BridgeImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ============================================================
// PART 3 — Studio → Translation
// ============================================================

/**
 * Studio episode list → Translation chapters.
 * 각 episode 를 ChapterEntry 로 변환. resultMarket/Faithful 은 비어둠 (사용자가 듀얼 번역).
 */
export function studioEpisodesToChapters(
  episodes: StudioEpisodeMinimal[],
): ChapterEntry[] {
  return episodes
    .filter((ep) => typeof ep.title === 'string' && typeof ep.content === 'string')
    .map((ep) => ({
      name: ep.title,
      content: ep.content,
      result: '',
      resultFaithful: undefined,
      resultMarket: undefined,
      isDone: false,
      stageProgress: 0,
      stageProgressFaithful: 0,
      stageProgressMarket: 0,
      faithfulApproved: false,
      marketApproved: false,
    }));
}

// ============================================================
// PART 4 — Translation → Studio
// ============================================================

/**
 * Translation chapters → Studio episode minimal.
 * track 선택: 'faithful' / 'market'. 기본 'market'.
 */
export function chaptersToStudioEpisodes(
  chapters: ChapterEntry[],
  track: 'faithful' | 'market' = 'market',
): StudioEpisodeMinimal[] {
  const out: StudioEpisodeMinimal[] = [];
  chapters.forEach((ch, i) => {
    const content =
      track === 'faithful'
        ? ch.resultFaithful ?? ch.result ?? ''
        : ch.resultMarket ?? ch.result ?? '';
    if (!content || !ch.name) return;
    out.push({
      title: ch.name,
      content,
      episodeNumber: i + 1,
      status: 'translated',
    });
  });
  return out;
}

// ============================================================
// PART 5 — Story Bible sync
// ============================================================

/**
 * Studio worldbook + characters → Translation context (worldContext / characterProfiles).
 * 양쪽 타입 격리 위해 input 은 최소 interface.
 */
export interface StoryBibleSyncInput {
  worldEntries?: Array<{ name: string; description?: string }>;
  characters?: Array<{ name: string; description?: string; aliases?: string[] }>;
  glossary?: Array<{ source: string; target: string }>;
}

export interface StoryBibleSyncOutput {
  worldContext: string;
  characterProfiles: string;
  glossaryText: string;
}

export function syncStoryBible(input: StoryBibleSyncInput): StoryBibleSyncOutput {
  const worldContext = (input.worldEntries ?? [])
    .filter((e) => e.name)
    .map((e) => `- ${e.name}${e.description ? ': ' + e.description : ''}`)
    .join('\n');

  const characterProfiles = (input.characters ?? [])
    .filter((c) => c.name)
    .map((c) => {
      const aliases = c.aliases && c.aliases.length > 0 ? ` (aka ${c.aliases.join(', ')})` : '';
      return `- ${c.name}${aliases}${c.description ? ': ' + c.description : ''}`;
    })
    .join('\n');

  const glossaryText = (input.glossary ?? [])
    .filter((g) => g.source)
    .map((g) => `${g.source} → ${g.target}`)
    .join('\n');

  return { worldContext, characterProfiles, glossaryText };
}
