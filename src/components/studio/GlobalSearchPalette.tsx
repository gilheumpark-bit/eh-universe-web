"use client";

// ============================================================
// PART 1 — Global Search Palette (Ctrl+K command palette)
// ============================================================

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Search, X, UserCircle, Globe, FileText } from 'lucide-react';
import type { StoryConfig, ChatSession, AppLanguage } from '@/lib/studio-types';

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
  const isKO = language === 'KO';
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      const worldFields: { key: string; label: string }[] = [
        { key: 'setting', label: isKO ? '배경' : 'Setting' },
        { key: 'corePremise', label: isKO ? '핵심 전제' : 'Core Premise' },
        { key: 'synopsis', label: isKO ? '시놉시스' : 'Synopsis' },
        { key: 'worldHistory', label: isKO ? '역사' : 'History' },
        { key: 'socialSystem', label: isKO ? '사회 시스템' : 'Social System' },
        { key: 'powerStructure', label: isKO ? '권력 구조' : 'Power Structure' },
        { key: 'currentConflict', label: isKO ? '현재 갈등' : 'Current Conflict' },
        { key: 'culture', label: isKO ? '문화' : 'Culture' },
        { key: 'magicTechSystem', label: isKO ? '마법/기술' : 'Magic/Tech' },
      ];
      for (const wf of worldFields) {
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
  }, [debouncedQuery, sessions, config, isKO]);

  const iconMap: Record<ResultType, React.ReactNode> = {
    character: <UserCircle className="w-4 h-4 text-accent-purple" />,
    episode: <FileText className="w-4 h-4 text-accent-green" />,
    world: <Globe className="w-4 h-4 text-[rgba(202,161,92,0.8)]" />,
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-bg-secondary border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        data-modal
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isKO ? '캐릭터, 에피소드, 세계관 검색... (Ctrl+K)' : 'Search characters, episodes, world... (Ctrl+K)'}
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
              {isKO ? '검색 결과가 없습니다' : 'No results found'}
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
              <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase text-text-tertiary tracking-widest shrink-0">
                {r.type === 'character' ? (isKO ? '캐릭터' : 'CHAR') : r.type === 'episode' ? (isKO ? '에피소드' : 'EP') : (isKO ? '세계관' : 'WORLD')}
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
