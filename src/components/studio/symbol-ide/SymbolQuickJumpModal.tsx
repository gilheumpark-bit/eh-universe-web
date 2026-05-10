"use client";
// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// SymbolQuickJumpModal — Ctrl+T 로 열리는 Symbol Quick Jump.
// 코드 IDE 의 "Go to Symbol in Workspace" 대응.
//
// GlobalSearchPalette (Ctrl+K) 와 별도 — 검색 범위가 Symbol Index 한정.
// 이름·alias 를 순위 매겨 표시 (시작 일치 > 부분 일치).
//
// [C] index 비어있으면 "정의 없음" / Esc 닫기
// [G] useMemo 필터링 / 키 입력 즉시 반영 (debounce 불필요 — 클라 데이터)
// [K] 키보드 내비게이션 (↑↓ Enter Esc)
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { SymbolIndex, SymbolDefinition } from '@/lib/symbol-index/types';
import { dispatchGoToDefinition } from '@/hooks/useGoToDefinition';

// ============================================================
// PART 2 — Helpers
// ============================================================

interface ScoredDef {
  def: SymbolDefinition;
  score: number;
}

/** 단순 점수 — 시작 일치 100, 부분 일치 50, alias 시작 80, alias 부분 30 */
function score(def: SymbolDefinition, query: string): number {
  const q = query.toLowerCase();
  if (!q) return 1;
  const name = def.name.toLowerCase();
  if (name.startsWith(q)) return 100 - (name.length - q.length);
  if (name.includes(q)) return 50;
  for (const a of def.aliases) {
    const al = a.toLowerCase();
    if (al.startsWith(q)) return 80 - (al.length - q.length);
    if (al.includes(q)) return 30;
  }
  return -1;
}

// ============================================================
// PART 3 — Component
// ============================================================

export interface SymbolQuickJumpModalProps {
  index: SymbolIndex;
  open: boolean;
  onClose: () => void;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const SymbolQuickJumpModal: React.FC<SymbolQuickJumpModalProps> = ({
  index,
  open,
  onClose,
  language = 'KO',
}) => {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isKO = language === 'KO';

  // 모달 열릴 때 input focus, 쿼리 초기화
  useEffect(() => {
    if (open) {
      // [legitimate reset-on-open] 모달 open 시 입력 초기화 + focus.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
       
      setActiveIdx(0);
      // [C] requestAnimationFrame 으로 DOM 마운트 후 focus
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /** query 적용 — 모든 kind 합쳐서 score 정렬 */
  const results = useMemo<ScoredDef[]>(() => {
    if (!open) return [];
    const all = Array.from(index.definitions.values());
    if (!query.trim()) {
      return all.slice(0, 50).map((def) => ({ def, score: 1 }));
    }
    return all
      .map((def) => ({ def, score: score(def, query) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [index, query, open]);

  // 키보드 내비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((idx) => Math.min(idx + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((idx) => Math.max(idx - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = results[activeIdx];
      if (sel) {
        dispatchGoToDefinition(sel.def.id, sel.def.jumpTarget);
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isKO ? 'Symbol 빠른 점프' : 'Symbol Quick Jump'}
    >
      <div
        className="w-full max-w-[600px] mx-4 bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isKO ? 'Symbol 이름 또는 별칭 입력' : 'Type symbol name or alias'}
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

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-tertiary">
              {isKO ? '결과 없음' : 'No matches'}
            </div>
          ) : (
            <ul role="listbox">
              {results.map((s, idx) => (
                <li key={s.def.id}>
                  <button
                    type="button"
                    onClick={() => {
                      dispatchGoToDefinition(s.def.id, s.def.jumpTarget);
                      onClose();
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      idx === activeIdx
                        ? 'bg-accent-purple/15 text-accent-purple'
                        : 'text-text-secondary hover:bg-bg-tertiary/30'
                    }`}
                    role="option"
                    aria-selected={idx === activeIdx}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary w-16">
                      {s.def.kind}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate">{s.def.name}</span>
                    {s.def.aliases.length > 0 && (
                      <span className="text-[10px] text-text-tertiary truncate max-w-[180px]">
                        {s.def.aliases.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-tertiary/30 text-[10px] text-text-tertiary font-mono">
          <span>↑↓ {isKO ? '이동' : 'navigate'} · Enter {isKO ? '점프' : 'jump'} · Esc {isKO ? '닫기' : 'close'}</span>
          <span>{results.length}{isKO ? '건' : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default SymbolQuickJumpModal;
