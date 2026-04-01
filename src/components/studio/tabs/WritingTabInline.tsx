"use client";

// ============================================================
// WritingTabInline — 집필 탭 레이아웃 (본문 7 : AI 채팅 3)
// ============================================================

import React, { useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Send } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import { createT } from '@/lib/i18n';
import { RightChatPanel } from '@/components/studio/tabs/RightChatPanel';
import { useWritingChat } from '@/hooks/useWritingChat';

const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: () => null });
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false, loading: () => null });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: () => null });
const WritingToolbar = dynamic(() => import('@/components/studio/WritingToolbar').then(m => ({ default: m.WritingToolbar })), { ssr: false, loading: () => null });

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
}

export default function WritingTabInline(props: Props) {
  const {
    language, currentSession, currentSessionId,
    writingMode,
    editDraft, setEditDraft, editDraftRef,
    isGenerating, lastReport,
    handleSend, handleRegenerate,
    messagesEndRef, searchQuery, filteredMessages,
    showAiLock,
    writingColumnShell,
    input, setInput,
  } = props;

  const {
    chatMessages, sendChat, chatLoading, abortChat, clearChat
  } = useWritingChat();

  const t = createT(language);
  const isKO = language === 'KO';

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

  return (
    <div className="flex flex-row h-full overflow-hidden bg-bg-primary">
      {/* 7: 소설 본문 영역 */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full border-r border-border/40">
        <div 
          ref={streamContainerRef} 
          onScroll={handleStreamScroll} 
          className={`${writingColumnShell} flex-1 overflow-y-auto ${currentSession.messages.length === 0 && writingMode === 'ai' ? 'flex flex-col justify-center items-center px-4' : 'py-6 md:py-8 space-y-6 px-4 md:px-8'}`}
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
                  <div className="flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <Sparkles className="w-16 h-16 text-accent-purple/20 animate-pulse" />
                    <div className="space-y-2">
                      <p className="text-text-primary text-xl font-black">{t('engine.startPrompt')}</p>
                      <p className="text-text-tertiary text-xs font-mono">{t('writingMode.describeFirstScene')}</p>
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
                  className="w-full min-h-[60vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-purple outline-none transition-all resize-none shadow-inner"
                  placeholder={t('writingMode.typeManuscript')}
                />
              </div>
            )}
          </div>
          <div ref={messagesEndRef} className="h-32" />
        </div>

        {/* 소설 전용 하단 입력창 (Sticky) — AI 모드일 때만 표시 */}
        {writingMode === 'ai' && !showAiLock && currentSessionId && (
          <div className="p-4 md:p-6 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent sticky bottom-0 z-20">
            <div className="relative group bg-bg-secondary border border-border rounded-2xl shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={t('writing.inputPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-text-primary placeholder-text-tertiary resize-none max-h-32 leading-relaxed"
                rows={1}
                disabled={isGenerating}
              />
              <button 
                onClick={() => handleSend()} 
                disabled={!input.trim() || isGenerating}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !isGenerating ? 'bg-accent-purple text-white shadow-lg' : 'bg-bg-tertiary text-text-tertiary opacity-30'}`}
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

      {/* 3: 독립 AI 채팅 패널 */}
      <RightChatPanel 
        language={language} 
        messages={chatMessages} 
        loading={chatLoading}
        onSend={(txt) => sendChat(txt, language)}
        onAbort={abortChat}
        onClear={clearChat}
      />
    </div>
  );
}
