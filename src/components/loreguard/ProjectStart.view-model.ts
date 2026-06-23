"use client";

import { useMemo } from "react";
import { L4 } from "@/lib/i18n";
import type { StudioContextValue } from "@/app/studio/StudioContext";
import type { ProjectDraft } from "@/components/loreguard/ProjectStart.shared";
import {
  PUBLISH_PLATFORM_OPTIONS,
  TARGET_MARKET_OPTIONS,
} from "@/components/loreguard/ProjectStart.shared";
import {
  deleteConfirmationToken,
  localeForLanguage,
} from "@/components/loreguard/ProjectStart.project-helpers";
import { PublishPlatform } from "@/lib/studio-types";

interface ProjectStartViewModelParams {
  currentProject: StudioContextValue["currentProject"];
  currentProjectId: StudioContextValue["currentProjectId"];
  deleteConfirmText: string;
  draft: ProjectDraft;
  language: StudioContextValue["language"];
  lastSaveTime: StudioContextValue["lastSaveTime"];
  projects: StudioContextValue["projects"];
  saveFlash: StudioContextValue["saveFlash"];
}

export function useProjectStartViewModel({
  currentProject,
  currentProjectId,
  deleteConfirmText,
  draft,
  language,
  lastSaveTime,
  projects,
  saveFlash,
}: ProjectStartViewModelParams) {
  const currentProjectName = currentProject?.name?.trim() || draft.title.trim() || L4(language, {
    ko: "새 작품",
    en: "New work",
    ja: "新規作品",
    zh: "新作品",
  });

  const saveStateLabel = saveFlash
    ? L4(language, { ko: "저장 중", en: "Saving", ja: "保存中", zh: "正在保存" })
    : !currentProjectId
      ? L4(language, { ko: "생성 전", en: "Not created", ja: "作成前", zh: "尚未创建" })
      : lastSaveTime
        ? `${new Date(lastSaveTime).toLocaleTimeString(localeForLanguage(language), { hour: "2-digit", minute: "2-digit" })} ${L4(language, { ko: "저장", en: "saved", ja: "保存", zh: "已保存" })}`
        : L4(language, { ko: "저장 전", en: "Not saved", ja: "未保存", zh: "尚未保存" });

  const deleteToken = deleteConfirmationToken(language);
  const canDeleteCurrentProject = Boolean(currentProjectId) && deleteConfirmText.trim() === deleteToken;

  const sortedProjects = useMemo(() => {
    return [...projects].sort((left, right) => (
      (right.lastUpdate || right.createdAt || 0) - (left.lastUpdate || left.createdAt || 0)
    ));
  }, [projects]);
  const visibleProjectTiles = sortedProjects.slice(0, 5);
  const hasSavedProjects = sortedProjects.length > 0;

  const filledCount = useMemo(() => {
    return [
      draft.title,
      draft.premise,
      draft.rightsNote,
      draft.rightsStatus,
      draft.targetLanguage,
      draft.publishPlatform !== PublishPlatform.NONE ? draft.publishPlatform : "",
      draft.totalEpisodes,
      draft.episodeLength,
    ].filter((value) => String(value).trim().length > 0).length;
  }, [draft]);

  const readiness = Math.min(100, Math.round((filledCount / 8) * 100));
  const readinessLabel = readiness === 0
    ? L4(language, { ko: "작품 시작점", en: "Work starting point", ja: "作品の出発点", zh: "作品起点" })
    : L4(language, {
      ko: `작품 기준 ${readiness}%`,
      en: `Work basis ${readiness}%`,
      ja: `作品基準 ${readiness}%`,
      zh: `作品基准 ${readiness}%`,
    });

  const visiblePlatformOptions = useMemo(
    () => PUBLISH_PLATFORM_OPTIONS.filter((option) => option.lang === "ALL" || option.lang === draft.targetLanguage),
    [draft.targetLanguage],
  );
  const visibleMarketOptions = useMemo(
    () => TARGET_MARKET_OPTIONS.filter((option) => option.lang === "ALL" || option.lang === draft.targetLanguage),
    [draft.targetLanguage],
  );

  return {
    canDeleteCurrentProject,
    currentProjectName,
    deleteToken,
    hasSavedProjects,
    readiness,
    readinessLabel,
    saveStateLabel,
    sortedProjects,
    visibleMarketOptions,
    visiblePlatformOptions,
    visibleProjectTiles,
  };
}
