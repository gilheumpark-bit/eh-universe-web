"use client";

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';

interface WindowTitleBarProps {
  activeTab: string;
  language: AppLanguage;
  focusMode: boolean;
  onToggleFocus: () => void;
}

const TAB_NAMES: Record<string, { ko: string; en: string }> = {
  world: { ko: '세계관 설계', en: 'World Design' },
  characters: { ko: '캐릭터', en: 'Characters' },
  rulebook: { ko: '연출', en: 'Direction' },
  writing: { ko: '집필', en: 'Writing' },
  style: { ko: '문체', en: 'Style' },
  manuscript: { ko: '원고', en: 'Manuscript' },
  history: { ko: '기록', en: 'History' },
  docs: { ko: '가이드', en: 'Docs' },
  visual: { ko: '연출', en: 'Direction' },
  settings: { ko: '설정', en: 'Settings' },
};

export function WindowTitleBar({ activeTab, language, focusMode, onToggleFocus }: WindowTitleBarProps) {
  const isKO = language === 'KO';
  const tabName = TAB_NAMES[activeTab] || { ko: activeTab, en: activeTab };

  return (
    <div
      data-zen-hide
      className="hidden md:flex h-8 items-center justify-between px-3 bg-bg-secondary/60 backdrop-blur-sm border-b border-border/30 shrink-0 select-none"
    >
      {/* Traffic light dots (decorative) */}
      <div className="flex items-center gap-1.5">
        <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]/60" />
        <div className="w-[10px] h-[10px] rounded-full bg-[#FFBD2E]/60" />
        <div className="w-[10px] h-[10px] rounded-full bg-[#27C93F]/60" />
      </div>

      {/* Tab name */}
      <span className="text-[11px] font-medium text-text-secondary tracking-wide">
        {isKO ? tabName.ko : tabName.en}
      </span>

      {/* Window controls */}
      <button
        onClick={onToggleFocus}
        className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
        title={focusMode ? (isKO ? '복원' : 'Restore') : (isKO ? '전체화면' : 'Fullscreen')}
      >
        {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
