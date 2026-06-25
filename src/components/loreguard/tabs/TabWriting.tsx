"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useStudio } from "@/app/studio/StudioContext";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import { StyleStudioPanel } from "@/components/loreguard/tabs/TabWritingStyleStudioPanel";
import { ManuscriptExportPanel } from "@/components/loreguard/tabs/TabWritingManuscriptExportPanel";
import CpJournalPanel from "@/components/loreguard/CpJournalPanel";
import TabWritingCenterPanel from "@/components/loreguard/tabs/TabWritingCenterPanel";
import { TabWritingEmptyState } from "@/components/loreguard/tabs/TabWritingEmptyState";
import RevisionPanel from "@/components/loreguard/RevisionPanel";
import IpAssetPanel from "@/components/loreguard/IpAssetPanel";
import TabWritingRightPanel from "@/components/loreguard/tabs/TabWritingRightPanel";
import { buildS4Str, buildS5Str } from "@/components/loreguard/tabs/TabWriting.shared";
import { buildWritingMetrics } from "@/components/loreguard/tabs/TabWriting.derived";
import { useTabWritingMentionComposer } from "@/components/loreguard/tabs/useTabWritingMentionComposer";
import { useTabWritingCreativeLog } from "@/components/loreguard/tabs/useTabWritingCreativeLog";
import { useTabWritingEditorActions } from "@/components/loreguard/tabs/useTabWritingEditorActions";
import { useTabWritingWorkspaceControls } from "@/components/loreguard/tabs/useTabWritingWorkspaceControls";
import { useTabWritingAiResult } from "@/components/loreguard/tabs/useTabWritingAiResult";
import { useTabWritingComposerKeys } from "@/components/loreguard/tabs/useTabWritingComposerKeys";
import { useTabWritingDraftRuntime } from "@/components/loreguard/tabs/useTabWritingDraftRuntime";
import { useTabWritingSessionModel } from "@/components/loreguard/tabs/useTabWritingSessionModel";
import { useTabWritingSnapshotActions } from "@/components/loreguard/tabs/useTabWritingSnapshotActions";
import type { StoryConfig } from "@/lib/studio-types";

const OutlineBinder = dynamic(() => import("@/components/loreguard/OutlineBinder"), { ssr: false, loading: () => <LoadingSkeleton height={400} /> });

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

  const S4_STR = useMemo(() => buildS4Str(language), [language]);
  const S5_STR = useMemo(() => buildS5Str(language), [language]);

  const {
    armedCancel,
    armedRestore,
    applyFindReplace,
    canRedo,
    canUndo,
    doRedo,
    doUndo,
    findOpen,
    hugePasteRef,
    isComposingRef,
    lastSnapshotRef,
    onEditorKeyDown,
    pasteNotice,
    readMode,
    restoring,
    selfCheckOpen,
    setArmedCancel,
    setArmedRestore,
    setFindOpen,
    setPasteNotice,
    setReadMode,
    setRestoring,
    setSelfCheckOpen,
    setSnapshotMeta,
    snapshotEpisode,
    snapshotMeta,
    snapshotSessionId,
  } = useTabWritingDraftRuntime({
    currentSession,
    editDraft,
    isGenerating,
    setConfig,
    setEditDraft,
  });

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

  const config = currentSession?.config ?? ({} as StoryConfig);

  const {
    activeSuggestions,
    backups,
    canNextEpisode,
    canPrevEpisode,
    contaminationRows,
    directorScore,
    draftCharCount,
    epNow,
    epTotal,
    episodeProgressPct,
    goNextEpisode,
    goPrevEpisode,
    hasFindings,
    logIssues,
    logSummary,
    metaChips,
    productReadinessRows,
    productionNext,
    productionRows,
    rightPanelSummary,
    stageLabel,
    stageStatusLabel,
    stages,
    writingValueActions,
  } = useTabWritingSessionModel({
    activeAiResult: Boolean(aiResult),
    config,
    currentProjectId,
    directorReport,
    editDraft,
    formatTime: clock,
    handleNextEpisode,
    language,
    hasAiAccess,
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
  });

  const { restoreBackup, undoSnapshot } = useTabWritingSnapshotActions({
    commitHumanEditIfDue,
    config,
    currentSessionId: currentSession?.id ?? "",
    doRestoreVersionedBackup,
    editDraft,
    lastLoggedRef,
    lastSnapshotRef,
    setArmedRestore,
    setEditDraft,
    setRestoring,
    setSnapshotMeta,
    snapshotEpisode,
    snapshotSessionId,
  });

  if (!currentSession) {
    return <TabWritingEmptyState language={language} onCreate={() => createNewSession("writing")} />;
  }

  return (
    <div className="wr-grid">
      <OutlineBinder config={config} currentEpisode={epNow} language={language} />

      <TabWritingCenterPanel
        language={language}
        labels={{ ...S4_STR, charUnit: S5_STR.charUnit }}
        writingWorkspaceMode={writingWorkspaceMode}
        readMode={readMode}
        fontMode={fontMode}
        editorViewStyle={editorViewStyle}
        findOpen={findOpen}
        saveFlash={saveFlash}
        hasLastSaveTime={Boolean(lastSaveTime)}
        snapshotMeta={snapshotMeta}
        toolMenuRef={toolMenuRef}
        toolMenuOpen={toolMenuOpen}
        metaChips={metaChips}
        epNow={epNow}
        epTotal={epTotal}
        canPrevEpisode={canPrevEpisode}
        canNextEpisode={canNextEpisode}
        productionNext={productionNext}
        episodeProgressPct={episodeProgressPct}
        productionRows={productionRows}
        activeSuggestions={activeSuggestions}
        pasteNotice={pasteNotice}
        editDraft={editDraft}
        editDraftRef={editDraftRef}
        config={config}
        snapshotSessionId={snapshotSessionId}
        snapshotEpisode={snapshotEpisode}
        aiResult={aiResult}
        aiResultPreview={aiResultPreview}
        aiResultExpanded={aiResultExpanded}
        aiResultNeedsToggle={aiResultNeedsToggle}
        tokenUsage={tokenUsage}
        generationTime={generationTime}
        hasLatestAssistant={Boolean(latestAssistantMsg)}
        isGenerating={isGenerating}
        hostedProviders={hostedProviders}
        genInputRef={genInputRef}
        input={input}
        armedCancel={armedCancel}
        hasAiAccess={hasAiAccess}
        mentionOpen={mentionOpen}
        mentionFiltered={mentionFiltered}
        mentionActiveIdx={mentionActiveIdx}
        mentionListboxId={mentionListboxId}
        onWritingWorkspaceModeChange={applyWritingWorkspaceMode}
        onFontModeChange={updateFontMode}
        onToggleReadMode={() => setReadMode((value) => !value)}
        canUndo={canUndo}
        onUndo={doUndo}
        canRedo={canRedo}
        onRedo={doRedo}
        onToggleFind={() => setFindOpen((value) => !value)}
        onCloseFind={() => setFindOpen(false)}
        onUndoSnapshot={undoSnapshot}
        onToggleToolMenu={() => setToolMenuOpen((open) => !open)}
        runToolMenuAction={runToolMenuAction}
        openStyle={openStyle}
        openRevision={openRevision}
        openNoaComposeBundle={openNoaComposeBundle}
        openCp={openCp}
        openIpAsset={openIpAsset}
        openExport={openExport}
        onPrevEpisode={goPrevEpisode}
        onNextEpisode={goNextEpisode}
        onFocusDraft={() => {
          if (readMode) setReadMode(false);
          window.setTimeout(() => editDraftRef.current?.focus(), 0);
        }}
        onNoaSuggestion={openNoaSuggestionPoint}
        onAcceptSuggestion={acceptSuggestion}
        onRejectSuggestion={rejectSuggestion}
        onFindReplace={applyFindReplace}
        onEditorKeyDown={onEditorKeyDown}
        onEditorContextMenu={onEditorContextMenu}
        onEditorChange={handleEditorChange}
        onEditorPaste={handleEditorPaste}
        onEditorCompositionStart={handleEditorCompositionStart}
        onEditorCompositionEnd={handleEditorCompositionEnd}
        onReplaceInlineSelection={replaceInlineSelection}
        onToggleAiResult={() => setAiResultExpanded((value) => !value)}
        onInsertAiResult={insertAiResult}
        onDismissAiResult={dismissAiResult}
        onRegenerate={regenerateLatest}
        onInputChange={handleComposerChange}
        onInputKeyDown={handleComposerKeyDown}
        onInputBlur={dismissMention}
        onMentionSelect={selectMention}
        onArmCancel={() => setArmedCancel(true)}
        onConfirmCancel={confirmCancelGeneration}
        onCancelStop={() => setArmedCancel(false)}
        onSubmit={submitGenerate}
      />

      <TabWritingRightPanel
        language={language}
        collapsed={rightPanelCollapsed}
        saveFlash={saveFlash}
        summary={rightPanelSummary}
        productReadinessRows={productReadinessRows}
        writingValueActions={writingValueActions}
        viewPrefs={viewPrefs}
        composePlan={composePlan}
        draftCharCount={draftCharCount}
        config={config}
        projects={projects}
        currentProjectId={currentProjectId}
        sessionId={currentSession.id}
        editDraft={editDraft}
        backups={backups}
        armedRestore={armedRestore}
        restoring={restoring}
        canRestore={Boolean(doRestoreVersionedBackup)}
        directorScore={directorScore}
        hasDirectorReport={directorReport != null}
        hasFindings={hasFindings}
        contaminationRows={contaminationRows}
        selfCheckLabels={S5_STR}
        selfCheckOpen={selfCheckOpen}
        writingMetrics={writingMetrics}
        logIssues={logIssues}
        logSummary={logSummary}
        synthesisTimeLabel={lastSaveTime ? clock(lastSaveTime) : "--:--:--"}
        stages={stages}
        stageLabel={stageLabel}
        stageStatusLabel={stageStatusLabel}
        onToggle={toggleWritingBasisPanel}
        onSaveDraft={saveDraftNow}
        onFocusDraft={() => editDraftRef.current?.focus()}
        onOpenExport={openExport}
        onOpenInlineRewrite={openInlineRewrite}
        updateViewPrefs={updateViewPrefs}
        setFontMode={setFontMode}
        onApproveComposePlan={approveNoaComposeBundle}
        onCloseComposePlan={() => setComposePlan(null)}
        openCp={openCp}
        openIpAsset={openIpAsset}
        setConfig={setConfig}
        onRefreshBackups={refreshBackupList}
        onArmRestore={setArmedRestore}
        onCancelRestore={() => setArmedRestore(null)}
        onRestore={restoreBackup}
        onDetails={() => setLoreguardTab("plot")}
        onToggleSelfCheck={() => setSelfCheckOpen((value) => !value)}
      />

      <ManuscriptExportPanel />

      <StyleStudioPanel />

      <CpJournalPanel />

      <RevisionPanel />

      <IpAssetPanel />
    </div>
  );
}
