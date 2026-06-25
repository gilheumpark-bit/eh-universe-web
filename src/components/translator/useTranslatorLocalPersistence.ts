"use client";

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { logger } from "@/lib/logger";
import {
  normalizeChapter,
  normalizeProjectSnapshots,
} from "@/lib/project-normalize";
import { sanitizeLoadedText } from "@/lib/project-sanitize";
import {
  PROJECT_LIBRARY_KEY,
  type TranslatorBackgroundMode,
  normalizeTranslatorBackgroundMode,
} from "@/lib/translator-constants";
import type {
  ChapterEntry,
  DomainPreset,
  HistoryEntry,
  ProjectSnapshot,
  TranslationMode,
} from "@/types/translator";
import {
  sanitizeTranslatorChapter,
  sanitizeTranslatorHistory,
  sanitizeTranslatorText,
} from "./TranslatorStudioApp.helpers";

type UseTranslatorLocalPersistenceArgs = {
  isHydrated: MutableRefObject<boolean>;
  projectId: string;
  setProjectId: Dispatch<SetStateAction<string>>;
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  projectList: ProjectSnapshot[];
  setProjectList: Dispatch<SetStateAction<ProjectSnapshot[]>>;
  chapters: ChapterEntry[];
  setChapters: Dispatch<SetStateAction<ChapterEntry[]>>;
  activeChapterIndex: number | null;
  setActiveChapterIndex: Dispatch<SetStateAction<number | null>>;
  source: string;
  setSource: Dispatch<SetStateAction<string>>;
  result: string;
  setResult: Dispatch<SetStateAction<string>>;
  from: string;
  setFrom: Dispatch<SetStateAction<string>>;
  to: string;
  setTo: Dispatch<SetStateAction<string>>;
  provider: string;
  setProvider: Dispatch<SetStateAction<string>>;
  history: HistoryEntry[];
  setHistory: Dispatch<SetStateAction<HistoryEntry[]>>;
  isZenMode: boolean;
  setIsZenMode: Dispatch<SetStateAction<boolean>>;
  backgroundMode: TranslatorBackgroundMode;
  setBackgroundMode: Dispatch<SetStateAction<TranslatorBackgroundMode>>;
  isCatMode: boolean;
  setIsCatMode: Dispatch<SetStateAction<boolean>>;
  translationMode: TranslationMode;
  setTranslationMode: Dispatch<SetStateAction<TranslationMode>>;
  worldContext: string;
  setWorldContext: Dispatch<SetStateAction<string>>;
  characterProfiles: string;
  setCharacterProfiles: Dispatch<SetStateAction<string>>;
  storySummary: string;
  setStorySummary: Dispatch<SetStateAction<string>>;
  referenceIds: string[];
  setReferenceIds: Dispatch<SetStateAction<string[]>>;
  glossaryText: string;
  setGlossaryText: Dispatch<SetStateAction<string>>;
  glossary: Record<string, string>;
  setGlossary: Dispatch<SetStateAction<Record<string, string>>>;
  domainPreset: DomainPreset;
  setDomainPreset: Dispatch<SetStateAction<DomainPreset>>;
  preserveDialogueLayout: boolean;
  setPreserveDialogueLayout: Dispatch<SetStateAction<boolean>>;
  apiKeys: Record<string, string>;
  setApiKeys: Dispatch<SetStateAction<Record<string, string>>>;
  setLastSavedAt: Dispatch<SetStateAction<number | null>>;
};

export function useTranslatorLocalPersistence({
  isHydrated,
  projectId,
  setProjectId,
  projectName,
  setProjectName,
  projectList,
  setProjectList,
  chapters,
  setChapters,
  activeChapterIndex,
  setActiveChapterIndex,
  source,
  setSource,
  result,
  setResult,
  from,
  setFrom,
  to,
  setTo,
  provider,
  setProvider,
  history,
  setHistory,
  isZenMode,
  setIsZenMode,
  backgroundMode,
  setBackgroundMode,
  isCatMode,
  setIsCatMode,
  translationMode,
  setTranslationMode,
  worldContext,
  setWorldContext,
  characterProfiles,
  setCharacterProfiles,
  storySummary,
  setStorySummary,
  referenceIds,
  setReferenceIds,
  glossaryText,
  setGlossaryText,
  glossary,
  setGlossary,
  domainPreset,
  setDomainPreset,
  preserveDialogueLayout,
  setPreserveDialogueLayout,
  apiKeys,
  setApiKeys,
  setLastSavedAt,
}: UseTranslatorLocalPersistenceArgs) {
  useEffect(() => {
    const savedState = localStorage.getItem("eh_translator_ui_state");
    const savedProjectLibrary = localStorage.getItem(PROJECT_LIBRARY_KEY);
    if (!savedState) {
      if (savedProjectLibrary) {
        try {
          setProjectList(normalizeProjectSnapshots(JSON.parse(savedProjectLibrary)));
        } catch (error) {
          logger.error("TranslatorStudioApp", "Failed to restore project library", error);
        }
      }
      isHydrated.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(savedState);
      const restoredProjects = normalizeProjectSnapshots(
        savedProjectLibrary ? JSON.parse(savedProjectLibrary) : parsed.projectList,
      );
      if (parsed.projectId !== undefined) setProjectId(parsed.projectId);
      if (parsed.projectName !== undefined) setProjectName(sanitizeTranslatorText(parsed.projectName));
      if (restoredProjects.length) setProjectList(restoredProjects);
      if (parsed.chapters !== undefined && Array.isArray(parsed.chapters)) {
        setChapters(
          parsed.chapters.map((chapter: Partial<ChapterEntry>, index: number) =>
            normalizeChapter(chapter, `Part ${index + 1}`),
          ),
        );
      }
      if (parsed.activeChapterIndex !== undefined) setActiveChapterIndex(parsed.activeChapterIndex);
      if (parsed.source !== undefined) setSource(sanitizeTranslatorText(parsed.source));
      if (parsed.result !== undefined) setResult(sanitizeTranslatorText(parsed.result));
      if (parsed.from !== undefined) setFrom(parsed.from);
      if (parsed.to !== undefined) setTo(parsed.to);
      if (parsed.provider !== undefined) setProvider(parsed.provider);
      if (parsed.history !== undefined && Array.isArray(parsed.history)) {
        setHistory(sanitizeTranslatorHistory(parsed.history as HistoryEntry[]));
      }
      if (parsed.isZenMode !== undefined) setIsZenMode(parsed.isZenMode);
      if (parsed.backgroundMode !== undefined) {
        setBackgroundMode(normalizeTranslatorBackgroundMode(parsed.backgroundMode));
      }
      if (parsed.isCatMode !== undefined) setIsCatMode(parsed.isCatMode);
      if (parsed.translationMode !== undefined) setTranslationMode(parsed.translationMode);
      if (parsed.worldContext !== undefined) setWorldContext(sanitizeTranslatorText(parsed.worldContext));
      if (parsed.characterProfiles !== undefined) {
        setCharacterProfiles(sanitizeTranslatorText(parsed.characterProfiles));
      }
      if (parsed.storySummary !== undefined) setStorySummary(sanitizeTranslatorText(parsed.storySummary));
      if (parsed.referenceIds !== undefined) setReferenceIds(parsed.referenceIds);
      if (parsed.glossaryText !== undefined) setGlossaryText(sanitizeTranslatorText(parsed.glossaryText));
      if (
        parsed.glossary !== undefined &&
        typeof parsed.glossary === "object" &&
        parsed.glossary !== null &&
        !Array.isArray(parsed.glossary)
      ) {
        const nextGlossary: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed.glossary as Record<string, unknown>)) {
          if (typeof key === "string" && typeof value === "string" && key.trim()) nextGlossary[key.trim()] = value;
        }
        if (Object.keys(nextGlossary).length) setGlossary(nextGlossary);
      }
      if (parsed.domainPreset !== undefined) setDomainPreset(parsed.domainPreset);
      if (parsed.preserveDialogueLayout !== undefined) setPreserveDialogueLayout(parsed.preserveDialogueLayout);
      if (
        parsed.apiKeys !== undefined &&
        typeof parsed.apiKeys === "object" &&
        parsed.apiKeys !== null &&
        !Array.isArray(parsed.apiKeys)
      ) {
        const nextKeys: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed.apiKeys as Record<string, unknown>)) {
          if (typeof key === "string" && typeof value === "string") nextKeys[key] = value;
        }
        if (Object.keys(nextKeys).length) setApiKeys(nextKeys);
      }
    } catch (error) {
      logger.error("TranslatorStudioApp", "Failed to restore state", error);
    } finally {
      isHydrated.current = true;
    }
  }, [
    isHydrated,
    setActiveChapterIndex,
    setApiKeys,
    setBackgroundMode,
    setChapters,
    setCharacterProfiles,
    setDomainPreset,
    setFrom,
    setGlossary,
    setGlossaryText,
    setHistory,
    setIsCatMode,
    setIsZenMode,
    setPreserveDialogueLayout,
    setProjectId,
    setProjectList,
    setProjectName,
    setProvider,
    setReferenceIds,
    setResult,
    setSource,
    setStorySummary,
    setTo,
    setTranslationMode,
    setWorldContext,
  ]);

  useEffect(() => {
    if (!isHydrated.current) return;

    const timeout = window.setTimeout(() => {
      localStorage.setItem("eh_translator_ui_state", JSON.stringify({
        projectId,
        projectName: sanitizeLoadedText(projectName),
        chapters: chapters.map(sanitizeTranslatorChapter),
        activeChapterIndex,
        source: sanitizeLoadedText(source),
        result: sanitizeLoadedText(result),
        from,
        to,
        provider,
        history: sanitizeTranslatorHistory(history),
        isZenMode,
        backgroundMode,
        isCatMode,
        translationMode,
        worldContext: sanitizeLoadedText(worldContext),
        characterProfiles: sanitizeLoadedText(characterProfiles),
        storySummary: sanitizeLoadedText(storySummary),
        referenceIds,
        glossaryText: sanitizeLoadedText(glossaryText),
        glossary,
        domainPreset,
        preserveDialogueLayout,
        apiKeys,
      }));
      setLastSavedAt(Date.now());
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [
    activeChapterIndex,
    apiKeys,
    backgroundMode,
    chapters,
    characterProfiles,
    domainPreset,
    from,
    glossary,
    glossaryText,
    history,
    isCatMode,
    isHydrated,
    isZenMode,
    preserveDialogueLayout,
    projectId,
    projectName,
    provider,
    referenceIds,
    result,
    setLastSavedAt,
    source,
    storySummary,
    to,
    translationMode,
    worldContext,
  ]);

  useEffect(() => {
    if (!isHydrated.current) return;

    const timeout = window.setTimeout(() => {
      localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(projectList));
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [isHydrated, projectList]);
}
