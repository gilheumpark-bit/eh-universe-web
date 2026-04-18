"use client";

// ============================================================
// SplitPanelTabs — 분할 뷰 우측 통합 패널 (연출 + 채팅 탭)
// ============================================================

import React, { useState } from 'react';
import { BookOpen, Columns2 } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message, AppTab, ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import { L4 } from '@/lib/i18n';
import { RightChatPanel } from '@/components/studio/tabs/RightChatPanel';
import { DirectionReferencePanel } from '@/components/studio/DirectionReferencePanel';

export interface SplitPanelTabsProps {
  splitView: 'chat' | 'reference' | null;
  setSplitView: (v: 'chat' | 'reference' | null) => void;
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  currentSession: ChatSession;
  chatMessages: Message[];
  chatLoading: boolean;
  handleChatSend: (msg: string) => void;
  abortChat: () => void;
  clearChat: () => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPState;
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
  setActiveTab: (tab: AppTab) => void;
  hostedProviders: Partial<Record<string, boolean>>;
}

export function SplitPanelTabs({
  splitView, setSplitView, language, config, setConfig,
  currentSession, chatMessages, chatLoading, handleChatSend, abortChat, clearChat,
  directorReport, hfcpState, suggestions, setSuggestions, pipelineResult,
  setActiveTab, hostedProviders,
}: SplitPanelTabsProps) {
  const [activePanel, setActivePanel] = useState<'direction' | 'chat'>(splitView === 'chat' ? 'chat' : 'direction');

  return (
    <>
      {/* 탭 헤더 — 모바일 터치 타겟 44px */}
      <div className="flex border-b border-border/50 shrink-0 bg-bg-primary">
        <button
          onClick={() => setActivePanel('direction')}
          aria-pressed={activePanel === 'direction'}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm md:text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
            activePanel === 'direction'
              ? 'text-accent-amber border-b-2 border-accent-amber bg-accent-amber/5'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <BookOpen className="w-4 h-4 md:w-3.5 md:h-3.5" />
          {L4(language, { ko: '연출', en: 'Direction', ja: 'Direction', zh: 'Direction' })}
        </button>
        <button
          onClick={() => setActivePanel('chat')}
          aria-pressed={activePanel === 'chat'}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm md:text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
            activePanel === 'chat'
              ? 'text-accent-purple border-b-2 border-accent-purple bg-accent-purple/5'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Columns2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
          {L4(language, { ko: '채팅', en: 'Chat', ja: 'Chat', zh: 'Chat' })}
        </button>
      </div>
      {/* 패널 콘텐츠 */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'direction' && (
          <DirectionReferencePanel
            config={config}
            language={language}
            setConfig={setConfig}
            onClose={() => setSplitView(null)}
            hideClose
          />
        )}
        {activePanel === 'chat' && (
          <RightChatPanel
            language={language}
            currentSession={currentSession}
            messages={chatMessages}
            loading={chatLoading}
            onSend={handleChatSend}
            onAbort={abortChat}
            onClear={clearChat}
            directorReport={directorReport}
            hfcpState={hfcpState}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            pipelineResult={pipelineResult}
            setConfig={setConfig}
            setActiveTab={setActiveTab}
            hostedProviders={hostedProviders}
          />
        )}
      </div>
    </>
  );
}
