"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Globe, Users, BookOpen, X } from 'lucide-react';
import type { StoryConfig, AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — Constants and types
// ============================================================

interface ReferenceSplitPaneProps {
  config: StoryConfig;
  language: AppLanguage;
  onClose: () => void;
}

type RefTab = 'world' | 'chars' | 'rulebook';

const STORAGE_KEY = 'noa_ref_pane_width';
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 200;

function clampWidth(w: number): number {
  const maxWidth = typeof window !== 'undefined' ? window.innerWidth * 0.5 : 600;
  return Math.min(Math.max(w, MIN_WIDTH), maxWidth);
}

function loadPersistedWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed) && parsed >= MIN_WIDTH) return clampWidth(parsed);
    }
  } catch { /* SSR / security error — ignore */ }
  return DEFAULT_WIDTH;
}

// ============================================================
// PART 2 — Component
// ============================================================

export function ReferenceSplitPane({ config, language, onClose }: ReferenceSplitPaneProps) {
  const isKO = language === 'KO';
  const [tab, setTab] = useState<RefTab>('chars');
  const [width, setWidth] = useState<number>(loadPersistedWidth);

  // Drag state refs (avoid re-renders during drag)
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  // Persist width to localStorage on change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(width)); } catch { /* ignore */ }
  }, [width]);

  // --- Drag handlers ---
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    // Handle is on the left edge, so dragging left = wider
    const delta = startX.current - e.clientX;
    setWidth(clampWidth(startWidth.current + delta));
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [width, onMouseMove, onMouseUp]);

  const onHandleDoubleClick = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const tabs: { id: RefTab; icon: typeof Globe; label: string }[] = [
    { id: 'world', icon: Globe, label: isKO ? '세계관' : 'World' },
    { id: 'chars', icon: Users, label: isKO ? '인물' : 'Characters' },
    { id: 'rulebook', icon: BookOpen, label: isKO ? '연출' : 'Direction' },
  ];

  return (
    <div
      className="relative flex flex-col h-full border-l border-border bg-bg-primary/95 backdrop-blur-sm animate-in slide-in-from-right duration-300"
      style={{ width }}
    >
      {/* Resize handle — 4px bar on the left edge */}
      <div
        ref={handleRef}
        onMouseDown={onMouseDown}
        onDoubleClick={onHandleDoubleClick}
        className="absolute left-0 top-0 bottom-0 w-[4px] cursor-col-resize z-10 group"
        aria-label="Resize handle"
      >
        <div className="absolute inset-0 bg-transparent transition-colors group-hover:bg-accent-amber/30 group-active:bg-accent-amber/50" />
      </div>

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
              <p className="text-text-tertiary text-center py-6 italic">{isKO ? '연출 데이터 없음' : 'No direction data'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
