"use client";
// ============================================================
// DebuggerPanel — Story Debugger 메인 패널 (좌하단, 코드 IDE 대응 위치).
// 4 섹션 탭: Breakpoints / Watch / Variables / Call Hierarchy
// ============================================================

import React, { useState } from 'react';
import { Bug, Play, Pause, ChevronsRight, ChevronsDown, Square } from 'lucide-react';
import type { Breakpoint, BreakpointLocation, StoryFrame, WatchEntry } from '@/lib/story-debugger/types';
import { BreakpointGutter } from './BreakpointGutter';
import { WatchWindow } from './WatchWindow';
import { VariablesView } from './VariablesView';
import { CallHierarchyView } from './CallHierarchyView';
import type { CallHierarchy } from '@/lib/story-debugger/types';
import type { Character, EpisodeManuscript } from '@/lib/studio-types';

type Tab = 'breakpoints' | 'watch' | 'variables' | 'call';

export interface DebuggerPanelProps {
  isRunning: boolean;
  currentLocation: BreakpointLocation | null;
  frame: StoryFrame | null;
  breakpoints: Breakpoint[];
  watches: WatchEntry[];
  callHierarchy: CallHierarchy;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  /** [후속 A-4] inspect Variable 호출용 — VariablesView 에 전달 */
  characters?: Character[];
  episodes?: EpisodeManuscript[];
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onStepOver?: () => void;
  onStepInto?: () => void;
  onAddWatch?: (entry: Omit<WatchEntry, 'id'>) => void;
  onRemoveWatch?: (id: string) => void;
  onToggleBreakpoint?: (id: string) => void;
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({
  isRunning,
  currentLocation,
  frame,
  breakpoints,
  watches,
  callHierarchy,
  language = 'KO',
  characters,
  episodes,
  onStart,
  onPause,
  onStop,
  onStepOver,
  onStepInto,
  onAddWatch,
  onRemoveWatch,
  onToggleBreakpoint,
}) => {
  const [tab, setTab] = useState<Tab>('breakpoints');
  const isKO = language === 'KO';

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'breakpoints', label: isKO ? '브레이크포인트' : 'Breakpoints' },
    { id: 'watch', label: 'Watch' },
    { id: 'variables', label: isKO ? '변수' : 'Variables' },
    { id: 'call', label: isKO ? '인과 그래프' : 'Call Hierarchy' },
  ];

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col" role="region" aria-label="Story Debugger">
      {/* Header — controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-tertiary/30">
        <Bug className="w-4 h-4 text-accent-purple" />
        <span className="text-sm font-bold text-text-primary">{isKO ? '디버거' : 'Debugger'}</span>
        <div className="flex items-center gap-1 ml-auto">
          <button type="button" onClick={isRunning ? onPause : onStart} className="p-1.5 rounded hover:bg-bg-tertiary/50" aria-label={isRunning ? 'Pause' : 'Start'} title="F5">
            {isRunning ? <Pause className="w-4 h-4 text-accent-amber" /> : <Play className="w-4 h-4 text-accent-green" />}
          </button>
          <button type="button" onClick={onStepOver} disabled={!isRunning} className="p-1.5 rounded hover:bg-bg-tertiary/50 disabled:opacity-30" aria-label="Step Over" title="F10 — 다음 화">
            <ChevronsRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={onStepInto} disabled={!isRunning} className="p-1.5 rounded hover:bg-bg-tertiary/50 disabled:opacity-30" aria-label="Step Into" title="F11 — 다음 문단">
            <ChevronsDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={onStop} disabled={!isRunning} className="p-1.5 rounded hover:bg-bg-tertiary/50 disabled:opacity-30" aria-label="Stop" title="Shift+F5">
            <Square className="w-4 h-4 text-accent-red" />
          </button>
        </div>
      </div>

      {/* Current location */}
      {currentLocation && (
        <div className="px-4 py-1.5 bg-accent-purple/10 border-b border-accent-purple/20 text-[10px] font-mono text-accent-purple">
          ▶ EP{currentLocation.episodeId} · ¶{currentLocation.paragraphIdx}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border bg-bg-tertiary/20">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              tab === t.id
                ? 'text-accent-purple border-b-2 border-accent-purple'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto max-h-[40vh]">
        {tab === 'breakpoints' && (
          <BreakpointGutter breakpoints={breakpoints} onToggle={onToggleBreakpoint} language={language} />
        )}
        {tab === 'watch' && (
          <WatchWindow watches={watches} frame={frame} onAdd={onAddWatch} onRemove={onRemoveWatch} language={language} />
        )}
        {tab === 'variables' && (
          <VariablesView frame={frame} language={language} characters={characters} episodes={episodes} />
        )}
        {tab === 'call' && <CallHierarchyView hierarchy={callHierarchy} language={language} />}
      </div>
    </section>
  );
};

export default DebuggerPanel;
