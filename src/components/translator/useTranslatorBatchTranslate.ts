"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { logger } from "@/lib/logger";
import type { Lang } from "@/lib/LangContext";
import type { GlossaryManager } from "@/lib/translation/glossary-manager";
import type { ChapterEntry } from "@/types/translator";
import { batchLabel } from "./translator-status-labels";

type AlertFn = (message: string, title?: string) => Promise<void>;
type ConfirmFn = (message: string, title?: string) => Promise<boolean>;
type BuildTranslationPayloadFn = (
  payload: Record<string, unknown>,
  options?: { storySummaryBase?: string; chapterIndex?: number | null },
) => Record<string, unknown>;
type EnrichPayloadFn = (
  payload: Record<string, unknown>,
  sourceText: string,
  chapterIndex: number | null,
) => Promise<Record<string, unknown>>;
type RequestTranslationFn = (payload: Record<string, unknown>) => Promise<string>;
type UpdateStoryBibleFn = (options: {
  translatedText: string;
  chapterName: string;
  chapterIndex?: number | null;
  storySummaryBase?: string;
}) => Promise<string>;

type UseTranslatorBatchTranslateArgs = {
  alert: AlertFn;
  confirm: ConfirmFn;
  lang: Lang;
  chapters: ChapterEntry[];
  from: string;
  to: string;
  provider: string;
  translationMode: "novel" | "general";
  storySummary: string;
  glossaryManagerRef: MutableRefObject<GlossaryManager>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<string>>;
  openChapter: (index: number | null, overrideChapters?: ChapterEntry[]) => void;
  patchChapterAtIndex: (index: number, patch: Record<string, unknown>) => void;
  getEffectiveApiKeyForProvider: (providerId: string) => string;
  buildTranslationPayload: BuildTranslationPayloadFn;
  enrichPayloadWithPipeline: EnrichPayloadFn;
  requestTranslation: RequestTranslationFn;
  recordEpisodeMemory: (sourceText: string, translatedText: string, chapterIndex: number | null) => void;
  updateStoryBibleAfterTranslation: UpdateStoryBibleFn;
};

export function useTranslatorBatchTranslate({
  alert,
  confirm,
  lang,
  chapters,
  from,
  to,
  provider,
  translationMode,
  storySummary,
  glossaryManagerRef,
  setLoading,
  setStatusMsg,
  setResult,
  openChapter,
  patchChapterAtIndex,
  getEffectiveApiKeyForProvider,
  buildTranslationPayload,
  enrichPayloadWithPipeline,
  requestTranslation,
  recordEpisodeMemory,
  updateStoryBibleAfterTranslation,
}: UseTranslatorBatchTranslateArgs) {
  return async () => {
    if (!chapters.length) return;
    const startBatch = await confirm(`${chapters.length}개 회차를 순차 번역할까요?`, "일괄 번역");
    if (!startBatch) return;

    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    let rollingStorySummary = storySummary;
    const glossaryManager = glossaryManagerRef.current;
    let batchGlossaryVersion = glossaryManager.version;
    try {
      for (let index = 0; index < chapters.length; index += 1) {
        const chapter = chapters[index];
        if (chapter.isDone) {
          const redo = await confirm(`${chapter.name}은(는) 이미 완료되었습니다. 재번역할까요?`, "재번역");
          if (!redo) continue;
        }

        openChapter(index);

        const currentGlossaryVersion = glossaryManager.version;
        if (currentGlossaryVersion !== batchGlossaryVersion) {
          logger.info("TranslatorStudioApp", `Glossary updated mid-batch: v${batchGlossaryVersion} → v${currentGlossaryVersion}`);
          batchGlossaryVersion = currentGlossaryVersion;
        }
        const freshGlossary = glossaryManager.getPromptInjection();

        setStatusMsg(batchLabel(lang, index + 1, chapters.length, freshGlossary ? ` [GLOSSv${currentGlossaryVersion}]` : ""));

        try {
          const batchPayload = buildTranslationPayload(
            {
              text: chapter.content,
              from,
              to,
              provider,
              apiKey: getEffectiveApiKeyForProvider(provider),
              mode: translationMode,
              glossary: freshGlossary || undefined,
            },
            { storySummaryBase: rollingStorySummary, chapterIndex: index },
          );
          const enrichedBatch = await enrichPayloadWithPipeline(batchPayload, chapter.content, index);
          const translated = await requestTranslation(enrichedBatch);
          setResult(translated);
          recordEpisodeMemory(chapter.content, translated, index);
          patchChapterAtIndex(index, { result: translated, isDone: true, stageProgress: 5 });

          if (translationMode === "novel") {
            rollingStorySummary = await updateStoryBibleAfterTranslation({
              translatedText: translated,
              chapterName: chapter.name,
              chapterIndex: index,
              storySummaryBase: rollingStorySummary,
            });
          }

          successCount += 1;
        } catch (error: unknown) {
          logger.error("TranslatorStudioApp", "Batch translate error", index, error);
          const msg = error instanceof Error ? error.message : "Error";
          patchChapterAtIndex(index, { error: msg });
          failCount += 1;
        }
      }
      await alert(`일괄 번역 종료: 성공 ${successCount}, 실패 ${failCount}`, "일괄 번역");
    } catch (error) {
      await alert(error instanceof Error ? error.message : "일괄 작업 중 치명적 오류 발생");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };
}
