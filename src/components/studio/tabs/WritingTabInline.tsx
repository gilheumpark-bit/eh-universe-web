"use client";

// ============================================================
// WritingTabInline — 집필 탭 레이아웃 (본문 7 : AI 채팅 3)
// ============================================================

import React, { useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Send, Key } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import { createT } from '@/lib/i18n';
import { RightChatPanel } from '@/components/studio/tabs/RightChatPanel';
import { useWritingChat } from '@/hooks/useWritingChat';
import type { ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import { ContextMenu } from '@/components/code-studio/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';

const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: DynSkeleton });
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false, loading: DynSkeleton });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: DynSkeleton });
const WritingToolbar = dynamic(() => import('@/components/studio/WritingToolbar').then(m => ({ default: m.WritingToolbar })), { ssr: false, loading: DynSkeleton });

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
  } = useWritingChat();

  const t = createT(language);
  const isKO = language === 'KO';
  const textMenu = useTextAreaContextMenu(language);

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
      {/* 7: 소설 본문 영역 */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full border-b lg:border-b-0 lg:border-r border-border/40">
        {/* Split 레이아웃에서도 집필 모드 전환 — 메인 스크롤 영역에서도 상단에 고정 (sticky) */}
        <div className="sticky top-0 z-30 shrink-0 px-3 py-2.5 border-b border-border/60 bg-bg-primary/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <p className="text-center text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary mb-2">
            {t('writingMode.modePickerCaption')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => {
                if (!hasApiKey) {
                  setShowApiKeyModal(true);
                  return;
                }
                setWritingMode('ai');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border transition-colors ${
                writingMode === 'ai'
                  ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple shadow-[0_0_0_1px_rgba(168,85,247,0.25)]'
                  : 'border-border text-text-secondary hover:border-accent-purple/40'
              }`}
            >
              {t('writingMode.draftGen')}
            </button>
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
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border transition-colors ${
                writingMode === 'edit'
                  ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber shadow-[0_0_0_1px_rgba(245,158,11,0.25)]'
                  : 'border-border text-text-secondary hover:border-accent-amber/40'
              }`}
            >
              {t('writingMode.manualEdit')}
            </button>
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
              <div className="flex-1 space-y-4">
                <WritingToolbar textareaRef={editDraftRef} value={editDraft} onChange={setEditDraft} language={language} />
                <textarea
                  ref={editDraftRef}
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  onContextMenu={textMenu.openMenu}
                  className="w-full min-h-[60vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-purple outline-none transition-all resize-none shadow-inner"
                  placeholder={t('writingMode.typeManuscript')}
                />
              </div>
            )}
          </div>
          <div ref={messagesEndRef} className="h-32" />
        </div>

        {/* 소설 전용 하단 입력창 (Sticky) — AI 모드일 때 표시 */}
        {writingMode === 'ai' && currentSessionId && (
          <div className="p-4 md:p-6 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent sticky bottom-0 z-20">
            {showAiLock && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent-amber/20 bg-accent-amber/5 px-4 py-2.5 text-xs text-accent-amber">
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span>{isKO ? '스플래시 화면에서 API 키를 등록하면 AI 생성을 사용할 수 있습니다.' : 'Register an API key from the splash screen to use AI generation.'}</span>
              </div>
            )}
            <div className="relative group bg-bg-secondary border border-border rounded-2xl shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!showAiLock) handleSend(); } }}
                placeholder={showAiLock ? (isKO ? 'API 키를 등록해주세요' : 'Please register an API key') : t('writing.inputPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-text-primary placeholder-text-tertiary resize-none max-h-32 leading-relaxed"
                rows={1}
                disabled={isGenerating || showAiLock}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isGenerating || showAiLock}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !isGenerating && !showAiLock ? 'bg-accent-purple text-white shadow-lg' : 'bg-bg-tertiary text-text-tertiary opacity-30'}`}
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

      {/* 3: 고도화 통합 AI 어시스턴트 패널 */}
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
