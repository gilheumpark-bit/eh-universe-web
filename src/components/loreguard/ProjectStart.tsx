"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { L4 } from "@/lib/i18n";
import type { StudioEntryMode } from "@/lib/studio-entry-links";
import {
  EMPTY_DRAFT,
  GRAMMAR_REGION_BY_LANGUAGE,
  type ProjectDraft,
} from "@/components/loreguard/ProjectStart.shared";
import {
  buildNoaInterviewPrompt,
  buildProjectMetaMemo,
  draftFromStoryConfig,
  parseEpisodeGoal,
} from "@/components/loreguard/ProjectStart.draft-helpers";
import { mergeImportFileReports } from "@/components/loreguard/ProjectStart.import-helpers";
import { useProjectStartImportRuntime } from "@/components/loreguard/ProjectStart.import-runtime";
import {
  latestProjectSessionId,
  projectPrimaryStage,
} from "@/components/loreguard/ProjectStart.project-helpers";
import { useProjectStartViewModel } from "@/components/loreguard/ProjectStart.view-model";
import { ProjectStartBasisForm } from "@/components/loreguard/ProjectStartBasisForm";
import { ProjectStartBasisPanel } from "@/components/loreguard/ProjectStartBasisPanel";
import { ProjectStartEntryPanel } from "@/components/loreguard/ProjectStartEntryPanel";
import { ProjectStartImportDialog } from "@/components/loreguard/ProjectStartImportDialog";
import { ProjectStartLibraryPanel } from "@/components/loreguard/ProjectStartLibraryPanel";
import { ProjectStartReviewDialog } from "@/components/loreguard/ProjectStartReviewDialog";
import type { LoreguardTabId } from "./LoreguardShell";
import { PlatformType } from "@/lib/studio-types";
interface ProjectStartProps {
  onContinue: (stage: LoreguardTabId) => void;
  entryMode?: StudioEntryMode;
}

function scheduleEffectUpdate(work: () => void): () => void {
  let cancelled = false;
  const run = () => {
    if (!cancelled) work();
  };
  if (typeof queueMicrotask === "function") {
    queueMicrotask(run);
    return () => {
      cancelled = true;
    };
  }
  const timer = window.setTimeout(run, 0);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

export default function ProjectStart({ onContinue, entryMode = "create" }: ProjectStartProps) {
  const {
    currentSession,
    currentProjectId,
    currentProject = null,
    projects = [],
    createNewProjectWithSession = () => ({ projectId: "", sessionId: "" }),
    deleteProject = () => undefined,
    renameProject = () => undefined,
    setCurrentProjectId = () => undefined,
    setCurrentSessionId = () => undefined,
    setConfig,
    updateCurrentSession,
    setInput,
    handleSend,
    hasAiAccess,
    setShowApiKeyModal,
    triggerSave = async () => true,
    saveFlash = false,
    lastSaveTime = null,
    language,
  } = useStudio();
  const [draft, setDraft] = useState<ProjectDraft>(EMPTY_DRAFT);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingCreateTarget, setPendingCreateTarget] = useState<LoreguardTabId | null>(null);
  const [pendingCreatedSessionId, setPendingCreatedSessionId] = useState<string | null>(null);
  const [pendingSaveAfterCreate, setPendingSaveAfterCreate] = useState(false);
  const [pendingNoaPrompt, setPendingNoaPrompt] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [startMode, setStartMode] = useState<StudioEntryMode>(entryMode);
  const [showImportDialog, setShowImportDialog] = useState(entryMode === "import");
  const hydratedProjectKeyRef = useRef<string | null>(null);
  const {
    acceptedCandidateIds,
    acceptedCandidateSet,
    acceptedImportEntries,
    acceptImportCandidate,
    candidateStatuses,
    discardImportCandidate,
    finalizeAcceptImportCandidate,
    handleImportFiles,
    holdImportCandidate,
    hydrateImportStateFromConfig,
    importAlignmentWarnings,
    importBucketSummary,
    importCandidates,
    importFileReports,
    importNotice,
    resetImportWorkingState,
    reviewCandidate,
    reviewSuggestions,
    reviewWarnings,
    setImportNotice,
    setReviewCandidateId,
    visibleImportFileReports,
  } = useProjectStartImportRuntime({
    currentProjectId,
    currentSession,
    draft,
    setConfig,
    setDraft,
  });
  const projectStartBusy = pendingCreate || pendingNoaPrompt !== null;
  const {
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
  } = useProjectStartViewModel({
    currentProject,
    currentProjectId,
    deleteConfirmText,
    draft,
    language,
    lastSaveTime,
    projects,
    saveFlash,
  });

  const applyDraftToCurrentSession = useCallback(() => {
    const title = draft.title.trim();
    if (title) {
      updateCurrentSession({ title });
      if (currentProjectId) renameProject(currentProjectId, title);
    }
    const projectMetaMemo = buildProjectMetaMemo(draft);
    setConfig((prev) => ({
      ...prev,
      title: title || prev.title,
      synopsis: draft.premise.trim() || prev.synopsis,
      corePremise: draft.premise.trim() || prev.corePremise,
      setting: projectMetaMemo,
      genreMode: draft.format,
      platform: draft.format === "webtoon" ? PlatformType.MOBILE : prev.platform,
      publishPlatform: draft.publishPlatform,
      projectTargetLanguage: draft.targetLanguage,
      targetMarket: draft.targetMarket,
      releasePurpose: draft.releasePurpose,
      rightsStatus: draft.rightsStatus,
      targetEpisodeLength: draft.episodeLength.trim(),
      releaseCadence: draft.releaseCadence.trim(),
      rightsNote: draft.rightsNote.trim(),
      acceptedImportCandidates: acceptedImportEntries.length > 0
        ? acceptedImportEntries
        : prev.acceptedImportCandidates,
      importFileReports: importFileReports.length > 0
        ? mergeImportFileReports(prev.importFileReports, importFileReports)
        : prev.importFileReports,
      totalEpisodes: parseEpisodeGoal(draft.totalEpisodes, prev.totalEpisodes),
      grammarRegion: GRAMMAR_REGION_BY_LANGUAGE[draft.targetLanguage],
    }));
  }, [acceptedImportEntries, currentProjectId, draft, importFileReports, renameProject, setConfig, updateCurrentSession]);

  const runManualSave = useCallback(() => {
    window.setTimeout(() => {
      void triggerSave().then((ok) => {
        window.dispatchEvent(new CustomEvent("noa:toast", {
          detail: {
            message: ok
              ? L4(language, { ko: "작품 저장 완료", en: "Work saved", ja: "作品を保存しました", zh: "作品已保存" })
              : L4(language, { ko: "작품 저장 실패", en: "Work save failed", ja: "作品保存に失敗", zh: "作品保存失败" }),
            variant: ok ? "success" : "error",
          },
        }));
      });
    }, 0);
  }, [language, triggerSave]);

  useEffect(() => {
    if (!pendingCreate || !currentSession) return;
    if (pendingCreatedSessionId && currentSession.id !== pendingCreatedSessionId) return;
    return scheduleEffectUpdate(() => {
      applyDraftToCurrentSession();
      setPendingCreate(false);
      setPendingCreatedSessionId(null);
      const target = pendingCreateTarget;
      setPendingCreateTarget(null);
      if (pendingSaveAfterCreate) {
        setPendingSaveAfterCreate(false);
        runManualSave();
      }
      if (target) onContinue(target);
    });
  }, [applyDraftToCurrentSession, currentSession, onContinue, pendingCreate, pendingCreateTarget, pendingCreatedSessionId, pendingSaveAfterCreate, runManualSave]);

  useEffect(() => {
    if (!currentSession || pendingCreate || pendingSaveAfterCreate) return;
    const sessionId = currentSession.id ?? "session";
    const hydrationKey = `${currentProjectId ?? "no-project"}:${sessionId}`;
    if (hydratedProjectKeyRef.current === hydrationKey) return;
    hydratedProjectKeyRef.current = hydrationKey;
    // Guarded project-switch hydration: keeps the editable draft aligned without async act leakage in tests.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(draftFromStoryConfig(currentSession.config, currentSession.title, currentProject?.name));
    hydrateImportStateFromConfig(
      currentSession.config.acceptedImportCandidates ?? [],
      currentSession.config.importFileReports ?? [],
    );
  }, [
    currentProject?.name,
    currentProjectId,
    currentSession,
    hydrateImportStateFromConfig,
    pendingCreate,
    pendingSaveAfterCreate,
  ]);

  useEffect(() => {
    if (!pendingNoaPrompt || !currentSession || pendingCreate) return;
    return scheduleEffectUpdate(() => {
      handleSend(pendingNoaPrompt);
      setInput("");
      setPendingNoaPrompt(null);
    });
  }, [currentSession, handleSend, pendingCreate, pendingNoaPrompt, setInput]);

  const resetProjectWorkingState = useCallback((nextDraft: ProjectDraft = EMPTY_DRAFT) => {
    hydratedProjectKeyRef.current = null;
    setDraft(nextDraft);
    resetImportWorkingState();
    setDeleteConfirmText("");
  }, [resetImportWorkingState]);

  const createProjectFromDraft = useCallback((
    nextStage: LoreguardTabId | null = "world",
    options: { saveAfterCreate?: boolean } = {},
  ) => {
    if (projectStartBusy) return;
    const title = draft.title.trim();
    setPendingCreateTarget(nextStage);
    setPendingSaveAfterCreate(Boolean(options.saveAfterCreate));
    setPendingCreate(true);
    const created = createNewProjectWithSession({
      projectName: title || undefined,
      sessionTitle: title || undefined,
    });
    setPendingCreatedSessionId(created.sessionId);
  }, [createNewProjectWithSession, draft.title, projectStartBusy]);

  const createBlankProject = useCallback(() => {
    if (projectStartBusy) return;
    resetProjectWorkingState(EMPTY_DRAFT);
    setPendingCreateTarget(null);
    setPendingSaveAfterCreate(true);
    setPendingCreate(true);
    const created = createNewProjectWithSession();
    setPendingCreatedSessionId(created.sessionId);
  }, [createNewProjectWithSession, projectStartBusy, resetProjectWorkingState]);

  const saveCurrentOrCreateProject = useCallback((nextStage: LoreguardTabId | null = "world") => {
    if (projectStartBusy) return;
    if (currentSession) {
      applyDraftToCurrentSession();
      runManualSave();
      if (nextStage) onContinue(nextStage);
      return;
    }
    createProjectFromDraft(nextStage, { saveAfterCreate: true });
  }, [applyDraftToCurrentSession, createProjectFromDraft, currentSession, onContinue, projectStartBusy, runManualSave]);

  const continueWithNoa = useCallback(() => {
    if (projectStartBusy) return;
    const prompt = buildNoaInterviewPrompt(draft);
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      setInput(prompt);
      createProjectFromDraft("world", { saveAfterCreate: true });
      return;
    }
    setPendingNoaPrompt(prompt);
    setInput(prompt);
    createProjectFromDraft("world", { saveAfterCreate: true });
  }, [createProjectFromDraft, draft, hasAiAccess, projectStartBusy, setInput, setShowApiKeyModal]);

  const selectProjectById = useCallback((projectId: string | null) => {
    const nextProjectId = projectId || null;
    setCurrentProjectId(nextProjectId);
    const nextProject = projects.find((project) => project.id === nextProjectId) ?? null;
    setCurrentSessionId(latestProjectSessionId(nextProject));
  }, [projects, setCurrentProjectId, setCurrentSessionId]);

  const selectProject = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    selectProjectById(event.target.value || null);
  }, [selectProjectById]);

  const openProject = useCallback((projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    selectProjectById(projectId);
    onContinue(projectPrimaryStage(project));
  }, [onContinue, projects, selectProjectById]);

  const focusProjectImport = useCallback(() => {
    setStartMode("import");
    setShowImportDialog(true);
    setImportNotice(L4(language, {
      ko: "원고나 설정집 파일을 선택하세요. 검토 후 고른 항목만 작품에 반영됩니다.",
      en: "Choose manuscript or setting files. Nothing is applied until you accept a candidate.",
      ja: "資料選択ボタンから原稿や設定集を読み込んでください。採択前はプロジェクトに反映されません。",
      zh: "请通过选择资料按钮导入稿件或设定集。采纳前不会写入项目。",
    }));
  }, [language, setImportNotice]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncTimer = window.setTimeout(() => {
      setStartMode(entryMode);
      if (entryMode === "import") {
        setShowImportDialog(true);
        setImportNotice(L4(language, {
          ko: "원고나 설정집 파일을 선택하세요. 검토 후 고른 항목만 작품에 반영됩니다.",
          en: "Choose manuscript or setting files. Nothing is applied until you accept a candidate.",
          ja: "資料選択ボタンから原稿や設定集を読み込んでください。採択前はプロジェクトに反映されません。",
          zh: "请通过选择资料按钮导入稿件或设定集。采纳前不会写入项目。",
        }));
      }
    }, 0);
    const targetId = entryMode === "manage" ? "project-management" : null;
    if (!targetId) return () => window.clearTimeout(syncTimer);
    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }, 120);
    return () => {
      window.clearTimeout(syncTimer);
      window.clearTimeout(timer);
    };
  }, [entryMode, language, setImportNotice]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDeleteConfirmText("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentProjectId]);

  const saveProjectNow = useCallback(() => {
    if (!currentSession) {
      if (projectStartBusy) return;
      createProjectFromDraft(null, { saveAfterCreate: true });
      return;
    }
    applyDraftToCurrentSession();
    runManualSave();
  }, [applyDraftToCurrentSession, createProjectFromDraft, currentSession, projectStartBusy, runManualSave]);

  const deleteCurrentProject = useCallback(() => {
    if (!currentProjectId || !canDeleteCurrentProject) return;
    const deletedProjectName = currentProjectName;
    deleteProject(currentProjectId);
    setDeleteConfirmText("");
    window.dispatchEvent(new CustomEvent("noa:toast", {
      detail: {
        message: L4(language, {
          ko: `작품 삭제 완료: ${deletedProjectName}`,
          en: `Work deleted: ${deletedProjectName}`,
          ja: `作品を削除しました: ${deletedProjectName}`,
          zh: `作品已删除：${deletedProjectName}`,
        }),
        variant: "warning",
      },
    }));
  }, [canDeleteCurrentProject, currentProjectId, currentProjectName, deleteProject, language]);

  return (
    <div className={`ps-grid ps-mode-${startMode}`}>
      <section
        className="ps-interview"
        aria-label={
          startMode === "manage"
            ? L4(language, { ko: "최근 작품 열기", en: "Open recent work", ja: "最近の作品を開く", zh: "打开近期作品" })
            : startMode === "import"
              ? L4(language, { ko: "파일에서 작품 자료 가져오기", en: "Import work material from files", ja: "ファイルから作品資料を読み込む", zh: "从文件导入作品资料" })
              : L4(language, { ko: "작품 기준선 만들기", en: "Build work baseline", ja: "作品の基準線を作る", zh: "建立作品基准线" })
        }
      >
        <ProjectStartEntryPanel
          language={language}
          startMode={startMode}
          draft={draft}
          setDraft={setDraft}
          projectStartBusy={projectStartBusy}
          onModeChange={setStartMode}
          onFocusImport={focusProjectImport}
          onCreateBlankProject={() => saveCurrentOrCreateProject("world")}
          onContinueWithNoa={continueWithNoa}
        />

        <ProjectStartLibraryPanel
          language={language}
          startMode={startMode}
          hasSavedProjects={hasSavedProjects}
          savedProjectCount={sortedProjects.length}
          visibleProjectTiles={visibleProjectTiles}
          currentProjectId={currentProjectId}
          projectStartBusy={projectStartBusy}
          onCreateBlankProject={createBlankProject}
          onContinueWithNoa={continueWithNoa}
          onFocusImport={focusProjectImport}
          onSelectProjectById={selectProjectById}
          onOpenProject={openProject}
        />

      </section>

      <ProjectStartBasisPanel
        language={language}
        draft={draft}
        readiness={readiness}
        readinessLabel={readinessLabel}
        saveStateLabel={saveStateLabel}
        currentProjectName={currentProjectName}
        currentProjectId={currentProjectId}
        currentProject={currentProject}
        projects={projects}
        saveFlash={saveFlash}
        projectStartBusy={projectStartBusy}
        deleteToken={deleteToken}
        deleteConfirmText={deleteConfirmText}
        canDeleteCurrentProject={canDeleteCurrentProject}
        importCandidateCount={importCandidates.length}
        acceptedCandidateCount={acceptedCandidateIds.length}
        onSelectProject={selectProject}
        onSaveProjectNow={saveProjectNow}
        onSaveOpenWorld={() => saveCurrentOrCreateProject("world")}
        onDeleteCurrentProject={deleteCurrentProject}
        onFocusImport={focusProjectImport}
        setDeleteConfirmText={setDeleteConfirmText}
      >
        <ProjectStartBasisForm
          language={language}
          draft={draft}
          setDraft={setDraft}
          visibleMarketOptions={visibleMarketOptions}
          visiblePlatformOptions={visiblePlatformOptions}
          projectStartBusy={projectStartBusy}
          onSaveOpenWorld={() => saveCurrentOrCreateProject("world")}
        />
      </ProjectStartBasisPanel>
      <ProjectStartImportDialog
        open={showImportDialog}
        language={language}
        importNotice={importNotice}
        visibleImportFileReports={visibleImportFileReports}
        importBucketSummary={importBucketSummary}
        importCandidates={importCandidates}
        importAlignmentWarnings={importAlignmentWarnings}
        candidateStatuses={candidateStatuses}
        acceptedCandidateSet={acceptedCandidateSet}
        onClose={() => setShowImportDialog(false)}
        onImportFiles={handleImportFiles}
        onHoldCandidate={holdImportCandidate}
        onAcceptCandidate={acceptImportCandidate}
        onDiscardCandidate={discardImportCandidate}
      />
      <ProjectStartReviewDialog
        language={language}
        candidate={reviewCandidate}
        warnings={reviewWarnings}
        suggestions={reviewSuggestions}
        onClose={() => setReviewCandidateId(null)}
        onKeepBasis={finalizeAcceptImportCandidate}
        onApplyBasis={(candidate) => finalizeAcceptImportCandidate(candidate, { applyBasisSuggestions: true })}
      />
    </div>
  );
}
