import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { extractJsonBlocks, type DockSuggestion, type DockSuggestionSource } from "@/components/loreguard/ChatCanvasDock";
import { compactDockMemoText, hashDockMemoText } from "@/components/loreguard/ChatCanvasDock.helpers";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { getCachedResponse, cacheResponse } from "@/lib/browser/ai-cache";
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import type { AcceptedImportCandidateRecord, EpisodeSceneSheet, StoryConfig } from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { fireCpLog, getCreativeLogger } from "./TabPlot.creative-log";
import { usePlotFlowGraph } from "./TabPlot.flow";
import {
  BEAT_CACHE_MODEL,
  BEAT_SUGGEST_SCHEMA,
  type BeatSuggestion,
  beatCacheMessages,
  buildAiHeaders,
  buildBeatPrompt,
  buildScenarioStructureFromImport,
  genSheetId,
  parseBeatSuggestions,
  parseImportedMainScenarioRows,
} from "./TabPlot.shared";

type PlotView = "list" | "grid" | "scene";
type SetConfig = (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;

interface UseTabPlotBoardActionsArgs {
  config: StoryConfig | null;
  sheets: EpisodeSceneSheet[];
  setConfig: SetConfig;
  setView: Dispatch<SetStateAction<PlotView>>;
  setFlowView: Dispatch<SetStateAction<boolean>>;
  closeRailIfSheet: () => void;
  hasAiAccess: boolean;
  setShowApiKeyModal: (val: boolean) => void;
}

export function useTabPlotBoardActions({
  config,
  sheets,
  setConfig,
  setView,
  setFlowView,
  closeRailIfSheet,
  hasAiAccess,
  setShowApiKeyModal,
}: UseTabPlotBoardActionsArgs) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<BeatSuggestion[]>([]);
  const [aiFromCache, setAiFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const toggleExpand = useCallback((episode: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(episode)) next.delete(episode);
      else next.add(episode);
      return next;
    });
  }, []);

  const focusEpisodeCard = useCallback((episode: number) => {
    setFlowView(false);
    setView("list");
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(episode);
      return next;
    });
  }, [setFlowView, setView]);

  const expandAll = useCallback(() => {
    setExpanded((prev) =>
      prev.size === sheets.length ? new Set() : new Set(sheets.map((sheet) => sheet.episode)),
    );
  }, [sheets]);

  const markImportCandidate = useCallback(
    (id: string, routedToStage: string, routedTargetKey: string) => {
      setConfig((prev: StoryConfig) => ({
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
      }));
    },
    [setConfig],
  );

  const routeMainScenarioImportCandidate = useCallback(
    (candidate: AcceptedImportCandidateRecord) => {
      let routedTargetKey = "episodeSceneSheets:";
      setConfig((prev: StoryConfig) => {
        const list = prev.episodeSceneSheets ?? [];
        const rows = parseImportedMainScenarioRows(candidate, list);
        const byEpisode: Record<number, EpisodeSceneSheet> = {};
        for (const sheet of list) byEpisode[sheet.episode] = sheet;
        for (const row of rows) {
          const existing = byEpisode[row.episode];
          byEpisode[row.episode] = {
            ...existing,
            ...row,
            id: existing?.id ?? row.id,
            lastUpdate: Date.now(),
          };
        }
        const nextSheets = Object.values(byEpisode).sort((a, b) => a.episode - b.episode);
        routedTargetKey = `episodeSceneSheets:${rows.map((row) => row.episode).join(",")}`;
        return {
          ...prev,
          episodeSceneSheets: nextSheets,
          mainScenarioStructure: buildScenarioStructureFromImport(candidate, rows, prev.mainScenarioStructure),
          acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
            entry.id === candidate.id
              ? {
                  ...entry,
                  routedToStage: "plot",
                  routedTargetKey,
                  routedAt: new Date().toISOString(),
                }
              : entry,
          ),
        };
      });
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: routedTargetKey,
          afterContent: candidate.excerpt || candidate.text,
          note: "import-main-scenario-adopt (TabPlot)",
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
      closeRailIfSheet();
    },
    [closeRailIfSheet, setConfig],
  );

  const addBeat = useCallback(() => {
    setConfig((prev) => {
      const list = prev.episodeSceneSheets ?? [];
      const taken = new Set(list.map((sheet) => sheet.episode));
      let nextEp = list.reduce((max, sheet) => Math.max(max, sheet.episode), 0) + 1;
      while (taken.has(nextEp)) nextEp += 1;
      const sheet: EpisodeSceneSheet = {
        id: genSheetId(),
        episode: nextEp,
        title: `새 비트 ${nextEp}`,
        lastUpdate: Date.now(),
      };
      return { ...prev, episodeSceneSheets: [...list, sheet] };
    });
    const nextEp = sheets.reduce((max, sheet) => Math.max(max, sheet.episode), 0) + 1;
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "scene",
        targetId: `beat-${nextEp}`,
        episodeId: nextEp,
        afterContent: `새 비트 ${nextEp}`,
        note: "beat-add (TabPlot)",
        stage: "plot",
      }),
    );
    markExplicitCreativeLog("scene");
  }, [setConfig, sheets]);

  const renameBeat = useCallback(
    (episode: number, title: string) => {
      setConfig((prev) => {
        const list = prev.episodeSceneSheets ?? [];
        return {
          ...prev,
          episodeSceneSheets: list.map((sheet) =>
            sheet.episode === episode ? { ...sheet, title, lastUpdate: Date.now() } : sheet,
          ),
        };
      });
      const old = sheets.find((sheet) => sheet.episode === episode);
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: `beat-${episode}`,
          episodeId: episode,
          beforeContent: old?.title || "(unknown)",
          afterContent: title,
          note: "beat-rename (TabPlot)",
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
    },
    [setConfig, sheets],
  );

  const removeBeat = useCallback(
    (episode: number) => {
      setConfig((prev) => {
        const list = prev.episodeSceneSheets ?? [];
        return { ...prev, episodeSceneSheets: list.filter((sheet) => sheet.episode !== episode) };
      });
      const removed = sheets.find((sheet) => sheet.episode === episode);
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: `beat-${episode}`,
          episodeId: episode,
          beforeContent: removed ? JSON.stringify(removed) : "(unknown)",
          afterContent: "",
          note: "beat-deleted (TabPlot)",
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
    },
    [setConfig, sheets],
  );

  const suggestBeats = useCallback(async () => {
    if (aiBusy) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    setAiBusy(true);
    setAiError(null);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const provider = getActiveProvider();
      const apiKey = getApiKey(provider);
      const prompt = buildBeatPrompt(config, sheets);
      const cacheKey = beatCacheMessages(prompt);
      const cachedText = await getCachedResponse(provider, BEAT_CACHE_MODEL, cacheKey, 0);
      if (cachedText && abortRef.current === controller) {
        try {
          const cachedParsed = parseBeatSuggestions(JSON.parse(cachedText));
          if (cachedParsed.length > 0) {
            setAiSuggestions(cachedParsed);
            setAiFromCache(true);
            return;
          }
        } catch {
          /* corrupt cache entry: continue through the network path */
        }
      }

      const resp = await fetch("/api/structured-generate", {
        method: "POST",
        headers: await buildAiHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          provider,
          prompt,
          schema: BEAT_SUGGEST_SCHEMA,
          apiKey: apiKey || undefined,
          fallback: { beats: [] },
        }),
      });
      const data: unknown = await resp.json().catch(() => null);
      if (!resp.ok) {
        const paywallMsg = checkPaywallJson(data);
        if (paywallMsg) throw new Error(paywallMsg);
        const msg =
          data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `요청 실패 (${resp.status})`;
        throw new Error(msg);
      }
      const blockedMsg = checkBlockedJson(data, "plot-ai");
      if (blockedMsg) throw new Error(blockedMsg);
      const parsed = parseBeatSuggestions(data);
      if (parsed.length === 0) {
        throw new Error("제안을 준비하지 못했습니다. 다시 시도해 주세요.");
      }
      void cacheResponse(provider, BEAT_CACHE_MODEL, cacheKey, 0, JSON.stringify(data));
      if (abortRef.current === controller) {
        setAiSuggestions(parsed);
        setAiFromCache(false);
      }
    } catch (err: unknown) {
      if (abortRef.current !== controller) return;
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setAiError(
        aborted
          ? "요청 시간이 초과되었습니다. 잠시 뒤 다시 시도해 주세요."
          : err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      clearTimeout(timeout);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setAiBusy(false);
      }
    }
  }, [aiBusy, hasAiAccess, setShowApiKeyModal, config, sheets]);

  const adoptSuggestion = useCallback(
    (suggestion: BeatSuggestion) => {
      setConfig((prev) => {
        const list = prev.episodeSceneSheets ?? [];
        const title = suggestion.title.trim();
        const existing = list.find((sheet) => sheet.title.trim() === title);
        if (existing) {
          return {
            ...prev,
            episodeSceneSheets: list.map((sheet) =>
              sheet.episode === existing.episode
                ? { ...sheet, arc: suggestion.summary || sheet.arc, lastUpdate: Date.now() }
                : sheet,
            ),
          };
        }
        const taken = new Set(list.map((sheet) => sheet.episode));
        let nextEp = list.reduce((max, sheet) => Math.max(max, sheet.episode), 0) + 1;
        while (taken.has(nextEp)) nextEp += 1;
        const sheet: EpisodeSceneSheet = {
          id: genSheetId(),
          episode: nextEp,
          title,
          arc: suggestion.summary || undefined,
          lastUpdate: Date.now(),
        };
        return { ...prev, episodeSceneSheets: [...list, sheet] };
      });
      setAiSuggestions((prev) => prev.filter((item) => item !== suggestion));
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "scene",
          targetId: `beat-${suggestion.title.trim()}`,
          afterContent: `${suggestion.title}\n${suggestion.summary}`,
          decisionContext: {
            selectedAlternativeId: `beat-${suggestion.title.trim()}`,
            selectedLabel: suggestion.title,
            selectedContent: `${suggestion.title}\n${suggestion.summary}`,
            reason: "작가가 다음 씬 흐름에 맞는 비트로 판단해 채택함",
          },
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
    },
    [setConfig],
  );

  const ignoreSuggestion = useCallback((suggestion: BeatSuggestion) => {
    setAiSuggestions((prev) => prev.filter((item) => item !== suggestion));
  }, []);

  const dockExtract = useCallback(
    (content: string): DockSuggestion[] => {
      const out: DockSuggestion[] = [];
      for (const block of extractJsonBlocks(content)) {
        for (const suggestion of parseBeatSuggestions(block)) {
          const key = `beat-${suggestion.title}`;
          if (out.some((item) => item.key === key)) continue;
          out.push({ key, label: `비트 채택: ${suggestion.title}`, apply: () => adoptSuggestion(suggestion) });
          if (out.length >= 6) return out;
        }
      }
      return out;
    },
    [adoptSuggestion],
  );

  const dockQuickExtract = useCallback(
    (source: DockSuggestionSource): DockSuggestion[] => {
      const clean = compactDockMemoText(source.content);
      if (clean.length < 18) return [];
      const hash = hashDockMemoText(clean);
      const title =
        clean
          .replace(/[.!?。！？].*$/u, "")
          .slice(0, 24)
          .trim() || "대화 메모 비트";

      return [
        {
          key: `plot-memo-${hash}`,
          label: `비트 메모 반영: ${title}`,
          apply: () => {
            let targetEpisode = 1;
            setConfig((prev) => {
              const list = prev.episodeSceneSheets ?? [];
              const taken = new Set(list.map((sheet) => sheet.episode));
              let nextEp = list.reduce((max, sheet) => Math.max(max, sheet.episode), 0) + 1;
              while (taken.has(nextEp)) nextEp += 1;
              targetEpisode = nextEp;
              const sheet: EpisodeSceneSheet = {
                id: genSheetId(),
                episode: nextEp,
                title,
                arc: clean,
                lastUpdate: Date.now(),
              };
              return { ...prev, episodeSceneSheets: [...list, sheet] };
            });
            fireCpLog(
              getCreativeLogger()?.logHumanEdit({
                targetType: "scene",
                targetId: `plot-memo-${hash}`,
                episodeId: targetEpisode,
                afterContent: clean,
                note: source.live ? "plot-live-memo-adopt" : "plot-chat-memo-adopt",
                stage: "plot",
              }),
            );
            markExplicitCreativeLog("scene");
          },
        },
      ];
    },
    [setConfig],
  );

  const dockContext = useMemo(() => {
    if (sheets.length === 0) return "현재 비트 보드: 비어 있음";
    const lines = sheets
      .slice(0, 30)
      .map((sheet) => `- ${sheet.episode}화: ${sheet.title}${sheet.arc ? ` — ${sheet.arc}` : ""}`);
    if (sheets.length > 30) lines.push(`(+${sheets.length - 30}개 생략)`);
    return `현재 비트 보드 (${sheets.length}개):\n${lines.join("\n")}`;
  }, [sheets]);

  const { flowNodes, flowEdges } = usePlotFlowGraph(sheets);

  const focusBeat = useCallback((nodeId: string) => {
    const match = /^ep-(\d+)/.exec(nodeId);
    if (match) focusEpisodeCard(Number(match[1]));
  }, [focusEpisodeCard]);

  return {
    expanded,
    setExpanded,
    aiBusy,
    aiError,
    aiSuggestions,
    aiFromCache,
    toggleExpand,
    focusEpisodeCard,
    expandAll,
    markImportCandidate,
    routeMainScenarioImportCandidate,
    addBeat,
    renameBeat,
    removeBeat,
    suggestBeats,
    adoptSuggestion,
    ignoreSuggestion,
    dockExtract,
    dockQuickExtract,
    dockContext,
    flowNodes,
    flowEdges,
    focusBeat,
  };
}
