"use client";

import type { Dispatch, SetStateAction } from "react";
import { logger } from "@/lib/logger";
import type { Lang } from "@/lib/LangContext";
import { normalizeLang } from "@/lib/translation/lang-utils";
import {
  dispatchNCGNCTUpdate,
  persistNCTReport,
  runPreflightNCG,
} from "@/lib/translation/ncg-nct-runner";
import type { ChapterEntry, TranslationMode } from "@/types/translator";
import { buildDualCompletionLabel, dispatchDualPrismRejection } from "./TranslatorStudioApp.dual";
import { dualStageLabel } from "./translator-status-labels";

type AlertFn = (message: string, title?: string) => Promise<void>;
type ConfirmFn = (message: string, title?: string) => Promise<boolean>;
type BuildTranslationPayloadFn = (payload: Record<string, unknown>) => Record<string, unknown>;
type RequestTranslationFn = (payload: Record<string, unknown>) => Promise<string>;

type UseTranslatorDualTranslateArgs = {
  alert: AlertFn;
  confirm: ConfirmFn;
  lang: Lang;
  source: string;
  from: string;
  to: string;
  provider: string;
  translationMode: TranslationMode;
  glossaryText: string;
  characterProfiles: string;
  storySummary: string;
  worldContext: string;
  activeChapter: ChapterEntry | null;
  activeChapterIndex: number | null;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<string>>;
  getEffectiveApiKeyForProvider: (providerId: string) => string;
  buildTranslationPayload: BuildTranslationPayloadFn;
  requestTranslation: RequestTranslationFn;
  patchActiveChapter: (patch: Record<string, unknown>) => void;
  recordEpisodeMemory: (sourceText: string, translatedText: string, chapterIndex: number | null) => void;
};

export function useTranslatorDualTranslate({
  alert,
  confirm,
  lang,
  source,
  from,
  to,
  provider,
  translationMode,
  glossaryText,
  characterProfiles,
  storySummary,
  worldContext,
  activeChapter,
  activeChapterIndex,
  setLoading,
  setStatusMsg,
  setResult,
  getEffectiveApiKeyForProvider,
  buildTranslationPayload,
  requestTranslation,
  patchActiveChapter,
  recordEpisodeMemory,
}: UseTranslatorDualTranslateArgs) {
  return async () => {
    if (!source.trim()) return;

    const ncgPreflight = await runPreflightNCG({
      source,
      from,
      to,
      track: "dual",
      alert,
      confirm,
    });
    if (!ncgPreflight.proceed) return;

    const ok = await confirm(
      "두 안 만들기 — 원문 보존안과 현지화안을 함께 생성합니다.\n\n비용: 단일 흐름 대비 약 1.4배입니다. 계속할까요?",
      "두 안 만들기",
    );
    if (!ok) return;
    setLoading(true);
    setStatusMsg(dualStageLabel(lang, 1));
    try {
      const dualMod = await import("@/lib/translation/dual-pipeline");
      const translateFn = async (prompt: string): Promise<string> => {
        const payload = buildTranslationPayload({
          text: prompt,
          from,
          to,
          provider,
          apiKey: getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
          raw: true,
        });
        return await requestTranslation(payload);
      };

      const dualResult = await dualMod.runDualTranslation({
        text: source,
        from,
        to,
        glossary: glossaryText,
        characterProfiles,
        storySummary,
        context: worldContext,
        translateFn,
        verifyIntegrity: true,
        tensionCurve: undefined,
        onStage: (stage, track) => {
          setStatusMsg(dualStageLabel(lang, stage, track));
        },
      });

      dispatchDualPrismRejection(dualResult, lang);
      setStatusMsg(buildDualCompletionLabel(lang, dualResult));

      let nctReport: import("@/lib/translation/ncg-nct").NCTReport | null = null;
      try {
        const ncgMod = await import("@/lib/translation/ncg-nct");
        nctReport = ncgMod.runNCT({
          source,
          srcLang: normalizeLang(from),
          tgtLang: normalizeLang(to),
          faithful: dualResult.faithful ?? undefined,
          market: dualResult.market ?? undefined,
          glossary: [],
        });
        persistNCTReport(nctReport);
      } catch {
        /* NCT silent */
      }

      patchActiveChapter({
        result: dualResult.market ?? dualResult.faithful ?? "",
        resultFaithful: dualResult.faithful ?? undefined,
        resultMarket: dualResult.market ?? undefined,
        isDone: Boolean(dualResult.faithful && dualResult.market),
        stageProgress: 5,
        stageProgressFaithful: dualResult.faithful ? 5 : 0,
        stageProgressMarket: dualResult.market ? 5 : 0,
      });

      try {
        const hookMod = await import("@/lib/translation/process-record-hooks");
        await hookMod.recordDualTranslation(dualResult, {
          chapterName: activeChapter?.name ?? `Chapter ${activeChapterIndex ?? 0}`,
          chapterIndex: activeChapterIndex ?? 0,
          fromLang: from,
          toLang: to,
          provider,
        });
        if (nctReport) {
          await hookMod.recordNCTReport(nctReport, {
            chapterName: activeChapter?.name ?? `Chapter ${activeChapterIndex ?? 0}`,
            chapterIndex: activeChapterIndex ?? 0,
          });
        }
      } catch {
        /* silent */
      }

      if (dualResult.market) setResult(dualResult.market);
      else if (dualResult.faithful) setResult(dualResult.faithful);

      if (dualResult.faithfulError || dualResult.marketError) {
        const errors: string[] = [];
        if (dualResult.faithfulError) errors.push(`Faithful: ${dualResult.faithfulError}`);
        if (dualResult.marketError) errors.push(`Market: ${dualResult.marketError}`);
        await alert(`듀얼 번역 부분 실패:\n${errors.join("\n")}`);
      } else if (nctReport && nctReport.recommendation !== "publish") {
        const tag = nctReport.recommendation === "reject" ? "⚠️ 거절" : "⚠️ 검토 필요";
        const violations: string[] = [];
        if (nctReport.faithful?.status !== "pass") violations.push(`Faithful: ${nctReport.faithful?.status}`);
        if (nctReport.market?.status !== "pass") violations.push(`Market: ${nctReport.market?.status}`);
        if (nctReport.glossaryMisses.length > 0) violations.push(`Glossary 누락 ${nctReport.glossaryMisses.length}건`);
        logger.warn("NCT", tag, violations.join(" / "));
      }

      dispatchNCGNCTUpdate();
      recordEpisodeMemory(source, dualResult.market ?? dualResult.faithful ?? "", activeChapterIndex);
    } catch (error) {
      await alert(error instanceof Error ? error.message : "듀얼 번역 실패");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };
}
