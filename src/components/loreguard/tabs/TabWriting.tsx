"use client";


import { useCallback, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import { L4 } from "@/lib/i18n";

import { useEffect, useMemo } from "react";

import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import { StyleStudioPanel } from "@/components/loreguard/tabs/TabWritingStyleStudioPanel";
import { ManuscriptExportPanel } from "@/components/loreguard/tabs/TabWritingManuscriptExportPanel";

import CpJournalPanel from "@/components/loreguard/CpJournalPanel";

import TabWritingEditorSurface from "@/components/loreguard/tabs/TabWritingEditorSurface";
import { ContextRefCard } from "@/components/loreguard/tabs/TabWritingContextRefCard";
import { ExternalCraftBridgeCard } from "@/components/loreguard/tabs/TabWritingExternalCraftBridgeCard";
import { WritingContextComplianceCard } from "@/components/loreguard/tabs/TabWritingComplianceCard";
import { NoaComposePlanCard } from "@/components/loreguard/tabs/TabWritingNoaComposePlanCard";
import TabWritingNoticeFeed from "@/components/loreguard/tabs/TabWritingNoticeFeed";
import TabWritingTopBar from "@/components/loreguard/tabs/TabWritingTopBar";
import { TabWritingEmptyState } from "@/components/loreguard/tabs/TabWritingEmptyState";
import {
  DraftViewSettingsCard,
  ReceiptReadinessCard,
  WritingShortcutsCard,
  WritingValueCard,
} from "@/components/loreguard/tabs/TabWritingRightPanelCards";
import {
  TabWritingRightPanelActions,
  TabWritingRightPanelHeader,
} from "@/components/loreguard/tabs/TabWritingRightPanelChrome";
import {
  ContaminationGuardCard,
  SelfCheckCard,
  SynthesisLogCard,
  VersionSnapshotsCard,
  WorkQueueCard,
} from "@/components/loreguard/tabs/TabWritingStatusCards";
import {
  WritingMetaChips,
  WritingProductionBoard,
} from "@/components/loreguard/tabs/TabWritingProductionPanel";
import { AiResultStrip, TokenRegenerateBar } from "@/components/loreguard/tabs/TabWritingResultStrip";
import { NoaRequestComposer } from "@/components/loreguard/tabs/TabWritingNoaRequestComposer";
import {
  validateNoaComposeReceipt,
} from "@/lib/loreguard/noa-compose";

import RevisionPanel from "@/components/loreguard/RevisionPanel";

import IpAssetPanel from "@/components/loreguard/IpAssetPanel";

import FindReplaceBar from "@/components/loreguard/FindReplaceBar";

import {
  buildS4Str,
  buildS5Str,
} from "@/components/loreguard/tabs/TabWriting.shared";
import {
  buildProductionModel,
  buildStageLabelMap,
  buildStageStatusLabelMap,
  buildWritingMetrics,
  buildWritingMetaChips,
  buildWritingValueModel,
} from "@/components/loreguard/tabs/TabWriting.derived";
import { useDraftHistory } from "@/components/loreguard/tabs/TabWriting.history";
import { useTabWritingMentionComposer } from "@/components/loreguard/tabs/useTabWritingMentionComposer";
import { useTabWritingCreativeLog } from "@/components/loreguard/tabs/useTabWritingCreativeLog";
import { useTabWritingEditorActions } from "@/components/loreguard/tabs/useTabWritingEditorActions";
import { useTabWritingWorkspaceControls } from "@/components/loreguard/tabs/useTabWritingWorkspaceControls";
import { useTabWritingAiResult } from "@/components/loreguard/tabs/useTabWritingAiResult";
import { useTabWritingComposerKeys } from "@/components/loreguard/tabs/useTabWritingComposerKeys";

const OutlineBinder = dynamic(() => import("@/components/loreguard/OutlineBinder"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={400} />,
});


function clock(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString("ko-KR", { hour12: false });
  } catch {
    return "--:--:--";
  }
}



export default function TabWriting() {
  const {
    currentSession,
    editDraft,
    setEditDraft,
    editDraftRef,
    suggestions,
    setSuggestions,
    directorReport,
    lastReport,
    pipelineResult,
    versionedBackups,
    doRestoreVersionedBackup,
    refreshBackupList,
    saveFlash,
    lastSaveTime,
    triggerSave,
    createNewSession,
    input,
    setInput,
    handleSend,
    isGenerating,
    handleCancel,
    hasAiAccess,
    setShowApiKeyModal,
    setConfig,
    handleNextEpisode,
    handleRegenerate,
    tokenUsage,
    generationTime,
    filteredMessages,
    currentProjectId,
    projects,
    language,
    hostedProviders,
  } = useStudio();

  const { setActiveTab: setLoreguardTab } = useLoreguardTab();

  const {
    applyWritingWorkspaceMode,
    approveNoaComposeBundle,
    composePlan,
    editorViewStyle,
    fontMode,
    openCp,
    openExport,
    openIpAsset,
    openNoaComposeBundle,
    openRevision,
    openStyle,
    rightPanelCollapsed,
    runToolMenuAction,
    saveDraftNow,
    setComposePlan,
    setFontMode,
    setRightPanelCollapsed,
    setToolMenuOpen,
    setWritingWorkspaceMode,
    toolMenuOpen,
    toolMenuRef,
    toggleWritingBasisPanel,
    updateFontMode,
    updateViewPrefs,
    viewPrefs,
    writingWorkspaceMode,
  } = useTabWritingWorkspaceControls({
    currentProjectId,
    currentSession,
    editDraft,
    language,
    triggerSave,
  });

  const [restoring, setRestoring] = useState<number | null>(null);

  const S4_STR = useMemo(() => buildS4Str(language), [language]);
  const S5_STR = useMemo(() => buildS5Str(language), [language]);

  const lastSnapshotRef = useRef<{
    text: string;
    label: string;
    at: number;
    sessionId: string;
    episode: number | null;
  } | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<{ label: string; at: number } | null>(null);
  const snapshotSessionId = currentSession?.id ?? null;
  const snapshotEpisode = currentSession?.config?.episode ?? null;
  useEffect(() => {
    lastSnapshotRef.current = null;
    setSnapshotMeta(null);
  }, [snapshotSessionId, snapshotEpisode]);

  const [armedRestore, setArmedRestore] = useState<number | null>(null);
  useEffect(() => {
    if (armedRestore == null) return;
    const t = window.setTimeout(() => setArmedRestore(null), 5000);
    return () => window.clearTimeout(t);
  }, [armedRestore]);

  const [armedCancel, setArmedCancel] = useState(false);
  useEffect(() => {
    if (!armedCancel) return;
    if (!isGenerating) {
      setArmedCancel(false);
      return;
    }
    const t = window.setTimeout(() => setArmedCancel(false), 5000);
    return () => window.clearTimeout(t);
  }, [armedCancel, isGenerating]);

  const hugePasteRef = useRef(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  useEffect(() => {
    if (!pasteNotice) return;
    const t = window.setTimeout(() => setPasteNotice(false), 6000);
    return () => window.clearTimeout(t);
  }, [pasteNotice]);
  const isComposingRef = useRef(false);


  const { canUndo, canRedo, doUndo, doRedo } = useDraftHistory({
    editDraft,
    setEditDraft,
    snapshotSessionId,
    snapshotEpisode,
  });


  const [findOpen, setFindOpen] = useState(false);

  const applyFindReplace = useCallback(
    (next: string) => {
      setEditDraft(next);
    },
    [setEditDraft],
  );

  const onEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const k = e.key.toLowerCase();
      if (k === "h" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setFindOpen((v) => !v);
        return;
      }
      if (k === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        doUndo();
        return;
      }
      if ((k === "z" && e.shiftKey) || (k === "y" && !e.shiftKey)) {
        e.preventDefault();
        doRedo();
        return;
      }
      if (k === "r" && e.shiftKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("noa:trigger-inline-rewrite"));
        return;
      }
    },
    [doUndo, doRedo],
  );

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { episode?: unknown; sceneId?: unknown } | undefined;
      const ep = detail?.episode;
      if (typeof ep !== "number" || !Number.isFinite(ep) || ep < 1) return;
      setConfig((prev) => (prev.episode === ep ? prev : { ...prev, episode: Math.floor(ep) }));
    };
    window.addEventListener("loreguard:navigate-scene", onNavigate);
    return () => window.removeEventListener("loreguard:navigate-scene", onNavigate);
  }, [setConfig]);

  const {
    dismissMention,
    genInputRef,
    mentionActiveIdx,
    mentionFiltered,
    mentionListboxId,
    mentionOpen,
    openNoaSuggestionPoint,
    selectMention,
    setMentionIndex,
    submitGenerate,
    suppressMention,
    updateMention,
  } = useTabWritingMentionComposer({
    currentProjectId,
    currentSession,
    editDraft,
    handleSend,
    hasAiAccess,
    input,
    isGenerating,
    language,
    setInput,
    setRightPanelCollapsed,
    setShowApiKeyModal,
    setWritingWorkspaceMode,
  });


  const manuscriptTargetId = snapshotEpisode != null ? String(snapshotEpisode) : "draft";
  const { commitHumanEditIfDue, fireLog, lastLoggedRef } = useTabWritingCreativeLog({
    editDraft,
    isComposingRef,
    language,
    manuscriptTargetId,
    snapshotEpisode,
    snapshotSessionId,
  });


  const [selfCheckOpen, setSelfCheckOpen] = useState(false);
  const [readMode, setReadMode] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ctrl = event.ctrlKey || event.metaKey;
      if (!ctrl || !event.altKey || event.shiftKey || event.key.toLowerCase() !== "r") return;
      event.preventDefault();
      setReadMode((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const writingMetrics = useMemo(() => buildWritingMetrics(editDraft), [editDraft]);

  const {
    acceptSuggestion,
    handleEditorChange,
    handleEditorCompositionEnd,
    handleEditorCompositionStart,
    handleEditorPaste,
    onEditorContextMenu,
    openInlineRewrite,
    rejectSuggestion,
    replaceInlineSelection,
    takeSnapshot,
  } = useTabWritingEditorActions({
    commitHumanEditIfDue,
    currentSession,
    editDraft,
    editDraftRef,
    fireLog,
    hugePasteRef,
    isComposingRef,
    language,
    lastLoggedRef,
    lastSnapshotRef,
    manuscriptTargetId,
    setConfig,
    setEditDraft,
    setPasteNotice,
    setSnapshotMeta,
    setSuggestions,
    snapshotEpisode,
    snapshotSessionId,
  });

  const {
    aiResult,
    aiResultExpanded,
    aiResultNeedsToggle,
    aiResultPreview,
    dismissAiResult,
    insertAiResult,
    latestAssistantMsg,
    markGenerationCancelled,
    regenerateLatest,
    setAiResultExpanded,
  } = useTabWritingAiResult({
    aiInsertSnapshotLabel: S4_STR.aiInsertSnapshotLabel,
    commitHumanEditIfDue,
    editDraft,
    filteredMessages,
    fireLog,
    handleRegenerate,
    isGenerating,
    lastLoggedRef,
    manuscriptTargetId,
    setEditDraft,
    snapshotEpisode,
    snapshotSessionId,
    takeSnapshot,
  });

  const { confirmCancelGeneration, handleComposerChange, handleComposerKeyDown } = useTabWritingComposerKeys({
    dismissMention,
    handleCancel,
    markGenerationCancelled,
    mentionActiveIdx,
    mentionFiltered,
    mentionOpen,
    selectMention,
    setArmedCancel,
    setInput,
    setMentionIndex,
    submitGenerate,
    suppressMention,
    updateMention,
  });

  if (!currentSession) {
    return <TabWritingEmptyState language={language} onCreate={() => createNewSession("writing")} />;
  }

  const config = currentSession.config;


  const metaChips = buildWritingMetaChips(config, language);

  const activeSuggestions = suggestions.filter((s) => !s.dismissed);
  const draftCharCount = editDraft.trim().length;
  const savedEpisodeCount = (config.manuscripts ?? []).filter((manuscript) => manuscript.content.trim().length > 0).length;
  const rightsReady = Boolean(config.rightsNote?.trim() || config.rightsStatus);
  const { productReadinessRows, writingValueActions } = buildWritingValueModel({
    language,
    hasAiAccess,
    currentSessionLinked: Boolean(currentSession),
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
  const rightPanelSummary = [
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
  ] as const;

  const undoSnapshot = () => {
    const snap = lastSnapshotRef.current;
    if (!snap) return;
    if (snap.sessionId !== currentSession.id || snap.episode !== (config?.episode ?? null)) {
      lastSnapshotRef.current = null;
      setSnapshotMeta(null);
      return;
    }
    const at = Date.now();
    commitHumanEditIfDue(editDraft); // 스왑 전 미계상 타이핑 잔여분 flush (swallow 방지)
    lastSnapshotRef.current = {
      text: editDraft,
      label: snap.label,
      at,
      sessionId: currentSession.id,
      episode: config?.episode ?? null,
    };
    setEditDraft(snap.text);
    if (snapshotSessionId) {
      lastLoggedRef.current = { text: snap.text, sessionId: snapshotSessionId, episode: snapshotEpisode };
    }
    setSnapshotMeta({ label: snap.label, at });
  };

  const epNow = config?.episode ?? null;
  const epTotal = config?.totalEpisodes ?? null;
  const hasNextManuscript =
    epNow != null && (config?.manuscripts ?? []).some((m) => m.episode === epNow + 1);
  const canPrevEpisode = epNow != null && epNow > 1;
  const canNextEpisode = epNow != null && (hasNextManuscript || epTotal == null || epNow < epTotal);
  const goPrevEpisode = () => {
    if (!canPrevEpisode) return;
    setConfig((prev) => ({ ...prev, episode: Math.max(1, prev.episode - 1) }));
  };
  const goNextEpisode = () => {
    if (!canNextEpisode) return;
    if (hasNextManuscript) {
      setConfig((prev) => ({ ...prev, episode: prev.episode + 1 }));
    } else {
      handleNextEpisode();
    }
  };

  const { episodeProgressPct, productionNext, productionRows } = buildProductionModel({
    language,
    draftCharCount,
    suggestionPending: activeSuggestions.length > 0 || Boolean(aiResult),
    writingCharCount: writingMetrics.withSpace,
    epNow,
    epTotal,
    savedEpisodeCount,
    saveFlash,
    lastSaveTime,
    formatTime: clock,
  });

  const findings = directorReport?.findings ?? [];
  const findingByKind = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + 1;
    return acc;
  }, {});
  const contaminationRows = Object.entries(findingByKind);
  const directorScore = directorReport?.score ?? null;

  const logIssues = lastReport?.issues ?? [];

  const stages = pipelineResult?.stages ?? [];
  const stageLabel = buildStageLabelMap(language);
  const stageStatusLabel = buildStageStatusLabelMap(language);

  const backups = versionedBackups ?? [];
  const restoreBackup = async (timestamp: number) => {
    if (!doRestoreVersionedBackup) return;
    setArmedRestore(null);
    setRestoring(timestamp);
    try {
      await doRestoreVersionedBackup(timestamp);
    } finally {
      lastLoggedRef.current = null;
      setRestoring(null);
    }
  };

  return (
    <div className="wr-grid">
      {/* QB-tabwriting-ide (3) — 좌측 아웃라인 바인더 (다른 owner 소유·dynamic import).
          props = 현재 config·회차·언어 (early return 뒤라 config 확정). OutlineBinder 가
          'loreguard:navigate-scene' 를 발신 → 위 PART 3.8 listener 가 회차 이동. */}
      <OutlineBinder config={config} currentEpisode={epNow} language={language} />

      {/* center — 집필 모드 + 원고 */}
      <section className={"wr-center" + (writingWorkspaceMode === "focus" ? " wr-focus-mode" : " wr-advanced-mode") + (readMode ? " wr-read-mode" : "")}>
        <TabWritingTopBar
          language={language}
          episode={epNow}
          charCount={writingMetrics.withSpace}
          charUnit={S5_STR.charUnit}
          writingWorkspaceMode={writingWorkspaceMode}
          onWritingWorkspaceModeChange={applyWritingWorkspaceMode}
          fontMode={fontMode}
          onFontModeChange={updateFontMode}
          readMode={readMode}
          onToggleReadMode={() => setReadMode((value) => !value)}
          canUndo={canUndo}
          onUndo={doUndo}
          canRedo={canRedo}
          onRedo={doRedo}
          findOpen={findOpen}
          onToggleFind={() => setFindOpen((value) => !value)}
          saveFlash={saveFlash}
          hasLastSaveTime={Boolean(lastSaveTime)}
          snapshotMeta={snapshotMeta}
          onUndoSnapshot={undoSnapshot}
          toolMenuRef={toolMenuRef}
          toolMenuOpen={toolMenuOpen}
          onToggleToolMenu={() => setToolMenuOpen((open) => !open)}
          runToolMenuAction={runToolMenuAction}
          openStyle={openStyle}
          openRevision={openRevision}
          openNoaComposeBundle={openNoaComposeBundle}
          openCp={openCp}
          openIpAsset={openIpAsset}
          openExport={openExport}
        />

        <WritingMetaChips
          labels={S4_STR}
          metaChips={metaChips}
          epNow={epNow}
          epTotal={epTotal}
          canPrevEpisode={canPrevEpisode}
          canNextEpisode={canNextEpisode}
          onPrevEpisode={goPrevEpisode}
          onNextEpisode={goNextEpisode}
        />

        <WritingProductionBoard
          language={language}
          nextStep={productionNext}
          progressPct={episodeProgressPct}
          rows={productionRows}
          canNextEpisode={canNextEpisode}
          onFocusDraft={() => {
            if (readMode) setReadMode(false);
            window.setTimeout(() => editDraftRef.current?.focus(), 0);
          }}
          onNoaSuggestion={openNoaSuggestionPoint}
          onNextEpisode={goNextEpisode}
        />

        <TabWritingNoticeFeed
          language={language}
          suggestions={activeSuggestions}
          pasteNotice={pasteNotice}
          onAcceptSuggestion={acceptSuggestion}
          onRejectSuggestion={rejectSuggestion}
        />

        {/* QB-tabwriting-ide (1) — 찾기·바꾸기 바 (Ctrl+H 또는 상단 버튼 토글).
            대상 = editDraft textarea·바꾼 결과는 applyFindReplace(=setEditDraft) 경유로
            undo 링버퍼와 정합. Escape 닫기·일치 수 실시간·다음/이전·전체 바꾸기·aria. */}
        {findOpen && (
          <FindReplaceBar
            text={editDraft}
            textareaRef={editDraftRef}
            onReplace={applyFindReplace}
            onClose={() => setFindOpen(false)}
            language={language}
          />
        )}

        <TabWritingEditorSurface
          language={language}
          text={editDraft}
          textareaRef={editDraftRef}
          fontMode={fontMode}
          editorViewStyle={editorViewStyle}
          readMode={readMode}
          config={config}
          snapshotSessionId={snapshotSessionId}
          snapshotEpisode={snapshotEpisode}
          onKeyDown={onEditorKeyDown}
          onContextMenu={onEditorContextMenu}
          onChange={handleEditorChange}
          onPaste={handleEditorPaste}
          onCompositionStart={handleEditorCompositionStart}
          onCompositionEnd={handleEditorCompositionEnd}
          onReplaceInlineSelection={replaceInlineSelection}
        />

        {aiResult && (
          <AiResultStrip
            labels={S4_STR}
            content={aiResult.content}
            preview={aiResultPreview}
            expanded={aiResultExpanded}
            needsToggle={aiResultNeedsToggle}
            onToggle={() => setAiResultExpanded((value) => !value)}
            onInsert={insertAiResult}
            onDismiss={dismissAiResult}
          />
        )}

        <TokenRegenerateBar
          labels={S4_STR}
          tokenUsage={tokenUsage}
          generationTime={generationTime}
          hasLatestAssistant={Boolean(latestAssistantMsg)}
          isGenerating={isGenerating}
          onRegenerate={regenerateLatest}
        />

        <NoaRequestComposer
          language={language}
          hostedProviders={hostedProviders}
          inputRef={genInputRef}
          input={input}
          isGenerating={isGenerating}
          armedCancel={armedCancel}
          hasAiAccess={hasAiAccess}
          mentionOpen={mentionOpen}
          mentionFiltered={mentionFiltered}
          mentionActiveIdx={mentionActiveIdx}
          mentionListboxId={mentionListboxId}
          onInputChange={handleComposerChange}
          onInputKeyDown={handleComposerKeyDown}
          onInputBlur={dismissMention}
          onMentionSelect={selectMention}
          onArmCancel={() => setArmedCancel(true)}
          onConfirmCancel={confirmCancelGeneration}
          onCancelStop={() => setArmedCancel(false)}
          onSubmit={submitGenerate}
        />
      </section>

      {/* right — 집필 기준·출고 준비 패널 */}
      <aside
        className={"wr-panel" + (rightPanelCollapsed ? " is-collapsed" : "")}
        aria-label={L4(language, { ko: "집필 정보·출고 준비", en: "Writing info and package" })}
      >
        <TabWritingRightPanelHeader
          language={language}
          collapsed={rightPanelCollapsed}
          saveFlash={saveFlash}
          onToggle={toggleWritingBasisPanel}
          onSaveDraft={saveDraftNow}
        />
        {rightPanelCollapsed ? (
          <div
            className="wr-panel-status"
            aria-label={rightPanelSummary.map((item) => `${item.label} ${item.value}`).join(", ")}
          >
            {rightPanelSummary.map((item) => (
              <span key={`${item.label}:${item.value}`} className={`wr-panel-status-chip ${item.tone}`}>
                <small>{item.label}</small>
                <b>{item.value}</b>
              </span>
            ))}
          </div>
        ) : null}

        <div className="wr-panel-body" aria-hidden={rightPanelCollapsed}>
        <div className="wr-advanced-summary" aria-label={L4(language, { ko: "고급 작업 요약", en: "Advanced work summary" })}>
          <span>{L4(language, { ko: "고급 작업", en: "Advanced" })}</span>
          <b>{L4(language, { ko: "작품 정보 · 과정기록 · 권리/IP · 출고", en: "Work info · Records · Rights/IP · Package" })}</b>
        </div>
        <TabWritingRightPanelActions
          language={language}
          onFocusDraft={() => editDraftRef.current?.focus()}
          onOpenExport={openExport}
          onOpenInlineRewrite={openInlineRewrite}
        />

        <WritingValueCard
          language={language}
          productReadinessRows={productReadinessRows}
          actions={writingValueActions}
        />

        <DraftViewSettingsCard
          language={language}
          viewPrefs={viewPrefs}
          updateViewPrefs={updateViewPrefs}
          setFontMode={setFontMode}
        />

        <WritingShortcutsCard language={language} />

        {composePlan && (
          <NoaComposePlanCard
            plan={composePlan}
            language={language}
            receiptValid={validateNoaComposeReceipt(composePlan)}
            onApprove={approveNoaComposeBundle}
            onClose={() => setComposePlan(null)}
          />
        )}

        <ReceiptReadinessCard
          language={language}
          draftCharCount={draftCharCount}
          productReadinessRows={productReadinessRows}
          openCp={openCp}
          openIpAsset={openIpAsset}
          openExport={openExport}
        />

        <ExternalCraftBridgeCard
          config={config}
          language={language}
          projects={projects}
          currentProjectId={currentProjectId}
          setConfig={setConfig}
        />

        {/* S7 — 노아 기준선 미리보기 (접이식·기본 접힘) — 실제 기준 소스 요약만 (PART 2.5) */}
        <ContextRefCard
          config={config}
          language={language}
          projectId={currentProjectId}
          sessionId={currentSession.id}
        />

        {/* S9 — 설정 준수·연계성 점검. 판단용 지표이며 생성/출고를 차단하지 않는다. */}
        <WritingContextComplianceCard config={config} draft={editDraft} language={language} />

        <VersionSnapshotsCard
          language={language}
          backups={backups}
          armedRestore={armedRestore}
          restoring={restoring}
          canRestore={Boolean(doRestoreVersionedBackup)}
          onRefresh={refreshBackupList}
          onArmRestore={setArmedRestore}
          onCancelRestore={() => setArmedRestore(null)}
          onRestore={restoreBackup}
        />

        <ContaminationGuardCard
          language={language}
          directorScore={directorScore}
          hasReport={directorReport != null}
          hasFindings={findings.length > 0}
          rows={contaminationRows}
          onDetails={() => setLoreguardTab("plot")}
        />

        <SelfCheckCard
          labels={S5_STR}
          open={selfCheckOpen}
          counts={writingMetrics}
          onToggle={() => setSelfCheckOpen((value) => !value)}
        />

        <SynthesisLogCard
          language={language}
          issues={logIssues}
          summary={lastReport}
          timeLabel={clock(lastSaveTime ?? Date.now())}
        />

        <WorkQueueCard
          language={language}
          stages={stages}
          stageLabel={stageLabel}
          stageStatusLabel={stageStatusLabel}
        />
        </div>
      </aside>

      {/* PART 4 mount — 원고함·출고 slide-over ('loreguard:open-export' 이벤트 수신) */}
      <ManuscriptExportPanel />

      {/* PART 5 mount — 문체 스튜디오 slide-over ('loreguard:open-style' 이벤트 수신).
          여기(early return 이후)에 mount 되므로 currentSession null 가드 자동 충족. */}
      <StyleStudioPanel />

      {/* S3 mount — 창작 과정 확인서 slide-over ('loreguard:open-cp' 이벤트 수신).
          동일하게 early return 이후 mount — currentSession null 가드 자동 충족. */}
      <CpJournalPanel />

      {/* S8 mount — 퇴고 slide-over ('loreguard:open-revision' 이벤트 수신).
          패널 본체는 별도 파일 (B 에이전트 소유) — 이 파일은 PART 4/5 패턴대로 mount 만.
          early return 이후 mount — currentSession null 가드 자동 충족. */}
      <RevisionPanel />

      {/* Z1d mount — IP 자산화 slide-over ('loreguard:open-ipasset' 이벤트 수신).
          패널 본체는 별도 파일 (Z1b 소유 — ../IpAssetPanel) — PART 4/5 패턴대로 mount 만.
          early return 이후 mount — currentSession null 가드 자동 충족. */}
      <IpAssetPanel />
    </div>
  );
}
