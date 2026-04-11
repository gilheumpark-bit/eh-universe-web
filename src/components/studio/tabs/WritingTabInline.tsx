"use client";

// ============================================================
// WritingTabInline — 집필 탭 레이아웃 (본문 7 : AI 채팅 3)
// ============================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Send, Columns2, BookOpen, Undo2, Redo2, PenLine, Layers, Wand2, Settings2, ChevronDown } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import { createT } from '@/lib/i18n';
import { RightChatPanel } from '@/components/studio/tabs/RightChatPanel';
import { useWritingChat } from '@/hooks/useWritingChat';
import type { ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import { ContextMenu } from '@/components/code-studio/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { useSVIRecorder } from '@/hooks/useSVIRecorder';
import { InlineActionPopup } from '@/components/studio/InlineActionPopup';
import { WritingContextPanel } from '@/components/studio/WritingContextPanel';
import { ReferenceSplitPane } from '@/components/studio/ReferenceSplitPane';
import { useQualityAnalysis } from '@/hooks/useQualityAnalysis';
import { useContinuityCheck } from '@/hooks/useContinuityCheck';
import { useUndoStack } from '@/hooks/useUndoStack';

const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: DynSkeleton });
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false, loading: DynSkeleton });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: DynSkeleton });
const WritingToolbar = dynamic(() => import('@/components/studio/WritingToolbar').then(m => ({ default: m.WritingToolbar })), { ssr: false, loading: DynSkeleton });
const QualityGutter = dynamic(() => import('@/components/studio/QualityGutter'), { ssr: false });
const ContinuityWarnings = dynamic(() => import('@/components/studio/ContinuityWarnings'), { ssr: false });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });

interface Props {
  language: AppLanguage;
  currentSession: ChatSession;
  currentSessionId: string | null;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  writingMode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced'; // canvas/refine/advanced: 상태 인프라 준비됨 (useStudioAI에서 canvasPass 사용)
  setWritingMode: (mode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  editDraftRef: React.RefObject<HTMLTextAreaElement | null>;
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  canvasPass: number;
  setCanvasPass: (val: number | ((p: number) => number)) => void;
  promptDirective: string;
  setPromptDirective: (val: string) => void;
  isGenerating: boolean;
  lastReport: EngineReport | null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setActiveTab: (tab: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  advancedSettings: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAdvancedSettings: (s: any) => void;
  advancedOutputMode?: string;
  setAdvancedOutputMode?: (m: string) => void;
  showDashboard: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  directorReport: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hfcpState: any;
  handleNextEpisode: () => void;
  showAiLock: boolean;
  hostedProviders: Partial<Record<string, boolean>>;
  saveFlash: boolean;
  triggerSave: () => void;
  writingColumnShell: string;
  writingInputDockOffset?: string;
  input: string;
  setInput: (v: string) => void;
  // External control props for sidebar integration
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
}

export default function WritingTabInline(props: Props) {
  const {
    language, currentSession, currentSessionId,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
    isGenerating, lastReport,
    handleSend, handleRegenerate,
    messagesEndRef, searchQuery, filteredMessages,
    showAiLock,
    hasApiKey, setShowApiKeyModal,
    writingColumnShell,
    input, setInput,
    suggestions, setSuggestions, pipelineResult,
    setConfig, setActiveTab,
  } = props;

  const {
    chatMessages, sendChat, chatLoading, abortChat, clearChat
  } = useWritingChat({
    genre: currentSession.config.genre,
    synopsis: currentSession.config.synopsis,
    characters: currentSession.config.characters?.map(c => c.name).join(', '),
    currentChapter: currentSession.messages.slice(-2).map(m => m.content).join('\n').slice(0, 2000),
  });

  const t = createT(language);
  const [splitView, setSplitView] = useState<'chat' | 'reference' | null>(null);
  const isKO = language === 'KO';
  const textMenu = useTextAreaContextMenu(language);
  const { handleSVIKeyDown } = useSVIRecorder();

  // P1: 실시간 품질 분석
  const quality = useQualityAnalysis(editDraft);
  // P1: 연속성 경고
  const continuityWarnings = useContinuityCheck(editDraft, currentSession?.config ?? null);
  // P2: Undo 스택
  const undoStack = useUndoStack(editDraft);

  // P2: 버전 히스토리 — 300자 이상 변경 시 자동 스냅샷
  const [draftVersions, setDraftVersions] = useState<string[]>([]);
  const [draftVersionIdx, setDraftVersionIdx] = useState(0);
  const lastSnapshotRef = useRef(editDraft);
  useEffect(() => {
    if (writingMode !== 'edit' || !editDraft) return;
    const diff = Math.abs(editDraft.length - lastSnapshotRef.current.length);
    if (diff >= 300 && editDraft.length > 50) {
      lastSnapshotRef.current = editDraft;
      setDraftVersions(prev => {
        const next = [...prev, editDraft];
        if (next.length > 20) next.shift();
        return next;
      });
      setDraftVersionIdx(prev => prev + 1);
    }
  }, [editDraft, writingMode]);

  // P2: 키보드 단축키 — Ctrl+Shift+R (인라인 리라이트), Ctrl+Z/Y (undo/redo)
  const handleWritingKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleSVIKeyDown(e);

    // Ctrl+Shift+R → 선택 영역 인라인 리라이트 트리거
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      const ta = editDraftRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (end - start < 2) return;
      // mouseup 이벤트를 시뮬레이트해서 InlineActionPopup이 표시되도록
      ta.dispatchEvent(new Event('mouseup', { bubbles: true }));
      return;
    }

    // Ctrl+Z → Undo (인라인 리라이트 전용)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z' && undoStack.canUndo) {
      // 브라우저 기본 undo와 겹치므로 undoStack에 항목이 있을 때만
      if (undoStack.undoCount > 1) {
        e.preventDefault();
        const prev = undoStack.undo();
        if (prev !== null) setEditDraft(prev);
      }
    }

    // Ctrl+Shift+Z 또는 Ctrl+Y → Redo
    if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      if (undoStack.canRedo) {
        e.preventDefault();
        const next = undoStack.redo();
        if (next !== null) setEditDraft(next);
      }
    }
  }, [handleSVIKeyDown, editDraftRef, undoStack, setEditDraft]);

  // Fix #10: Streaming auto-scroll with manual scroll detection
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

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-bg-primary">
      {/* 참조 패널 — edit 모드에서만 */}
      {writingMode === 'edit' && (
        <WritingContextPanel config={currentSession.config} language={language} />
      )}
      {/* 7: 소설 본문 영역 */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full border-b lg:border-b-0 lg:border-r border-border/40">
        {/* Split 레이아웃에서도 집필 모드 전환 — 메인 스크롤 영역에서도 상단에 고정 (sticky) */}
        <div data-zen-hide-bar className="sticky top-0 z-30 shrink-0 px-3 py-2.5 border-b border-border/60 bg-bg-primary/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto items-center">
            {/* 기본 2개: 항상 노출 */}
            <button
              type="button"
              onClick={() => {
                setWritingMode('edit');
                if (!editDraft && currentSession.messages.length > 0) {
                  const allText = currentSession.messages
                    .filter((m) => m.role === 'assistant' && m.content)
                    .map((m) => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                    .join('\n\n---\n\n');
                  setEditDraft(allText);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                writingMode === 'edit'
                  ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
                  : 'border-border text-text-secondary hover:border-accent-amber/40'
              }`}
              title={isKO ? '직접 타이핑으로 집필합니다' : 'Write by typing directly'}
            >
              <PenLine className="w-3.5 h-3.5" />
              {isKO ? '집필' : 'Write'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasApiKey) { setShowApiKeyModal(true); return; }
                setWritingMode('ai');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                writingMode === 'ai'
                  ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple'
                  : 'border-border text-text-secondary hover:border-accent-purple/40'
              }`}
              title={isKO ? 'NOA가 장면을 생성합니다' : 'NOA generates scenes for you'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isKO ? 'NOA 생성' : 'Generate'}
            </button>

            {/* 더보기: API 키 있을 때만 노출 */}
            {hasApiKey && (
              <>
                <div className="w-px h-5 bg-border/50 mx-1" />
                <button
                  type="button"
                  onClick={() => setWritingMode('canvas')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    writingMode === 'canvas'
                      ? 'bg-accent-green/20 border-accent-green/50 text-accent-green'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
                  }`}
                  title={isKO ? '구조→초안→다듬기 3단계로 완성' : 'Structure → Draft → Polish in 3 steps'}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {isKO ? '3단계' : '3-Step'}
                </button>
                <button
                  type="button"
                  onClick={() => setWritingMode('refine')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    writingMode === 'refine'
                      ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
                  }`}
                  title={isKO ? '약한 문단을 AI가 자동으로 개선합니다' : 'AI automatically improves weak paragraphs'}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {isKO ? '다듬기' : 'Refine'}
                </button>
                <button
                  type="button"
                  onClick={() => setWritingMode('advanced')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    writingMode === 'advanced'
                      ? 'bg-accent-red/20 border-accent-red/50 text-accent-red'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
                  }`}
                  title={isKO ? '엔진 파라미터를 직접 제어합니다' : 'Directly control engine parameters'}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  {isKO ? '엔진' : 'Engine'}
                </button>
              </>
            )}
            {/* Split view toggles */}
            <div className="hidden lg:flex items-center gap-1 ml-2 pl-2 border-l border-border/40">
              <button
                type="button"
                onClick={() => setSplitView(splitView === 'reference' ? null : 'reference')}
                className={`p-2 rounded-xl border transition-colors ${
                  splitView === 'reference'
                    ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
                title={isKO ? '참조 패널' : 'Reference Pane'}
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSplitView(splitView === 'chat' ? null : 'chat')}
                className={`p-2 rounded-xl border transition-colors ${
                  splitView === 'chat'
                    ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
                title={isKO ? 'NOA 채팅' : 'NOA Chat'}
              >
                <Columns2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div 
          ref={streamContainerRef} 
          onScroll={handleStreamScroll} 
          className={`${writingColumnShell} flex-1 overflow-y-auto ${currentSession.messages.length === 0 && writingMode === 'ai' ? 'flex flex-col justify-center items-center px-4' : 'py-6 md:py-8 space-y-6 px-4 md:px-8 custom-scrollbar'}`}
        >
          {/* Continuity Tracker Graph */}
          {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
            <ContinuityGraph language={language} config={currentSession.config} />
          )}

          {/* Applied Settings Summary */}
          {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
            <details className="w-full group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary">
                  {t('applied.appliedSettings')}
                </span>
                <span className="text-[11px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 space-y-3 text-[10px] border-t border-border pt-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-text-tertiary font-bold uppercase w-16">{t('applied.genre')}</span>
                  <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                  <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                </div>
              </div>
            </details>
          )}

          {/* Main Rendering Area */}
          <div className="space-y-6">
            {writingMode === 'ai' && (
              <>
                <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                {currentSession.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 md:py-20 px-2">
                    <Sparkles className="w-16 h-16 text-accent-purple/20 animate-pulse" />
                    <div className="space-y-3 max-w-md">
                      <p className="text-text-primary text-xl font-black">{t('engine.startPrompt')}</p>
                      <p className="text-text-tertiary text-xs font-mono">{t('writingMode.describeFirstScene')}</p>
                      <p className="text-text-tertiary text-[11px] leading-relaxed pt-1">{t('writingMode.emptyStateManualHint')}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setWritingMode('edit');
                          if (!editDraft && currentSession.messages.length > 0) {
                            const allText = currentSession.messages
                              .filter((m) => m.role === 'assistant' && m.content)
                              .map((m) => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                              .join('\n\n---\n\n');
                            setEditDraft(allText);
                          }
                        }}
                        className="mt-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 transition-colors"
                      >
                        {t('writingMode.startManualEdit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 pb-10">
                    {(searchQuery ? filteredMessages : currentSession.messages).map(msg => (
                      <div key={msg.id} className="animate-in fade-in duration-500">
                        <ChatMessage 
                          message={msg} 
                          language={language} 
                          onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined}
                          hostedProviders={props.hostedProviders}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {writingMode === 'edit' && (
              <div className="flex-1 space-y-3">
                {/* 모드 설명 배너 — 첫 진입 가이드 */}
                {editDraft.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-amber/5 border border-accent-amber/20 text-[11px] text-accent-amber">
                    <PenLine className="w-4 h-4 shrink-0" />
                    <span>{isKO ? '직접 타이핑으로 집필합니다. 텍스트 선택 후 Ctrl+Shift+R로 NOA 리라이트를 사용할 수 있습니다.' : 'Write by typing. Select text and press Ctrl+Shift+R for NOA inline rewrite.'}</span>
                  </div>
                )}
                <WritingToolbar textareaRef={editDraftRef} value={editDraft} onChange={setEditDraft} language={language} targetMin={currentSession.config.guardrails?.min} targetMax={currentSession.config.guardrails?.max} />

                {/* P1: 연속성 경고 */}
                {continuityWarnings.length > 0 && (
                  <ContinuityWarnings warnings={continuityWarnings} language={language} />
                )}

                {/* P1: 품질 분석 게이지 */}
                {editDraft.length > 50 && (
                  <QualityGutter
                    paragraphs={quality.paragraphs}
                    averageScore={quality.averageScore}
                    weakCount={quality.weakCount}
                    language={language}
                    onSelectWeak={(index) => {
                      // 해당 문단으로 스크롤
                      const ta = editDraftRef.current;
                      if (!ta) return;
                      const paras = editDraft.split(/\n\s*\n/);
                      let offset = 0;
                      for (let i = 0; i < index && i < paras.length; i++) offset += paras[i].length + 2;
                      ta.focus();
                      ta.setSelectionRange(offset, offset + (paras[index]?.length || 0));
                      const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 28;
                      ta.scrollTop = Math.max(0, editDraft.slice(0, offset).split('\n').length * lineHeight - ta.clientHeight / 3);
                    }}
                  />
                )}

                {/* P2: Undo/Redo 바 */}
                {undoStack.undoCount > 1 && (
                  <div className="flex items-center gap-1.5 px-2">
                    <button
                      type="button"
                      onClick={() => { const prev = undoStack.undo(); if (prev !== null) setEditDraft(prev); }}
                      disabled={!undoStack.canUndo}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors"
                      title={isKO ? '되돌리기 (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                    >
                      <Undo2 className="w-3 h-3" />
                      {isKO ? '되돌리기' : 'Undo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { const next = undoStack.redo(); if (next !== null) setEditDraft(next); }}
                      disabled={!undoStack.canRedo}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors"
                      title={isKO ? '다시 실행 (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
                    >
                      <Redo2 className="w-3 h-3" />
                      {isKO ? '다시' : 'Redo'}
                    </button>
                    {undoStack.lastLabel && (
                      <span className="text-[9px] font-mono text-text-tertiary ml-1">
                        {undoStack.lastLabel}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-text-quaternary ml-auto">
                      Ctrl+Shift+R: {isKO ? '인라인 리라이트' : 'Inline Rewrite'}
                    </span>
                  </div>
                )}

                {/* P2: 버전 히스토리 diff */}
                {draftVersions.length >= 2 && (
                  <VersionDiff
                    versions={draftVersions}
                    currentIndex={Math.min(draftVersionIdx, draftVersions.length - 1)}
                    language={language}
                    onSwitch={(idx) => {
                      setDraftVersionIdx(idx);
                      setEditDraft(draftVersions[idx]);
                    }}
                  />
                )}

                <textarea
                  ref={editDraftRef}
                  data-zen-editor
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  onKeyDown={handleWritingKeyDown}
                  onContextMenu={textMenu.openMenu}
                  autoFocus
                  className="w-full min-h-[70vh] bg-[var(--color-surface-soft)] border border-border/50 rounded-2xl px-8 py-8 md:px-12 md:py-10 text-base md:text-lg font-serif leading-[2] tracking-wide focus:border-accent-amber/40 focus:shadow-[0_0_24px_rgba(202,161,92,0.08)] outline-none transition-all resize-none"
                  placeholder={isKO ? '여기에 이야기를 써 내려가세요...' : 'Start writing your story here...'}
                />
                <InlineActionPopup
                  textareaRef={editDraftRef}
                  language={language}
                  storyConfig={{
                    genre: currentSession.config.genre || undefined,
                    tone: currentSession.config.narrativeIntensity || undefined,
                    characters: currentSession.config.characters?.slice(0, 5).map(c => ({
                      name: c.name, role: c.role, speechStyle: c.speechStyle,
                    })),
                  }}
                  onReplace={(oldText, newText) => {
                    undoStack.push(editDraft, isKO ? '리라이트' : 'Rewrite');
                    setEditDraft(editDraft.replace(oldText, newText));
                  }}
                />
              </div>
            )}

            {writingMode === 'canvas' && (
              <div className="flex-1 space-y-4">
                <div className="bg-accent-green/5 border border-accent-green/20 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-accent-green mb-2">{isKO ? '3단계 캔버스 모드' : 'Three-Step Canvas'}</h3>
                  <p className="text-xs text-text-secondary mb-4">{isKO ? '구조 → 초안 → 다듬기 3단계로 글을 완성합니다.' : 'Complete your writing in 3 steps: Structure → Draft → Polish.'}</p>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <span className={`px-2 py-1 rounded ${canvasPass >= 1 ? 'bg-accent-green/20 text-accent-green' : 'bg-bg-secondary'}`}>{isKO ? '1. 구조' : '1. Structure'}</span>
                    <span className="text-text-quaternary">→</span>
                    <span className={`px-2 py-1 rounded ${canvasPass >= 2 ? 'bg-accent-green/20 text-accent-green' : 'bg-bg-secondary'}`}>{isKO ? '2. 초안' : '2. Draft'}</span>
                    <span className="text-text-quaternary">→</span>
                    <span className={`px-2 py-1 rounded ${canvasPass >= 3 ? 'bg-accent-green/20 text-accent-green' : 'bg-bg-secondary'}`}>{isKO ? '3. 다듬기' : '3. Polish'}</span>
                  </div>
                </div>
                <textarea
                  value={canvasContent}
                  onChange={e => setCanvasContent(e.target.value)}
                  className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-green outline-none transition-all resize-none"
                  placeholder={isKO ? '캔버스에 구조를 작성하세요...' : 'Write your structure on the canvas...'}
                />
              </div>
            )}

            {writingMode === 'refine' && (
              <div className="flex-1 space-y-4">
                <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-accent-blue mb-2 flex items-center gap-2"><Wand2 className="w-4 h-4" /> {isKO ? '다듬기' : 'Refine'}</h3>
                  <p className="text-xs text-text-secondary mb-3">{isKO ? 'NOA가 현재 원고를 분석하고 약한 문단(점수 50 미만)을 자동으로 개선합니다.' : 'NOA analyzes your manuscript and automatically improves weak paragraphs (score <50).'}</p>
                  {promptDirective && <p className="text-xs text-accent-blue font-mono bg-accent-blue/5 rounded px-3 py-2">{isKO ? '지시:' : 'Directive:'} {promptDirective}</p>}

                  {/* 약한 문단 감지 결과 */}
                  {quality.paragraphs.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="font-mono text-text-tertiary">
                        {isKO ? '평균 점수:' : 'Avg Score:'} <span className={quality.averageScore >= 60 ? 'text-accent-green font-bold' : 'text-accent-amber font-bold'}>{quality.averageScore}</span>
                      </span>
                      {quality.weakCount > 0 && (
                        <span className="font-mono text-accent-red">
                          {quality.weakCount} {isKO ? '개 약한 문단 감지됨' : 'weak paragraphs detected'}
                        </span>
                      )}
                      {quality.weakCount === 0 && (
                        <span className="font-mono text-accent-green">
                          {isKO ? '모든 문단 양호' : 'All paragraphs healthy'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 약한 문단 목록 */}
                  {quality.weakCount > 0 && (
                    <div className="mt-3 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {quality.paragraphs.filter(p => p.score < 50).map((p, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-red/5 border border-accent-red/15 text-[11px]">
                          <span className="font-mono font-bold text-accent-red shrink-0">{p.score}</span>
                          <span className="text-text-secondary truncate">{p.text.slice(0, 80)}...</span>
                          <div className="flex gap-1 shrink-0">
                            {p.issues.slice(0, 2).map((iss, j) => (
                              <span key={j} className="text-[9px] px-1 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-mono">
                                {isKO ? iss.messageKO.slice(0, 15) : iss.messageEN.slice(0, 15)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-blue outline-none transition-all resize-none"
                  placeholder={isKO ? '다듬을 원고를 붙여넣으세요...' : 'Paste your manuscript to refine...'}
                />
              </div>
            )}

            {writingMode === 'advanced' && (
              <div className="flex-1 space-y-4">
                <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-accent-red mb-2 flex items-center gap-2"><Settings2 className="w-4 h-4" /> {isKO ? '엔진 설정' : 'Engine Settings'}</h3>
                  <p className="text-xs text-text-secondary">{isKO ? '엔진 파라미터, 장르 프리셋, HFCP 설정을 직접 제어합니다.' : 'Direct control over engine parameters, genre presets, and HFCP settings.'}</p>
                </div>
                <textarea
                  ref={editDraftRef}
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-red outline-none transition-all resize-none"
                  placeholder={isKO ? '고급 모드에서 직접 작성하세요...' : 'Write directly in advanced mode...'}
                />
              </div>
            )}
          </div>
          <div ref={messagesEndRef} className="h-32" />
        </div>

        {/* 소설 전용 하단 입력창 (Sticky) — AI 모드일 때 표시 */}
        {writingMode === 'ai' && currentSessionId && (
          <div className="p-4 md:p-6 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent sticky bottom-0 z-20">
            {/* API lock banner removed — settings accessible via splash screen */}
            <div className="relative group bg-bg-secondary border border-border rounded-2xl shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { handleSVIKeyDown(e); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!showAiLock) handleSend(); } }}
                placeholder={t('writing.inputPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-text-primary placeholder-text-secondary resize-none max-h-32 leading-relaxed"
                rows={1}
                disabled={isGenerating || showAiLock}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isGenerating || showAiLock}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !isGenerating && !showAiLock ? 'bg-accent-purple text-bg-primary shadow-lg hover:scale-[1.02] active:scale-95' : 'bg-bg-tertiary text-text-tertiary opacity-50'}`}
              >
                {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-text-tertiary text-center font-mono uppercase tracking-[0.2em] opacity-40">
              {isKO ? 'Narrative Origin Writer — 소설 생성 엔진' : 'Narrative Origin Writer — Story Engine'}
            </p>
          </div>
        )}
      </div>

      {/* 3: 우측 패널 — 채팅 또는 참조 분할 뷰 */}
      {splitView === 'chat' && (
        <RightChatPanel
          language={language}
          currentSession={currentSession}
          messages={chatMessages}
          loading={chatLoading}
          onSend={handleChatSend}
          onAbort={abortChat}
          onClear={clearChat}
          directorReport={props.directorReport}
          hfcpState={props.hfcpState}
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          pipelineResult={pipelineResult}
          setConfig={setConfig}
          setActiveTab={setActiveTab}
          hostedProviders={props.hostedProviders}
        />
      )}
      {splitView === 'reference' && (
        <div className="hidden lg:flex w-[35%] min-w-[280px] max-w-[500px] shrink-0">
          <ReferenceSplitPane
            config={currentSession.config}
            language={language}
            onClose={() => setSplitView(null)}
          />
        </div>
      )}
      {textMenu.menuState && (
        <ContextMenu
          x={textMenu.menuState.x}
          y={textMenu.menuState.y}
          items={textMenu.items}
          onSelect={textMenu.handleSelect}
          onClose={textMenu.closeMenu}
        />
      )}
    </div>
  );
}
