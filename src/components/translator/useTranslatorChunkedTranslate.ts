"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Lang } from "@/lib/LangContext";
import { splitTextIntoChunks } from "@/lib/project-normalize";
import type { TranslationMode } from "@/types/translator";
import { estimateChunkFormStability } from "./TranslatorStudioApp.helpers";
import { chunkLabel } from "./translator-status-labels";

type AlertFn = (message: string, title?: string) => Promise<void>;
type ConfirmFn = (message: string, title?: string) => Promise<boolean>;
type BuildTranslationPayloadFn = (payload: Record<string, unknown>) => Record<string, unknown>;
type EnrichPayloadFn = (
  payload: Record<string, unknown>,
  sourceText: string,
  chapterIndex: number | null,
) => Promise<Record<string, unknown>>;
type RequestTranslationFn = (payload: Record<string, unknown>) => Promise<string>;

type UseTranslatorChunkedTranslateArgs = {
  alert: AlertFn;
  confirm: ConfirmFn;
  lang: Lang;
  source: string;
  from: string;
  to: string;
  provider: string;
  translationMode: TranslationMode;
  activeChapterIndex: number | null;
  autoRegenEnabled: boolean;
  setAutoRegenAttempts: Dispatch<SetStateAction<number | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<string>>;
  getEffectiveApiKeyForProvider: (providerId: string) => string;
  buildTranslationPayload: BuildTranslationPayloadFn;
  enrichPayloadWithPipeline: EnrichPayloadFn;
  requestTranslation: RequestTranslationFn;
  recordEpisodeMemory: (sourceText: string, translatedText: string, chapterIndex: number | null) => void;
  patchActiveChapter: (patch: Record<string, unknown>) => void;
};

export function useTranslatorChunkedTranslate({
  alert,
  confirm,
  lang,
  source,
  from,
  to,
  provider,
  translationMode,
  activeChapterIndex,
  autoRegenEnabled,
  setAutoRegenAttempts,
  setLoading,
  setStatusMsg,
  setResult,
  getEffectiveApiKeyForProvider,
  buildTranslationPayload,
  enrichPayloadWithPipeline,
  requestTranslation,
  recordEpisodeMemory,
  patchActiveChapter,
}: UseTranslatorChunkedTranslateArgs) {
  return async () => {
    if (!source.trim()) return;
    const ok = await confirm(
      "긴 원고를 약 6000자 단위로 나눠 순서대로 번역한 뒤 이어 붙입니다. 계속할까요?",
      "분할 번역",
    );
    if (!ok) return;
    const chunks = splitTextIntoChunks(source, 6000, 400);
    setLoading(true);
    let accumulated = "";
    try {
      let totalAutoRegenAttempts = 0;
      const cpModule = await import("@/lib/creative-process").catch(() => null);
      const studioProjectId = typeof window !== "undefined"
        ? window.localStorage?.getItem("noa_studio_currentProjectId") ?? null
        : null;
      for (let index = 0; index < chunks.length; index += 1) {
        setStatusMsg(chunkLabel(lang, index + 1, chunks.length, autoRegenEnabled));
        const chunkPayload = buildTranslationPayload({
          text: chunks[index],
          from,
          to,
          provider,
          apiKey: getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        });
        const enrichedChunk = index === 0
          ? await enrichPayloadWithPipeline(chunkPayload, source, activeChapterIndex)
          : chunkPayload;

        let part: string;
        if (autoRegenEnabled) {
          const translationModule = await import("@/lib/translation");
          const result = await translationModule.translateWithAutoRegen(
            async (temp: number) => requestTranslation({ ...enrichedChunk, temperature: temp }),
            async (text: string) => estimateChunkFormStability(chunks[index], text),
            { initialTemperature: 0.5, maxRetries: 2, threshold: 0.7 },
          );
          part = result.text;
          totalAutoRegenAttempts += result.attempts.length;
        } else {
          part = await requestTranslation(enrichedChunk);
        }

        accumulated += (accumulated ? "\n\n" : "") + part;
        setResult(accumulated);

        if (cpModule && studioProjectId) {
          try {
            const sourceHash = await cpModule.computeSha256Hex(part);
            const sourceId = await cpModule.recordSource({
              projectId: studioProjectId,
              sourceType: "ai_output",
              label: `Translation chunk ${index + 1}/${chunks.length} (${from}→${to})`,
              contentHash: sourceHash,
              provider: provider || "unknown",
              model: provider || "unknown",
              visibility: "private",
            });
            await cpModule.recordCreativeEvent({
              projectId: studioProjectId,
              targetType: "manuscript",
              targetId: `translate-${Date.now()}-${index}`,
              eventType: "create",
              actorType: "ai",
              actorId: provider || "unknown",
              originType: "AI_REWRITE",
              beforeHash: null,
              afterHash: sourceHash,
              sourceId,
              note: `chunk ${index + 1}/${chunks.length} (${from}→${to})${autoRegenEnabled ? " [auto-regen]" : ""}`,
            });
          } catch {
            /* 과정기록 실패가 번역 본 흐름을 막지 않는다. */
          }
        }
      }
      if (autoRegenEnabled) setAutoRegenAttempts(totalAutoRegenAttempts);
      recordEpisodeMemory(source, accumulated, activeChapterIndex);
      patchActiveChapter({ result: accumulated, isDone: true, stageProgress: 5 });
    } catch (error) {
      await alert(error instanceof Error ? error.message : "분할 번역 실패");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };
}
