"use client";

import React, { useState } from 'react';
import { Users, BookOpen, X, ChevronRight } from 'lucide-react';
import type { StoryConfig, AppLanguage } from '@/lib/studio-types';

// ============================================================
// WritingContextPanel — 집필 중 캐릭터/설정 참조 슬라이드 패널
// ============================================================

interface Props {
  config: StoryConfig;
  language: AppLanguage;
}

export function WritingContextPanel({ config, language }: Props) {
  const isKO = language === 'KO';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'chars' | 'world'>('chars');

  return (
    <>
      {/* Toggle button — fixed on left edge */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-20 bg-bg-secondary/80 backdrop-blur-sm border border-l-0 border-border rounded-r-xl flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-all group"
          title={isKO ? '참조 패널' : 'Reference Panel'}
        >
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Slide-over panel — top-10 for OSDesktop top bar clearance */}
      {open && (
        <div className="fixed left-0 top-10 bottom-0 z-30 w-72 bg-bg-primary/95 backdrop-blur-xl border-r border-border shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex gap-1">
              <button
                onClick={() => setTab('chars')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === 'chars' ? 'bg-accent-amber/15 text-accent-amber' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" />
                {isKO ? '인물' : 'Characters'}
              </button>
              <button
                onClick={() => setTab('world')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === 'world' ? 'bg-accent-purple/15 text-accent-purple' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                {isKO ? '세계관' : 'World'}
              </button>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {tab === 'chars' && (
              config.characters.length > 0 ? (
                config.characters.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{c.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber font-mono">{c.role}</span>
                    </div>
                    {c.desire && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{isKO ? '욕구:' : 'Desire:'}</span> {c.desire}</p>}
                    {c.conflict && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{isKO ? '갈등:' : 'Conflict:'}</span> {c.conflict}</p>}
                    {c.changeArc && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{isKO ? '변화:' : 'Arc:'}</span> {c.changeArc}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-tertiary text-center py-8 italic">
                  {isKO ? '등록된 캐릭터가 없습니다.' : 'No characters registered.'}
                </p>
              )
            )}

            {tab === 'world' && (
              <div className="space-y-3">
                {config.synopsis && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '시놉시스' : 'Synopsis'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{config.synopsis}</p>
                  </div>
                )}
                {config.corePremise && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '핵심 전제' : 'Core Premise'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{config.corePremise}</p>
                  </div>
                )}
                {config.currentConflict && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '현재 갈등' : 'Current Conflict'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{config.currentConflict}</p>
                  </div>
                )}
                {!config.synopsis && !config.corePremise && !config.currentConflict && (
                  <p className="text-xs text-text-tertiary text-center py-8 italic">
                    {isKO ? '세계관 설정이 없습니다.' : 'No world settings yet.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
