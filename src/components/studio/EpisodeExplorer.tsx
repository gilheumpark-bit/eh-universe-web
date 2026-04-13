"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  FolderOpen, FileText, Plus, ChevronRight, ChevronDown,
  Users, Globe, Clapperboard, X,
} from 'lucide-react';
import type { StoryConfig, AppLanguage, EpisodeManuscript } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import BranchSelector from './BranchSelector';

interface EpisodeExplorerProps {
  config: StoryConfig;
  currentEpisode: number;
  language: AppLanguage;
  onSelectEpisode: (episode: number) => void;
  onCreateEpisode?: () => void;
  onCreateVolume?: () => void;
  onClose?: () => void;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

interface VolumeGroup {
  volumeId: number;
  title: string;
  episodes: EpisodeManuscript[];
}

type EpisodeStatus = 'done' | 'writing' | 'draft';

// ============================================================
// PART 2 — Helpers
// ============================================================

function getEpisodeStatus(ms: EpisodeManuscript): EpisodeStatus {
  if (ms.charCount >= 4000) return 'done';
  if (ms.charCount >= 500) return 'writing';
  return 'draft';
}

function statusIcon(status: EpisodeStatus): string {
  if (status === 'done') return '\u2705';
  if (status === 'writing') return '\u270D\uFE0F';
  return '\uD83D\uDCDD';
}

function statusLabel(status: EpisodeStatus, lang: AppLanguage): string {
  if (status === 'done') return L4(lang, { ko: '완료', en: 'Done', ja: '完了', zh: '完成' });
  if (status === 'writing') return L4(lang, { ko: '집필 중', en: 'Writing', ja: '執筆中', zh: '写作中' });
  return L4(lang, { ko: '초안', en: 'Draft', ja: '下書き', zh: '草稿' });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\u2026';
}

function formatCharCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ============================================================
// PART 3 — Volume Tree Node
// ============================================================

interface VolumeNodeProps {
  group: VolumeGroup;
  currentEpisode: number;
  language: AppLanguage;
  onSelectEpisode: (ep: number) => void;
}

const VolumeNode: React.FC<VolumeNodeProps> = ({
  group, currentEpisode, language, onSelectEpisode,
}) => {
  const [expanded, setExpanded] = useState(true);
  const toggle = useCallback(() => setExpanded(v => !v), []);

  return (
    <div className="mb-1">
      {/* Volume header */}
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg
          text-text-secondary hover:bg-bg-tertiary/60 transition-colors
          text-left min-h-[44px]"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-text-tertiary" />
        )}
        <FolderOpen className="w-4 h-4 shrink-0 text-accent-amber" />
        <span className="text-xs font-serif font-medium truncate">
          {group.title}
        </span>
        <span className="ml-auto text-[10px] text-text-tertiary shrink-0">
          {group.episodes.length}
        </span>
      </button>

      {/* Episode items */}
      {expanded && (
        <div className="ml-4 border-l border-border/40 pl-1">
          {group.episodes.map(ms => {
            const status = getEpisodeStatus(ms);
            const isActive = ms.episode === currentEpisode;

            return (
              <button
                key={ms.episode}
                onClick={() => onSelectEpisode(ms.episode)}
                className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg
                  transition-colors text-left min-h-[44px] group/ep
                  ${isActive
                    ? 'bg-accent-amber/10 border border-accent-amber/30 text-text-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary/50 border border-transparent'
                  }`}
                title={ms.summary ?? ms.title}
              >
                <FileText className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-accent-amber' : 'text-text-tertiary'
                }`} />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-tertiary font-mono shrink-0">
                      {String(ms.episode).padStart(3, '0')}
                    </span>
                    <span className="text-xs font-serif truncate">
                      {truncate(ms.title, 18)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="text-[10px]"
                    title={statusLabel(status, language)}
                  >
                    {statusIcon(status)}
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">
                    {formatCharCount(ms.charCount)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PART 4 — EpisodeExplorer Main Component
// ============================================================

const EpisodeExplorer: React.FC<EpisodeExplorerProps> = ({
  config,
  currentEpisode,
  language,
  onSelectEpisode,
  onCreateEpisode,
  onCreateVolume,
  onClose,
  onNavigateTab,
  className = '',
}) => {
  // Build volume groups from manuscripts
  const volumeGroups = useMemo<VolumeGroup[]>(() => {
    const manuscripts = config.manuscripts ?? [];
    if (manuscripts.length === 0) return [];

    const map = new Map<number, EpisodeManuscript[]>();
    for (const ms of manuscripts) {
      const vol = ms.volume ?? 1;
      const arr = map.get(vol);
      if (arr) { arr.push(ms); } else { map.set(vol, [ms]); }
    }

    const sorted = Array.from(map.entries()).sort(([a], [b]) => a - b);
    return sorted.map(([volId, eps]) => ({
      volumeId: volId,
      title: L4(language, {
        ko: `${volId}권`,
        en: `Volume ${volId}`,
        ja: `第${volId}巻`,
        zh: `第${volId}卷`,
      }),
      episodes: eps.sort((a, b) => a.episode - b.episode),
    }));
  }, [config.manuscripts, language]);

  const quickLinks = useMemo(() => [
    {
      id: 'characters',
      icon: Users,
      label: L4(language, { ko: '인물', en: 'Characters', ja: 'キャラ', zh: '人物' }),
    },
    {
      id: 'world',
      icon: Globe,
      label: L4(language, { ko: '세계관', en: 'World', ja: '世界観', zh: '世界观' }),
    },
    {
      id: 'rulebook',
      icon: Clapperboard,
      label: L4(language, { ko: '연출', en: 'Direction', ja: '演出', zh: '演出' }),
    },
  ], [language]);

  return (
    <div className={`flex flex-col h-full bg-bg-primary border-r border-border ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border min-h-[44px]">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-serif font-semibold text-text-primary truncate">
            {config.title || L4(language, { ko: '제목 없음', en: 'Untitled' })}
          </span>
          <BranchSelector
            currentBranch="main"
            branches={['main']}
            onSwitchBranch={() => {}}
            disabled
            language={language}
            className="mt-1"
          />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary
              transition-colors shrink-0 ml-2"
            title={L4(language, { ko: '닫기', en: 'Close' })}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        {volumeGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-xs font-serif">
              {L4(language, {
                ko: '아직 원고가 없어요',
                en: 'No manuscripts yet',
                ja: 'まだ原稿がありません',
                zh: '还没有稿件',
              })}
            </span>
          </div>
        ) : (
          volumeGroups.map(group => (
            <VolumeNode
              key={group.volumeId}
              group={group}
              currentEpisode={currentEpisode}
              language={language}
              onSelectEpisode={onSelectEpisode}
            />
          ))
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-border">
        {onCreateEpisode && (
          <button
            onClick={onCreateEpisode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
              text-xs font-serif text-text-secondary
              hover:text-accent-amber hover:bg-accent-amber/10
              transition-colors min-h-[44px] flex-1 justify-center
              border border-border hover:border-accent-amber/30"
            title={L4(language, { ko: '새 에피소드', en: 'New Episode' })}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{L4(language, { ko: '에피소드', en: 'Episode', ja: 'エピソード', zh: '章节' })}</span>
          </button>
        )}
        {onCreateVolume && (
          <button
            onClick={onCreateVolume}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
              text-xs font-serif text-text-secondary
              hover:text-accent-amber hover:bg-accent-amber/10
              transition-colors min-h-[44px] flex-1 justify-center
              border border-border hover:border-accent-amber/30"
            title={L4(language, { ko: '새 권', en: 'New Volume' })}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{L4(language, { ko: '권', en: 'Volume', ja: '巻', zh: '卷' })}</span>
          </button>
        )}
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-border">
        {quickLinks.map(link => (
          <button
            key={link.id}
            onClick={() => onNavigateTab?.(link.id)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg
              text-[11px] font-serif text-text-tertiary
              hover:text-text-primary hover:bg-bg-tertiary/50
              transition-colors min-h-[44px] flex-1 justify-center"
            title={link.label}
          >
            <link.icon className="w-3.5 h-3.5" />
            <span>{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EpisodeExplorer;
