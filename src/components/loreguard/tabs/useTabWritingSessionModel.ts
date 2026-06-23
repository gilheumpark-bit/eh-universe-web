"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, ProactiveSuggestion, StoryConfig } from "@/lib/studio-types";
import type { EngineReport } from "@/engine/types";
import {
  buildProductionModel,
  buildStageLabelMap,
  buildStageStatusLabelMap,
  buildWritingMetaChips,
  buildWritingValueModel,
  type WritingMetrics,
} from "@/components/loreguard/tabs/TabWriting.derived";
import type { WritingPanelSummaryItem } from "@/components/loreguard/tabs/TabWritingRightPanel";
import type {
  SynthesisIssueRow,
  SynthesisSummary,
  VersionSnapshotRow,
  WorkQueueStage,
} from "@/components/loreguard/tabs/TabWritingStatusCards";

type DirectorReport = {
  score?: number | null;
  findings?: Array<{ kind: string }>;
} | null | undefined;

type PipelineResult = {
  stages?: WorkQueueStage[];
} | null | undefined;

export function useTabWritingSessionModel({
  activeAiResult,
  config,
  currentProjectId,
  directorReport,
  editDraft,
  formatTime,
  handleNextEpisode,
  hasAiAccess,
  language,
  lastReport,
  lastSaveTime,
  openCp,
  openExport,
  openIpAsset,
  openNoaSuggestionPoint,
  pipelineResult,
  saveFlash,
  setConfig,
  suggestions,
  versionedBackups,
  writingMetrics,
}: {
  activeAiResult: boolean;
  config: StoryConfig;
  currentProjectId: string | null;
  directorReport: DirectorReport;
  editDraft: string;
  formatTime: (ms: number) => string;
  handleNextEpisode: () => void;
  hasAiAccess: boolean;
  language: AppLanguage;
  lastReport: EngineReport | null | undefined;
  lastSaveTime: number | null;
  openCp: () => void;
  openExport: () => void;
  openIpAsset: () => void;
  openNoaSuggestionPoint: () => void;
  pipelineResult: PipelineResult;
  saveFlash: boolean;
  setConfig: Dispatch<SetStateAction<StoryConfig>>;
  suggestions: ProactiveSuggestion[];
  versionedBackups: VersionSnapshotRow[] | null | undefined;
  writingMetrics: WritingMetrics;
}) {
  const metaChips = buildWritingMetaChips(config, language);
  const activeSuggestions = suggestions.filter((s) => !s.dismissed);
  const draftCharCount = editDraft.trim().length;
  const savedEpisodeCount = (config.manuscripts ?? []).filter(
    (manuscript) => manuscript.content.trim().length > 0,
  ).length;
  const rightsReady = Boolean(config.rightsNote?.trim() || config.rightsStatus);
  const { productReadinessRows, writingValueActions } = buildWritingValueModel({
    language,
    hasAiAccess,
    currentSessionLinked: true,
    currentProjectId,
    draftCharCount,
    savedEpisodeCount,
    rightsReady,
    openNoaSuggestionPoint,
    openCp,
    openIpAsset,
    openExport,
  });
  const compactDraftCount =
    draftCharCount >= 1000 ? `${Math.round(draftCharCount / 100) / 10}k` : String(draftCharCount);
  const rightPanelSummary: readonly WritingPanelSummaryItem[] = [
    {
      label: L4(language, { ko: "원고", en: "Draft" }),
      value: compactDraftCount,
      tone: draftCharCount > 0 ? "green" : "amber",
    },
    {
      label: L4(language, { ko: "기록", en: "Log" }),
      value: draftCharCount > 0 ? L4(language, { ko: "ON", en: "ON" }) : L4(language, { ko: "대기", en: "Wait" }),
      tone: draftCharCount > 0 ? "green" : "amber",
    },
    {
      label: L4(language, { ko: "권리", en: "IP" }),
      value: rightsReady ? L4(language, { ko: "점검", en: "Check" }) : L4(language, { ko: "필요", en: "Need" }),
      tone: rightsReady ? "green" : "amber",
    },
    {
      label: L4(language, { ko: "출고", en: "Pkg" }),
      value: savedEpisodeCount > 0 ? String(savedEpisodeCount) : L4(language, { ko: "대기", en: "Wait" }),
      tone: savedEpisodeCount > 0 ? "green" : "amber",
    },
  ];

  const epNow = config.episode ?? null;
  const epTotal = config.totalEpisodes ?? null;
  const hasNextManuscript =
    epNow != null && (config.manuscripts ?? []).some((manuscript) => manuscript.episode === epNow + 1);
  const canPrevEpisode = epNow != null && epNow > 1;
  const canNextEpisode = epNow != null && (hasNextManuscript || epTotal == null || epNow < epTotal);
  const goPrevEpisode = useCallback(() => {
    if (!canPrevEpisode) return;
    setConfig((prev) => ({ ...prev, episode: Math.max(1, prev.episode - 1) }));
  }, [canPrevEpisode, setConfig]);
  const goNextEpisode = useCallback(() => {
    if (!canNextEpisode) return;
    if (hasNextManuscript) {
      setConfig((prev) => ({ ...prev, episode: prev.episode + 1 }));
    } else {
      handleNextEpisode();
    }
  }, [canNextEpisode, handleNextEpisode, hasNextManuscript, setConfig]);

  const { episodeProgressPct, productionNext, productionRows } = buildProductionModel({
    language,
    draftCharCount,
    suggestionPending: activeSuggestions.length > 0 || activeAiResult,
    writingCharCount: writingMetrics.withSpace,
    epNow,
    epTotal,
    savedEpisodeCount,
    saveFlash,
    lastSaveTime,
    formatTime,
  });

  const findings = directorReport?.findings ?? [];
  const findingByKind = findings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.kind] = (acc[finding.kind] ?? 0) + 1;
    return acc;
  }, {});
  const logSummary: SynthesisSummary | null = lastReport
    ? {
        grade: lastReport.grade,
        aiTonePercent: lastReport.aiTonePercent,
        eosScore: lastReport.eosScore,
      }
    : null;

  return {
    activeSuggestions,
    backups: versionedBackups ?? [],
    canNextEpisode,
    canPrevEpisode,
    contaminationRows: Object.entries(findingByKind),
    directorScore: directorReport?.score ?? null,
    draftCharCount,
    epNow,
    epTotal,
    episodeProgressPct,
    goNextEpisode,
    goPrevEpisode,
    hasFindings: findings.length > 0,
    logIssues:
      lastReport?.issues.map((issue) => ({
        category: issue.category,
        message: issue.message,
        severity: issue.severity,
      })) ?? ([] as SynthesisIssueRow[]),
    logSummary,
    metaChips,
    productReadinessRows,
    productionNext,
    productionRows,
    rightPanelSummary,
    stageLabel: buildStageLabelMap(language),
    stageStatusLabel: buildStageStatusLabelMap(language),
    stages: pipelineResult?.stages ?? [],
    writingValueActions,
  };
}
