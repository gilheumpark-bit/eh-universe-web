"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { logger } from "@/lib/logger";
import type { Lang } from "@/lib/LangContext";
import { mergeStoryBible } from "@/lib/project-normalize";
import { processStoryBibleOutput } from "@/lib/translation/story-bible-normalizer";
import type { ChapterEntry, HistoryEntry } from "@/types/translator";
import { statusLabel } from "./translator-status-labels";

type AlertFn = (message: string, title?: string) => Promise<void>;
type BuildTranslationPayloadFn = (
  payload: Record<string, unknown>,
  options?: { storySummaryBase?: string; chapterIndex?: number | null },
) => Record<string, unknown>;
type EnrichPayloadFn = (
  payload: Record<string, unknown>,
  sourceText: string,
  chapterIndex: number | null,
) => Promise<Record<string, unknown>>;
type RequestTranslationFn = (
  payload: Record<string, unknown>,
  options?: { stream?: boolean; onDelta?: (text: string) => void },
) => Promise<string>;

type UpdateStoryBibleOptions = {
  translatedText: string;
  chapterName: string;
  chapterIndex?: number | null;
  storySummaryBase?: string;
};

type UseTranslatorPrimaryTranslateArgs = {
  activeChapter: ChapterEntry | null;
  activeChapterIndex: number | null;
  alert: AlertFn;
  buildTranslationPayload: BuildTranslationPayloadFn;
  enrichPayloadWithPipeline: EnrichPayloadFn;
  from: string;
  getEffectiveApiKeyForProvider: (providerId: string) => string;
  lang: Lang;
  lastPrimaryTranslateAt: MutableRefObject<number>;
  patchActiveChapter: (patch: Record<string, unknown>) => void;
  patchChapterAtIndex: (index: number, patch: Record<string, unknown>) => void;
  provider: string;
  recordEpisodeMemory: (sourceText: string, translatedText: string, chapterIndex: number | null) => void;
  requestTranslation: RequestTranslationFn;
  setHistory: Dispatch<SetStateAction<HistoryEntry[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setResult: Dispatch<SetStateAction<string>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  setStorySummary: Dispatch<SetStateAction<string>>;
  source: string;
  storyBibleRequestCounter: MutableRefObject<number>;
  storySummary: string;
  to: string;
  translationMode: "novel" | "general";
};

export function useTranslatorPrimaryTranslate({
  activeChapter,
  activeChapterIndex,
  alert,
  buildTranslationPayload,
  enrichPayloadWithPipeline,
  from,
  getEffectiveApiKeyForProvider,
  lang,
  lastPrimaryTranslateAt,
  patchActiveChapter,
  patchChapterAtIndex,
  provider,
  recordEpisodeMemory,
  requestTranslation,
  setHistory,
  setLoading,
  setResult,
  setStatusMsg,
  setStorySummary,
  source,
  storyBibleRequestCounter,
  storySummary,
  to,
  translationMode,
}: UseTranslatorPrimaryTranslateArgs) {
  const updateStoryBibleAfterTranslation = async ({
    translatedText,
    chapterName,
    chapterIndex = activeChapterIndex,
    storySummaryBase = storySummary,
  }: UpdateStoryBibleOptions) => {
    if (translationMode !== "novel" || !translatedText.trim()) {
      return storySummaryBase;
    }

    const summaryProvider =
      (getEffectiveApiKeyForProvider("gemini") && "gemini") ||
      (getEffectiveApiKeyForProvider("openai") && "openai") ||
      (getEffectiveApiKeyForProvider("claude") && "claude") ||
      provider;

    const requestId = ++storyBibleRequestCounter.current;
    setStatusMsg(statusLabel(lang, "updating-story-bible"));

    try {
      const summary = await requestTranslation(
        buildTranslationPayload(
          {
            text: `[${chapterName}]\n\n${translatedText}`,
            from: to,
            to,
            provider: summaryProvider,
            apiKey: getEffectiveApiKeyForProvider(summaryProvider),
            stage: 10,
            mode: "novel",
          },
          { storySummaryBase, chapterIndex },
        ),
      );

      const { normalized: normalizedSummary } = processStoryBibleOutput(summary);
      const mergedStoryBible = mergeStoryBible(storySummaryBase, normalizedSummary);

      if (storyBibleRequestCounter.current === requestId) {
        setStorySummary(mergedStoryBible);
      }

      if (chapterIndex !== null && typeof chapterIndex === "number") {
        patchChapterAtIndex(chapterIndex, { storyNote: summary.trim() });
      }

      return mergedStoryBible;
    } catch (error) {
      logger.error("TranslatorStudioApp", "Story Bible update failed", error);
      return storySummaryBase;
    }
  };

  const translate = async () => {
    if (!source.trim()) return;
    const now = Date.now();
    if (now - lastPrimaryTranslateAt.current < 800) return;
    lastPrimaryTranslateAt.current = now;
    setLoading(true);
    setStatusMsg(statusLabel(lang, "fast-draft"));
    try {
      const enriched = await enrichPayloadWithPipeline(
        buildTranslationPayload({
          text: source,
          from,
          to,
          provider,
          apiKey: getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        }),
        source,
        activeChapterIndex,
      );
      const translated = await requestTranslation(enriched);
      setResult(translated);
      recordEpisodeMemory(source, translated, activeChapterIndex);
      patchActiveChapter({ result: translated, isDone: true, stageProgress: 5 });
      const mergedStoryBible = await updateStoryBibleAfterTranslation({
        translatedText: translated,
        chapterName: activeChapter?.name || "Current Chapter",
      });
      setHistory((prev) => [{ source, result: translated, time: Date.now(), from, to }, ...prev.slice(0, 19)]);
      if (translationMode === "novel" && mergedStoryBible !== storySummary) {
        setStatusMsg(statusLabel(lang, "story-bible-updated"));
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : "번역 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  const deepTranslate = async () => {
    if (!source.trim()) return;
    const now = Date.now();
    if (now - lastPrimaryTranslateAt.current < 800) return;
    lastPrimaryTranslateAt.current = now;
    setLoading(true);
    const stageSequence = translationMode === "novel"
      ? [
          { stage: 1, label: "FIRST DRAFT", providerId: getEffectiveApiKeyForProvider("gemini") ? "gemini" : provider },
          { stage: 2, label: "LORE ALIGN", providerId: getEffectiveApiKeyForProvider("deepseek") ? "deepseek" : provider },
          { stage: 3, label: "PROSE SHAPE", providerId: getEffectiveApiKeyForProvider("claude") ? "claude" : provider },
          { stage: 4, label: "NATIVE RESONANCE", providerId: getEffectiveApiKeyForProvider("openai") ? "openai" : provider },
          { stage: 5, label: "FINAL POLISH", providerId: getEffectiveApiKeyForProvider("claude") ? "claude" : provider },
        ]
      : [
          { stage: 1, label: "STRUCTURAL ANALYSIS", providerId: provider },
          { stage: 5, label: "FINAL ACCURACY", providerId: provider },
        ];
    try {
      let currentResult = source;
      for (const item of stageSequence) {
        setStatusMsg(item.label);
        const stagePayload = buildTranslationPayload({
          text: item.stage === 1 ? source : currentResult,
          sourceText: source,
          stage: item.stage,
          from,
          to,
          provider: item.providerId,
          apiKey: getEffectiveApiKeyForProvider(item.providerId),
          mode: translationMode,
        });
        const enrichedStage = item.stage === 1
          ? await enrichPayloadWithPipeline(stagePayload, source, activeChapterIndex)
          : stagePayload;
        currentResult = await requestTranslation(
          enrichedStage,
          { stream: true, onDelta: (streamText) => setResult(streamText) },
        );
        setResult(currentResult);
        patchActiveChapter({
          result: currentResult,
          stageProgress: item.stage,
          isDone: item.stage === 5,
        });
      }
      recordEpisodeMemory(source, currentResult, activeChapterIndex);
      const mergedStoryBible = await updateStoryBibleAfterTranslation({
        translatedText: currentResult,
        chapterName: activeChapter?.name || "Current Chapter",
      });
      setHistory((prev) => [{ source, result: currentResult, time: Date.now(), from, to }, ...prev.slice(0, 19)]);
      if (translationMode === "novel" && mergedStoryBible !== storySummary) {
        setStatusMsg(statusLabel(lang, "story-bible-updated"));
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : "Deep Pipeline 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return { updateStoryBibleAfterTranslation, translate, deepTranslate };
}
