// ============================================================
// PART 1 — Module Header
// ============================================================
//
// scene-sheet/helpers.ts — episodeSceneSheets read/write 단일 API.
//
// 이전: StudioRightPanel.tsx 에서 setConfig 직접 호출 3 회 — 같은 패턴 보일러플레이트.
//   onSave: existing.filter + [...filtered, sheet].sort + setConfig({...config, episodeSceneSheets})
//   onDelete: filter + setConfig({...config, episodeSceneSheets})
//   onUpdate: 동일 onSave 패턴 (사실상 중복)
//
// 수정: helpers 함수 3개 export — pure StoryConfig transformer.
//   upsertSheet — sheet add/replace + episode 순 정렬
//   removeSheet — episode 기준 제거
//   findSheet   — episode 검색 (Optional)
//
// [C] pure function — race 위험 0 (caller setConfig 가 atomic)
// [G] O(n) — episodeSceneSheets 길이 (보통 < 100)
// [K] 단일 책임 — episodeSceneSheets 변환만 (다른 config 필드 영향 X)
// ============================================================

import type { StoryConfig, EpisodeSceneSheet } from '@/lib/studio-types';

// ============================================================
// PART 2 — Read
// ============================================================

/**
 * 특정 에피소드의 씬시트 검색.
 * 없으면 undefined.
 */
export function findSheet(
  config: Pick<StoryConfig, 'episodeSceneSheets'>,
  episode: number,
): EpisodeSceneSheet | undefined {
  return (config.episodeSceneSheets ?? []).find((s) => s.episode === episode);
}

/**
 * 모든 씬시트 episode 순 정렬 반환 (불변 — 원본 미변경).
 */
export function listSheetsSorted(
  config: Pick<StoryConfig, 'episodeSceneSheets'>,
): EpisodeSceneSheet[] {
  return [...(config.episodeSceneSheets ?? [])].sort((a, b) => a.episode - b.episode);
}

// ============================================================
// PART 3 — Write (pure transformers)
// ============================================================

/**
 * 씬시트 추가/교체 + episode 순 정렬.
 * sheet.episode 가 기존 항목과 동일하면 교체, 아니면 추가.
 *
 * @returns episodeSceneSheets 만 갱신된 새 StoryConfig
 */
export function upsertSheet(config: StoryConfig, sheet: EpisodeSceneSheet): StoryConfig {
  const existing = config.episodeSceneSheets ?? [];
  const filtered = existing.filter((s) => s.episode !== sheet.episode);
  const next = [...filtered, sheet].sort((a, b) => a.episode - b.episode);
  return { ...config, episodeSceneSheets: next };
}

/**
 * 특정 에피소드 씬시트 제거.
 * 미존재 episode 도 안전 (no-op).
 *
 * @returns episodeSceneSheets 만 갱신된 새 StoryConfig
 */
export function removeSheet(config: StoryConfig, episode: number): StoryConfig {
  const existing = config.episodeSceneSheets ?? [];
  const next = existing.filter((s) => s.episode !== episode);
  return { ...config, episodeSceneSheets: next };
}
