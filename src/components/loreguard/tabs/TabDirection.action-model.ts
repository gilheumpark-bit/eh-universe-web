import type {
  AcceptedImportCandidateRecord,
  EpisodeSceneSheet,
  SceneProductionDirection,
  StoryConfig,
} from "@/lib/studio-types";
import { findSheet, upsertSheet } from "@/lib/scene-sheet/helpers";
import {
  type ProductionDirectionFieldKey,
  appendImportedNotes,
  buildProductionDirectionFromCandidate,
  parseImportedSceneRows,
} from "./TabDirection.shared";

export function markDirectionCandidateInConfig(
  prev: StoryConfig,
  id: string,
  routedToStage: string,
  routedTargetKey: string,
): StoryConfig {
  return {
    ...prev,
    acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((candidate) =>
      candidate.id === id
        ? {
            ...candidate,
            routedToStage,
            routedTargetKey,
            routedAt: new Date().toISOString(),
          }
        : candidate,
    ),
  };
}

export function routeSceneCandidateInConfig(
  prev: StoryConfig,
  candidate: AcceptedImportCandidateRecord,
  episode: number,
): StoryConfig {
  const existing = findSheet(prev, episode);
  const existingScenes = existing?.scenes ?? [];
  const importedScenes = parseImportedSceneRows(candidate, episode, existingScenes.length);
  const mergedSheet: EpisodeSceneSheet = {
    episode,
    title: existing?.title ?? prev.title ?? `${episode}화`,
    arc: existing?.arc,
    characters: existing?.characters,
    scenes: [...existingScenes, ...importedScenes],
    directionSnapshot: existing?.directionSnapshot,
    presetUsed: existing?.presetUsed,
    lastUpdate: Date.now(),
  };
  const routedTargetKey = `episode:${episode}:scenes:${importedScenes
    .map((scene) => scene.sceneId)
    .join(",")}`;
  return {
    ...upsertSheet(prev, mergedSheet),
    acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
      entry.id === candidate.id
        ? {
            ...entry,
            routedToStage: "scene-sheet",
            routedTargetKey,
            routedAt: new Date().toISOString(),
          }
        : entry,
    ),
  };
}

export function routeDirectionCandidateInConfig(
  prev: StoryConfig,
  candidate: AcceptedImportCandidateRecord,
  episode: number,
): StoryConfig {
  const existing = findSheet(prev, episode);
  const writerNotes = appendImportedNotes(prev.sceneDirection?.writerNotes, candidate);
  const snapshotWriterNotes = appendImportedNotes(existing?.directionSnapshot?.writerNotes, candidate);
  const productionDirection = buildProductionDirectionFromCandidate(
    candidate,
    prev.sceneDirection?.productionDirection ?? existing?.directionSnapshot?.productionDirection,
  );
  const mergedSheet: EpisodeSceneSheet = {
    episode,
    title: existing?.title ?? prev.title ?? `${episode}화`,
    arc: existing?.arc,
    characters: existing?.characters,
    scenes: existing?.scenes ?? [],
    directionSnapshot: {
      ...(existing?.directionSnapshot ?? {}),
      productionDirection,
      writerNotes: snapshotWriterNotes,
    },
    presetUsed: existing?.presetUsed,
    lastUpdate: Date.now(),
  };
  return {
    ...upsertSheet(
      {
        ...prev,
        sceneDirection: {
          ...(prev.sceneDirection ?? {}),
          productionDirection,
          writerNotes,
        },
      },
      mergedSheet,
    ),
    acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
      entry.id === candidate.id
        ? {
            ...entry,
            routedToStage: "direction",
            routedTargetKey: `episode:${episode}:directionSnapshot:writerNotes`,
            routedAt: new Date().toISOString(),
          }
        : entry,
    ),
  };
}

export function updateProductionDirectionInConfig(
  prev: StoryConfig,
  episode: number,
  key: ProductionDirectionFieldKey,
  value: string,
): StoryConfig {
  const existing = findSheet(prev, episode);
  const productionDirection: SceneProductionDirection = {
    ...(prev.sceneDirection?.productionDirection ?? existing?.directionSnapshot?.productionDirection ?? {}),
    [key]: value,
    updatedAt: Date.now(),
  };
  const mergedSheet: EpisodeSceneSheet = {
    episode,
    title: existing?.title ?? prev.title ?? `${episode}화`,
    arc: existing?.arc,
    characters: existing?.characters,
    scenes: existing?.scenes ?? [],
    directionSnapshot: {
      ...(existing?.directionSnapshot ?? {}),
      productionDirection,
    },
    presetUsed: existing?.presetUsed,
    lastUpdate: Date.now(),
  };
  return upsertSheet(
    {
      ...prev,
      sceneDirection: {
        ...(prev.sceneDirection ?? {}),
        productionDirection,
      },
    },
    mergedSheet,
  );
}
