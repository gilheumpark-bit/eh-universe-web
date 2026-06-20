"use client";

import { useCallback, type MutableRefObject } from "react";
import { formatRAGBlock } from "@/engine/translation";
import { logger } from "@/lib/logger";
import {
  STORY_BIBLE_LIMIT,
  REFERENCE_TEXT_LIMIT,
} from "@/lib/translator-constants";
import {
  buildMemoryPromptHint,
  detectTermDrift,
  saveGraphLocal,
  updateMemoryFromTranslation,
  type EpisodeMemoryGraph,
  type TermDriftWarning,
} from "@/lib/translation/episode-memory";
import { buildRAGTranslationContext, type RAGTranslationContext } from "@/services/ragService";
import type { TranslationProjectContext } from "@/lib/translation/project-bridge";
import { limitText } from "@/lib/project-normalize";

type ReferenceBundle = {
  context: string;
  characterProfiles: string;
  storySummary: string;
  continuityNotes: string;
  episodeContext: string;
};

type GlossaryManagerLike = {
  getPromptInjection: () => string;
};

type UseTranslatorPayloadPipelineArgs = {
  activeChapterIndex: number | null;
  chapters: Array<{ name: string; content?: string; result?: string }>;
  characterProfiles: string;
  domainPreset: string;
  glossary: Record<string, string>;
  glossaryManagerRef: MutableRefObject<GlossaryManagerLike>;
  glossaryText: string;
  memoryGraphRef: MutableRefObject<EpisodeMemoryGraph | null>;
  preserveDialogueLayout: boolean;
  projectContextRef: MutableRefObject<TranslationProjectContext | null>;
  referenceBundle: ReferenceBundle;
  referenceIds: string[];
  setDriftWarnings: (warnings: TermDriftWarning[]) => void;
  storySummary: string;
  to: string;
  translationMode: "novel" | "general";
  worldContext: string;
};

export function useTranslatorPayloadPipeline({
  activeChapterIndex,
  chapters,
  characterProfiles,
  domainPreset,
  glossary,
  glossaryManagerRef,
  glossaryText,
  memoryGraphRef,
  preserveDialogueLayout,
  projectContextRef,
  referenceBundle,
  referenceIds,
  setDriftWarnings,
  storySummary,
  to,
  translationMode,
  worldContext,
}: UseTranslatorPayloadPipelineArgs) {
  const buildEpisodeContext = useCallback((chapterIndex = activeChapterIndex) => {
    const continuityBlocks: string[] = [];

    if (chapterIndex !== null && chapterIndex > 0 && chapters[chapterIndex - 1]) {
      const previousChapter = chapters[chapterIndex - 1];
      const previousChapterText = (previousChapter.result || previousChapter.content || "").trim();

      if (previousChapterText) {
        continuityBlocks.push(
          `[현재 프로젝트 이전 화 / ${previousChapter.name}]\n${limitText(previousChapterText, 5000)}`,
        );
      }
    }

    if (referenceBundle.episodeContext) {
      continuityBlocks.push(referenceBundle.episodeContext);
    }

    return limitText(continuityBlocks.join("\n\n---\n\n"), REFERENCE_TEXT_LIMIT);
  }, [activeChapterIndex, chapters, referenceBundle.episodeContext]);

  const buildContinuityBundle = useCallback((storySummaryBase = storySummary, chapterIndex = activeChapterIndex) => ({
    context: limitText([worldContext.trim(), referenceBundle.context].filter(Boolean).join("\n\n"), 6500),
    characterProfiles: limitText(
      [characterProfiles.trim(), referenceBundle.characterProfiles].filter(Boolean).join("\n\n"),
      6500,
    ),
    storySummary: limitText(
      [storySummaryBase.trim(), referenceBundle.storySummary].filter(Boolean).join("\n\n"),
      STORY_BIBLE_LIMIT,
    ),
    continuityNotes: referenceBundle.continuityNotes,
    episodeContext: buildEpisodeContext(chapterIndex),
  }), [
    activeChapterIndex,
    buildEpisodeContext,
    characterProfiles,
    referenceBundle.characterProfiles,
    referenceBundle.context,
    referenceBundle.continuityNotes,
    referenceBundle.storySummary,
    storySummary,
    worldContext,
  ]);

  const buildTranslationPayload = useCallback((
    payload: Record<string, unknown>,
    options?: { storySummaryBase?: string; chapterIndex?: number | null },
  ) => {
    const continuity = buildContinuityBundle(options?.storySummaryBase, options?.chapterIndex ?? activeChapterIndex);

    return {
      tone: "natural",
      genre: translationMode === "novel" ? "Novel" : "General",
      context: continuity.context,
      characterProfiles: continuity.characterProfiles,
      storySummary: continuity.storySummary,
      continuityNotes: continuity.continuityNotes,
      episodeContext: continuity.episodeContext,
      referenceIds,
      glossary: glossaryManagerRef.current.getPromptInjection() || glossaryText.trim() || undefined,
      domainPreset: translationMode === "general" ? domainPreset : "general",
      preserveDialogueLayout: translationMode === "novel" ? preserveDialogueLayout : false,
      ...payload,
    };
  }, [
    activeChapterIndex,
    buildContinuityBundle,
    domainPreset,
    glossaryManagerRef,
    glossaryText,
    preserveDialogueLayout,
    referenceIds,
    translationMode,
  ]);

  const enrichPayloadWithPipeline = useCallback(async (
    payload: Record<string, unknown>,
    sourceText: string,
    chapterIndex: number | null,
  ): Promise<Record<string, unknown>> => {
    const ctx = projectContextRef.current;
    if (!ctx?.projectId || !sourceText || sourceText.trim().length < 50) {
      return payload;
    }

    const targetLangNorm = ((): "KO" | "EN" | "JP" | "CN" => {
      const targetLang = String(payload.to ?? to ?? "").toLowerCase();
      if (targetLang === "ja" || targetLang === "jp") return "JP";
      if (targetLang === "zh" || targetLang === "cn") return "CN";
      if (targetLang === "en") return "EN";
      return "KO";
    })();

    const blocks: string[] = [];
    try {
      const ragCtx: RAGTranslationContext = await buildRAGTranslationContext(
        {
          projectId: ctx.projectId,
          sourceText: sourceText.slice(0, 8000),
          characterNames: ctx.characters.map((character) => character.name).filter(Boolean),
          targetGenre: ctx.genre,
          targetLang: targetLangNorm,
          episodeNo: typeof chapterIndex === "number" ? chapterIndex + 1 : undefined,
        },
        { timeoutMs: 5000 },
      );
      const ragBlock = formatRAGBlock(ragCtx);
      if (ragBlock) blocks.push(ragBlock);
    } catch (err) {
      logger.warn("TranslatorStudioApp", "RAG context fetch failed (silent fallback)", err);
    }

    const memoryHint = buildMemoryPromptHint(memoryGraphRef.current);
    if (memoryHint) blocks.push(memoryHint);

    if (blocks.length === 0) return payload;

    const prevContext = typeof payload.context === "string" ? payload.context : "";
    const merged = [blocks.join("\n\n"), prevContext].filter(Boolean).join("\n\n");
    return { ...payload, context: merged };
  }, [memoryGraphRef, projectContextRef, to]);

  const recordEpisodeMemory = useCallback((
    sourceText: string,
    translatedText: string,
    chapterIndex: number | null,
  ) => {
    const ctx = projectContextRef.current;
    const graph = memoryGraphRef.current;
    if (!ctx || !graph || !translatedText) return;

    const episodeNo = typeof chapterIndex === "number" && chapterIndex >= 0 ? chapterIndex + 1 : 0;
    const lowerOut = translatedText.toLowerCase();
    const newPairs = Object.entries(glossary)
      .filter(([sourceTerm, targetTerm]) => sourceTerm && targetTerm && lowerOut.includes(targetTerm.toLowerCase()))
      .map(([source, target]) => ({
        source,
        target,
        episodeNo,
        isCharacter: ctx.characters.some((character) =>
          character.name === source || (character.aliases ?? []).includes(source),
        ),
      }));

    if (newPairs.length === 0) return;

    const warnings = detectTermDrift(graph, newPairs);
    if (warnings.length > 0) {
      setDriftWarnings(warnings);
      logger.warn("TranslatorStudioApp", "Term drift detected", warnings);
    }

    const updated = updateMemoryFromTranslation(graph, newPairs);
    memoryGraphRef.current = updated;
    saveGraphLocal(updated);
  }, [glossary, memoryGraphRef, projectContextRef, setDriftWarnings]);

  return {
    buildContinuityBundle,
    buildTranslationPayload,
    enrichPayloadWithPipeline,
    recordEpisodeMemory,
  };
}
