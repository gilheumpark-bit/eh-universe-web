"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import type { StudioContextValue } from "@/app/studio/StudioContext";
import type { ProjectDraft } from "@/components/loreguard/ProjectStart.shared";
import {
  appendCandidateToDraftValue,
  applyImportBasisSuggestionsToConfig,
  applyImportBasisSuggestionsToDraft,
  buildAcceptedImportCandidateRecord,
  isSameImportFileReportList,
  MAX_PENDING_IMPORT_CANDIDATES,
  mergeImportFileReports,
  processProjectImportFiles,
  targetTypeForImport,
  upsertAcceptedImportCandidate,
} from "@/components/loreguard/ProjectStart.import-helpers";
import type { CandidateDecisionStatus } from "@/components/loreguard/CandidateDecisionCard";
import {
  IMPORT_BUCKET_LABELS,
  type ImportCandidate,
} from "@/lib/loreguard/import-classifier";
import {
  getImportAlignmentWarnings,
  getImportBasisUpdateSuggestions,
  type ImportBasisUpdateSuggestion,
} from "@/lib/loreguard/import-project-alignment";
import { recordCandidateDecision } from "@/lib/loreguard/candidate-decision-receipt";
import type {
  AcceptedImportCandidateRecord,
  ImportFileReportRecord,
} from "@/lib/studio-types";

interface ProjectStartImportRuntimeParams {
  currentProjectId: StudioContextValue["currentProjectId"];
  currentSession: StudioContextValue["currentSession"];
  draft: ProjectDraft;
  setConfig: StudioContextValue["setConfig"];
  setDraft: Dispatch<SetStateAction<ProjectDraft>>;
}

function scheduleImportStateUpdate(work: () => void): () => void {
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

export function useProjectStartImportRuntime({
  currentProjectId,
  currentSession,
  draft,
  setConfig,
  setDraft,
}: ProjectStartImportRuntimeParams) {
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([]);
  const [acceptedCandidateIds, setAcceptedCandidateIds] = useState<string[]>([]);
  const [acceptedImportEntries, setAcceptedImportEntries] = useState<AcceptedImportCandidateRecord[]>([]);
  const [candidateStatuses, setCandidateStatuses] = useState<Record<string, CandidateDecisionStatus>>({});
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importFileReports, setImportFileReports] = useState<ImportFileReportRecord[]>([]);
  const [reviewCandidateId, setReviewCandidateId] = useState<string | null>(null);
  const loggedCandidateIdsRef = useRef<Set<string>>(new Set());

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

  const hydrateImportStateFromConfig = useCallback((
    acceptedEntries: AcceptedImportCandidateRecord[] = [],
    fileReports: ImportFileReportRecord[] = [],
  ) => {
    setAcceptedImportEntries(acceptedEntries);
    setAcceptedCandidateIds(acceptedEntries.map((entry) => entry.id));
    setImportFileReports(fileReports);
    setCandidateStatuses(acceptedEntries.reduce<Record<string, CandidateDecisionStatus>>((acc, entry) => {
      acc[entry.id] = "accepted";
      return acc;
    }, {}));
  }, []);

  const resetImportWorkingState = useCallback(() => {
    loggedCandidateIdsRef.current = new Set();
    setAcceptedImportEntries([]);
    setAcceptedCandidateIds([]);
    setCandidateStatuses({});
    setImportCandidates([]);
    setImportFileReports([]);
    setImportNotice(null);
    setReviewCandidateId(null);
  }, []);

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
      const hiddenCandidateCount = Math.max(
        0,
        result.nextCandidates.length + importCandidates.length - MAX_PENDING_IMPORT_CANDIDATES,
      );
      if (result.nextCandidates.length > 0) {
        setImportCandidates((prev) => {
          const merged = [...result.nextCandidates, ...prev];
          return merged.slice(0, MAX_PENDING_IMPORT_CANDIDATES);
        });
      }
      setImportNotice(hiddenCandidateCount > 0
        ? `${result.notice} 대기 후보 ${hiddenCandidateCount}건은 최근 ${MAX_PENDING_IMPORT_CANDIDATES}건 표시 한도 때문에 숨겼습니다.`
        : result.notice);
    } catch (error) {
      const message = error instanceof Error ? error.message : "파일을 읽지 못했습니다. 인코딩이나 파일 내용을 확인해 주세요.";
      setImportNotice(message);
    }
  }, [draft, importCandidates.length, rememberImportFileReports]);

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
  }, [acceptedCandidateSet, currentSession, importAlignmentWarnings, importBasisUpdateSuggestions, setConfig, setDraft]);

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
    const restoredReports = currentSession?.config?.importFileReports ?? [];
    if (restoredReports.length === 0) return;
    return scheduleImportStateUpdate(() => setImportFileReports((prev) => {
      const merged = mergeImportFileReports(prev, restoredReports);
      return isSameImportFileReportList(prev, merged) ? prev : merged;
    }));
  }, [currentSession?.config?.importFileReports]);

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

  return {
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
  };
}
