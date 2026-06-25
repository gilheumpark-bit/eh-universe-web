"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { logger } from "@/lib/logger";
import {
  mergeProjectSnapshots,
  normalizeChapter,
  normalizeProjectSnapshots,
  projectFingerprint,
} from "@/lib/project-normalize";
import {
  loadProjectFromCloud,
  listUserProjects,
  saveProjectToCloud,
} from "@/lib/supabase";
import { MAX_LOCAL_PROJECTS } from "@/lib/translator-constants";
import type { ChapterEntry, DomainPreset, ProjectSnapshot } from "@/types/translator";

type CloudSyncStatus = "idle" | "saving" | "ok" | "error";

type UseTranslatorProjectSyncArgs = {
  activeChapterIndex: number | null;
  apiReady: boolean;
  chapters: ChapterEntry[];
  characterProfiles: string;
  domainPreset: DomainPreset;
  from: string;
  glossary: Record<string, string>;
  glossaryText: string;
  isAuthLoaded: boolean;
  isHydrated: MutableRefObject<boolean>;
  patchActiveChapter: (patch: Record<string, unknown>) => void;
  preserveDialogueLayout: boolean;
  prevActiveChapterIndexRef: MutableRefObject<number | null>;
  projectId: string;
  projectList: ProjectSnapshot[];
  projectName: string;
  referenceIds: string[];
  result: string;
  setCloudSyncDetail: Dispatch<SetStateAction<string>>;
  setCloudSyncStatus: Dispatch<SetStateAction<CloudSyncStatus>>;
  setProjectList: Dispatch<SetStateAction<ProjectSnapshot[]>>;
  setReferenceIds: Dispatch<SetStateAction<string[]>>;
  source: string;
  storySummary: string;
  to: string;
  translationMode: "novel" | "general";
  userId: string | null;
  worldContext: string;
};

export function useTranslatorProjectSync({
  activeChapterIndex,
  apiReady,
  chapters,
  characterProfiles,
  domainPreset,
  from,
  glossary,
  glossaryText,
  isAuthLoaded,
  isHydrated,
  patchActiveChapter,
  preserveDialogueLayout,
  prevActiveChapterIndexRef,
  projectId,
  projectList,
  projectName,
  referenceIds,
  result,
  setCloudSyncDetail,
  setCloudSyncStatus,
  setProjectList,
  setReferenceIds,
  source,
  storySummary,
  to,
  translationMode,
  userId,
  worldContext,
}: UseTranslatorProjectSyncArgs) {
  useEffect(() => {
    if (!isHydrated.current || activeChapterIndex === null) return;

    if (activeChapterIndex !== prevActiveChapterIndexRef.current) {
      prevActiveChapterIndexRef.current = activeChapterIndex;
      return;
    }

    const activeChapter = chapters[activeChapterIndex];
    if (!activeChapter) return;
    if (activeChapter.content === source && activeChapter.result === result) return;

    const syncTimer = window.setTimeout(() => {
      patchActiveChapter({ content: source, result });
    }, 650);

    return () => window.clearTimeout(syncTimer);
  }, [activeChapterIndex, chapters, isHydrated, patchActiveChapter, prevActiveChapterIndexRef, result, source]);

  useEffect(() => {
    if (!isHydrated.current) return;

    const hasMeaningfulData =
      Boolean(projectName.trim()) ||
      Boolean(chapters.length) ||
      Boolean(worldContext.trim()) ||
      Boolean(characterProfiles.trim()) ||
      Boolean(storySummary.trim());

    if (!hasMeaningfulData) return;

    const snapshotBase = {
      id: projectId,
      project_name: projectName.trim() || `Project ${projectId.slice(-4)}`,
      chapters: chapters.map((chapter, index) => normalizeChapter(chapter, `Part ${index + 1}`)),
      worldContext,
      characterProfiles,
      storySummary,
      from,
      to,
    } satisfies Omit<ProjectSnapshot, "updated_at">;

    const syncTimer = window.setTimeout(() => {
      setProjectList((previous) => {
        const existingIndex = previous.findIndex((project) => project.id === projectId);
        const nextFingerprint = projectFingerprint(snapshotBase);
        const existingFingerprint =
          existingIndex >= 0
            ? projectFingerprint({
                id: previous[existingIndex].id,
                project_name: previous[existingIndex].project_name,
                chapters: previous[existingIndex].chapters,
                worldContext: previous[existingIndex].worldContext,
                characterProfiles: previous[existingIndex].characterProfiles,
                storySummary: previous[existingIndex].storySummary,
                from: previous[existingIndex].from,
                to: previous[existingIndex].to,
              })
            : "";

        if (existingFingerprint === nextFingerprint) return previous;

        const nextSnapshot: ProjectSnapshot = {
          ...snapshotBase,
          updated_at: Date.now(),
        };

        if (existingIndex >= 0) {
          const next = [...previous];
          next[existingIndex] = nextSnapshot;
          return next.sort((left, right) => right.updated_at - left.updated_at);
        }

        return [nextSnapshot, ...previous].slice(0, MAX_LOCAL_PROJECTS);
      });
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [chapters, characterProfiles, from, isHydrated, projectId, projectName, setProjectList, storySummary, to, worldContext]);

  useEffect(() => {
    if (!isHydrated.current) return;

    const syncTimer = window.setTimeout(() => {
      setReferenceIds((previous) =>
        previous.filter((referenceId) => referenceId !== projectId && projectList.some((project) => project.id === referenceId)),
      );
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [isHydrated, projectId, projectList, setReferenceIds]);

  useEffect(() => {
    if (!isHydrated.current || !isAuthLoaded || !userId || !apiReady) return;

    let cancelled = false;

    const loadCloudProjects = async () => {
      try {
        const metadata = await listUserProjects(userId);
        if (!metadata.length || cancelled) return;

        const loadedProjects = await Promise.all(
          metadata.slice(0, MAX_LOCAL_PROJECTS).map(async (projectMeta: { id: string; projectName?: string; updatedAt?: string }) => {
            const projectData = await loadProjectFromCloud(userId, projectMeta.id);
            if (!projectData) return null;

            const normalized = normalizeProjectSnapshots([
              {
                id: projectMeta.id,
                project_name: projectMeta.projectName,
                updated_at: projectMeta.updatedAt ? Date.parse(projectMeta.updatedAt) : Date.now(),
                ...projectData,
              },
            ]);

            return normalized[0] || null;
          }),
        );

        if (cancelled) return;

        const availableProjects = loadedProjects.filter((project): project is ProjectSnapshot => Boolean(project));
        if (!availableProjects.length) return;

        setProjectList((previous) => mergeProjectSnapshots(previous, availableProjects));
      } catch (error) {
        logger.error("TranslatorStudioApp", "Failed to load cloud projects", error);
      }
    };

    loadCloudProjects();

    return () => {
      cancelled = true;
    };
  }, [apiReady, isAuthLoaded, isHydrated, setProjectList, userId]);

  useEffect(() => {
    if (!isHydrated.current || !isAuthLoaded || !userId || !apiReady) return;

    const hasMeaningfulData =
      Boolean(projectName.trim()) ||
      Boolean(chapters.length) ||
      Boolean(worldContext.trim()) ||
      Boolean(characterProfiles.trim()) ||
      Boolean(storySummary.trim());

    if (!hasMeaningfulData) return;

    const saveTimer = window.setTimeout(async () => {
      setCloudSyncStatus("saving");
      setCloudSyncDetail("동기화 중...");
      try {
        const { error } = await saveProjectToCloud(userId, projectId, {
          projectId,
          projectName,
          chapters,
          activeChapterIndex,
          source,
          result,
          from,
          to,
          worldContext,
          characterProfiles,
          storySummary,
          referenceIds,
          translationMode,
          glossaryText,
          glossary,
          domainPreset,
          preserveDialogueLayout,
        });
        if (error && error !== "DB_DISABLED") {
          setCloudSyncStatus("error");
          const message =
            typeof error === "object" && error !== null && "message" in error
              ? String((error as { message?: string }).message)
              : "클라우드 저장 실패";
          setCloudSyncDetail(message);
        } else {
          setCloudSyncStatus("ok");
          setCloudSyncDetail(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }
      } catch (error) {
        logger.error("TranslatorStudioApp", "Failed to save project to cloud", error);
        setCloudSyncStatus("error");
        setCloudSyncDetail(error instanceof Error ? error.message : "클라우드 저장 실패");
      }
    }, 1800);

    return () => window.clearTimeout(saveTimer);
  }, [
    activeChapterIndex,
    apiReady,
    chapters,
    characterProfiles,
    domainPreset,
    from,
    glossary,
    glossaryText,
    isAuthLoaded,
    isHydrated,
    preserveDialogueLayout,
    projectId,
    projectName,
    referenceIds,
    result,
    setCloudSyncDetail,
    setCloudSyncStatus,
    source,
    storySummary,
    to,
    translationMode,
    userId,
    worldContext,
  ]);
}
