"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  GitBranch, GitFork, Circle, Plus, Check, X,
} from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

export interface ParallelUniversePanelProps {
  branches: string[];
  currentBranch: string;
  episodes: Array<{ episode: number; title?: string }>;
  onSwitchBranch: (branch: string) => void;
  onCreateBranch: (name: string, fromEpisode: number) => void;
  language: AppLanguage;
}

/** Color palette for branch lanes (up to 6 distinct colors) */
const BRANCH_COLORS = [
  'var(--accent-amber)',
  'var(--accent-blue)',
  'var(--accent-green)',
  'var(--accent-purple)',
  'var(--accent-red)',
  'var(--accent-cyan)',
] as const;

function getBranchColor(index: number): string {
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}

// ============================================================
// PART 2 — Branch Creation Inline Form
// ============================================================

interface BranchCreateFormProps {
  fromEpisode: number;
  language: AppLanguage;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const BranchCreateForm: React.FC<BranchCreateFormProps> = ({
  fromEpisode,
  language,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim().replace(/\s+/g, '-').toLowerCase();
    if (!trimmed) return;
    onConfirm(trimmed);
  }, [name, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  }, [handleSubmit, onCancel]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-bg-tertiary/60 rounded-lg border border-accent-amber/30 mt-1">
      <span className="text-[10px] text-text-tertiary font-mono shrink-0">
        universe/
      </span>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={L4(language, {
          ko: `${fromEpisode}화에서 분기`,
          en: `Branch from ep.${fromEpisode}`,
        })}
        className="flex-1 min-w-0 bg-transparent text-xs text-text-primary
          border-none outline-none placeholder:text-text-tertiary/50
          font-mono"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="w-6 h-6 flex items-center justify-center rounded
          text-accent-green hover:bg-accent-green/10
          disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors"
        title={L4(language, { ko: '확인', en: 'Confirm' })}
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onCancel}
        className="w-6 h-6 flex items-center justify-center rounded
          text-text-tertiary hover:bg-bg-tertiary transition-colors"
        title={L4(language, { ko: '취소', en: 'Cancel' })}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ============================================================
// PART 3 — Timeline & Main Panel
// ============================================================

const ParallelUniversePanel: React.FC<ParallelUniversePanelProps> = ({
  branches,
  currentBranch,
  episodes,
  onSwitchBranch,
  onCreateBranch,
  language,
}) => {
  const [creatingAtEpisode, setCreatingAtEpisode] = useState<number | null>(null);

  /** Map branches to color indices, current branch always first */
  const branchColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...branches].sort((a, b) => {
      if (a === currentBranch) return -1;
      if (b === currentBranch) return 1;
      return a.localeCompare(b);
    });
    sorted.forEach((br, i) => map.set(br, i));
    return map;
  }, [branches, currentBranch]);

  /** Detect which episodes are branch fork points (universe/ prefix heuristic) */
  const forkEpisodes = useMemo(() => {
    const forks = new Set<number>();
    for (const br of branches) {
      if (br.startsWith('universe/')) {
        // Convention: universe/<name> may encode fork episode, but we mark
        // the first episode as the default fork point for display
        forks.add(1);
      }
    }
    return forks;
  }, [branches]);

  const handleCreateConfirm = useCallback((rawName: string) => {
    if (creatingAtEpisode == null) return;
    const fullName = `universe/${rawName}`;
    onCreateBranch(fullName, creatingAtEpisode);
    setCreatingAtEpisode(null);
  }, [creatingAtEpisode, onCreateBranch]);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border min-h-[44px]">
        <GitFork className="w-4 h-4 text-accent-amber shrink-0" />
        <span className="text-xs font-serif font-semibold text-text-primary">
          {L4(language, {
            ko: '평행 우주',
            en: 'Parallel Universes',
          })}
        </span>
        <span className="ml-auto text-[10px] text-text-tertiary font-mono">
          {branches.length} {L4(language, { ko: '브랜치', en: 'branches' })}
        </span>
      </div>

      {/* Branch legend */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border">
        {branches.map((br) => {
          const colorIdx = branchColorMap.get(br) ?? 0;
          const isActive = br === currentBranch;
          return (
            <button
              key={br}
              onClick={() => onSwitchBranch(br)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px]
                font-mono transition-all min-h-[28px]
                ${isActive
                  ? 'bg-accent-amber/15 border border-accent-amber/40 text-text-primary'
                  : 'bg-bg-tertiary/40 border border-border text-text-secondary hover:bg-bg-tertiary'
                }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getBranchColor(colorIdx) }}
              />
              <span className="truncate max-w-[100px]">{br}</span>
            </button>
          );
        })}
      </div>

      {/* Vertical timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {episodes.map((ep, idx) => {
          const isFork = forkEpisodes.has(ep.episode);
          const isLast = idx === episodes.length - 1;

          return (
            <div key={ep.episode} className="relative flex items-start gap-3">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className="absolute left-[9px] top-[20px] w-px bg-border"
                  style={{ height: 'calc(100% - 4px)' }}
                />
              )}

              {/* Dot / Fork icon */}
              <div className="relative z-10 mt-1 shrink-0">
                {isFork ? (
                  <div className="w-[20px] h-[20px] flex items-center justify-center
                    rounded-full bg-accent-amber/15 border border-accent-amber/40">
                    <GitFork className="w-3 h-3 text-accent-amber" />
                  </div>
                ) : (
                  <div className="w-[20px] h-[20px] flex items-center justify-center">
                    <Circle className="w-2.5 h-2.5 text-text-tertiary fill-bg-primary" />
                  </div>
                )}
              </div>

              {/* Episode info + branch action */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-tertiary">
                    {String(ep.episode).padStart(3, '0')}
                  </span>
                  <span className="text-xs font-serif text-text-primary truncate">
                    {ep.title || L4(language, { ko: `${ep.episode}화`, en: `Episode ${ep.episode}` })}
                  </span>
                  <button
                    onClick={() => setCreatingAtEpisode(ep.episode)}
                    className="ml-auto w-6 h-6 flex items-center justify-center rounded
                      text-text-tertiary hover:text-accent-amber hover:bg-accent-amber/10
                      transition-colors opacity-0 group-hover/ep:opacity-100
                      focus-visible:opacity-100 focus-visible:ring-2 ring-accent-blue shrink-0"
                    title={L4(language, {
                      ko: '여기서 분기 생성',
                      en: 'Create branch from here',
                    })}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Inline branch creation form */}
                {creatingAtEpisode === ep.episode && (
                  <BranchCreateForm
                    fromEpisode={ep.episode}
                    language={language}
                    onConfirm={handleCreateConfirm}
                    onCancel={() => setCreatingAtEpisode(null)}
                  />
                )}

                {/* Branch lane indicators */}
                {isFork && branches.filter(b => b !== 'main').length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {branches.filter(b => b !== 'main').map(br => {
                      const colorIdx = branchColorMap.get(br) ?? 0;
                      return (
                        <span
                          key={br}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px]
                            font-mono text-text-tertiary bg-bg-tertiary/40"
                        >
                          <GitBranch className="w-2.5 h-2.5" style={{ color: getBranchColor(colorIdx) }} />
                          {br.replace('universe/', '')}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {episodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <GitFork className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-xs font-serif">
              {L4(language, {
                ko: '에피소드를 추가하면 타임라인이 나타납니다',
                en: 'Add episodes to see the timeline',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParallelUniversePanel;
