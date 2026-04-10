"use client";

import React, { useState } from 'react';
import { Globe, Users, BookOpen, X } from 'lucide-react';
import type { StoryConfig, AppLanguage } from '@/lib/studio-types';

interface ReferenceSplitPaneProps {
  config: StoryConfig;
  language: AppLanguage;
  onClose: () => void;
}

type RefTab = 'world' | 'chars' | 'rulebook';

export function ReferenceSplitPane({ config, language, onClose }: ReferenceSplitPaneProps) {
  const isKO = language === 'KO';
  const [tab, setTab] = useState<RefTab>('chars');

  const tabs: { id: RefTab; icon: typeof Globe; label: string }[] = [
    { id: 'world', icon: Globe, label: isKO ? '세계관' : 'World' },
    { id: 'chars', icon: Users, label: isKO ? '인물' : 'Characters' },
    { id: 'rulebook', icon: BookOpen, label: isKO ? '설정집' : 'Rulebook' },
  ];

  return (
    <div className="flex flex-col h-full border-l border-border bg-bg-primary/95 backdrop-blur-sm animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex gap-0.5">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                  tab === t.id
                    ? 'bg-accent-amber/15 text-accent-amber'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar text-[11px]">
        {tab === 'chars' && (
          config.characters.length > 0 ? (
            config.characters.map(c => (
              <div key={c.id} className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary text-xs">{c.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber font-mono">{c.role}</span>
                </div>
                {c.desire && <p className="text-text-secondary"><span className="text-text-tertiary font-bold">{isKO ? '욕구' : 'Desire'}:</span> {c.desire}</p>}
                {c.conflict && <p className="text-text-secondary"><span className="text-text-tertiary font-bold">{isKO ? '갈등' : 'Conflict'}:</span> {c.conflict}</p>}
                {c.changeArc && <p className="text-text-secondary"><span className="text-text-tertiary font-bold">{isKO ? '변화' : 'Arc'}:</span> {c.changeArc}</p>}
              </div>
            ))
          ) : (
            <p className="text-text-tertiary text-center py-6 italic">{isKO ? '등록된 캐릭터 없음' : 'No characters'}</p>
          )
        )}

        {tab === 'world' && (
          <div className="space-y-2.5">
            {config.synopsis && (
              <div className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '시놉시스' : 'Synopsis'}</span>
                <p className="text-text-secondary mt-1 leading-relaxed">{config.synopsis}</p>
              </div>
            )}
            {config.corePremise && (
              <div className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '핵심 전제' : 'Core Premise'}</span>
                <p className="text-text-secondary mt-1 leading-relaxed">{config.corePremise}</p>
              </div>
            )}
            {config.currentConflict && (
              <div className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '현재 갈등' : 'Current Conflict'}</span>
                <p className="text-text-secondary mt-1 leading-relaxed">{config.currentConflict}</p>
              </div>
            )}
            <div className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30">
              <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '장르' : 'Genre'}</span>
              <p className="text-text-secondary mt-1">{config.genre}</p>
            </div>
            {!config.synopsis && !config.corePremise && (
              <p className="text-text-tertiary text-center py-6 italic">{isKO ? '세계관 설정 없음' : 'No world settings'}</p>
            )}
          </div>
        )}

        {tab === 'rulebook' && (
          <div className="space-y-2.5">
            {config.sceneDirection?.plotStructure && (
              <div className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '플롯 구조' : 'Plot Structure'}</span>
                <p className="text-text-secondary mt-1">{config.sceneDirection.plotStructure}</p>
              </div>
            )}
            {config.sceneDirection?.writerNotes && (
              <div className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '작가 메모' : 'Writer Notes'}</span>
                <p className="text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.sceneDirection.writerNotes}</p>
              </div>
            )}
            {config.sceneDirection?.goguma && config.sceneDirection.goguma.length > 0 && (
              <div className="p-2.5 rounded-lg bg-bg-secondary/40 border border-border/30">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '고구마/사이다' : 'Tension/Release'}</span>
                <div className="mt-1 space-y-1">
                  {config.sceneDirection.goguma.map((g, i) => (
                    <p key={i} className="text-text-secondary">
                      <span className={g.type === 'goguma' ? 'text-accent-red' : 'text-accent-blue'}>{g.type === 'goguma' ? '🍠' : '🥤'}</span>{' '}
                      {g.desc}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {!config.sceneDirection?.plotStructure && !config.sceneDirection?.writerNotes && (
              <p className="text-text-tertiary text-center py-6 italic">{isKO ? '설정집 데이터 없음' : 'No rulebook data'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
