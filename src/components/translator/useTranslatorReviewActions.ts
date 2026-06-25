"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Lang } from "@/lib/LangContext";
import type { TranslationMode } from "@/types/translator";
import { statusLabel } from "./translator-status-labels";

type AlertFn = (message: string, title?: string) => Promise<void>;
type BuildTranslationPayloadFn = (payload: Record<string, unknown>) => Record<string, unknown>;
type EnrichPayloadFn = (
  payload: Record<string, unknown>,
  sourceText: string,
  chapterIndex: number | null,
) => Promise<Record<string, unknown>>;
type RequestTranslationFn = (
  payload: Record<string, unknown>,
  options?: { stream?: boolean; onDelta?: (text: string) => void },
) => Promise<string>;

type UseTranslatorReviewActionsArgs = {
  alert: AlertFn;
  lang: Lang;
  langKo: boolean;
  source: string;
  result: string;
  from: string;
  to: string;
  provider: string;
  translationMode: TranslationMode;
  activeChapterIndex: number | null;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<string>>;
  setBackResult: Dispatch<SetStateAction<string>>;
  setCompareResultB: Dispatch<SetStateAction<string>>;
  getEffectiveApiKeyForProvider: (providerId: string) => string;
  buildTranslationPayload: BuildTranslationPayloadFn;
  enrichPayloadWithPipeline: EnrichPayloadFn;
  requestTranslation: RequestTranslationFn;
  patchActiveChapter: (patch: Record<string, unknown>) => void;
};

export function useTranslatorReviewActions({
  alert,
  lang,
  langKo,
  source,
  result,
  from,
  to,
  provider,
  translationMode,
  activeChapterIndex,
  setLoading,
  setStatusMsg,
  setResult,
  setBackResult,
  setCompareResultB,
  getEffectiveApiKeyForProvider,
  buildTranslationPayload,
  enrichPayloadWithPipeline,
  requestTranslation,
  patchActiveChapter,
}: UseTranslatorReviewActionsArgs) {
  const refineResult = async () => {
    if (!result.trim()) return;

    setLoading(true);
    setStatusMsg(statusLabel(lang, "final-polish"));
    try {
      const hasClaudeKey = Boolean(getEffectiveApiKeyForProvider("claude"));
      const refineProvider = hasClaudeKey ? "claude" : provider;
      const refined = await requestTranslation(
        buildTranslationPayload({
          text: result,
          sourceText: source,
          stage: 5,
          from,
          to,
          provider: refineProvider,
          apiKey: getEffectiveApiKeyForProvider(refineProvider),
          mode: translationMode,
        }),
        { stream: true, onDelta: (text) => setResult(text) },
      );
      setResult(refined);
      patchActiveChapter({ result: refined, isDone: true, stageProgress: 5 });
    } catch (error) {
      await alert(error instanceof Error ? error.message : "다듬기 실패");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  const backTranslate = async () => {
    if (!result.trim()) return;

    setLoading(true);
    setStatusMsg(statusLabel(lang, "back-check"));
    try {
      const reversed = await requestTranslation({
        text: result,
        from: to,
        to: from,
        provider,
        apiKey: getEffectiveApiKeyForProvider(provider),
        mode: "general",
      });
      setBackResult(reversed);
    } catch (error) {
      await alert(error instanceof Error ? error.message : "역번역 검사 실패");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  const runCompareB = async () => {
    if (!source.trim()) return;
    const altProvider = provider === "openai" ? "claude" : "openai";
    if (!getEffectiveApiKeyForProvider(altProvider) && !getEffectiveApiKeyForProvider(provider)) {
      await alert(langKo ? "비교 B안을 만들려면 해당 엔진 연결 키를 설정해 주세요." : "Set the connection key for that engine before creating comparison B.");
      return;
    }
    setLoading(true);
    setStatusMsg(statusLabel(lang, "compare-b"));
    try {
      const compareProvider = getEffectiveApiKeyForProvider(altProvider) ? altProvider : provider;
      const enrichedB = await enrichPayloadWithPipeline(
        buildTranslationPayload({
          text: source,
          from,
          to,
          provider: compareProvider,
          apiKey: getEffectiveApiKeyForProvider(compareProvider),
          mode: translationMode,
        }),
        source,
        activeChapterIndex,
      );
      const comparison = await requestTranslation(enrichedB);
      setCompareResultB(comparison);
    } catch (error) {
      await alert(error instanceof Error ? error.message : "비교 B안 실패");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return { refineResult, backTranslate, runCompareB };
}
