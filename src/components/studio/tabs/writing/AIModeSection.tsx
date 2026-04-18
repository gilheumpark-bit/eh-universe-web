"use client";

// ============================================================
// AIModeSection — NOA 생성 / 스트리밍 / 빈 상태 (구 PART 3)
// ============================================================

import React from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message, AppTab } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import { createT, L4 } from '@/lib/i18n';
import { GenerationControls } from '@/components/studio/tabs/GenerationControls';

const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false, loading: DynSkeleton });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: DynSkeleton });

interface AIModeSectionProps {
  language: AppLanguage;
  currentSession: ChatSession;
  lastReport: EngineReport | null;
  isGenerating: boolean;
  slowWarning: 'slow' | 'very-slow' | null;
  generationTime?: number | null;
  tokenUsage?: { used: number; budget: number } | null;
  searchQuery: string;
  filteredMessages: Message[];
  handleRegenerate: (msgId: string) => void;
  hostedProviders: Partial<Record<string, boolean>>;
  setActiveTab: (tab: AppTab) => void;
  setWritingMode: (mode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  /** Unused directly here but included for parity with shell. */
  setConfig?: React.Dispatch<React.SetStateAction<StoryConfig>>;
}

export function AIModeSection({
  language, currentSession, lastReport, isGenerating, slowWarning, generationTime, tokenUsage,
  searchQuery, filteredMessages, handleRegenerate, hostedProviders, setActiveTab,
  setWritingMode, editDraft, setEditDraft,
}: AIModeSectionProps) {
  const t = createT(language);

  return (
    <>
      <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
      <GenerationControls
        isGenerating={isGenerating}
        slowWarning={slowWarning}
        generationTime={generationTime}
        tokenUsage={tokenUsage}
        language={language}
      />
      {/* Cinema Mode entry — after generation completes */}
      {!isGenerating && currentSession.messages.length > 0 && currentSession.messages.some(m => m.role === 'assistant' && m.content) && (
        <div className="mx-3 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('manuscript')}
            className="flex-1 flex items-center gap-3 px-4 py-3 min-h-[44px] bg-gradient-to-r from-accent-purple/5 to-accent-blue/5 border border-transparent rounded-xl hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] transition-[box-shadow] group"
            style={{ backgroundClip: 'padding-box', boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.25)' }}
          >
            <span className="text-lg">🎬</span>
            <div className="flex-1 text-left">
              <div className="text-sm md:text-[13px] font-bold text-text-secondary group-hover:text-text-primary transition-colors">
                {L4(language, {
                  ko: '시네마 모드',
                  en: 'Cinema Mode',
                  ja: 'シネマモード',
                  zh: '电影模式',
                })}
              </div>
              <div className="text-[11px] md:text-[9px] text-text-quaternary">
                {L4(language, { ko: '비주얼 노벨 플레이어', en: 'Visual novel player', ja: 'ビジュアルノベル', zh: '视觉小说播放器' })}
              </div>
            </div>
            <span className="text-[10px] font-bold text-accent-purple opacity-60 group-hover:opacity-100 transition-opacity">▶</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manuscript')}
            className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-gradient-to-r from-accent-amber/5 to-accent-green/5 border border-accent-amber/20 rounded-xl hover:border-accent-amber/40 transition-colors group"
          >
            <span className="text-lg">📻</span>
            <div className="text-left">
              <div className="text-sm md:text-[13px] font-bold text-text-secondary group-hover:text-text-primary transition-colors">
                {L4(language, { ko: '라디오 모드', en: 'Radio Mode', ja: 'ラジオモード', zh: '广播模式' })}
              </div>
              <div className="text-[11px] md:text-[9px] text-text-quaternary">
                {L4(language, { ko: '오디오 드라마 스타일', en: 'Audio drama style', ja: 'オーディオドラマ', zh: '广播剧风格' })}
              </div>
            </div>
          </button>
        </div>
      )}
      {currentSession.messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 md:py-20 px-4 md:px-2">
          <Sparkles className="w-16 h-16 text-accent-purple/20 animate-pulse" />
          <div className="space-y-3 max-w-md">
            <p className="text-text-primary text-lg md:text-xl font-black">{t('engine.startPrompt')}</p>
            <p className="text-text-tertiary text-xs font-mono">{t('writingMode.describeFirstScene')}</p>
            <p className="text-text-tertiary text-sm md:text-[13px] leading-relaxed pt-1">{t('writingMode.emptyStateManualHint')}</p>
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
              className="mt-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold border border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 transition-colors"
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
                hostedProviders={hostedProviders}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
