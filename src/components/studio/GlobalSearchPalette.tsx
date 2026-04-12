"use client";

// ============================================================
// PART 1 — Global Search Palette (Ctrl+K command palette)
// ============================================================

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Search, X, UserCircle, Globe, FileText } from 'lucide-react';
import type { StoryConfig, ChatSession, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

type ResultType = 'character' | 'episode' | 'world';

interface SearchResult {
  type: ResultType;
  label: string;
  detail: string;
  id?: string;
}

interface GlobalSearchPaletteProps {
  query: string;
  setQuery: (q: string) => void;
  sessions: ChatSession[];
  config: StoryConfig | null;
  language: AppLanguage;
  onSelect: (type: ResultType, id?: string) => void;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=search palette | inputs=query,sessions,config | outputs=SearchResult[]

// ============================================================
// PART 2 — Search logic with debounce
// ============================================================

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const GlobalSearchPalette: React.FC<GlobalSearchPaletteProps> = ({
  query, setQuery, sessions, config, language, onSelect, onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const worldFieldLabels = useMemo(() => [
    { key: 'setting', label: L4(language, { ko: '배경', en: 'Setting', ja: '背景', zh: '背景' }) },
    { key: 'corePremise', label: L4(language, { ko: '핵심 전제', en: 'Core Premise', ja: 'コアプレミス', zh: '核心前提' }) },
    { key: 'synopsis', label: L4(language, { ko: '시놉시스', en: 'Synopsis', ja: 'シノプシス', zh: '剧情简介' }) },
    { key: 'worldHistory', label: L4(language, { ko: '역사', en: 'History', ja: '歴史', zh: '历史' }) },
    { key: 'socialSystem', label: L4(language, { ko: '사회 시스템', en: 'Social System', ja: '社会システム', zh: '社会系统' }) },
    { key: 'powerStructure', label: L4(language, { ko: '권력 구조', en: 'Power Structure', ja: '権力構造', zh: '权力结构' }) },
    { key: 'currentConflict', label: L4(language, { ko: '현재 갈등', en: 'Current Conflict', ja: '現在の対立', zh: '当前冲突' }) },
    { key: 'culture', label: L4(language, { ko: '문화', en: 'Culture', ja: '文化', zh: '文化' }) },
    { key: 'magicTechSystem', label: L4(language, { ko: '마법/기술', en: 'Magic/Tech', ja: '魔法/技術', zh: '魔法/科技' }) },
  ], [language]);

  const results = useMemo<SearchResult[]>(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return [];
    const out: SearchResult[] = [];

    // Search character names & traits
    if (config?.characters) {
      for (const char of config.characters) {
        if (
          char.name.toLowerCase().includes(q) ||
          char.traits?.toLowerCase().includes(q) ||
          char.role?.toLowerCase().includes(q)
        ) {
          out.push({
            type: 'character',
            label: char.name,
            detail: `${char.role} — ${char.traits?.slice(0, 50) ?? ''}`,
          });
        }
      }
    }

    // Search episode titles
    for (const session of sessions) {
      if (
        session.title?.toLowerCase().includes(q) ||
        session.config?.title?.toLowerCase().includes(q)
      ) {
        out.push({
          type: 'episode',
          label: session.config?.title || session.title,
          detail: `EP.${session.config?.episode ?? '?'}`,
          id: session.id,
        });
      }
    }

    // Search world settings text fields
    if (config) {
      for (const wf of worldFieldLabels) {
        const val = (config as unknown as Record<string, unknown>)[wf.key];
        if (typeof val === 'string' && val.toLowerCase().includes(q)) {
          out.push({
            type: 'world',
            label: wf.label,
            detail: val.slice(0, 60) + (val.length > 60 ? '...' : ''),
          });
          break; // Only show one world match
        }
      }
    }

    return out.slice(0, 12);
  }, [debouncedQuery, sessions, config, worldFieldLabels]);

  const iconMap: Record<ResultType, React.ReactNode> = {
    character: <UserCircle className="w-4 h-4 text-accent-purple" />,
    episode: <FileText className="w-4 h-4 text-accent-green" />,
    world: <Globe className="w-4 h-4 text-amber-400" />,
  };

  const categoryLabel = (type: ResultType): string => {
    if (type === 'character') return L4(language, { ko: '캐릭터', en: 'CHAR', ja: 'キャラ', zh: '角色' });
    if (type === 'episode') return L4(language, { ko: '에피소드', en: 'EP', ja: 'エピソード', zh: '章节' });
    return L4(language, { ko: '세계관', en: 'WORLD', ja: '世界観', zh: '世界观' });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-bg-secondary border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-modal
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={L4(language, {
              ko: '캐릭터, 에피소드, 세계관 검색... (Ctrl+K)',
              en: 'Search characters, episodes, world... (Ctrl+K)',
              ja: 'キャラクター、エピソード、世界観を検索... (Ctrl+K)',
              zh: '搜索角色、章节、世界观... (Ctrl+K)',
            })}
            className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder-text-tertiary"
          />
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {debouncedQuery && results.length === 0 && (
            <div className="px-4 py-6 text-center text-text-tertiary text-sm">
              {L4(language, {
                ko: '검색 결과가 없습니다',
                en: 'No results found',
                ja: '検索結果がありません',
                zh: '没有找到结果',
              })}
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${i}`}
              onClick={() => onSelect(r.type, r.id)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/[0.06] transition-colors border-b border-border/50 last:border-0"
            >
              {iconMap[r.type]}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text-primary truncate">{r.label}</div>
                <div className="text-[11px] text-text-tertiary truncate">{r.detail}</div>
              </div>
              <span className="text-[9px] font-mono uppercase text-text-tertiary tracking-widest shrink-0">
                {categoryLabel(r.type)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchPalette;

// IDENTITY_SEAL: PART-2 | role=search UI | inputs=query,results | outputs=JSX
