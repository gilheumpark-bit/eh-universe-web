// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { PLATFORM_PRESETS, PublishPlatform } from '@/engine/types';
import type {
  AppLanguage,
  EpisodeLifecycleState,
  EpisodeManuscript,
  ShipmentStatus,
  TranslatedManuscriptEntry,
} from '@/lib/studio-types';

export interface EpisodeLengthBand {
  min: number;
  max: number;
}

export interface EpisodeLifecycleDecision {
  state: EpisodeLifecycleState;
  reason: string;
  charCount: number;
  lengthBand: EpisodeLengthBand;
  signedOff: boolean;
}

export interface EpisodeLifecycleInput {
  manuscript: EpisodeManuscript;
  publishPlatform?: PublishPlatform | null;
  translatedManuscripts?: readonly TranslatedManuscriptEntry[];
  targetLang?: TranslatedManuscriptEntry['targetLang'];
  shipped?: boolean;
}

export interface EpisodeLifecycleStoryInput {
  manuscripts?: readonly EpisodeManuscript[];
  translatedManuscripts?: readonly TranslatedManuscriptEntry[];
  publishPlatform?: PublishPlatform;
  shipmentStatus?: ShipmentStatus;
}

export const DEFAULT_EPISODE_LENGTH_BAND: EpisodeLengthBand = { min: 3000, max: 7000 };

// ============================================================
// PART 2 — Platform & Signoff Helpers
// ============================================================

export function getEpisodeLengthBand(platform?: PublishPlatform | null): EpisodeLengthBand {
  if (!platform || platform === PublishPlatform.NONE) return DEFAULT_EPISODE_LENGTH_BAND;
  return PLATFORM_PRESETS[platform]?.episodeLength ?? DEFAULT_EPISODE_LENGTH_BAND;
}

export function getEpisodeCharCount(manuscript: Pick<EpisodeManuscript, 'charCount' | 'content'>): number {
  if (Number.isFinite(manuscript.charCount) && manuscript.charCount > 0) return manuscript.charCount;
  return manuscript.content.trim().length;
}

export function hasEpisodeTranslationSignoff(
  translatedManuscripts: readonly TranslatedManuscriptEntry[] | undefined,
  episode: number,
  targetLang?: TranslatedManuscriptEntry['targetLang'],
): boolean {
  if (!Array.isArray(translatedManuscripts) || translatedManuscripts.length === 0) return false;
  return translatedManuscripts.some((entry) => {
    if (entry.episode !== episode) return false;
    if (targetLang && entry.targetLang !== targetLang) return false;
    return !!entry.faithfulApproved || !!entry.marketApproved;
  });
}

// ============================================================
// PART 3 — Lifecycle Derivation
// ============================================================

export function deriveEpisodeLifecycle(input: EpisodeLifecycleInput): EpisodeLifecycleDecision {
  const { manuscript, publishPlatform, translatedManuscripts, targetLang, shipped = false } = input;
  const lengthBand = getEpisodeLengthBand(publishPlatform);
  const charCount = getEpisodeCharCount(manuscript);
  const signedOff = hasEpisodeTranslationSignoff(translatedManuscripts, manuscript.episode, targetLang);

  if (shipped || manuscript.lifecycleState === 'SHIPPED') {
    return { state: 'SHIPPED', reason: 'shipped', charCount, lengthBand, signedOff };
  }

  if (signedOff) {
    return { state: 'SIGNED_OFF', reason: 'translation-signoff', charCount, lengthBand, signedOff };
  }

  if (charCount <= 0) {
    return { state: 'DRAFT', reason: 'empty-manuscript', charCount, lengthBand, signedOff };
  }

  if (charCount < lengthBand.min) {
    return { state: 'IN_PROGRESS', reason: 'below-platform-minimum', charCount, lengthBand, signedOff };
  }

  return { state: 'COMPLETED', reason: 'meets-platform-minimum', charCount, lengthBand, signedOff };
}

export function applyEpisodeLifecycle(
  input: EpisodeLifecycleInput & { now?: number },
): EpisodeManuscript {
  const decision = deriveEpisodeLifecycle(input);
  const previousState = input.manuscript.lifecycleState;
  const stateChanged = previousState !== decision.state;
  return {
    ...input.manuscript,
    lifecycleState: decision.state,
    lifecycleUpdatedAt: stateChanged
      ? input.now ?? Date.now()
      : input.manuscript.lifecycleUpdatedAt,
    lifecycleReason: decision.reason,
  };
}

export type EpisodeLifecycleStoryOutput<T extends EpisodeLifecycleStoryInput> =
  Omit<T, 'manuscripts' | 'shipmentStatus'> & {
    manuscripts?: EpisodeManuscript[];
    shipmentStatus: ShipmentStatus;
  };

export function applyEpisodeLifecycles<T extends EpisodeLifecycleStoryInput>(
  story: T,
  options?: { now?: number; targetLang?: AppLanguage },
): EpisodeLifecycleStoryOutput<T> {
  const manuscripts = story.manuscripts?.map((manuscript) => applyEpisodeLifecycle({
    manuscript,
    publishPlatform: story.publishPlatform,
    translatedManuscripts: story.translatedManuscripts,
    targetLang: options?.targetLang,
    shipped: story.shipmentStatus === 'shipped',
    now: options?.now,
  }));

  return {
    ...story,
    manuscripts,
    shipmentStatus: deriveStoryShipmentStatus({
      ...story,
      manuscripts,
    }),
  } as EpisodeLifecycleStoryOutput<T>;
}

export function deriveStoryShipmentStatus(story: EpisodeLifecycleStoryInput): ShipmentStatus {
  if (story.shipmentStatus === 'shipped') return 'shipped';
  if (!story.manuscripts || story.manuscripts.length === 0) return 'draft';

  const readyStates: EpisodeLifecycleState[] = ['COMPLETED', 'SIGNED_OFF', 'SHIPPED'];
  const everyReady = story.manuscripts.every((manuscript) => {
    const state = deriveEpisodeLifecycle({
      manuscript,
      publishPlatform: story.publishPlatform,
      translatedManuscripts: story.translatedManuscripts,
    }).state;
    return readyStates.includes(state);
  });

  return everyReady ? 'ready' : 'draft';
}
