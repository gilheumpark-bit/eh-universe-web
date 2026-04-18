"use client";

// ============================================================
// PART 1 — Types & Imports (Global Search Palette — command palette)
// ============================================================

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Search, X, UserCircle, Globe, FileText, Type, Zap } from 'lucide-react';
import type { StoryConfig, ChatSession, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

export type ResultType = 'character' | 'episode' | 'world' | 'text' | 'action';
export type FilterType = 'all' | ResultType;

export interface StudioAction {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  keywords?: string[];
  handler: () => void;
}

export interface SearchResult {
  type: ResultType;
  label: string;
  detail: string;
  id?: string;
  snippet?: string;
  matchStart?: number;
  matchLength?: number;
  sessionId?: string;
  shortcut?: string;
  actionId?: string;
}

export interface GlobalSearchPaletteProps {
  query: string;
  setQuery: (q: string) => void;
  sessions: ChatSession[];
  config: StoryConfig | null;
  language: AppLanguage;
  actions?: StudioAction[];
  onSelect: (type: ResultType, id?: string, sessionId?: string) => void;
  onExecuteAction?: (actionId: string) => void;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=types+imports | inputs=none | outputs=types

// ============================================================
// PART 2 — Hooks & Snippet helpers
// ============================================================

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Build a ±30 char snippet around the first match. Returns null if no match. */
function buildSnippet(
  text: string,
  query: string,
): { snippet: string; matchStart: number; matchLength: number } | null {
  if (!text || !query) return null;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return null;
  const radius = 30;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return {
    snippet: prefix + text.slice(start, end) + suffix,
    matchStart: idx - start + prefix.length,
    matchLength: query.length,
  };
}

/** Render a snippet with the match highlighted. */
function HighlightSnippet({
  snippet,
  start,
  length,
}: {
  snippet: string;
  start: number;
  length: number;
}): React.ReactElement {
  if (start < 0 || length <= 0 || start + length > snippet.length) {
    return <>{snippet}</> as React.ReactElement;
  }
  const before = snippet.slice(0, start);
  const match = snippet.slice(start, start + length);
  const after = snippet.slice(start + length);
  return (
    <>
      {before}
      <mark className="bg-accent-blue/25 text-accent-blue rounded-sm px-0.5">{match}</mark>
      {after}
    </>
  );
}

// IDENTITY_SEAL: PART-2 | role=hooks+snippet | inputs=text,query | outputs=snippet-result

// ============================================================
// PART 3 — Search logic (characters, episodes, world, body, actions)
// ============================================================

interface BuildResultsInput {
  query: string;
  sessions: ChatSession[];
  config: StoryConfig | null;
  actions: StudioAction[];
  worldFieldLabels: { key: string; label: string }[];
}

/** Collect search hits across all categories. Caller applies filter/limit. */
function buildResults({
  query,
  sessions,
  config,
  actions,
  worldFieldLabels,
}: BuildResultsInput): SearchResult[] {
  const q = query.toLowerCase().trim();
  const out: SearchResult[] = [];

  // ── Action category (always shown; matches if query empty or matches label/keyword)
  for (const a of actions) {
    const hay = [a.label, a.description, ...(a.keywords ?? [])].join(' ').toLowerCase();
    if (!q || hay.includes(q)) {
      out.push({
        type: 'action',
        label: a.label,
        detail: a.description,
        shortcut: a.shortcut,
        actionId: a.id,
      });
    }
  }

  // Below this point the query is required
  if (!q) return out;

  // ── Characters
  if (config?.characters) {
    for (const char of config.characters) {
      if (
        char.name.toLowerCase().includes(q) ||
        (char.traits ?? '').toLowerCase().includes(q) ||
        (char.role ?? '').toLowerCase().includes(q)
      ) {
        out.push({
          type: 'character',
          label: char.name,
          detail: `${char.role ?? ''} — ${(char.traits ?? '').slice(0, 50)}`,
        });
      }
    }
  }

  // ── Episodes (title match)
  for (const session of sessions) {
    if (
      (session.title ?? '').toLowerCase().includes(q) ||
      (session.config?.title ?? '').toLowerCase().includes(q)
    ) {
      out.push({
        type: 'episode',
        label: session.config?.title || session.title,
        detail: `EP.${session.config?.episode ?? '?'}`,
        id: session.id,
        sessionId: session.id,
      });
    }
  }

  // ── World fields (first hit per session)
  if (config) {
    for (const wf of worldFieldLabels) {
      const val = (config as unknown as Record<string, unknown>)[wf.key];
      if (typeof val === 'string' && val.toLowerCase().includes(q)) {
        out.push({
          type: 'world',
          label: wf.label,
          detail: val.slice(0, 60) + (val.length > 60 ? '…' : ''),
        });
        break; // one world match suffices
      }
    }
  }

  // ── Body text search (assistant messages only). Query must be ≥2 chars.
  if (q.length >= 2) {
    let totalMatches = 0;
    const GLOBAL_CAP = 5;
    const PER_SESSION_CAP = 3;
    for (const session of sessions) {
      if (totalMatches >= GLOBAL_CAP) break;
      let perSession = 0;
      for (const msg of session.messages ?? []) {
        if (perSession >= PER_SESSION_CAP || totalMatches >= GLOBAL_CAP) break;
        if (msg.role !== 'assistant' || !msg.content) continue;
        const snippet = buildSnippet(msg.content, q);
        if (!snippet) continue;
        out.push({
          type: 'text',
          label: session.config?.title || session.title || `EP.${session.config?.episode ?? '?'}`,
          detail: `EP.${session.config?.episode ?? '?'}`,
          id: session.id,
          sessionId: session.id,
          snippet: snippet.snippet,
          matchStart: snippet.matchStart,
          matchLength: snippet.matchLength,
        });
        perSession++;
        totalMatches++;
      }
    }
  }

  return out;
}

// IDENTITY_SEAL: PART-3 | role=search-logic | inputs=query,sessions,config,actions | outputs=SearchResult[]

// ============================================================
// PART 4 — Component (UI, tab filter, keyboard nav)
// ============================================================

const GlobalSearchPalette: React.FC<GlobalSearchPaletteProps> = ({
  query, setQuery, sessions, config, language,
  actions = [],
  onSelect, onExecuteAction, onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

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

  const allResults = useMemo<SearchResult[]>(() => {
    return buildResults({
      query: debouncedQuery,
      sessions,
      config,
      actions,
      worldFieldLabels,
    });
  }, [debouncedQuery, sessions, config, actions, worldFieldLabels]);

  const results = useMemo<SearchResult[]>(() => {
    const filtered = filter === 'all' ? allResults : allResults.filter(r => r.type === filter);
    return filtered.slice(0, 20);
  }, [allResults, filter]);

  // Reset selection when query/filter changes — React-idiomatic "derived state"
  // pattern (store previous key in state, setState during render, which React
  // supports and is preferred over a setState-in-effect).
  const resetKey = `${debouncedQuery}\u0001${filter}`;
  const [prevResetKey, setPrevResetKey] = useState<string>(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setSelectedIndex(0);
  }
  // Clamp selectedIndex within results length — derived during render.
  const effectiveIndex = results.length === 0
    ? 0
    : Math.min(selectedIndex, results.length - 1);

  const filterTabs: { id: FilterType; label: string }[] = useMemo(() => [
    { id: 'all', label: L4(language, { ko: '전체', en: 'All', ja: '全て', zh: '全部' }) },
    { id: 'character', label: L4(language, { ko: '캐릭터', en: 'Character', ja: 'キャラ', zh: '角色' }) },
    { id: 'episode', label: L4(language, { ko: '에피소드', en: 'Episode', ja: 'エピソード', zh: '章节' }) },
    { id: 'world', label: L4(language, { ko: '세계관', en: 'World', ja: '世界観', zh: '世界观' }) },
    { id: 'text', label: L4(language, { ko: '본문', en: 'Text', ja: '本文', zh: '正文' }) },
    { id: 'action', label: L4(language, { ko: '명령', en: 'Action', ja: 'コマンド', zh: '命令' }) },
  ], [language]);

  const iconMap: Record<ResultType, React.ReactNode> = {
    character: <UserCircle className="w-4 h-4 text-accent-purple" />,
    episode: <FileText className="w-4 h-4 text-accent-green" />,
    world: <Globe className="w-4 h-4 text-amber-400" />,
    text: <Type className="w-4 h-4 text-accent-blue" />,
    action: <Zap className="w-4 h-4 text-accent-amber" />,
  };

  const categoryLabel = useCallback((type: ResultType): string => {
    if (type === 'character') return L4(language, { ko: '캐릭터', en: 'CHAR', ja: 'キャラ', zh: '角色' });
    if (type === 'episode') return L4(language, { ko: '에피소드', en: 'EP', ja: 'エピソード', zh: '章节' });
    if (type === 'world') return L4(language, { ko: '세계관', en: 'WORLD', ja: '世界観', zh: '世界观' });
    if (type === 'text') return L4(language, { ko: '본문', en: 'TEXT', ja: '本文', zh: '正文' });
    return L4(language, { ko: '명령', en: 'ACTION', ja: 'コマンド', zh: '命令' });
  }, [language]);

  const executeResult = useCallback((r: SearchResult) => {
    if (r.type === 'action' && r.actionId) {
      onExecuteAction?.(r.actionId);
      return;
    }
    onSelect(r.type, r.id, r.sessionId);
  }, [onExecuteAction, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[effectiveIndex];
      if (r) executeResult(r);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const order: FilterType[] = ['all', 'character', 'episode', 'world', 'text', 'action'];
      const idx = order.indexOf(filter);
      const step = e.shiftKey ? order.length - 1 : 1;
      const next = order[(idx + step) % order.length];
      setFilter(next);
    }
  }, [results, effectiveIndex, filter, executeResult]);

  // Scroll selected item into view (guard against jsdom where scrollIntoView is absent)
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-result-index="${effectiveIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [effectiveIndex]);

  const placeholder = L4(language, {
    ko: '검색 또는 명령… (Ctrl+K)',
    en: 'Search or command… (Ctrl+K)',
    ja: '検索またはコマンド… (Ctrl+K)',
    zh: '搜索或命令… (Ctrl+K)',
  });
  const emptyLabel = L4(language, {
    ko: '검색 결과가 없습니다',
    en: 'No results found',
    ja: '検索結果がありません',
    zh: '没有找到结果',
  });

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[15vh]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-bg-secondary border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: '전역 검색 팔레트', en: 'Global search palette', ja: 'グローバル検索', zh: '全局搜索' })}
        data-modal
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-text-primary placeholder-text-tertiary text-ellipsis overflow-hidden"
          />
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div
          className="flex items-center gap-1 px-3 py-2 border-b border-border bg-bg-primary/30 overflow-x-auto"
          role="tablist"
          aria-label={L4(language, { ko: '카테고리 필터', en: 'Category filter', ja: 'カテゴリーフィルター', zh: '类别过滤' })}
        >
          {filterTabs.map(tab => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                data-tab={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors shrink-0 ${
                  active
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-white/[0.05]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto" role="listbox">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-text-tertiary text-sm">
              {emptyLabel}
            </div>
          )}
          {results.map((r, i) => {
            const selected = i === effectiveIndex;
            return (
              <button
                key={`${r.type}-${r.actionId ?? r.id ?? i}-${i}`}
                data-result-index={i}
                data-result-type={r.type}
                role="option"
                aria-selected={selected}
                onClick={() => executeResult(r)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0 ${
                  selected ? 'bg-accent-blue/10' : 'hover:bg-white/[0.06]'
                }`}
              >
                {iconMap[r.type]}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary truncate">{r.label}</div>
                  {r.type === 'text' && r.snippet ? (
                    <div className="text-[11px] text-text-secondary truncate" data-testid="text-snippet">
                      <HighlightSnippet
                        snippet={r.snippet}
                        start={r.matchStart ?? 0}
                        length={r.matchLength ?? 0}
                      />
                    </div>
                  ) : (
                    <div className="text-[11px] text-text-tertiary truncate">{r.detail}</div>
                  )}
                </div>
                {r.type === 'action' && r.shortcut && (
                  <span
                    data-testid="action-shortcut"
                    className="px-1.5 py-0.5 text-[9px] font-mono bg-white/[0.06] text-text-secondary rounded border border-border/50 shrink-0"
                  >
                    {r.shortcut}
                  </span>
                )}
                <span className="text-[9px] font-mono uppercase text-text-tertiary tracking-widest shrink-0">
                  {categoryLabel(r.type)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchPalette;

// IDENTITY_SEAL: PART-4 | role=UI+keyboard-nav | inputs=props | outputs=JSX
