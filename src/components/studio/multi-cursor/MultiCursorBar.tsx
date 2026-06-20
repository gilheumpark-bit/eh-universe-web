"use client";
// ============================================================
// MultiCursorBar — 본문 상단 검색·치환 바.
// Ctrl+D 로 활성 (코드 IDE 의 Find/Replace 대응).
//
// 기능:
//   - 검색 입력 → occurrences 카운트 표시
//   - 치환 입력 → 일괄 적용
//   - Aa (대소문자) / .* (정규식) / W (whole word) 토글
// ============================================================

import React, { useState, useEffect } from 'react';
import { Search, Replace, X, CaseSensitive, Regex, WholeWord } from 'lucide-react';
import { findAllOccurrences, replaceAllOccurrences, type Occurrence } from '@/lib/multi-cursor/find-occurrences';

export interface MultiCursorBarProps {
  text: string;
  open: boolean;
  onClose: () => void;
  onApply: (newText: string, occurrences: Occurrence[]) => void;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const MultiCursorBar: React.FC<MultiCursorBarProps> = ({
  text,
  open,
  onClose,
  onApply,
  language = 'KO',
}) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const isKO = language === 'KO';

  // Esc 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const occurrences = findAllOccurrences(text, query, { caseSensitive, wholeWord, regex });

  const handleReplace = () => {
    if (occurrences.length === 0) return;
    const newText = replaceAllOccurrences(text, occurrences, replacement);
    onApply(newText, occurrences);
    setQuery('');
    setReplacement('');
  };

  return (
    <div
      className="fixed top-20 right-6 z-40 w-[420px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden"
      role="dialog"
      aria-label={isKO ? '검색/치환' : 'Find/Replace'}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-tertiary/30">
        <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
          {isKO ? '동시 수정' : 'Multi-cursor'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-text-tertiary hover:text-text-secondary rounded"
          aria-label={isKO ? '닫기' : 'Close'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search row */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <Search className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isKO ? '검색' : 'Find'}
          className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-tertiary outline-none"
        />
        <span className="text-[10px] font-mono text-text-tertiary">
          {occurrences.length}
        </span>
        <div className="flex items-center gap-0.5 ml-1">
          <button
            type="button"
            onClick={() => setCaseSensitive((v) => !v)}
            className={`p-1 rounded ${caseSensitive ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-tertiary'}`}
            aria-label="Case sensitive"
            title="Aa"
          >
            <CaseSensitive className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setWholeWord((v) => !v)}
            className={`p-1 rounded ${wholeWord ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-tertiary'}`}
            aria-label="Whole word"
            title="W"
          >
            <WholeWord className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setRegex((v) => !v)}
            className={`p-1 rounded ${regex ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-tertiary'}`}
            aria-label="Regex"
            title=".*"
          >
            <Regex className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Replace row */}
      <div className="flex items-center gap-1 px-3 py-2">
        <Replace className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        <input
          type="text"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
          placeholder={isKO ? '치환' : 'Replace'}
          className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-tertiary outline-none"
        />
        <button
          type="button"
          onClick={handleReplace}
          disabled={occurrences.length === 0}
          className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 disabled:opacity-30 rounded"
        >
          {isKO ? '모두 변경' : 'All'}
        </button>
      </div>
    </div>
  );
};

export default MultiCursorBar;
