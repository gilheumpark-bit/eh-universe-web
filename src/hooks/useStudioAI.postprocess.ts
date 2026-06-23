import type { Dispatch, SetStateAction } from "react";
import type { DirectorFinding, DirectorReport, QualityTag } from "@/engine/director";
import { executePipeline, getDefaultPipelineConfig, type PipelineExecution } from "@/engine/auto-pipeline";
import type { EngineReport } from "@/engine/types";
import { getDefaultSuggestionConfig, generateSuggestions } from "@/engine/proactive-suggestions";
import { buildProfileHint, saveProfile, updateProfile } from "@/engine/writer-profile";
import { hasDgxService, getActiveProvider } from "@/lib/ai-providers";
import { recordAIUsage } from "@/lib/ai-usage-tracker";
import type { AppLanguage, ChatSession, ProactiveSuggestion, StoryConfig, WriterProfile } from "@/lib/studio-types";
import { createT } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import {
  attachDraftJournal,
  recordCreativeProcessOutput,
  scanAntiSycophancyOutput,
} from "./useStudioAI.helpers";

type SetSessions = Dispatch<SetStateAction<ChatSession[]>> | ((updater: (prev: ChatSession[]) => ChatSession[]) => void);

export function buildConfigWithSimulatorGenres<T extends StoryConfig>(config: T): T {
  return {
    ...config,
    simulatorRef: {
      ...config.simulatorRef,
      genreSelections: config.worldSimData?.genreSelections || config.simulatorRef?.genreSelections,
    },
  };
}

export function runStudioPipelineGate({
  capturedConfig,
  writerProfile,
  language,
  onPipelineUpdate,
}: {
  capturedConfig: StoryConfig;
  writerProfile: WriterProfile;
  language: AppLanguage;
  onPipelineUpdate?: (result: PipelineExecution) => void;
}) {
  onPipelineUpdate?.({ id: "running", stages: [], totalDuration: 0, finalStatus: "running" } as unknown as PipelineExecution);
  const pipelineResult = executePipeline(
    { config: capturedConfig, currentEpisode: capturedConfig.episode ?? 1 },
    getDefaultPipelineConfig(writerProfile.skillLevel),
  );
  onPipelineUpdate?.(pipelineResult);

  if (pipelineResult.finalStatus !== "failed") return { pipelineResult, blockedMsg: null };

  logger.error("pipeline", "Pipeline failed at stage:", pipelineResult.blockedAt, pipelineResult.stages);
  const failedStages = pipelineResult.stages?.filter((stage) => stage.status === "failed") || [];
  const failedDetails = failedStages.map((stage) => `${stage.stage}: ${stage.warnings?.join(", ")}`).join("\n");
  const t = createT(language);
  return {
    pipelineResult,
    blockedMsg: {
      id: `sys-${Date.now()}`,
      role: "assistant" as const,
      content: `${t("system.pipelineBlocked")} (${pipelineResult.blockedAt})${failedDetails ? `\n${failedDetails}` : ""}`,
      timestamp: Date.now(),
    },
  };
}

function qualityFindings(findings: QualityTag["visibleFindings"]) {
  return findings.map((finding: DirectorFinding) => ({
    kind: finding.kind,
    severity: finding.severity,
    message: finding.message,
    lineNo: finding.lineNo,
    excerpt: finding.excerpt,
  }));
}

export async function runGenerationAuditSideEffects({
  currentProjectId,
  capturedSessionId,
  episodeId,
  targetId,
  finalContent,
  language,
}: {
  currentProjectId: string | null;
  capturedSessionId: string;
  episodeId?: number;
  targetId: string;
  finalContent: string;
  language: AppLanguage;
}) {
  try {
    await attachDraftJournal(currentProjectId);
  } catch (err) { logger.warn("StudioAI", "attachJournal failed", err); }

  try {
    const activeProv = hasDgxService() ? "dgx-qwen" : getActiveProvider();
    recordAIUsage(capturedSessionId, {
      type: "generation",
      provider: activeProv,
      charsGenerated: finalContent.length,
    });
  } catch (err) { logger.warn("StudioAI", "recordAIUsage failed", err); }

  try {
    await recordCreativeProcessOutput({
      currentProjectId,
      episodeId,
      targetId,
      finalContent,
      originType: "AI_DRAFT",
      label: "AI generation",
    });
  } catch (err) { logger.warn("StudioAI", "creative-process logging failed (non-blocking)", err); }

  try {
    await scanAntiSycophancyOutput(finalContent, language, "generation");
  } catch (err) { logger.warn("StudioAI", "anti-sycophancy scan failed (non-blocking)", err); }
}

export async function runRegenerationAuditSideEffects({
  currentProjectId,
  capturedSessionId,
  episodeId,
  finalContent,
  language,
}: {
  currentProjectId: string | null;
  capturedSessionId: string;
  episodeId?: number;
  finalContent: string;
  language: AppLanguage;
}) {
  try {
    const activeProv = hasDgxService() ? "dgx-qwen" : getActiveProvider();
    recordAIUsage(capturedSessionId, {
      type: "rewrite",
      provider: activeProv,
      charsGenerated: finalContent.length,
    });
  } catch (err) { logger.warn("StudioAI", "recordAIUsage (regenerate) failed", err); }

  try {
    await recordCreativeProcessOutput({
      currentProjectId,
      episodeId,
      targetId: `regen-${Date.now()}`,
      finalContent,
      originType: "AI_REWRITE",
      label: "AI regenerate",
    });
  } catch (err) { logger.warn("StudioAI", "creative-process logging (regenerate) failed (non-blocking)", err); }

  try {
    await scanAntiSycophancyOutput(finalContent, language, "regenerate");
  } catch (err) { logger.warn("StudioAI", "anti-sycophancy scan (regenerate) failed (non-blocking)", err); }
}

export function updateProactiveSuggestions({
  writerProfile,
  capturedConfig,
  currentSession,
  resultReport,
  language,
  onSuggestionsUpdate,
}: {
  writerProfile: WriterProfile;
  capturedConfig: StoryConfig;
  currentSession: ChatSession | null;
  resultReport: EngineReport;
  language: AppLanguage;
  onSuggestionsUpdate?: (suggestions: ProactiveSuggestion[]) => void;
}) {
  try {
    const sgConfig = getDefaultSuggestionConfig(writerProfile.skillLevel);
    const chars = capturedConfig.characters || [];
    const pastReports = (currentSession?.messages || [])
      .filter((message) => message.role === "assistant" && message.meta?.engineReport)
      .slice(-5)
      .map((message) => {
        const report = message.meta?.engineReport;
        if (!report) return { tension: 50, pacing: 60, immersion: 60, eos: 50, grade: "B" };
        return {
          tension: report.metrics?.tension ?? 50,
          pacing: report.metrics?.pacing ?? 60,
          immersion: report.metrics?.immersion ?? 60,
          eos: report.eosScore ?? 50,
          grade: report.grade ?? "B",
        };
      });
    const recentMetrics = [
      ...pastReports,
      {
        tension: resultReport.metrics.tension,
        pacing: resultReport.metrics.pacing,
        immersion: resultReport.metrics.immersion,
        eos: resultReport.eosScore,
        grade: resultReport.grade,
      },
    ];
    const characterLastAppearance: Record<string, number> = {};
    chars.forEach((character) => { characterLastAppearance[character.name] = capturedConfig.episode ?? 1; });
    const newSuggestions = generateSuggestions({
      config: capturedConfig,
      currentEpisode: capturedConfig.episode ?? 1,
      recentMetrics,
      characterNames: chars.map((character) => character.name),
      characterLastAppearance,
      language,
    }, sgConfig);
    if (newSuggestions.length > 0) onSuggestionsUpdate?.(newSuggestions);
  } catch (err) { logger.warn("StudioAI", "proactiveSuggestions failed", err); }
}

export function saveWriterProfileForGeneration({
  writerProfile,
  finalContent,
  resultReport,
  directorReport,
  language,
}: {
  writerProfile: WriterProfile;
  finalContent: string;
  resultReport: EngineReport;
  directorReport: DirectorReport;
  language: AppLanguage;
}) {
  try {
    const updated = updateProfile(writerProfile, {
      text: finalContent,
      grade: resultReport.grade,
      directorScore: directorReport.score,
      eosScore: resultReport.eosScore,
      tension: resultReport.metrics.tension,
      pacing: resultReport.metrics.pacing,
      immersion: resultReport.metrics.immersion,
      findings: directorReport.findings,
      wasRegenerated: false,
      wasOverridden: false,
    });
    saveProfile(updated);
    const hint = buildProfileHint(updated, language);
    logger.info("writer-profile", "Profile updated, hint length:", hint.length);
  } catch (err) { logger.warn("StudioAI", "writerProfile save failed", err); }
}

export function saveWriterProfileForRegeneration({
  writerProfile,
  finalContent,
  resultReport,
  directorReport,
}: {
  writerProfile: WriterProfile;
  finalContent: string;
  resultReport: EngineReport;
  directorReport: DirectorReport;
}) {
  try {
    const updated = updateProfile(writerProfile, {
      text: finalContent,
      grade: resultReport.grade,
      directorScore: directorReport.score,
      eosScore: resultReport.eosScore,
      tension: resultReport.metrics.tension,
      pacing: resultReport.metrics.pacing,
      immersion: resultReport.metrics.immersion,
      findings: directorReport.findings,
      wasRegenerated: true,
      wasOverridden: false,
    });
    saveProfile(updated);
  } catch (err) { logger.warn("StudioAI", "writerProfile save failed (regenerate)", err); }
}

export function applyGenerationResultToSessions({
  setSessions,
  capturedSessionId,
  aiMsgId,
  externalLeakNotice,
  finalContent,
  resultReport,
  ipFilteredCount,
  qTag,
  gateMeta,
  externalLeakHits,
  capturedConfig,
}: {
  setSessions: SetSessions;
  capturedSessionId: string;
  aiMsgId: string;
  externalLeakNotice: string;
  finalContent: string;
  resultReport: EngineReport;
  ipFilteredCount: number;
  qTag: QualityTag;
  gateMeta: Record<string, unknown>;
  externalLeakHits: string[];
  capturedConfig: StoryConfig;
}) {
  setSessions((prev) => prev.map((session) => {
    if (session.id !== capturedSessionId) return session;
    const assistantContent = externalLeakNotice ? `${finalContent}\n\n${externalLeakNotice}` : finalContent;
    const messages = session.messages.map((message) =>
      message.id === aiMsgId
        ? {
            ...message,
            content: assistantContent,
            meta: {
              engineReport: resultReport,
              grade: resultReport.grade,
              eosScore: resultReport.eosScore,
              metrics: resultReport.metrics,
              ipFiltered: ipFilteredCount,
              qualityTag: qTag.tag,
              qualityLabel: qTag.label,
              qualityFindings: qualityFindings(qTag.visibleFindings),
              ...gateMeta,
            },
          }
        : message,
    );
    if (finalContent.length > 100 && externalLeakHits.length === 0) {
      const episode = capturedConfig.episode;
      const existing = (session.config.manuscripts || []).find((manuscript) => manuscript.episode === episode);
      const manuscript = {
        episode,
        title: capturedConfig.title ? `${capturedConfig.title} EP.${episode}` : `EP.${episode}`,
        content: finalContent,
        charCount: finalContent.length,
        lastUpdate: Date.now(),
      };
      const manuscripts = existing
        ? (session.config.manuscripts || []).map((entry) => entry.episode === episode ? manuscript : entry)
        : [...(session.config.manuscripts || []), manuscript];
      return { ...session, messages, config: { ...session.config, manuscripts } };
    }
    return { ...session, messages };
  }));
}

export function applyRegenerationResultToSessions({
  setSessions,
  capturedSessionId,
  assistantMsgId,
  externalLeakNotice,
  finalContent,
  resultReport,
  ipFilteredCount,
  externalLeakHits,
  complianceReport,
  qTag,
}: {
  setSessions: SetSessions;
  capturedSessionId: string;
  assistantMsgId: string;
  externalLeakNotice: string;
  finalContent: string;
  resultReport: EngineReport;
  ipFilteredCount: number;
  externalLeakHits: string[];
  complianceReport: unknown;
  qTag: QualityTag;
}) {
  setSessions((prev) => prev.map((session) => {
    if (session.id !== capturedSessionId) return session;
    const assistantContent = externalLeakNotice ? `${finalContent}\n\n${externalLeakNotice}` : finalContent;
    const messages = session.messages.map((message) => {
      if (message.id !== assistantMsgId) return message;
      const updatedVersions = [...(message.versions ?? []), finalContent];
      return {
        ...message,
        content: assistantContent,
        versions: updatedVersions,
        currentVersionIndex: updatedVersions.length - 1,
        meta: {
          engineReport: resultReport,
          grade: resultReport.grade,
          eosScore: resultReport.eosScore,
          metrics: resultReport.metrics,
          ipFiltered: ipFilteredCount,
          externalCraftLeakHits: externalLeakHits,
          writingContextCompliance: complianceReport,
          qualityTag: qTag.tag,
          qualityLabel: qTag.label,
          qualityFindings: qualityFindings(qTag.visibleFindings),
        },
      };
    });
    return { ...session, messages };
  }));
}
