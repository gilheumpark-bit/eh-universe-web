"use client";

// ============================================================
// WritingTabInline — Shell 컨테이너 (M2 Day 3-7 리팩토링)
//
// 기존 889줄 → ~420줄 축소. 주요 분해:
//   - ModeSwitch        → writing/ModeSwitch.tsx (툴바 + undo/redo + Tier 토글)
//   - FabControls       → writing/FabControls.tsx (AI FAB + Ctrl+Enter)
//   - SceneWarnings     → writing/SceneWarnings.tsx (이벤트 수신 + 배너)
//   - UI 상태           → hooks/useWritingReducer.ts (splitView/drag/version)
//
// M1 저장 경로 (useProjectManager / useAutoSave / use*Writer) 0 수정 — prop 패스스루.
// ============================================================

import React, { useRef, useEffect, useCallback, useState, useMemo, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import type { AppLanguage, StoryConfig, ChatSession, Message, AppTab } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import { createT, L4 } from '@/lib/i18n';
import { useWritingChat } from '@/hooks/useWritingChat';
import type { ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { useSVIRecorder } from '@/hooks/useSVIRecorder';
import type { NovelEditorHandle } from '@/components/studio/NovelEditor';
import { useInlineCompletion } from '@/hooks/useInlineCompletion';
import { WritingContextPanel } from '@/components/studio/WritingContextPanel';
import { useQualityAnalysis } from '@/hooks/useQualityAnalysis';
import { useContinuityCheck } from '@/hooks/useContinuityCheck';
import { useUndoStack } from '@/hooks/useUndoStack';
import { useUserRoleSafe } from '@/contexts/UserRoleContext';
import { useWritingReducer } from '@/hooks/useWritingReducer';

import { AIModeSection } from './writing/AIModeSection';
import { EditModeSection } from './writing/EditModeSection';
// ============================================================
// M2.2 Day 9-10 — 고급 3모드 dynamic import
// ============================================================
// [G] AI + Edit 만 기본 번들. Canvas/Refine/Advanced 는 사용자가 고급 모드로
//     진입해 드롭다운에서 선택할 때 on-demand 로드.
//     ModeLoadingPlaceholder 로 로딩 스켈레톤 표시.
// ============================================================
import { InputDockSection } from './writing/InputDockSection';
import { MobileOverlaySection } from './writing/MobileOverlaySection';
import { ModeSwitch } from './writing/ModeSwitch';
import { FabControls } from './writing/FabControls';
import { SceneWarningsBanner, useSceneWarnings } from './writing/SceneWarnings';
// ModeLoadingPlaceholder는 ModeSwitch 드롭다운에서 선택 직후 명시적으로 사용한다.
// dynamic loading 스켈레톤과 달리 language-aware 4언어 문구를 제공.
import { ModeLoadingPlaceholder } from './writing/ModeLoadingPlaceholder';
import { TabHeader } from '@/components/studio/TabHeader';
import { X } from 'lucide-react';

const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: DynSkeleton });

// [G] 고급 3모드 청크 분리 — 각 named export 를 default 로 매핑.
//     data-testid 를 포함한 로딩 스켈레톤을 노출하여 E2E 에서 chunk on-demand
//     로드를 검증. 실제 렌더 시 language-aware 는 ModeLoadingPlaceholder 로 보강.
const CanvasModeSection = dynamic(
  () => import('./writing/CanvasModeSection').then(m => ({ default: m.CanvasModeSection })),
  { ssr: false, loading: () => <div data-testid="mode-chunk-loading-canvas" className="h-40 rounded-2xl bg-bg-secondary/30 animate-pulse" /> },
);
const RefineModeSection = dynamic(
  () => import('./writing/RefineModeSection').then(m => ({ default: m.RefineModeSection })),
  { ssr: false, loading: () => <div data-testid="mode-chunk-loading-refine" className="h-40 rounded-2xl bg-bg-secondary/30 animate-pulse" /> },
);
const AdvancedModeSection = dynamic(
  () => import('./writing/AdvancedModeSection').then(m => ({ default: m.AdvancedModeSection })),
  { ssr: false, loading: () => <div data-testid="mode-chunk-loading-advanced" className="h-40 rounded-2xl bg-bg-secondary/30 animate-pulse" /> },
);

// ============================================================
// M2.2 — Language-aware 프리로드 플레이스홀더 (전환 직후)
// ============================================================
// next/dynamic 의 loading prop 은 language 클로저 밖에서 실행되므로
// 4언어 문구를 쓸 수 없다. 본 컴포넌트 내부에서는 고급 모드 진입 시점을
// useDeferredValue 로 한 프레임 지연시켜, 첫 프레임에 ModeLoadingPlaceholder 를
// 노출한 뒤 실제 dynamic 청크가 이어받도록 한다.
//
// [C] 어떠한 effect 도 setState 를 동반하지 않는다 — render-time 계산만 수행.
//     useDeferredValue 는 React 내장 API 로 render-time 에서 안전하게 호출.

// ============================================================
// PART 1 — Props
// ============================================================

interface Props {
  language: AppLanguage;
  currentSession: ChatSession;
  currentSessionId: string | null;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  writingMode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';
  setWritingMode: (mode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  editDraftRef: React.RefObject<HTMLTextAreaElement | null>;
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  canvasPass: number;
  setCanvasPass: (val: number | ((p: number) => number)) => void;
  promptDirective: string;
  isGenerating: boolean;
  lastReport: EngineReport | null;
  generationTime?: number | null;
  tokenUsage?: { used: number; budget: number } | null;
  handleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  handleCancel: () => void;
  handleRegenerate: (msgId: string) => void;
  handleVersionSwitch: (msgId: string, idx: number) => void;
  handleTypoFix: (msgId: string, idx: number, orig: string, sug: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  filteredMessages: Message[];
  hasApiKey: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  setActiveTab: (tab: AppTab) => void;
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: (s: AdvancedWritingSettings) => void;
  advancedOutputMode?: string;
  setAdvancedOutputMode?: (m: string) => void;
  showDashboard: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPState;
  handleNextEpisode: () => void;
  showAiLock: boolean;
  hostedProviders: Partial<Record<string, boolean>>;
  saveFlash: boolean;
  triggerSave: () => void;
  writingColumnShell: string;
  writingInputDockOffset?: string;
  input: string;
  setInput: (v: string) => void;
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
}

// ============================================================
// PART 2 — Shell 컴포넌트 (Props 분해)
// ============================================================

export default function WritingTabInline(props: Props) {
  const {
    language, currentSession, currentSessionId,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective,
    isGenerating, lastReport, generationTime, tokenUsage,
    handleSend, handleRegenerate,
    messagesEndRef, searchQuery, filteredMessages,
    showAiLock,
    hasApiKey, setShowApiKeyModal,
    writingColumnShell,
    input, setInput,
    suggestions, setSuggestions, pipelineResult,
    setConfig, setActiveTab,
    directorReport, hfcpState, hostedProviders,
  } = props;

  // ── Writing chat (엔진 보조 채팅) ──
  const {
    chatMessages, sendChat, chatLoading, abortChat, clearChat,
  } = useWritingChat({
    genre: currentSession.config.genre,
    synopsis: currentSession.config.synopsis,
    characters: currentSession.config.characters?.map(c => c.name).join(', '),
    currentChapter: currentSession.messages.slice(-2).map(m => m.content).join('\n').slice(0, 2000),
  });

  const t = createT(language);

  // ── 사용자 역할 컨텍스트 (advancedWritingMode 영속화) ──
  const userRole = useUserRoleSafe();
  const advancedWritingMode = userRole?.advancedWritingMode ?? false;
  const setAdvancedWritingMode = userRole?.setAdvancedWritingMode ?? (() => undefined);

  // 고급 OFF ↔ 고급 전용 모드 불일치 시 edit로 안전 복귀.
  useEffect(() => {
    if (!advancedWritingMode && (writingMode === 'canvas' || writingMode === 'refine' || writingMode === 'advanced')) {
      setWritingMode('edit');
    }
  }, [advancedWritingMode, writingMode, setWritingMode]);

  // ============================================================
  // PART 3 — UI 상태 (reducer 클러스터)
  // ============================================================
  const ui = useWritingReducer();
  const {
    state: { isDragOver, splitView, showCompletionHint, draftVersions, draftVersionIdx, novelSelection },
    setDragOver, setSplitView, setCompletionHint, pushDraftVersion, setDraftVersionIdx,
    setNovelSelection,
  } = ui;

  // ── 파일 드롭 ──
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(txt|md|json)$/i)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result) return;
      setEditDraft(editDraft ? editDraft + '\n\n---\n\n' + result : result);
    };
    reader.readAsText(file, 'UTF-8');
  }, [setEditDraft, editDraft, setDragOver]);

  // ── 품질/연속성/컨텍스트 ──
  const textMenu = useTextAreaContextMenu(language);
  const { handleSVIKeyDown } = useSVIRecorder();
  const quality = useQualityAnalysis(editDraft);
  const continuityWarnings = useContinuityCheck(editDraft, currentSession?.config ?? null);

  // ── 씬 경고 이벤트 수신 ──
  const sceneWarnings = useSceneWarnings();

  // ── 인라인 자동완성 토글 (localStorage 영속) ──
  const novelEditorRef = useRef<NovelEditorHandle>(null);
  const [inlineCompletionEnabled, setInlineCompletionEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('noa_inline_completion_enabled');
    return stored !== 'false';
  });
  const [completionHintShown, setCompletionHintShown] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('noa_tab_hint_shown') === '1';
  });

  // 편집 모드 첫 진입 시 힌트 1회 표시.
  useEffect(() => {
    if (writingMode === 'edit' && !completionHintShown && inlineCompletionEnabled) {
      const timer = setTimeout(() => setCompletionHint(true), 800);
      return () => clearTimeout(timer);
    }
    if (writingMode !== 'edit') setCompletionHint(false);
  }, [writingMode, completionHintShown, inlineCompletionEnabled, setCompletionHint]);

  const dismissCompletionHint = useCallback(() => {
    setCompletionHint(false);
    setCompletionHintShown(true);
    try { localStorage.setItem('noa_tab_hint_shown', '1'); } catch { /* quota */ }
  }, [setCompletionHint]);

  const toggleInlineCompletion = useCallback(() => {
    setInlineCompletionEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem('noa_inline_completion_enabled', String(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  const inlineCompletion = useInlineCompletion({
    enabled: inlineCompletionEnabled && writingMode === 'edit' && !novelSelection && !isGenerating,
    debounceMs: 1500,
    maxTokens: 100,
    genre: currentSession?.config?.genre,
    characters: currentSession?.config?.characters?.slice(0, 10),
  });

  // ── Undo 스택 ──
  const undoStack = useUndoStack(editDraft);

  // ── 자동 버전 스냅샷 (300자+ 변경) ──
  const lastSnapshotRef = useRef(editDraft);
  useEffect(() => {
    if (writingMode !== 'edit' || !editDraft) return;
    undoStack.checkAutoSnapshot(editDraft);
    const diff = Math.abs(editDraft.length - lastSnapshotRef.current.length);
    if (diff >= 300 && editDraft.length > 50) {
      lastSnapshotRef.current = editDraft;
      pushDraftVersion(editDraft);
    }
  }, [editDraft, writingMode, undoStack, pushDraftVersion]);

  // ── Tiptap 인라인 자동완성 → ghost text decoration 싱크 ──
  useEffect(() => {
    const editor = novelEditorRef.current?.getEditor();
    if (!editor) return;
    const storage = editor.storage as { inlineCompletion?: { suggestion: string | null } };
    if (storage.inlineCompletion) {
      storage.inlineCompletion.suggestion = inlineCompletion.suggestion;
      editor.view.dispatch(editor.view.state.tr);
    }
  }, [inlineCompletion.suggestion]);

  // ── editDraft 변화 → 새 자동완성 트리거 ──
  const prevDraftRef = useRef(editDraft);
  useEffect(() => {
    if (writingMode !== 'edit') return;
    if (editDraft === prevDraftRef.current) return;
    prevDraftRef.current = editDraft;
    inlineCompletion.dismiss();
    if (editDraft.length >= 20) {
      inlineCompletion.triggerCompletion(editDraft);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDraft, writingMode]);

  // ── 스트리밍 자동 스크롤 ──
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const handleStreamScroll = useCallback(() => {
    const el = streamContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    userScrolledUpRef.current = !atBottom;
  }, []);
  const lastMsgContent = currentSession.messages[currentSession.messages.length - 1]?.content;
  useEffect(() => {
    if (!isGenerating) {
      userScrolledUpRef.current = false;
      return;
    }
    if (userScrolledUpRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isGenerating, lastMsgContent, messagesEndRef]);

  const handleChatSend = useCallback((txt: string) => {
    sendChat(txt, language);
  }, [sendChat, language]);

  // ============================================================
  // M2.2 Day 9-10 — 고급 모드 진입 시 language-aware placeholder 프리뷰
  // ============================================================
  // useDeferredValue 는 이전 렌더의 값을 먼저 반환하고, 급하지 않은 업데이트를
  // 뒤로 미뤄 첫 프레임에 placeholder 가 노출되게 한다. dynamic chunk 가 로드되는
  // 사이 자연스러운 전환 — set-state-in-effect 룰 위반 없음.
  const deferredWritingMode = useDeferredValue(writingMode);
  const advancedModeReady = deferredWritingMode === writingMode;

  // ============================================================
  // M2.2 Day 11-12 — 씬시트 비어있음 가드 (FAB 에 전달)
  // ============================================================
  // [G] episodeSceneSheets 변화에 대해서만 재계산 — 타이핑 중 editDraft
  //     변화로는 매번 돌지 않는다. 현재 에피소드의 scenes 배열이 비었거나,
  //     에피소드에 해당하는 씬시트 자체가 없으면 empty 로 간주.
  const sceneSheetEmpty = useMemo<boolean>(() => {
    const episode = currentSession?.config?.episode ?? 1;
    const sheets = currentSession?.config?.episodeSceneSheets ?? [];
    if (sheets.length === 0) return true;
    const sheet = sheets.find((s) => s.episode === episode);
    if (!sheet) return true;
    return (sheet.scenes?.length ?? 0) === 0;
  }, [currentSession?.config?.episode, currentSession?.config?.episodeSceneSheets]);

  // ============================================================
  // PART 4 — Shell JSX
  // ============================================================

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary">
      <TabHeader
        icon="✍️"
        title={L4(language, { ko: '집필', en: 'Write', ja: '執筆', zh: '写作' })}
        description={L4(language, {
          ko: '좌측 에디터에 글을 쓰세요. NOA 도움은 우측 하단 버튼 (Ctrl+Enter)',
          en: 'Write on the left editor. Use the bottom-right button for NOA help (Ctrl+Enter)',
          ja: '左側のエディタで執筆。右下のボタンでNOAサポート (Ctrl+Enter)',
          zh: '在左侧编辑器中写作。右下角按钮启用 NOA 协助 (Ctrl+Enter)',
        })}
      />
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* 참조 패널 — edit 모드에서만 */}
        {writingMode === 'edit' && (
          <WritingContextPanel config={currentSession.config} language={language} />
        )}

        {/* 소설 본문 영역 */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full border-b lg:border-b-0 lg:border-r border-border/40">
          {/* 모드 전환 툴바 */}
          <ModeSwitch
            language={language}
            writingMode={writingMode}
            setWritingMode={setWritingMode}
            hasApiKey={hasApiKey}
            setShowApiKeyModal={setShowApiKeyModal}
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            currentSession={currentSession}
            advancedWritingMode={advancedWritingMode}
            setAdvancedWritingMode={setAdvancedWritingMode}
            undoStack={undoStack}
            inlineCompletionEnabled={inlineCompletionEnabled}
            toggleInlineCompletion={toggleInlineCompletion}
            splitView={splitView}
            setSplitView={setSplitView}
            setActiveTab={setActiveTab}
          />

          {/* Tab 자동완성 1회 힌트 */}
          {showCompletionHint && writingMode === 'edit' && (
            <div className="mx-4 mt-2 flex items-center gap-2 py-2 px-3 bg-accent-amber/5 border-l-2 border-accent-amber rounded text-xs text-text-tertiary animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="shrink-0">&#128161;</span>
              <span className="flex-1 text-xs leading-relaxed">
                {L4(language, {
                  ko: '글을 멈추면 노아가 다음 문장을 제안합니다. Tab으로 수락, Esc로 무시',
                  en: 'When you pause writing, NOA suggests the next sentence. Tab to accept, Esc to dismiss',
                  ja: '入力を止めるとノアが次の文を提案します。Tabで採用、Escで無視',
                  zh: '停止输入时诺亚会建议下一句。Tab接受，Esc忽略',
                })}
              </span>
              <button
                onClick={dismissCompletionHint}
                className="text-text-tertiary/60 hover:text-text-primary transition-colors text-sm leading-none shrink-0"
                aria-label="Dismiss hint"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 메인 스크롤 영역 */}
          <div
            ref={streamContainerRef}
            onScroll={handleStreamScroll}
            aria-live="polite"
            aria-label={L4(language, {
              ko: '노아 생성 결과',
              en: 'NOA generation output',
              ja: 'ノア生成結果',
              zh: '诺亚生成结果',
            })}
            className={`${writingColumnShell} flex-1 overflow-y-auto ${
              currentSession.messages.length === 0 && writingMode === 'ai'
                ? 'flex flex-col justify-center items-center px-4'
                : 'py-6 md:py-8 space-y-6 px-4 md:px-8 custom-scrollbar'
            }`}
          >
            {/* Continuity 그래프 */}
            {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
              <ContinuityGraph language={language} config={currentSession.config} />
            )}

            {/* 적용된 설정 요약 (간이) */}
            {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
              <details className="w-full group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary">
                    {t('applied.appliedSettings')}
                  </span>
                  <span className="text-[11px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 space-y-3 text-[13px] border-t border-border pt-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-text-tertiary font-bold uppercase w-16">{t('applied.genre')}</span>
                    <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                    <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                  </div>
                </div>
              </details>
            )}

            {/* 씬시트 인라인 경고 */}
            <SceneWarningsBanner language={language} warnings={sceneWarnings} />

            {/* 모드별 렌더 */}
            <div className="space-y-6">
              {writingMode === 'ai' && (
                <AIModeSection
                  language={language}
                  currentSession={currentSession}
                  lastReport={lastReport}
                  isGenerating={isGenerating}
                  slowWarning={null}
                  generationTime={generationTime}
                  tokenUsage={tokenUsage}
                  searchQuery={searchQuery}
                  filteredMessages={filteredMessages}
                  handleRegenerate={handleRegenerate}
                  hostedProviders={hostedProviders}
                  setActiveTab={setActiveTab}
                  setWritingMode={setWritingMode}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                />
              )}

              {writingMode === 'edit' && (
                <EditModeSection
                  language={language}
                  currentSession={currentSession}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                  editDraftRef={editDraftRef}
                  novelEditorRef={novelEditorRef}
                  novelSelection={novelSelection}
                  setNovelSelection={setNovelSelection}
                  quality={quality}
                  continuityWarnings={continuityWarnings}
                  undoStack={undoStack}
                  draftVersions={draftVersions}
                  draftVersionIdx={draftVersionIdx}
                  setDraftVersionIdx={setDraftVersionIdx}
                  isDragOver={isDragOver}
                  setIsDragOver={setDragOver}
                  handleFileDrop={handleFileDrop}
                  splitView={splitView}
                  setSplitView={setSplitView}
                  chatMessages={chatMessages}
                  chatLoading={chatLoading}
                  handleChatSend={handleChatSend}
                  abortChat={abortChat}
                  clearChat={clearChat}
                  directorReport={directorReport}
                  hfcpState={hfcpState}
                  suggestions={suggestions}
                  setSuggestions={setSuggestions}
                  pipelineResult={pipelineResult}
                  setActiveTab={setActiveTab}
                  hostedProviders={hostedProviders}
                  setConfig={setConfig}
                />
              )}

              {writingMode === 'canvas' && (
                advancedModeReady ? (
                  <CanvasModeSection
                    language={language}
                    canvasContent={canvasContent}
                    setCanvasContent={setCanvasContent}
                    canvasPass={canvasPass}
                    setCanvasPass={setCanvasPass}
                    isGenerating={isGenerating}
                    handleSend={handleSend}
                    editDraft={editDraft}
                    setEditDraft={setEditDraft}
                    setWritingMode={setWritingMode}
                    undoStack={undoStack}
                  />
                ) : (
                  <ModeLoadingPlaceholder language={language} mode="canvas" />
                )
              )}

              {writingMode === 'refine' && (
                advancedModeReady ? (
                  <RefineModeSection
                    language={language}
                    editDraft={editDraft}
                    setEditDraft={setEditDraft}
                    promptDirective={promptDirective}
                    quality={quality}
                  />
                ) : (
                  <ModeLoadingPlaceholder language={language} mode="refine" />
                )
              )}

              {writingMode === 'advanced' && (
                advancedModeReady ? (
                  <AdvancedModeSection
                    language={language}
                    editDraft={editDraft}
                    setEditDraft={setEditDraft}
                    editDraftRef={editDraftRef}
                  />
                ) : (
                  <ModeLoadingPlaceholder language={language} mode="advanced" />
                )
              )}
            </div>
            <div ref={messagesEndRef} className="h-32" />
          </div>

          {/* 소설 전용 하단 입력창 (AI 모드) */}
          {writingMode === 'ai' && currentSessionId && (
            <InputDockSection
              language={language}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              isGenerating={isGenerating}
              showAiLock={showAiLock}
              handleSVIKeyDown={handleSVIKeyDown}
            />
          )}
        </div>

        <MobileOverlaySection
          language={language}
          splitView={splitView}
          setSplitView={setSplitView}
          currentSession={currentSession}
          setConfig={setConfig}
          chatMessages={chatMessages}
          chatLoading={chatLoading}
          handleChatSend={handleChatSend}
          abortChat={abortChat}
          clearChat={clearChat}
          directorReport={directorReport}
          hfcpState={hfcpState}
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          pipelineResult={pipelineResult}
          setActiveTab={setActiveTab}
          hostedProviders={hostedProviders}
          textMenu={textMenu}
        />

        {/* AI FAB — 엔진 호출 (Ctrl+Enter) + 씬시트 가드 (M2.2) */}
        <FabControls
          language={language}
          writingMode={writingMode}
          isGenerating={isGenerating}
          showAiLock={showAiLock}
          currentSessionId={currentSessionId}
          handleSend={handleSend}
          sceneSheetEmpty={sceneSheetEmpty}
        />
      </div>
    </div>
  );
}
