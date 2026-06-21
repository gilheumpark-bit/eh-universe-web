// ============================================================
// Studio Config Updaters — pure StoryConfig transformers
// ============================================================
//
// 역할:
//   - UI handler 가 currentSession.config 스냅샷을 객체로 덮어쓰지 않게 한다.
//   - setConfig(prev => updater(prev)) 형태로만 쓰는 작은 순수 변환을 제공한다.
//
// [C] 안전성: 다른 config 필드 보존, totalEpisodes 상한, 비정상 숫자 가드
// [G] 성능: O(1)
// [K] 간결성: 회차 증가 책임만 수행
// ============================================================

import type { StoryConfig } from '@/lib/studio-types';

function normalizePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
}

export function advanceEpisodeConfig(prev: StoryConfig): StoryConfig {
  const currentEpisode = normalizePositiveInteger(prev.episode, 1);
  const totalEpisodes = normalizePositiveInteger(prev.totalEpisodes, currentEpisode);
  const nextEpisode = Math.min(currentEpisode + 1, totalEpisodes);
  if (nextEpisode === prev.episode) return prev;
  return { ...prev, episode: nextEpisode };
}

// IDENTITY_SEAL: studio-config-updaters | role=pure-config-transformers | inputs=StoryConfig | outputs=StoryConfig
