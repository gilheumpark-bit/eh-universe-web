"use client";

// ============================================================
// MobileOverlaySection — 모바일 분할 뷰 + 컨텍스트 메뉴 오버레이 (구 PART 9)
// ============================================================

import React from 'react';
import { X } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message, AppTab, ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import { L4 } from '@/lib/i18n';
import { ContextMenu } from '@/components/code-studio/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { SplitPanelTabs } from './SplitPanelTabs';

type ContextMenuHandle = ReturnType<typeof useTextAreaContextMenu>;

interface MobileOverlaySectionProps {
  language: AppLanguage;
  splitView: 'chat' | 'reference' | null;
  setSplitView: (v: 'chat' | 'reference' | null) => void;
  currentSession: ChatSession;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
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
  textMenu: ContextMenuHandle;
}

export function MobileOverlaySection({
  language, splitView, setSplitView, currentSession, setConfig,
  chatMessages, chatLoading, handleChatSend, abortChat, clearChat,
  directorReport, hfcpState, suggestions, setSuggestions, pipelineResult,
  setActiveTab, hostedProviders, textMenu,
}: MobileOverlaySectionProps) {
  return (
    <>
      {/* 모바일 전용: 분할 뷰 전체화면 오버레이 */}
      {splitView && (
        <div className="fixed inset-0 z-40 bg-bg-primary/95 backdrop-blur-sm lg:hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-base md:text-sm font-bold text-text-primary">{L4(language, { ko: '연출/채팅', en: 'Direction/Chat', ja: '演出/チャット', zh: '导演/聊天' })}</span>
            <button
              onClick={() => setSplitView(null)}
              aria-label={L4(language, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' })}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <X className="w-5 h-5 md:w-4 md:h-4" />
            </button>
          </div>
          <SplitPanelTabs
            splitView={splitView}
            setSplitView={setSplitView}
            language={language}
            config={currentSession.config}
            setConfig={setConfig}
            currentSession={currentSession}
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
    </>
  );
}
