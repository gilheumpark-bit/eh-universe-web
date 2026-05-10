"use client";
// ============================================================
// SnippetPalette — Ctrl+Shift+S 모달. prefix/이름 검색 → 본문 삽입.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { searchSnippets, expandSnippet } from '@/lib/snippets/registry';
import type { Snippet, SnippetCategory } from '@/lib/snippets/types';

const CATEGORY_LABEL_KO: Record<SnippetCategory, string> = {
  description: '묘사',
  dialogue: '대화',
  transition: '전환',
  action: '액션',
  emotion: '감정',
};

const CATEGORY_LABEL_EN: Record<SnippetCategory, string> = {
  description: 'Description',
  dialogue: 'Dialogue',
  transition: 'Transition',
  action: 'Action',
  emotion: 'Emotion',
};

export interface SnippetPaletteProps {
  open: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const SnippetPalette: React.FC<SnippetPaletteProps> = ({
  open,
  onClose,
  onInsert,
  language = 'KO',
}) => {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isKO = language === 'KO';
  const lang = language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh';
  const labels = isKO ? CATEGORY_LABEL_KO : CATEGORY_LABEL_EN;

  useEffect(() => {
    if (open) {
      // [legitimate reset-on-open] 모달 열릴 때 입력 초기화 + focus.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Snippet[]>(() => {
    if (!open) return [];
    return searchSnippets(query, lang);
  }, [open, query, lang]);

  const handleInsert = (snippet: Snippet) => {
    onInsert(expandSnippet(snippet));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((idx) => Math.min(idx + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((idx) => Math.max(idx - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = results[activeIdx];
      if (sel) handleInsert(sel);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[600px] mx-4 bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Sparkles className="w-4 h-4 text-accent-amber" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isKO ? '묘사·대화·전환·액션·감정 검색' : 'Search snippets'}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-tertiary outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-secondary rounded"
            aria-label={isKO ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-tertiary">
              {isKO ? '결과 없음' : 'No matches'}
            </div>
          ) : (
            <ul role="listbox">
              {results.map((s, idx) => {
                const name = s.name[lang] ?? s.name.ko;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleInsert(s)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        idx === activeIdx ? 'bg-accent-amber/15 text-accent-amber' : 'text-text-secondary hover:bg-bg-tertiary/30'
                      }`}
                    >
                      <code className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary w-20 truncate">
                        {s.prefix}
                      </code>
                      <span className="text-[10px] text-text-tertiary">{labels[s.category]}</span>
                      <span className="text-sm font-medium flex-1 truncate">{name}</span>
                      {s.scope === 'user' && (
                        <span className="text-[9px] uppercase tracking-wider text-accent-purple">USER</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-tertiary/30 text-[10px] text-text-tertiary font-mono">
          <span>↑↓ {isKO ? '이동' : 'navigate'} · Enter {isKO ? '삽입' : 'insert'} · Esc {isKO ? '닫기' : 'close'}</span>
          <span>{results.length}{isKO ? '개' : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default SnippetPalette;
