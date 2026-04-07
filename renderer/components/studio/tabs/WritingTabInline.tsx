"use client";

// ============================================================
// WritingTabInline — 집필 탭 레이아웃 (본문 7 : AI 채팅 3)
// ============================================================

import React, { useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Sparkles, Send, Key
} from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message, ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import { createT } from '@/lib/i18n';
import { RightChatPanel } from '@/components/studio/tabs/RightChatPanel';

import { useWritingChat } from '@/hooks/useWritingChat';
import { ContextMenu } from '@/components/code-studio/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { useSVIRecorder } from '@/hooks/useSVIRecorder';
import { LoadingSpinner } from '@/components/studio/UXHelpers';
import { useAIProvider } from '@/hooks/useAIProvider';


const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: DynSkeleton });
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false, loading: DynSkeleton });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: DynSkeleton });
const WritingToolbar = dynamic(() => import('@/components/studio/WritingToolbar').then(m => ({ default: m.WritingToolbar })), { ssr: false, loading: DynSkeleton });

import type { CanvasNode, CanvasConnection } from '@/components/code-studio/CanvasPanel';
const CanvasPanel = dynamic(() => import('@/components/code-studio/CanvasPanel'), { ssr: false, loading: DynSkeleton });

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
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
}

export default function WritingTabInline(props: Props) {
  const {
    language, currentSession, currentSessionId, updateCurrentSession,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    showAiLock,
    input, setInput,
    canvasPass,
    promptDirective,
    isGenerating, lastReport,
    handleSend, handleRegenerate,
    messagesEndRef, searchQuery, filteredMessages,
    suggestions, setSuggestions, pipelineResult,
    setConfig, setActiveTab, rightPanelOpen, setRightPanelOpen
  } = props;

  const writingColumnShell = useRef<HTMLDivElement>(null);


  const {
    chatMessages, sendChat, chatLoading, abortChat, clearChat
  } = useWritingChat({
    genre: currentSession.config.genre,
    synopsis: currentSession.config.synopsis,
    characters: currentSession.config.characters?.map(c => c.name).join(', '),
    currentChapter: currentSession.messages.slice(-2).map(m => m.content).join('\n').slice(0, 2000),
  });

  const t = createT(language);
  const isKO = language === 'KO';
  const textMenu = useTextAreaContextMenu(language);
  const { handleSVIKeyDown } = useSVIRecorder();
  const { getActiveModel } = useAIProvider();
  const activeModel = getActiveModel();

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

  // Canvas Persistence State
  const [canvasNodes, setCanvasNodes] = React.useState<CanvasNode[]>(() => currentSession.meta?.canvasNodes || []);
  const [canvasConnections, setCanvasConnections] = React.useState<CanvasConnection[]>(() => currentSession.meta?.canvasConnections || []);

  // Sync canvas state to session meta for persistence
  useEffect(() => {
    if (currentSessionId) {
      updateCurrentSession({
        meta: {
          ...currentSession.meta,
          canvasNodes,
          canvasConnections
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasNodes, canvasConnections, currentSessionId]);

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-bg-primary">
      {/* 7: 소설 본문 영역 */}
      <div ref={writingColumnShell} className="flex-1 flex flex-col min-w-0 relative h-full border-b lg:border-b-0 lg:border-r border-border/40">
        <div className="sticky top-0 z-30 shrink-0 px-3 py-2.5 border-b border-border/60 bg-bg-primary/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-[100px] hidden sm:block" />
            <p className="flex-1 text-center text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary">
              {t('writingMode.modePickerCaption')}
            </p>
            <div className="w-auto flex justify-end shrink-0">
              <button
                onClick={() => setRightPanelOpen((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all shadow-md whitespace-nowrap shrink-0 ${
                  rightPanelOpen ? 'bg-accent-purple/10 border-accent-purple/40 text-accent-purple' : 'bg-bg-secondary border-border hover:border-text-tertiary text-text-secondary'
                }`}
              >
                {t('rightPanel.toggle')}
                <Sparkles className={`w-3.5 h-3.5 transition-transform duration-500 ${rightPanelOpen ? 'rotate-12 scale-110' : ''}`} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center p-1 bg-bg-secondary/40 backdrop-blur-xs rounded-2xl border border-border/40 max-w-fit mx-auto shadow-inner">
            {(['ai', 'edit', 'canvas', 'refine', 'advanced'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setWritingMode(m)}
                className={`relative px-4 sm:px-6 py-2 rounded-xl text-[10.5px] font-black transition-all tracking-tight ${
                  writingMode === m 
                    ? 'bg-bg-primary text-text-primary shadow-[0_4px_12px_rgba(0,0,0,0.15)] scale-[1.02] border border-border/60' 
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {t(`writingMode.${m}`)}
                {writingMode === m && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent-purple rounded-full animate-in fade-in zoom-in duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div 
          ref={streamContainerRef}
          onScroll={handleStreamScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-hide"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {writingMode === 'ai' && (
              <>
                <ContinuityGraph language={language} config={currentSession.config} />
                <EngineStatusBar isGenerating={isGenerating} language={language} config={currentSession.config} report={lastReport} />

                {currentSession.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="w-20 h-20 mb-8 rounded-3xl bg-accent-purple/10 flex items-center justify-center border border-accent-purple/20 shadow-2xl shadow-accent-purple/5">
                      <Sparkles className="w-10 h-10 text-accent-purple animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-text-primary mb-4 tracking-tight">
                      {isKO ? '나만의 전설을 시작하세요' : 'Start Your Own Legend'}
                    </h2>
                    <p className="text-sm text-text-tertiary max-w-md leading-relaxed whitespace-pre-wrap">
                      {t('writingMode.emptyState')}
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-3">
                      <button 
                        onClick={() => {
                          const allText = currentSession.messages
                            .filter(m => m.role === 'assistant')
                            .map(m => m.content)
                            .join('\n\n---\n\n');
                          if (allText) {
                            setWritingMode('edit');
                            setEditDraft(allText);
                          } else {
                            setWritingMode('edit');
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
                  onKeyDown={handleSVIKeyDown}
                  onContextMenu={textMenu.openMenu}
                  className="w-full min-h-[60vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-purple outline-none transition-all resize-none shadow-inner"
                  placeholder={t('writingMode.typeManuscript')}
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
                <div className="h-[60vh] rounded-xl overflow-hidden border border-border">
                  <CanvasPanel
                    nodes={canvasNodes}
                    connections={canvasConnections}
                    onNodesChange={setCanvasNodes}
                    onConnectionsChange={setCanvasConnections}
                  />
                </div>
              </div>
            )}

            {writingMode === 'refine' && (
              <div className="flex-1 space-y-4">
                <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-accent-blue mb-2">{isKO ? '자동 30% 다듬기' : 'Auto 30% Refine'}</h3>
                  <p className="text-xs text-text-secondary mb-3">{isKO ? 'AI가 현재 원고를 분석하고 약 30%를 자동으로 개선합니다.' : 'AI analyzes your manuscript and automatically improves ~30%.'}</p>
                  {promptDirective && <p className="text-xs text-accent-blue font-mono bg-accent-blue/5 rounded px-3 py-2">{isKO ? '지시:' : 'Directive:'} {promptDirective}</p>}
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
                  <h3 className="text-sm font-bold text-accent-red mb-2">{isKO ? '고급 모드' : 'Advanced Mode'}</h3>
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
            {showAiLock && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-2.5 text-xs text-accent-amber">
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span>{isKO ? '스플래시 화면에서 API 키를 등록하면 AI 생성을 사용할 수 있습니다.' : 'Register an API key from the splash screen to use AI generation.'}</span>
              </div>
            )}
            <div className="relative group bg-bg-secondary border border-border rounded-2xl shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { handleSVIKeyDown(e); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!showAiLock) handleSend(); } }}
                placeholder={showAiLock ? (isKO ? 'API 키를 등록해주세요' : 'Please register an API key') : t('writing.inputPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-text-primary placeholder-text-tertiary resize-none max-h-32 leading-relaxed"
                rows={1}
                disabled={isGenerating || showAiLock}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isGenerating || showAiLock}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !isGenerating && !showAiLock ? 'bg-accent-purple text-bg-primary shadow-lg hover:scale-[1.02] active:scale-95' : 'bg-bg-tertiary text-text-tertiary opacity-50'}`}
              >
                {isGenerating ? <LoadingSpinner size="sm" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-[10px] text-text-tertiary font-black font-mono uppercase tracking-[0.3em] opacity-40">
                {isKO ? 'N.O.W — Narrative Origin Writer' : 'N.O.W — Narrative Origin Writer'}
              </p>
              {activeModel && (
                <div className="flex items-center gap-1.5 opacity-60">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
                  <span className="text-[10px] font-mono text-accent-purple font-bold tracking-tight">AI: {activeModel}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3: 고도화 통합 AI 어시스턴트 패널 */}
      {rightPanelOpen && (
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
