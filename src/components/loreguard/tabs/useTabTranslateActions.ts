"use client";

import { useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useStudioExport } from "@/hooks/useStudioExport";
import type { EpisodeManuscript, StoryConfig } from "@/lib/studio-types";
import type { TranslationProgress } from "@/engine/translation";
import { LANGS, LANG_TO_TARGET, type LangKey, type SegStatus } from "./TabTranslate.shared";
import { fireCpLog, getCreativeLogger } from "./TabTranslate.creative-log";
import { mapStoredToSegments } from "./TabTranslate.logic";
import type { TabTranslateState } from "./useTabTranslateState";

function escapePreviewHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildProgressMap(args: {
  lang: LangKey;
  liveProgress: number;
  config: StoryConfig | null;
  activeEpisode?: number;
}): Record<LangKey, number> {
  const progressForLang = (k: LangKey): number => {
    if (k === args.lang) return args.liveProgress;
    const stored = (args.config?.translatedManuscripts ?? []).find(
      (e) => e.episode === args.activeEpisode && e.targetLang === LANG_TO_TARGET[k],
    );
    return stored ? 1 : 0;
  };

  return {
    en: progressForLang("en"),
    ja: progressForLang("ja"),
    zh: progressForLang("zh"),
  };
}

export function useTabTranslateActions(state: TabTranslateState) {
  const {
    activeManuscript,
    avgScore,
    config,
    currentProjectId,
    currentSession,
    currentSessionId,
    editDraft,
    effectiveSelected,
    glossary,
    isKO,
    lang,
    language,
    projects,
    sessions,
    setAiText,
    setAvgScore,
    setConfig,
    setCurrentProjectId,
    setCurrentSessionId,
    setProgressLabel,
    setStatuses,
    setSuggestions,
    setTranslations,
    statuses,
    suggestions,
    translations,
    triggerSave,
    writingMode,
    segments,
    aiText,
    persistTranslations,
  } = state;

  const onProgress = useCallback((p: TranslationProgress) => {
    if (p.status === "translating") setProgressLabel("번역 중…");
    else if (p.status === "scoring") setProgressLabel("품질 점검 중…");
    else if (p.status === "recreating") setProgressLabel(`재번역 중… (${p.recreateCount})`);
    else if (p.status === "done") setProgressLabel("");
    else if (p.status === "error") setProgressLabel("오류: " + (p.error ?? ""));
  }, [setProgressLabel]);

  const { translateEpisode, translateBatch, isTranslating, abort } = useTranslation({ onProgress });

  const buildPartialConfig = useCallback(() => {
    const tc = config?.translationConfig;
    return {
      targetLang: LANG_TO_TARGET[lang] as "EN" | "JP" | "CN",
      glossary: glossary.map((g) => ({ source: g.source, target: g.target, context: g.context, locked: g.locked })),
      mode: tc?.mode ?? ("fidelity" as const),
      band: tc?.band,
      scoreThreshold: tc?.scoreThreshold,
      maxRecreate: tc?.maxRecreate,
      contractionLevel: tc?.contractionLevel,
    };
  }, [config, glossary, lang]);

  const translateSegment = useCallback(
    async (segId: string, directive?: string) => {
      const seg = segments.find((s) => s.id === segId);
      if (!seg || !seg.ko.trim()) return;
      const key = lang + ":" + segId;
      setProgressLabel("번역 중…");
      const ms: EpisodeManuscript = {
        episode: activeManuscript?.episode ?? config?.episode ?? 1,
        title: activeManuscript?.title ?? currentSession?.title ?? "",
        content: directive ? `${seg.ko}\n\n[지시: ${directive}]` : seg.ko,
        charCount: seg.ko.length,
        lastUpdate: Date.now(),
      };
      const result = await translateEpisode(ms, buildPartialConfig());
      if (result?.translatedText) {
        setSuggestions((prev) => ({ ...prev, [key]: result.translatedText.trim() }));
        setStatuses((prev) => ({ ...prev, [segId]: "review" }));
        setAvgScore(result.avgScore);
      }
      setProgressLabel("");
    },
    [segments, lang, setProgressLabel, activeManuscript, config, currentSession, translateEpisode, buildPartialConfig, setSuggestions, setStatuses, setAvgScore],
  );

  const acceptSuggestion = useCallback(
    (segId: string) => {
      const key = lang + ":" + segId;
      const txt = suggestions[key];
      const nextTrans = txt ? { ...translations, [key]: txt } : translations;
      const nextStatuses: Record<string, SegStatus> = { ...statuses, [segId]: "done" };
      setTranslations(nextTrans);
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStatuses(nextStatuses);
      persistTranslations({ translations: nextTrans, statuses: nextStatuses, dirty: true });
      if (txt) {
        fireCpLog(
          getCreativeLogger()?.logAcceptAI({
            targetType: "manuscript",
            targetId: `translate:${lang}:${activeManuscript?.episode ?? 0}:${segId}`,
            episodeId: activeManuscript?.episode,
            afterContent: txt,
            decisionContext: {
              selectedAlternativeId: `translate:${lang}:${segId}`,
              selectedLabel: `${lang} 세그먼트 번역`,
              selectedContent: txt,
              reason: "작가가 현지화 문맥에 맞는 번역으로 판단해 세그먼트를 확정함",
            },
            stage: "translate",
          }),
        );
      }
    },
    [lang, suggestions, translations, statuses, setTranslations, setSuggestions, setStatuses, persistTranslations, activeManuscript],
  );

  const rejectSuggestion = useCallback(
    (segId: string) => {
      const key = lang + ":" + segId;
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStatuses((prev) => ({ ...prev, [segId]: "pending" }));
    },
    [lang, setSuggestions, setStatuses],
  );

  const handleAiSend = useCallback(() => {
    const directive = aiText.trim();
    if (!effectiveSelected) return;
    translateSegment(effectiveSelected, directive || undefined);
    setAiText("");
  }, [aiText, effectiveSelected, translateSegment, setAiText]);

  const handleTranslateAll = useCallback(async () => {
    if (!activeManuscript) return;
    setProgressLabel("일괄 번역 중…");
    const results = await translateBatch([activeManuscript], buildPartialConfig());
    const r = results[0];
    if (r?.translatedText) {
      const mapped = mapStoredToSegments(r.translatedText, undefined, segments.map((seg) => seg.id));
      const next: Record<string, string> = {};
      const nextStatus: Record<string, SegStatus> = {};
      for (const seg of segments) {
        const txt = mapped[seg.id];
        if (txt) {
          next[lang + ":" + seg.id] = txt;
          nextStatus[seg.id] = "done";
        }
      }
      setTranslations((prev) => ({ ...prev, ...next }));
      setStatuses((prev) => ({ ...prev, ...nextStatus }));
      setAvgScore(r.avgScore);
      persistTranslations({
        translations: { ...translations, ...next },
        statuses: { ...statuses, ...nextStatus },
        avgScore: r.avgScore,
        dirty: true,
      });
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "manuscript",
          targetId: `translate:${lang}:${activeManuscript.episode}:batch`,
          episodeId: activeManuscript.episode,
          afterContent: r.translatedText,
          decisionContext: {
            selectedAlternativeId: `translate:${lang}:${activeManuscript.episode}:batch`,
            selectedLabel: `${lang} 일괄 번역`,
            selectedContent: r.translatedText,
            reason: "작가가 회차 번역 흐름을 검토한 뒤 일괄 반영함",
          },
          stage: "translate",
        }),
      );
    }
    setProgressLabel("");
  }, [activeManuscript, setProgressLabel, translateBatch, buildPartialConfig, segments, lang, setTranslations, setStatuses, setAvgScore, persistTranslations, translations, statuses]);

  const addGlossary = useCallback(
    (source: string, target: string) => {
      setConfig((prev: StoryConfig) => {
        const tc = prev.translationConfig;
        const existing = tc?.glossary ?? [];
        if (existing.some((g) => g.source === source)) return prev;
        return {
          ...prev,
          translationConfig: {
            mode: tc?.mode ?? "fidelity",
            targetLang: tc?.targetLang ?? "EN",
            band: tc?.band ?? 0.5,
            scoreThreshold: tc?.scoreThreshold ?? 0.7,
            maxRecreate: tc?.maxRecreate ?? 2,
            contractionLevel: tc?.contractionLevel ?? "normal",
            glossary: [...existing, { source, target, locked: false }],
          },
        };
      });
    },
    [setConfig],
  );

  const removeGlossary = useCallback(
    (source: string) => {
      setConfig((prev: StoryConfig) => {
        const tc = prev.translationConfig;
        if (!tc) return prev;
        return {
          ...prev,
          translationConfig: { ...tc, glossary: (tc.glossary ?? []).filter((g) => g.source !== source) },
        };
      });
    },
    [setConfig],
  );

  const exportApi = useStudioExport({
    currentSession,
    sessions,
    currentSessionId,
    currentProjectId,
    projects,
    setProjects: () => {},
    setCurrentProjectId,
    setSessions: () => {},
    setCurrentSessionId,
    setActiveTab: () => {},
    isKO,
    language,
    writingMode,
    editDraft,
  });

  const handleExport = useCallback(() => {
    exportApi.exportProjectManuscripts("txt");
  }, [exportApi]);

  const handlePreview = useCallback(() => {
    const ordered = segments
      .map((s) => translations[lang + ":" + s.id] || suggestions[lang + ":" + s.id] || "")
      .filter(Boolean);
    if (ordered.length === 0) return;
    const body = ordered.map((p) => `<p>${escapePreviewHtml(p)}</p>`).join("");
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const title = escapePreviewHtml((activeManuscript?.title ?? currentSession?.title ?? "Translation") + " · " + LANGS[lang].native);
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>` +
        `<style>body{max-width:760px;margin:48px auto;padding:0 24px;font-family:serif;line-height:1.85;color:#222}h1{font-family:sans-serif;font-size:18px;color:#555}p{margin:0 0 1em}</style>` +
        `</head><body><h1>${title}</h1>${body}</body></html>`,
    );
    w.document.close();
  }, [segments, translations, suggestions, lang, activeManuscript, currentSession]);

  const handleRevert = useCallback(() => {
    const prefix = lang + ":";
    const strip = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(prefix)));
    const nextTrans = strip(translations);
    const nextStatuses: Record<string, SegStatus> = {};
    for (const seg of segments) nextStatuses[seg.id] = "pending";
    setTranslations(nextTrans);
    setSuggestions((prev) => strip(prev));
    setStatuses(nextStatuses);
    setAvgScore(null);
    persistTranslations({ translations: nextTrans, statuses: nextStatuses, avgScore: null, dirty: true });
  }, [lang, segments, translations, setTranslations, setSuggestions, setStatuses, setAvgScore, persistTranslations]);

  const handleSave = useCallback(() => {
    persistTranslations();
    triggerSave();
  }, [triggerSave, persistTranslations]);

  const doneCount = segments.filter((s) => statuses[s.id] === "done").length;
  const total = segments.length;
  const liveProgress = total > 0 ? doneCount / total : 0;
  const progressMap = buildProgressMap({ lang, liveProgress, config, activeEpisode: activeManuscript?.episode });
  const stats = { progress: liveProgress, done: doneCount, total, avgScore };

  return {
    abort,
    acceptSuggestion,
    addGlossary,
    handleAiSend,
    handleExport,
    handlePreview,
    handleRevert,
    handleSave,
    handleTranslateAll,
    isTranslating,
    progressMap,
    rejectSuggestion,
    removeGlossary,
    stats,
    translateSegment,
  };
}

export type TabTranslateActions = ReturnType<typeof useTabTranslateActions>;
