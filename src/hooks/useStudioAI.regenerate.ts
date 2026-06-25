import { useCallback, type MutableRefObject } from "react";
import { analyzeManuscript, calculateQualityTag, type DirectorReport, type QualityTag } from "@/engine/director";
import { getGenreTemperature } from "@/engine/genre-presets";
import { stripEngineArtifacts } from "@/engine/pipeline";
import { loadProfile } from "@/engine/writer-profile";
import { VLLM_MODEL_ID } from "@/lib/dgx-models";
import { StudioErrorCode, classifyAsStudioError } from "@/lib/errors";
import { hasDgxService } from "@/lib/ai-providers";
import { getNarrativeDepth } from "@/lib/noa/lora-swap";
import { computeTemperature, getTemperatureOverride } from "@/lib/temperature-settings";
import type { AppLanguage, ChatSession } from "@/lib/studio-types";
import { logger } from "@/lib/logger";
import { buildWritingContextPack } from "@/lib/writing-workspace/context-pack";
import { assembleNoaPrompt } from "@/lib/writing-workspace/noa-prompt-assembly";
import { generateStoryStream } from "@/services/geminiService";
import {
  buildComplianceGatePatch,
  buildExternalCraftLeakNotice,
  buildIntentMemoryPrefix,
  buildMetaContextPrefix,
  buildNoaCriticalRules,
  buildStoryContextPrefix,
  buildWritingBaselinePrefix,
  isGenerationRetryable,
  pickContextBlock,
  scanExternalCraftLeaks,
} from "./useStudioAI.helpers";
import {
  applyRegenerationResultToSessions,
  buildConfigWithSimulatorGenres,
  runRegenerationAuditSideEffects,
  saveWriterProfileForRegeneration,
} from "./useStudioAI.postprocess";

type SetSessions = React.Dispatch<React.SetStateAction<ChatSession[]>> | ((updater: (prev: ChatSession[]) => ChatSession[]) => void);

interface UseStudioAIRegenerateArgs {
  isGenerating: boolean;
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  currentProjectId: string | null;
  language: AppLanguage;
  setSessions: SetSessions;
  setLastReport: (report: import("@/engine/types").EngineReport | null) => void;
  setDirectorReport: (report: DirectorReport | null) => void;
  setShowApiKeyModal: (val: boolean) => void;
  setUxError: (err: { error: unknown; retry?: () => void } | null) => void;
  generationLockRef: MutableRefObject<boolean>;
  abortControllerRef: MutableRefObject<AbortController | null>;
  setIsGenerating: (generating: boolean) => void;
}

export function useStudioAIRegenerate({
  isGenerating,
  currentSessionId,
  currentSession,
  currentProjectId,
  language,
  setSessions,
  setLastReport,
  setDirectorReport,
  setShowApiKeyModal,
  setUxError,
  generationLockRef,
  abortControllerRef,
  setIsGenerating,
}: UseStudioAIRegenerateArgs) {
  const handleRegenerate = useCallback(async (assistantMsgId: string) => {
    if (isGenerating || !currentSessionId || !currentSession) return;
    if (generationLockRef.current) return;
    generationLockRef.current = true;
    const msgIndex = currentSession.messages.findIndex((message) => message.id === assistantMsgId);
    if (msgIndex <= 0) { generationLockRef.current = false; return; }
    const userMsg = currentSession.messages[msgIndex - 1];
    if (userMsg.role !== "user") { generationLockRef.current = false; return; }
    const historyMessages = currentSession.messages.slice(0, msgIndex - 1);

    const currentMsg = currentSession.messages[msgIndex];
    const prevVersions = currentMsg.versions ?? [];
    const savedVersions = currentMsg.content ? [...prevVersions, currentMsg.content] : prevVersions;

    setSessions((prev) => prev.map((session) => {
      if (session.id !== currentSessionId) return session;
      const messages = session.messages.map((message) =>
        message.id === assistantMsgId
          ? { ...message, content: "", meta: undefined, versions: savedVersions, currentVersionIndex: savedVersions.length }
          : message,
      );
      return { ...session, messages };
    }));
    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const capturedSessionId = currentSessionId;
    const capturedConfig = currentSession.config;

    let fullContent = "";
    try {
      const configForChat = buildConfigWithSimulatorGenres(capturedConfig);
      const regenStoryContextPrefix = await buildStoryContextPrefix(capturedConfig, language);
      const regenIntentMemoryPrefix = await buildIntentMemoryPrefix(historyMessages, language);
      const regenMetaContextPrefix = await buildMetaContextPrefix(userMsg.content, language);
      const regenWritingContextPack = buildWritingContextPack({
        config: capturedConfig,
        projectId: currentProjectId,
        sessionId: capturedSessionId,
        mode: "episode-regenerate",
      });
      if (regenWritingContextPack.hardStopReasons.length > 0) {
        generationLockRef.current = false;
        setIsGenerating(false);
        setUxError?.({
          error: new Error(`집필 기준선 검토 필요: ${regenWritingContextPack.hardStopReasons.join(" / ")}`),
          retry: () => void handleRegenerate(assistantMsgId),
        });
        return;
      }
      const regenExternalCraftReferenceBlock = pickContextBlock(regenWritingContextPack, "external-craft");
      const regenCombinedPrefix = assembleNoaPrompt({
        criticalRules: buildNoaCriticalRules(regenWritingContextPack),
        currentProjectLore: [buildWritingBaselinePrefix(regenWritingContextPack), regenStoryContextPrefix].filter(Boolean).join("\n"),
        recentContext: [regenIntentMemoryPrefix, regenMetaContextPrefix].filter(Boolean).join("\n"),
        externalCraftReferenceBlock: regenExternalCraftReferenceBlock,
        currentTask: "",
        finalAuthorCommand: "",
      });
      const result = await generateStoryStream(
        configForChat,
        userMsg.content,
        (chunk) => {
          fullContent += chunk;
          const displayContent = stripEngineArtifacts(fullContent);
          setSessions((prev) => prev.map((session) => {
            if (session.id !== capturedSessionId) return session;
            const messages = session.messages.map((message) =>
              message.id === assistantMsgId ? { ...message, content: displayContent } : message,
            );
            return { ...session, messages };
          }));
        },
        {
          language,
          signal: controller.signal,
          platform: capturedConfig.platform,
          history: historyMessages,
          storyBible: regenCombinedPrefix || undefined,
          model: hasDgxService() ? VLLM_MODEL_ID : undefined,
          temperature: computeTemperature(getGenreTemperature(capturedConfig.genre || ""), getNarrativeDepth(), getTemperatureOverride()),
        },
      );

      const { filterTrademarks } = await import("@/engine/validator");
      const ipCheck = filterTrademarks(fullContent);
      if (ipCheck.matches.length > 0) fullContent = ipCheck.filtered;

      const finalContent = stripEngineArtifacts(fullContent) || result.content;
      const compliancePatch = buildComplianceGatePatch(capturedConfig, finalContent, language);
      const externalLeakHits = scanExternalCraftLeaks(finalContent, regenExternalCraftReferenceBlock, capturedConfig);
      const externalLeakNotice = externalLeakHits.length > 0
        ? buildExternalCraftLeakNotice(externalLeakHits, language)
        : "";
      setLastReport(result.report);

      await runRegenerationAuditSideEffects({
        currentProjectId,
        capturedSessionId,
        episodeId: capturedConfig.episode ?? undefined,
        finalContent,
        language,
      });

      let dReport: DirectorReport = { findings: [], stats: {}, score: 100 };
      let qTag: QualityTag = { tag: "🟢", label: "CLEAR", visibleFindings: [] };
      try { dReport = analyzeManuscript(finalContent, capturedConfig.publishPlatform, capturedConfig.genre); } catch (err) { logger.warn("StudioAI", "analyzeManuscript failed (regenerate, non-blocking)", err); }
      qTag = calculateQualityTag(dReport, capturedConfig.narrativeIntensity || "standard");
      setDirectorReport(dReport);

      saveWriterProfileForRegeneration({
        writerProfile: loadProfile(),
        finalContent,
        resultReport: result.report,
        directorReport: dReport,
      });

      applyRegenerationResultToSessions({
        setSessions,
        capturedSessionId,
        assistantMsgId,
        externalLeakNotice,
        finalContent,
        resultReport: result.report,
        ipFilteredCount: ipCheck.matches.length,
        externalLeakHits,
        complianceReport: compliancePatch.report,
        qTag,
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") { /* user cancelled */ }
      else {
        const classified = classifyAsStudioError(error);
        if (classified.code === StudioErrorCode.KEY_MISSING || classified.code === StudioErrorCode.KEY_INVALID) {
          setShowApiKeyModal(true);
        } else {
          logger.error("StudioAI", classified);
          setUxError({ error: classified, retry: isGenerationRetryable(classified) ? () => void handleRegenerate(assistantMsgId) : undefined });
        }
      }
    } finally {
      generationLockRef.current = false;
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [
    abortControllerRef,
    currentProjectId,
    currentSession,
    currentSessionId,
    generationLockRef,
    isGenerating,
    language,
    setDirectorReport,
    setIsGenerating,
    setLastReport,
    setSessions,
    setShowApiKeyModal,
    setUxError,
  ]);
  return handleRegenerate;
}
