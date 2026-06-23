"use client";

import type {
  CSSProperties,
  ChangeEvent,
  ChangeEventHandler,
  ClipboardEventHandler,
  KeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  RefObject,
} from "react";
import type { ReplaceRangeInfo } from "@/components/studio/InlineActionPopup";
import FindReplaceBar from "@/components/loreguard/FindReplaceBar";
import type { MentionItem, WritingFontMode } from "@/components/loreguard/ComposerExtras";
import TabWritingEditorSurface from "@/components/loreguard/tabs/TabWritingEditorSurface";
import TabWritingNoticeFeed from "@/components/loreguard/tabs/TabWritingNoticeFeed";
import TabWritingTopBar from "@/components/loreguard/tabs/TabWritingTopBar";
import { WritingMetaChips, WritingProductionBoard } from "@/components/loreguard/tabs/TabWritingProductionPanel";
import { AiResultStrip, TokenRegenerateBar } from "@/components/loreguard/tabs/TabWritingResultStrip";
import { NoaRequestComposer } from "@/components/loreguard/tabs/TabWritingNoaRequestComposer";
import type {
  AiResultLabels,
} from "@/components/loreguard/tabs/TabWritingResultStrip";
import type {
  EpisodeNavLabels,
  ProductionNextStep,
  ProductionRow,
} from "@/components/loreguard/tabs/TabWritingProductionPanel";
import type { AppLanguage, ProactiveSuggestion, StoryConfig } from "@/lib/studio-types";

type WritingWorkspaceMode = "focus" | "advanced";
type SnapshotMeta = { label: string; at: number };

interface TabWritingCenterPanelProps {
  language: AppLanguage;
  labels: AiResultLabels & EpisodeNavLabels & { charUnit: string };
  writingWorkspaceMode: WritingWorkspaceMode;
  readMode: boolean;
  fontMode: WritingFontMode;
  editorViewStyle: CSSProperties;
  findOpen: boolean;
  saveFlash: boolean;
  hasLastSaveTime: boolean;
  snapshotMeta: SnapshotMeta | null;
  toolMenuRef: RefObject<HTMLDivElement | null>;
  toolMenuOpen: boolean;
  metaChips: Array<[string, string]>;
  epNow: number | null;
  epTotal: number | null;
  canPrevEpisode: boolean;
  canNextEpisode: boolean;
  productionNext: ProductionNextStep;
  episodeProgressPct: number;
  productionRows: ProductionRow[];
  activeSuggestions: ProactiveSuggestion[];
  pasteNotice: boolean;
  editDraft: string;
  editDraftRef: RefObject<HTMLTextAreaElement | null>;
  config: StoryConfig;
  snapshotSessionId: string | null;
  snapshotEpisode: number | null;
  aiResult: { content: string } | null;
  aiResultPreview: string;
  aiResultExpanded: boolean;
  aiResultNeedsToggle: boolean;
  tokenUsage: { used: number; budget: number } | null | undefined;
  generationTime: number | null;
  hasLatestAssistant: boolean;
  isGenerating: boolean;
  hostedProviders: Record<string, boolean>;
  genInputRef: RefObject<HTMLInputElement | null>;
  input: string;
  armedCancel: boolean;
  hasAiAccess: boolean;
  mentionOpen: boolean;
  mentionFiltered: MentionItem[];
  mentionActiveIdx: number;
  mentionListboxId: string;
  onWritingWorkspaceModeChange: (mode: WritingWorkspaceMode) => void;
  onFontModeChange: (mode: WritingFontMode) => void;
  onToggleReadMode: () => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onToggleFind: () => void;
  onCloseFind: () => void;
  onUndoSnapshot: () => void;
  onToggleToolMenu: () => void;
  runToolMenuAction: (action: () => void) => void;
  openStyle: () => void;
  openRevision: () => void;
  openNoaComposeBundle: () => void;
  openCp: () => void;
  openIpAsset: () => void;
  openExport: () => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  onFocusDraft: () => void;
  onNoaSuggestion: () => void;
  onAcceptSuggestion: (suggestion: ProactiveSuggestion) => void;
  onRejectSuggestion: (suggestion: ProactiveSuggestion) => void;
  onFindReplace: (next: string) => void;
  onEditorKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onEditorContextMenu: MouseEventHandler<HTMLTextAreaElement>;
  onEditorChange: ChangeEventHandler<HTMLTextAreaElement>;
  onEditorPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  onEditorCompositionStart: () => void;
  onEditorCompositionEnd: () => void;
  onReplaceInlineSelection: (oldText: string, newText: string, range?: ReplaceRangeInfo) => void;
  onToggleAiResult: () => void;
  onInsertAiResult: () => void;
  onDismissAiResult: () => void;
  onRegenerate: () => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onMentionSelect: (item: MentionItem) => void;
  onArmCancel: () => void;
  onConfirmCancel: () => void;
  onCancelStop: () => void;
  onSubmit: () => void;
}

export default function TabWritingCenterPanel({
  language,
  labels,
  writingWorkspaceMode,
  readMode,
  fontMode,
  editorViewStyle,
  findOpen,
  saveFlash,
  hasLastSaveTime,
  snapshotMeta,
  toolMenuRef,
  toolMenuOpen,
  metaChips,
  epNow,
  epTotal,
  canPrevEpisode,
  canNextEpisode,
  productionNext,
  episodeProgressPct,
  productionRows,
  activeSuggestions,
  pasteNotice,
  editDraft,
  editDraftRef,
  config,
  snapshotSessionId,
  snapshotEpisode,
  aiResult,
  aiResultPreview,
  aiResultExpanded,
  aiResultNeedsToggle,
  tokenUsage,
  generationTime,
  hasLatestAssistant,
  isGenerating,
  hostedProviders,
  genInputRef,
  input,
  armedCancel,
  hasAiAccess,
  mentionOpen,
  mentionFiltered,
  mentionActiveIdx,
  mentionListboxId,
  onWritingWorkspaceModeChange,
  onFontModeChange,
  onToggleReadMode,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  onToggleFind,
  onCloseFind,
  onUndoSnapshot,
  onToggleToolMenu,
  runToolMenuAction,
  openStyle,
  openRevision,
  openNoaComposeBundle,
  openCp,
  openIpAsset,
  openExport,
  onPrevEpisode,
  onNextEpisode,
  onFocusDraft,
  onNoaSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  onFindReplace,
  onEditorKeyDown,
  onEditorContextMenu,
  onEditorChange,
  onEditorPaste,
  onEditorCompositionStart,
  onEditorCompositionEnd,
  onReplaceInlineSelection,
  onToggleAiResult,
  onInsertAiResult,
  onDismissAiResult,
  onRegenerate,
  onInputChange,
  onInputKeyDown,
  onInputBlur,
  onMentionSelect,
  onArmCancel,
  onConfirmCancel,
  onCancelStop,
  onSubmit,
}: TabWritingCenterPanelProps) {
  return (
    <section className={"wr-center" + (writingWorkspaceMode === "focus" ? " wr-focus-mode" : " wr-advanced-mode") + (readMode ? " wr-read-mode" : "")}>
      <TabWritingTopBar
        language={language}
        episode={epNow}
        charCount={editDraft.length}
        charUnit={labels.charUnit}
        writingWorkspaceMode={writingWorkspaceMode}
        onWritingWorkspaceModeChange={onWritingWorkspaceModeChange}
        fontMode={fontMode}
        onFontModeChange={onFontModeChange}
        readMode={readMode}
        onToggleReadMode={onToggleReadMode}
        canUndo={canUndo}
        onUndo={onUndo}
        canRedo={canRedo}
        onRedo={onRedo}
        findOpen={findOpen}
        onToggleFind={onToggleFind}
        saveFlash={saveFlash}
        hasLastSaveTime={hasLastSaveTime}
        snapshotMeta={snapshotMeta}
        onUndoSnapshot={onUndoSnapshot}
        toolMenuRef={toolMenuRef}
        toolMenuOpen={toolMenuOpen}
        onToggleToolMenu={onToggleToolMenu}
        runToolMenuAction={runToolMenuAction}
        openStyle={openStyle}
        openRevision={openRevision}
        openNoaComposeBundle={openNoaComposeBundle}
        openCp={openCp}
        openIpAsset={openIpAsset}
        openExport={openExport}
      />

      <WritingMetaChips
        labels={labels}
        metaChips={metaChips}
        epNow={epNow}
        epTotal={epTotal}
        canPrevEpisode={canPrevEpisode}
        canNextEpisode={canNextEpisode}
        onPrevEpisode={onPrevEpisode}
        onNextEpisode={onNextEpisode}
      />

      <WritingProductionBoard
        language={language}
        nextStep={productionNext}
        progressPct={episodeProgressPct}
        rows={productionRows}
        canNextEpisode={canNextEpisode}
        onFocusDraft={onFocusDraft}
        onNoaSuggestion={onNoaSuggestion}
        onNextEpisode={onNextEpisode}
      />

      <TabWritingNoticeFeed
        language={language}
        suggestions={activeSuggestions}
        pasteNotice={pasteNotice}
        onAcceptSuggestion={onAcceptSuggestion}
        onRejectSuggestion={onRejectSuggestion}
      />

      {findOpen && (
        <FindReplaceBar
          text={editDraft}
          textareaRef={editDraftRef}
          onReplace={onFindReplace}
          onClose={onCloseFind}
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
        onChange={onEditorChange}
        onPaste={onEditorPaste}
        onCompositionStart={onEditorCompositionStart}
        onCompositionEnd={onEditorCompositionEnd}
        onTextPatch={onFindReplace}
        onReplaceInlineSelection={onReplaceInlineSelection}
      />

      {aiResult && (
        <AiResultStrip
          labels={labels}
          content={aiResult.content}
          preview={aiResultPreview}
          expanded={aiResultExpanded}
          needsToggle={aiResultNeedsToggle}
          onToggle={onToggleAiResult}
          onInsert={onInsertAiResult}
          onDismiss={onDismissAiResult}
        />
      )}

      <TokenRegenerateBar
        labels={labels}
        tokenUsage={tokenUsage}
        generationTime={generationTime}
        hasLatestAssistant={hasLatestAssistant}
        isGenerating={isGenerating}
        onRegenerate={onRegenerate}
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
        onInputChange={onInputChange}
        onInputKeyDown={onInputKeyDown}
        onInputBlur={onInputBlur}
        onMentionSelect={onMentionSelect}
        onArmCancel={onArmCancel}
        onConfirmCancel={onConfirmCancel}
        onCancelStop={onCancelStop}
        onSubmit={onSubmit}
      />
    </section>
  );
}
