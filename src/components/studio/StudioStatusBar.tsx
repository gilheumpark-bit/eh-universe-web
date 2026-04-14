"use client";

import React, { useMemo } from 'react';
import { Save, Circle, Loader2, Cpu, Zap } from 'lucide-react';
import type { AppLanguage, ChatSession } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { SPARK_SERVER_URL } from '@/services/sparkService';

interface StudioStatusBarProps {
  editDraft: string;
  writingMode: string;
  activeTab: string;
  saveFlash: boolean;
  isSaving?: boolean;
  isGenerating: boolean;
  language: AppLanguage;
  currentSession: ChatSession | null;
  lastSaveTime?: number;
  isDirty?: boolean;
  /** Character count at session start — for session delta display */
  sessionStartChars?: number;
  editorFontSize?: number;
}

const MODE_LABELS: Record<string, { ko: string; en: string }> = {
  ai: { ko: '초안 생성', en: 'Draft Gen' },
  edit: { ko: '글쓰기', en: 'Writing' },
  canvas: { ko: '3단계', en: '3-Step' },
  refine: { ko: '자동 30%', en: 'Auto 30%' },
  advanced: { ko: '정밀', en: 'Precision' },
};

export function StudioStatusBar({
  editDraft, writingMode, activeTab, saveFlash, isSaving, isGenerating, language, currentSession, lastSaveTime, isDirty, sessionStartChars = 0, editorFontSize,
}: StudioStatusBarProps) {
  const isKO = language === 'KO';

  // TODO: Extract to useTextStats(text) hook
  const stats = useMemo(() => {
    const text = activeTab === 'writing' ? editDraft : '';
    const chars = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [editDraft, activeTab]);

  const modeLabel = MODE_LABELS[writingMode] || { ko: writingMode, en: writingMode };
  const episodeNum = currentSession?.config?.episode ?? 1;
  const guardrailMin = currentSession?.config?.guardrails?.min ?? 0;
  const guardrailMax = currentSession?.config?.guardrails?.max ?? Infinity;

  return (
    <>
      {/* P0-3: Mobile compact status bar — always visible */}
      <div
        data-zen-hide
        className="flex md:hidden fixed bottom-0 left-0 w-full h-6 z-40 items-center justify-between px-3 bg-bg-secondary/90 backdrop-blur-sm border-t border-border/40 font-mono text-[9px] text-text-tertiary select-none"
      >
        <span className={guardrailMin > 0 && stats.chars < guardrailMin ? 'text-red-400' : stats.chars > guardrailMax ? 'text-accent-amber' : stats.chars >= guardrailMin ? 'text-accent-green' : 'text-text-tertiary'}>
          {stats.chars.toLocaleString()}{isKO ? '자' : 'ch'}
        </span>
        {isGenerating ? (
          <span className="flex items-center gap-1 text-accent-amber">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            {isKO ? '생성 중' : 'Gen...'}
          </span>
        ) : isSaving ? (
          <span className="flex items-center gap-1 text-accent-amber">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            {isKO ? '저장 중' : 'Saving'}
          </span>
        ) : saveFlash ? (
          <span className="flex items-center gap-1 text-accent-green">
            <Save className="w-2.5 h-2.5" />
            {isKO ? '저장됨' : 'Saved'}
          </span>
        ) : isDirty ? (
          <span className="flex items-center gap-1 text-accent-amber">
            <Circle className="w-1.5 h-1.5 fill-accent-amber text-accent-amber" />
            {isKO ? '미저장' : 'Unsaved'}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Circle className="w-1.5 h-1.5 fill-accent-green text-accent-green" />
            {isKO ? '저장' : 'Saved'}
          </span>
        )}
      </div>

      {/* Desktop full status bar */}
      <div
        data-zen-hide
        className="hidden md:flex fixed bottom-0 left-0 w-full h-6 z-40 items-center justify-between px-4 bg-bg-secondary/80 backdrop-blur-sm border-t border-border/40 font-mono text-[10px] text-text-tertiary select-none"
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          {activeTab === 'writing' && (
            <>
              <span className={guardrailMin > 0 && stats.chars < guardrailMin ? 'text-red-400' : stats.chars > guardrailMax ? 'text-accent-amber' : stats.chars >= guardrailMin ? 'text-accent-green' : 'text-text-tertiary'}>{stats.chars.toLocaleString()}{isKO ? '자' : 'ch'}</span>
              <span className="text-border">|</span>
              <span>{stats.words.toLocaleString()}{isKO ? '어' : 'w'}</span>
              <span className="text-border">|</span>
              <span>{isKO ? modeLabel.ko : modeLabel.en}</span>
              {stats.chars > sessionStartChars && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-accent-green">+{(stats.chars - sessionStartChars).toLocaleString()}{isKO ? '자' : 'ch'}</span>
                </>
              )}
              {editorFontSize && editorFontSize !== 16 && (
                <>
                  <span className="text-border">|</span>
                  <span>{editorFontSize}px</span>
                </>
              )}
            </>
          )}
          {activeTab !== 'writing' && (
            <span className="uppercase tracking-wider">{activeTab}</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <span>{isKO ? `${episodeNum}화` : `Ep.${episodeNum}`}</span>
          <span className="text-border">|</span>
          {isGenerating ? (
            <span className="flex items-center gap-1 text-accent-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isKO ? '생성 중' : 'Generating'}
            </span>
          ) : isSaving ? (
            <span className="flex items-center gap-1 text-accent-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isKO ? '저장 중...' : 'Saving...'}
            </span>
          ) : saveFlash ? (
            <span className="flex items-center gap-1 text-accent-green">
              <Save className="w-3 h-3" />
              {isKO ? '저장됨' : 'Saved'}
              {lastSaveTime ? <span className="text-text-quaternary ml-1">{new Date(lastSaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : null}
            </span>
          ) : isDirty ? (
            <span className="flex items-center gap-1 text-accent-amber">
              <Circle className="w-2 h-2 fill-accent-amber text-accent-amber" />
              {isKO ? '미저장' : 'Unsaved'}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 fill-accent-green text-accent-green" />
              {isKO ? '자동 저장' : 'Auto-saved'}
            </span>
          )}
          <span className="text-border">|</span>
          {/* AI 엔진 뱃지 */}
          {SPARK_SERVER_URL ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-purple/10 border border-accent-purple/20">
              <Zap className="w-2.5 h-2.5 text-accent-purple" />
              <span className="text-accent-purple font-bold">DGX 128GB</span>
              {isGenerating && <span className="text-accent-amber animate-pulse">Qwen-32B</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" />
              BYOK
            </span>
          )}
          <span className="text-border">|</span>
          <span>ANS {ENGINE_VERSION}</span>
        </div>
      </div>
    </>
  );
}
