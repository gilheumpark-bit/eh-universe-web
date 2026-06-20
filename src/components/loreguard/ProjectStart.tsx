"use client";

/* ===========================================================
   ProjectStart — 10단계 창작 IDE의 첫 화면

   역할:
   - 첫 진입 시 "새 작품 시작"을 바로 보여준다.
   - 중앙은 질문형 기준 잡기, 오른쪽은 실제 저장될 작품 기준표 형태를 취한다.
   - 저장 엔진은 기존 project/session manager와 setConfig 경로를 재사용한다.
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { L4 } from "@/lib/i18n";
import type { StudioEntryMode } from "@/lib/studio-entry-links";
import {
  EMPTY_DRAFT,
  GRAMMAR_REGION_BY_LANGUAGE,
  PUBLISH_PLATFORM_OPTIONS,
  TARGET_MARKET_OPTIONS,
  type ProjectDraft,
} from "@/components/loreguard/ProjectStart.shared";
import {
  buildNoaInterviewPrompt,
  buildProjectMetaMemo,
  draftFromStoryConfig,
  parseEpisodeGoal,
} from "@/components/loreguard/ProjectStart.draft-helpers";
import {
  appendCandidateToDraftValue,
  applyImportBasisSuggestionsToConfig,
  applyImportBasisSuggestionsToDraft,
  buildAcceptedImportCandidateRecord,
  isSameImportFileReportList,
  mergeImportFileReports,
  processProjectImportFiles,
  targetTypeForImport,
  upsertAcceptedImportCandidate,
} from "@/components/loreguard/ProjectStart.import-helpers";
import {
  deleteConfirmationToken,
  latestProjectSessionId,
  localeForLanguage,
  projectPrimaryStage,
} from "@/components/loreguard/ProjectStart.project-helpers";
import type { CandidateDecisionStatus } from "@/components/loreguard/CandidateDecisionCard";
import { ProjectStartBasisForm } from "@/components/loreguard/ProjectStartBasisForm";
import { ProjectStartBasisPanel } from "@/components/loreguard/ProjectStartBasisPanel";
import { ProjectStartEntryPanel } from "@/components/loreguard/ProjectStartEntryPanel";
import { ProjectStartImportDialog } from "@/components/loreguard/ProjectStartImportDialog";
import { ProjectStartLibraryPanel } from "@/components/loreguard/ProjectStartLibraryPanel";
import { ProjectStartReviewDialog } from "@/components/loreguard/ProjectStartReviewDialog";
import type { LoreguardTabId } from "./LoreguardShell";
import {
  PlatformType,
  PublishPlatform,
  type AcceptedImportCandidateRecord,
  type ImportFileReportRecord,
} from "@/lib/studio-types";
import {
  IMPORT_BUCKET_LABELS,
  type ImportCandidate,
} from "@/lib/loreguard/import-classifier";
import {
  getImportBasisUpdateSuggestions,
  getImportAlignmentWarnings,
  type ImportBasisUpdateSuggestion,
} from "@/lib/loreguard/import-project-alignment";
import { recordCandidateDecision } from "@/lib/loreguard/candidate-decision-receipt";
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
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([]);
  const [acceptedCandidateIds, setAcceptedCandidateIds] = useState<string[]>([]);
  const [acceptedImportEntries, setAcceptedImportEntries] = useState<AcceptedImportCandidateRecord[]>([]);
  const [candidateStatuses, setCandidateStatuses] = useState<Record<string, CandidateDecisionStatus>>({});
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importFileReports, setImportFileReports] = useState<ImportFileReportRecord[]>([]);
  const [reviewCandidateId, setReviewCandidateId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [startMode, setStartMode] = useState<StudioEntryMode>(entryMode);
  const [showImportDialog, setShowImportDialog] = useState(entryMode === "import");
  const loggedCandidateIdsRef = useRef<Set<string>>(new Set());
  const hydratedProjectKeyRef = useRef<string | null>(null);
  const projectStartBusy = pendingCreate || pendingNoaPrompt !== null;
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
    setAcceptedImportEntries(currentSession.config.acceptedImportCandidates ?? []);
    setAcceptedCandidateIds((currentSession.config.acceptedImportCandidates ?? []).map((entry) => entry.id));
    setImportFileReports(currentSession.config.importFileReports ?? []);
    setCandidateStatuses((currentSession.config.acceptedImportCandidates ?? []).reduce<Record<string, CandidateDecisionStatus>>((acc, entry) => {
      acc[entry.id] = "accepted";
      return acc;
    }, {}));
  }, [
    currentProject?.name,
    currentProjectId,
    currentSession,
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

  useEffect(() => {
    const restoredReports = currentSession?.config?.importFileReports ?? [];
    if (restoredReports.length === 0) return;
    return scheduleEffectUpdate(() => {
      setImportFileReports((prev) => {
        const merged = mergeImportFileReports(prev, restoredReports);
        return isSameImportFileReportList(prev, merged) ? prev : merged;
      });
    });
  }, [currentSession?.config?.importFileReports]);

  const resetProjectWorkingState = useCallback((nextDraft: ProjectDraft = EMPTY_DRAFT) => {
    hydratedProjectKeyRef.current = null;
    loggedCandidateIdsRef.current = new Set();
    setDraft(nextDraft);
    setAcceptedImportEntries([]);
    setAcceptedCandidateIds([]);
    setCandidateStatuses({});
    setImportCandidates([]);
    setImportFileReports([]);
    setImportNotice(null);
    setReviewCandidateId(null);
    setDeleteConfirmText("");
  }, []);

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
  }, [language]);

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
  }, [entryMode, language]);

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

  const acceptedCandidateSet = useMemo(() => new Set(acceptedCandidateIds), [acceptedCandidateIds]);
  const importBucketSummary = useMemo(() => {
    return importCandidates.reduce<Record<string, number>>((acc, candidate) => {
      const label = IMPORT_BUCKET_LABELS[candidate.bucket];
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
  }, [importCandidates]);
  const importAlignmentWarnings = useMemo(() => {
    return importCandidates.reduce<Record<string, ReturnType<typeof getImportAlignmentWarnings>>>((acc, candidate) => {
      acc[candidate.id] = getImportAlignmentWarnings(candidate, {
        targetLanguage: draft.targetLanguage,
        targetMarket: draft.targetMarket,
        publishPlatform: draft.publishPlatform,
        releasePurpose: draft.releasePurpose,
        targetEpisodeLength: draft.episodeLength,
        rightsNote: draft.rightsNote,
      });
      return acc;
    }, {});
  }, [draft.episodeLength, draft.publishPlatform, draft.releasePurpose, draft.rightsNote, draft.targetLanguage, draft.targetMarket, importCandidates]);
  const importBasisUpdateSuggestions = useMemo(() => {
    return importCandidates.reduce<Record<string, ImportBasisUpdateSuggestion[]>>((acc, candidate) => {
      acc[candidate.id] = getImportBasisUpdateSuggestions(candidate, {
        targetLanguage: draft.targetLanguage,
        targetMarket: draft.targetMarket,
        publishPlatform: draft.publishPlatform,
        releasePurpose: draft.releasePurpose,
        targetEpisodeLength: draft.episodeLength,
        rightsNote: draft.rightsNote,
      });
      return acc;
    }, {});
  }, [draft.episodeLength, draft.publishPlatform, draft.releasePurpose, draft.rightsNote, draft.targetLanguage, draft.targetMarket, importCandidates]);
  const reviewCandidate = useMemo(
    () => importCandidates.find((candidate) => candidate.id === reviewCandidateId) ?? null,
    [importCandidates, reviewCandidateId],
  );
  const reviewWarnings = reviewCandidate ? importAlignmentWarnings[reviewCandidate.id] ?? [] : [];
  const reviewSuggestions = reviewCandidate ? importBasisUpdateSuggestions[reviewCandidate.id] ?? [] : [];
  const visibleImportFileReports = importFileReports.slice(0, 8);

  const rememberImportFileReports = useCallback((reports: ImportFileReportRecord[]) => {
    if (reports.length === 0) return;
    setImportFileReports((prev) => mergeImportFileReports(prev, reports));
    if (currentSession) {
      setConfig((prev) => ({
        ...prev,
        importFileReports: mergeImportFileReports(prev.importFileReports, reports),
      }));
    }
  }, [currentSession, setConfig]);

  const handleImportFiles = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const inputEl = event.currentTarget;
    const files = Array.from(inputEl.files ?? []);
    inputEl.value = "";
    if (files.length === 0) return;

    try {
      const result = await processProjectImportFiles(files, draft);
      rememberImportFileReports(result.fileReports);
      if (result.nextCandidates.length > 0) {
        setImportCandidates((prev) => [...result.nextCandidates, ...prev].slice(0, 60));
      }
      setImportNotice(result.notice);
    } catch (error) {
      const message = error instanceof Error ? error.message : "파일을 읽지 못했습니다. 인코딩이나 파일 내용을 확인해 주세요.";
      setImportNotice(message);
    }
  }, [draft, rememberImportFileReports]);

  const finalizeAcceptImportCandidate = useCallback((candidate: ImportCandidate, options?: { applyBasisSuggestions?: boolean }) => {
    if (acceptedCandidateSet.has(candidate.id)) return;
    const basisSuggestions = options?.applyBasisSuggestions ? importBasisUpdateSuggestions[candidate.id] ?? [] : [];
    const alignmentWarnings = importAlignmentWarnings[candidate.id] ?? [];
    const acceptedEntry = buildAcceptedImportCandidateRecord(candidate, {
      appliedBasisSuggestions: basisSuggestions.length > 0,
      alignmentWarnings,
      basisSuggestions,
    });
    recordCandidateDecision({
      candidateId: candidate.id,
      title: candidate.title,
      surface: `파일가져오기:${IMPORT_BUCKET_LABELS[candidate.bucket]}${basisSuggestions.length > 0 ? ":기준반영" : ""}`,
      stage: "project-import",
      action: "accepted",
      content: candidate.text,
      sourceLabel: candidate.sourceFileName,
      actor: basisSuggestions.length > 0 ? "loreguard-import-review" : undefined,
    });
    setAcceptedCandidateIds((prev) => [...prev, candidate.id]);
    setAcceptedImportEntries((prev) => upsertAcceptedImportCandidate(prev, acceptedEntry));
    setCandidateStatuses((prev) => ({ ...prev, [candidate.id]: "accepted" }));
    setReviewCandidateId(null);
    if (currentSession) {
      setConfig((prev) => ({
        ...applyImportBasisSuggestionsToConfig(prev, basisSuggestions),
        acceptedImportCandidates: upsertAcceptedImportCandidate(prev.acceptedImportCandidates, acceptedEntry),
      }));
    }
    setDraft((prev) => {
      const nextDraft = basisSuggestions.length > 0 ? applyImportBasisSuggestionsToDraft(prev, basisSuggestions) : prev;
      if (candidate.bucket === "rightsIp") {
        return { ...nextDraft, rightsNote: appendCandidateToDraftValue(nextDraft.rightsNote, candidate) };
      }
      return {
        ...nextDraft,
        title: nextDraft.title.trim() ? nextDraft.title : candidate.title,
        premise: appendCandidateToDraftValue(nextDraft.premise, candidate),
      };
    });
  }, [acceptedCandidateSet, currentSession, importAlignmentWarnings, importBasisUpdateSuggestions, setConfig]);

  const acceptImportCandidate = useCallback((candidate: ImportCandidate) => {
    if (acceptedCandidateSet.has(candidate.id)) return;
    if ((importAlignmentWarnings[candidate.id] ?? []).length > 0) {
      setReviewCandidateId(candidate.id);
      return;
    }
    finalizeAcceptImportCandidate(candidate);
  }, [acceptedCandidateSet, finalizeAcceptImportCandidate, importAlignmentWarnings]);

  const holdImportCandidate = useCallback((candidate: ImportCandidate) => {
    if (acceptedCandidateSet.has(candidate.id)) return;
    recordCandidateDecision({
      candidateId: candidate.id,
      title: candidate.title,
      surface: `파일가져오기:${IMPORT_BUCKET_LABELS[candidate.bucket]}`,
      stage: "project-import",
      action: "held",
      content: candidate.text,
      sourceLabel: candidate.sourceFileName,
    });
    setCandidateStatuses((prev) => ({ ...prev, [candidate.id]: "held" }));
  }, [acceptedCandidateSet]);

  const discardImportCandidate = useCallback((candidate: ImportCandidate) => {
    recordCandidateDecision({
      candidateId: candidate.id,
      title: candidate.title,
      surface: `파일가져오기:${IMPORT_BUCKET_LABELS[candidate.bucket]}`,
      stage: "project-import",
      action: "discarded",
      content: candidate.text,
      sourceLabel: candidate.sourceFileName,
    });
    setCandidateStatuses((prev) => ({ ...prev, [candidate.id]: "discarded" }));
    setImportCandidates((prev) => prev.filter((item) => item.id !== candidate.id));
  }, []);

  useEffect(() => {
    if (!currentProjectId) return;
    const cl = typeof window !== "undefined" ? window.__creativeLogger : undefined;
    if (!cl?.logExternalImport) return;

    for (const candidateId of acceptedCandidateIds) {
      if (loggedCandidateIdsRef.current.has(candidateId)) continue;
      const candidate = importCandidates.find((item) => item.id === candidateId);
      if (!candidate) continue;
      loggedCandidateIdsRef.current.add(candidateId);
      void cl.logExternalImport({
        targetType: targetTypeForImport(candidate.bucket),
        targetId: `project-import:${candidate.bucket}:${candidate.id}`,
        label: `자료 반영: ${IMPORT_BUCKET_LABELS[candidate.bucket]} / ${candidate.title}`,
        content: candidate.text,
        fileName: candidate.sourceFileName,
        licenseNote: candidate.bucket === "rightsIp" ? candidate.text.slice(0, 400) : undefined,
      });
    }
  }, [acceptedCandidateIds, currentProjectId, importCandidates]);

  return (
    <div className={`ps-grid ps-mode-${startMode}`}>
      <section
        className="ps-interview"
        aria-label={
          startMode === "manage"
            ? L4(language, { ko: "최근 작품 열기", en: "Open recent work", ja: "最近の作品を開く", zh: "打开近期作品" })
            : startMode === "import"
              ? L4(language, { ko: "파일에서 작품 자료 가져오기", en: "Import work material from files", ja: "ファイルから作品資料を読み込む", zh: "从文件导入作品资料" })
              : L4(language, { ko: "새 작품 시작", en: "Start a new work", ja: "新しい作品を始める", zh: "开始新作品" })
        }
      >
        <ProjectStartEntryPanel
          language={language}
          startMode={startMode}
          projectStartBusy={projectStartBusy}
          onModeChange={setStartMode}
          onFocusImport={focusProjectImport}
          onCreateBlankProject={createBlankProject}
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

        <ProjectStartBasisForm
          language={language}
          draft={draft}
          setDraft={setDraft}
          visibleMarketOptions={visibleMarketOptions}
          visiblePlatformOptions={visiblePlatformOptions}
          projectStartBusy={projectStartBusy}
          onSaveOpenWorld={() => saveCurrentOrCreateProject("world")}
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
      />
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
