import { useEffect, useRef, useState } from "react";
import { extractJsonBlocks, type DockSuggestion, type DockSuggestionSource } from "@/components/loreguard/ChatCanvasDock";
import { compactDockMemoText, hashDockMemoText } from "@/components/loreguard/ChatCanvasDock.helpers";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { lazyFirebaseAuth } from "@/lib/firebase";
import type {
  AcceptedImportCandidateRecord,
  EpisodeSceneEntry,
  EpisodeSceneSheet,
  StoryConfig,
} from "@/lib/studio-types";
import { buildAgentSystemPrompt } from "@/lib/ai/writing-agent-registry";
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import { findSheet, upsertSheet } from "@/lib/scene-sheet/helpers";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import {
  DIRECTION_AI_SCHEMA,
  DIRECTION_SCHEMA_OVERRIDE,
  type DirectionAiSuggestion,
  type ProductionDirectionFieldKey,
  buildCharacterDnaBlock,
  buildDirectionPrompt,
  buildSceneSheetBlock,
  buildStorySummaryBlock,
  fireCpLog,
  getCreativeLogger,
  parseDirectionSuggestions,
} from "./TabDirection.shared";
import {
  markDirectionCandidateInConfig,
  routeDirectionCandidateInConfig,
  routeSceneCandidateInConfig,
  updateProductionDirectionInConfig,
} from "./TabDirection.action-model";

type SetConfig = (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;

interface UseTabDirectionActionsArgs {
  isSceneSurface: boolean;
  config: StoryConfig;
  sheet: EpisodeSceneSheet | undefined;
  scenes: EpisodeSceneEntry[];
  episode: number;
  episodeTitle: string;
  sel: string;
  editingId: string | null;
  setSel: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setNavEpisode: (episode: number | null) => void;
  setConfig: SetConfig;
  closeNavIfSheet: () => void;
  hasAiAccess: boolean;
  setShowApiKeyModal: (val: boolean) => void;
}

export function useTabDirectionActions({
  isSceneSurface,
  config,
  sheet,
  scenes,
  episode,
  episodeTitle,
  sel,
  editingId,
  setSel,
  setEditingId,
  setNavEpisode,
  setConfig,
  closeNavIfSheet,
  hasAiAccess,
  setShowApiKeyModal,
}: UseTabDirectionActionsArgs) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<DirectionAiSuggestion[]>([]);
  const aiAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      aiAbortRef.current?.abort();
    };
  }, []);

  const blankEntry = (): EpisodeSceneEntry => {
    let maxSuffix = 0;
    for (const scene of scenes) {
      const match = /-(\d+)$/.exec(scene.sceneId);
      if (match) maxSuffix = Math.max(maxSuffix, parseInt(match[1], 10));
    }
    return {
      sceneId: `${episode}-${maxSuffix + 1}`,
      sceneName: "",
      characters: "",
      tone: "긴장",
      summary: "",
      purpose: "",
      conflict: "",
      publicInfo: "",
      hiddenInfo: "",
      emotionCurve: "",
      rewardBeat: "",
      hookPoint: "",
      keyDialogue: "",
      emotionPoint: "",
      nextScene: "",
    };
  };

  const writeScenes = (next: EpisodeSceneEntry[]) => {
    setConfig((prev: StoryConfig) => {
      const existing = findSheet(prev, episode);
      const merged: EpisodeSceneSheet = {
        episode,
        title: existing?.title ?? prev.title ?? `${episode}화`,
        arc: existing?.arc,
        characters: existing?.characters,
        scenes: next,
        directionSnapshot: existing?.directionSnapshot,
        presetUsed: existing?.presetUsed,
        lastUpdate: Date.now(),
      };
      return upsertSheet(prev, merged);
    });
  };

  const markImportCandidate = (
    id: string,
    routedToStage: string,
    routedTargetKey: string,
  ) => {
    setConfig((prev: StoryConfig) => markDirectionCandidateInConfig(prev, id, routedToStage, routedTargetKey));
  };

  const routeSceneImportCandidate = (candidate: AcceptedImportCandidateRecord) => {
    setConfig((prev: StoryConfig) => routeSceneCandidateInConfig(prev, candidate, episode));
  };

  const routeDirectionImportCandidate = (candidate: AcceptedImportCandidateRecord) => {
    setConfig((prev: StoryConfig) => routeDirectionCandidateInConfig(prev, candidate, episode));
  };

  const updateProductionDirection = (key: ProductionDirectionFieldKey, value: string) => {
    setConfig((prev: StoryConfig) => updateProductionDirectionInConfig(prev, episode, key, value));
  };

  const handleConfirm = (entry: EpisodeSceneEntry, opts?: { suppressLog?: boolean }) => {
    const before = scenes.find((scene) => scene.sceneId === entry.sceneId);
    const next = before
      ? scenes.map((scene) => (scene.sceneId === entry.sceneId ? entry : scene))
      : [...scenes, entry];
    writeScenes(next);
    setEditingId(null);
    setSel(entry.sceneId);
    if (!opts?.suppressLog) {
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: entry.sceneId,
          episodeId: episode,
          beforeContent: before ? JSON.stringify(before) : undefined,
          afterContent: JSON.stringify(entry),
          note: "scene-direction confirm (TabDirection)",
          stage: "direction",
        }),
      );
      markExplicitCreativeLog("scene");
    }
  };

  const handleDelete = (id: string) => {
    writeScenes(scenes.filter((scene) => scene.sceneId !== id));
    if (sel === id) setSel("");
    if (editingId === id) setEditingId(null);
  };

  const handlePickEpisode = (ep: number) => {
    setNavEpisode(ep);
    setSel("");
    setEditingId(null);
    closeNavIfSheet();
    aiAbortRef.current?.abort();
    setAiSuggestions([]);
    setAiError(null);
    setAiLoading(false);
  };

  const handleAiSuggest = async () => {
    if (aiLoading) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setAiLoading(true);
    setAiError(null);
    try {
      const provider = getActiveProvider();
      const apiKey = getApiKey(provider);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const auth = await lazyFirebaseAuth();
        const user = auth?.currentUser;
        if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      } catch {
        /* direct key flow can continue without a token */
      }
      const system = buildAgentSystemPrompt(
        "studio-direction",
        {
          "scene-sheet": buildSceneSheetBlock(sheet),
          "character-dna": buildCharacterDnaBlock(config.characters),
          "story-summary": buildStorySummaryBlock(config),
          extraDirectives: DIRECTION_SCHEMA_OVERRIDE,
        },
        { autoTrim: true },
      );
      const res = await fetch("/api/structured-generate", {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          provider,
          prompt: `${buildNoaSystemHeader(isSceneSurface ? "씬시트 설계자" : "씬 연출 디자이너(콘티 제안가)")}\n\n${system}\n\n${buildDirectionPrompt(config, episode, episodeTitle, scenes)}`,
          schema: DIRECTION_AI_SCHEMA,
          apiKey: apiKey || undefined,
          fallback: { suggestions: [] },
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const paywallMsg = checkPaywallJson(data);
        if (paywallMsg) throw new Error(paywallMsg);
        const serverError = (data as { error?: unknown } | null)?.error;
        throw new Error(
          typeof serverError === "string" ? serverError : `요청 실패 (HTTP ${res.status})`,
        );
      }
      const blockedMsg = checkBlockedJson(data, "direction-ai");
      if (blockedMsg) throw new Error(blockedMsg);
      const items = parseDirectionSuggestions(data);
      if (items.length === 0) {
        throw new Error("유효한 연출 제안이 반환되지 않았습니다. 다시 시도해 주세요.");
      }
      setAiSuggestions(items);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setAiError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (aiAbortRef.current === ctrl) setAiLoading(false);
    }
  };

  const adoptSuggestion = (suggestion: DirectionAiSuggestion) => {
    const entry: EpisodeSceneEntry = {
      ...blankEntry(),
      sceneName: suggestion.sceneName,
      tone: suggestion.tone,
      summary: suggestion.summary,
      purpose: suggestion.summary,
      conflict: "",
      publicInfo: suggestion.sceneName,
      hiddenInfo: "",
      emotionCurve: suggestion.emotionPoint,
      rewardBeat: "",
      hookPoint: suggestion.keyDialogue || suggestion.emotionPoint,
      keyDialogue: suggestion.keyDialogue,
      emotionPoint: suggestion.emotionPoint,
    };
    handleConfirm(entry, { suppressLog: true });
    setAiSuggestions((prev) => prev.filter((item) => item !== suggestion));
    fireCpLog(
      getCreativeLogger()?.logAcceptAI({
        targetType: "scene",
        targetId: entry.sceneId,
        episodeId: episode,
        afterContent: JSON.stringify(entry),
        decisionContext: {
          selectedAlternativeId: entry.sceneId,
          selectedLabel: suggestion.sceneName || entry.sceneName || "연출 제안",
          selectedContent: JSON.stringify(suggestion),
          reason: "작가가 해당 장면의 감정선과 후킹에 맞는 연출로 판단해 채택함",
        },
        stage: "direction",
      }),
    );
    markExplicitCreativeLog("scene");
  };

  const dismissAi = () => {
    aiAbortRef.current?.abort();
    setAiSuggestions([]);
    setAiError(null);
    setAiLoading(false);
  };

  const dockExtract = (content: string): DockSuggestion[] => {
    const out: DockSuggestion[] = [];
    for (const block of extractJsonBlocks(content)) {
      for (const suggestion of parseDirectionSuggestions(block)) {
        const key = `shot-${suggestion.sceneName}`;
        if (out.some((item) => item.key === key)) continue;
        out.push({ key, label: `씬 채택: ${suggestion.sceneName}`, apply: () => adoptSuggestion(suggestion) });
        if (out.length >= 6) return out;
      }
    }
    return out;
  };

  const dockQuickExtract = (source: DockSuggestionSource): DockSuggestion[] => {
    const clean = compactDockMemoText(source.content);
    if (clean.length < 18) return [];
    const hash = hashDockMemoText(clean);
    const labelSeed =
      clean
        .replace(/[.!?。！？].*$/u, "")
        .slice(0, 22)
        .trim() || "대화 메모";
    const noteKind = source.live ? "live-memo" : "chat-memo";

    return [
      {
        key: `${isSceneSurface ? "scene" : "direction"}-memo-${episode}-${hash}`,
        label: isSceneSurface ? `씬 메모 반영: ${labelSeed}` : `연출 노트 반영: ${labelSeed}`,
        apply: () => {
          if (isSceneSurface) {
            const entry: EpisodeSceneEntry = {
              ...blankEntry(),
              sceneName: labelSeed,
              summary: clean,
              purpose: clean,
              hookPoint: clean,
              keyDialogue: "",
              emotionPoint: "",
              nextScene: "",
            };
            handleConfirm(entry, { suppressLog: true });
            fireCpLog(
              getCreativeLogger()?.logHumanEdit({
                targetType: "scene",
                targetId: entry.sceneId,
                episodeId: episode,
                afterContent: JSON.stringify(entry),
                note: `scene-sheet-${noteKind}-adopt`,
                stage: "direction",
              }),
            );
            markExplicitCreativeLog("scene");
            return;
          }

          setConfig((prev: StoryConfig) => {
            const existing = findSheet(prev, episode);
            const currentNotes = prev.sceneDirection?.writerNotes?.trim();
            const writerNotes =
              currentNotes && !currentNotes.includes(clean)
                ? `${currentNotes}\n${clean}`
                : currentNotes || clean;
            const currentSnapshotNotes = existing?.directionSnapshot?.writerNotes?.trim();
            const snapshotWriterNotes =
              currentSnapshotNotes && !currentSnapshotNotes.includes(clean)
                ? `${currentSnapshotNotes}\n${clean}`
                : currentSnapshotNotes || clean;
            const mergedSheet: EpisodeSceneSheet = {
              episode,
              title: existing?.title ?? prev.title ?? `${episode}화`,
              arc: existing?.arc,
              characters: existing?.characters,
              scenes: existing?.scenes ?? [],
              directionSnapshot: {
                ...(existing?.directionSnapshot ?? {}),
                writerNotes: snapshotWriterNotes,
              },
              presetUsed: existing?.presetUsed,
              lastUpdate: Date.now(),
            };
            return upsertSheet(
              {
                ...prev,
                sceneDirection: {
                  ...(prev.sceneDirection ?? {}),
                  writerNotes,
                },
              },
              mergedSheet,
            );
          });
          fireCpLog(
            getCreativeLogger()?.logHumanEdit({
              targetType: "scene",
              targetId: `direction-memo-${episode}-${hash}`,
              episodeId: episode,
              afterContent: clean,
              note: `direction-${noteKind}-adopt`,
              stage: "direction",
            }),
          );
          markExplicitCreativeLog("scene");
        },
      },
    ];
  };

  return {
    aiLoading,
    aiError,
    aiSuggestions,
    blankEntry,
    markImportCandidate,
    routeSceneImportCandidate,
    routeDirectionImportCandidate,
    updateProductionDirection,
    handleConfirm,
    handleDelete,
    handlePickEpisode,
    handleAiSuggest,
    adoptSuggestion,
    dismissAi,
    dockExtract,
    dockQuickExtract,
  };
}
