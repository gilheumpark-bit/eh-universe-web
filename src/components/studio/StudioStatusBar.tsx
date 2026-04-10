"use client";

import React, { useMemo } from 'react';
import { Save, Circle, Loader2 } from 'lucide-react';
import type { AppLanguage, ChatSession } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';

interface StudioStatusBarProps {
  editDraft: string;
  writingMode: string;
  activeTab: string;
  saveFlash: boolean;
  isGenerating: boolean;
  language: AppLanguage;
  currentSession: ChatSession | null;
}

const MODE_LABELS: Record<string, { ko: string; en: string }> = {
  ai: { ko: '초안 생성', en: 'Draft Gen' },
  edit: { ko: '글쓰기', en: 'Writing' },
  canvas: { ko: '3단계', en: '3-Step' },
  refine: { ko: '자동 30%', en: 'Auto 30%' },
  advanced: { ko: '정밀', en: 'Precision' },
};

export function StudioStatusBar({
  editDraft, writingMode, activeTab, saveFlash, isGenerating, language, currentSession,
}: StudioStatusBarProps) {
  const isKO = language === 'KO';

  const stats = useMemo(() => {
    const text = activeTab === 'writing' ? editDraft : '';
    const chars = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [editDraft, activeTab]);

  const modeLabel = MODE_LABELS[writingMode] || { ko: writingMode, en: writingMode };
  const episodeNum = currentSession?.config?.episode ?? 1;

  return (
    <div
      data-zen-hide
      className="hidden md:flex fixed bottom-0 left-0 w-full h-6 z-40 items-center justify-between px-4 bg-bg-secondary/80 backdrop-blur-sm border-t border-border/40 font-mono text-[10px] text-text-tertiary select-none"
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {activeTab === 'writing' && (
          <>
            <span>{stats.chars.toLocaleString()}{isKO ? '자' : 'ch'}</span>
            <span className="text-border">|</span>
            <span>{stats.words.toLocaleString()}{isKO ? '어' : 'w'}</span>
            <span className="text-border">|</span>
            <span>{isKO ? modeLabel.ko : modeLabel.en}</span>
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
        ) : saveFlash ? (
          <span className="flex items-center gap-1 text-accent-green">
            <Save className="w-3 h-3" />
            {isKO ? '저장됨' : 'Saved'}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Circle className="w-2 h-2 fill-accent-green text-accent-green" />
            {isKO ? '자동 저장' : 'Auto-saved'}
          </span>
        )}
        <span className="text-border">|</span>
        <span>ANS {ENGINE_VERSION}</span>
      </div>
    </div>
  );
}
