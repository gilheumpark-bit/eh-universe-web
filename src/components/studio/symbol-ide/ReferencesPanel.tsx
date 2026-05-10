"use client";
// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// ReferencesPanel — Shift+F12 결과 패널.
// 코드 IDE 의 "Find All References" 우측 패널 대응.
//
// 표시 내용:
//   - Symbol 이름 + 총 등장 횟수
//   - episode 별 그룹 (접기/펼치기)
//   - 각 reference: episodeId · charOffset · context (±50자)
//   - 클릭 시 'noa:goto-reference' CustomEvent dispatch
//
// [C] result null → 빈 상태 / 없는 episode → skip
// [G] 단일 트리 렌더 — 가상화는 수백 건 넘을 때 (Phase 2)
// [K] 검색 필터 1개 (context 부분 매치) — 과도 추상 X
// ============================================================

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Search, X } from 'lucide-react';
import type { FindReferencesResult, SymbolReference } from '@/lib/symbol-index/types';

// ============================================================
// PART 2 — Helpers
// ============================================================

/** context 안에서 surfaceForm 위치를 마킹하기 위해 분할 */
function highlightSurface(context: string, surface: string): React.ReactNode {
  if (!context || !surface) return context;
  const idx = context.indexOf(surface);
  if (idx < 0) return context;
  return (
    <>
      <span>{context.slice(0, idx)}</span>
      <mark className="bg-accent-amber/30 text-accent-amber font-bold">{surface}</mark>
      <span>{context.slice(idx + surface.length)}</span>
    </>
  );
}

/** 'noa:goto-reference' dispatch — 부모가 episodeId·charOffset 으로 점프 */
function dispatchGotoReference(ref: SymbolReference): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('noa:goto-reference', {
      detail: { episodeId: ref.episodeId, charOffset: ref.charOffset, surface: ref.surfaceForm },
    }),
  );
}

// ============================================================
// PART 3 — Component
// ============================================================

export interface ReferencesPanelProps {
  result: FindReferencesResult | null;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  onClose?: () => void;
}

export const ReferencesPanel: React.FC<ReferencesPanelProps> = ({
  result,
  language = 'KO',
  onClose,
}) => {
  const [filter, setFilter] = useState('');
  const [expandedEps, setExpandedEps] = useState<Set<number>>(new Set());
  const isKO = language === 'KO';

  const filteredEntries = useMemo(() => {
    if (!result) return [];
    const entries = Array.from(result.byEpisode.entries()).sort((a, b) => a[0] - b[0]);
    if (!filter.trim()) return entries;
    const q = filter.trim().toLowerCase();
    return entries
      .map(([ep, refs]) => [ep, refs.filter((r) => r.context.toLowerCase().includes(q))] as const)
      .filter(([, refs]) => refs.length > 0);
  }, [result, filter]);

  const toggleEpisode = (ep: number) => {
    setExpandedEps((prev) => {
      const next = new Set(prev);
      if (next.has(ep)) next.delete(ep);
      else next.add(ep);
      return next;
    });
  };

  if (!result) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-6 text-center">
        <p className="text-sm text-text-tertiary">
          {isKO ? 'Symbol 을 선택하세요 (Shift+F12)' : 'Select a symbol (Shift+F12)'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col max-h-[70vh]"
      role="region"
      aria-label={isKO ? '참조 목록' : 'References list'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <div>
          <h3 className="text-sm font-bold text-text-primary">{result.symbolName}</h3>
          <p className="text-xs text-text-tertiary">
            {result.totalCount}{isKO ? '회 등장' : ' references'} · {result.byEpisode.size}{isKO ? '개 화수' : ' episodes'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-secondary rounded focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
            aria-label={isKO ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 bg-bg-tertiary/40 rounded-md px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={isKO ? '컨텍스트 필터' : 'Filter context'}
            className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-tertiary outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-tertiary">
            {isKO ? '필터 결과 없음' : 'No matches'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredEntries.map(([ep, refs]) => {
              const expanded = expandedEps.has(ep);
              return (
                <li key={ep}>
                  <button
                    type="button"
                    onClick={() => toggleEpisode(ep)}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-tertiary/30 transition-colors text-left"
                    aria-expanded={expanded}
                  >
                    {expanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                    <span className="text-xs font-mono text-accent-purple">EP{ep}</span>
                    <span className="text-xs text-text-tertiary">{refs.length}{isKO ? '건' : ''}</span>
                  </button>
                  {expanded && (
                    <ul className="bg-bg-primary/40">
                      {refs.map((ref, idx) => (
                        <li key={`${ref.episodeId}-${ref.charOffset}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => dispatchGotoReference(ref)}
                            className="w-full flex items-start gap-2 px-6 py-2 hover:bg-bg-tertiary/30 text-left group"
                          >
                            <ExternalLink className="w-3 h-3 text-text-tertiary mt-0.5 group-hover:text-accent-purple flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-text-secondary leading-snug line-clamp-2">
                                …{highlightSurface(ref.context, ref.surfaceForm)}…
                              </p>
                              <p className="text-[10px] text-text-tertiary font-mono mt-0.5">
                                offset {ref.charOffset}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ReferencesPanel;
