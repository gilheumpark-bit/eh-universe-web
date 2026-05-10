"use client";
// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// SymbolOutlinePanel — 작품 전체 Symbol 트리 (좌측 사이드).
//
// 구조:
//   - 5 카테고리 그룹 (캐릭터·장소·아이템·개념·사건)
//   - 검색창 (이름·alias 부분 매치)
//   - 클릭 → Go to Definition (jumpTarget 기반 dispatch)
//
// [C] 빈 index → "정의 없음" 안내
// [G] useMemo 로 필터 결과 캐시
// [K] 가상화 X (Symbol 수 ≤ 500 가정 — 충분)
// ============================================================

import React, { useMemo, useState } from 'react';
import { Search, Users, MapPin, Package, Lightbulb, Zap, ChevronRight, ChevronDown } from 'lucide-react';
import type { SymbolIndex, SymbolKind, SymbolDefinition } from '@/lib/symbol-index/types';
import { dispatchGoToDefinition } from '@/hooks/useGoToDefinition';

// ============================================================
// PART 2 — Mappings
// ============================================================

const KIND_ORDER: SymbolKind[] = ['character', 'place', 'item', 'concept', 'event'];

const KIND_ICON: Record<SymbolKind, React.ComponentType<{ className?: string }>> = {
  character: Users,
  place: MapPin,
  item: Package,
  concept: Lightbulb,
  event: Zap,
};

const KIND_LABEL_KO: Record<SymbolKind, string> = {
  character: '캐릭터',
  place: '장소',
  item: '아이템',
  concept: '개념',
  event: '사건',
};

const KIND_LABEL_EN: Record<SymbolKind, string> = {
  character: 'Characters',
  place: 'Places',
  item: 'Items',
  concept: 'Concepts',
  event: 'Events',
};

// ============================================================
// PART 3 — Component
// ============================================================

export interface SymbolOutlinePanelProps {
  index: SymbolIndex;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const SymbolOutlinePanel: React.FC<SymbolOutlinePanelProps> = ({
  index,
  language = 'KO',
}) => {
  const [filter, setFilter] = useState('');
  const [collapsedKinds, setCollapsedKinds] = useState<Set<SymbolKind>>(new Set(['event']));
  const isKO = language === 'KO';

  /** 필터 적용 — 이름·alias 부분 매치 */
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return index.byKind;
    const out: Record<SymbolKind, SymbolDefinition[]> = {
      character: [],
      place: [],
      item: [],
      concept: [],
      event: [],
    };
    for (const kind of KIND_ORDER) {
      out[kind] = index.byKind[kind].filter((d) => {
        if (d.name.toLowerCase().includes(q)) return true;
        return d.aliases.some((a) => a.toLowerCase().includes(q));
      });
    }
    return out;
  }, [index, filter]);

  const totalDefs = index.definitions.size;

  const toggleKind = (kind: SymbolKind) => {
    setCollapsedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  const handleClick = (def: SymbolDefinition) => {
    dispatchGoToDefinition(def.id, def.jumpTarget);
  };

  return (
    <aside
      className="bg-bg-secondary border border-border rounded-xl flex flex-col overflow-hidden"
      role="navigation"
      aria-label={isKO ? 'Symbol 아웃라인' : 'Symbol Outline'}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <h3 className="text-sm font-bold text-text-primary mb-2">
          {isKO ? 'Symbol 아웃라인' : 'Symbol Outline'}
        </h3>
        <div className="flex items-center gap-2 bg-bg-tertiary/40 rounded-md px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={isKO ? '이름 검색' : 'Search names'}
            className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-tertiary outline-none"
          />
        </div>
        <p className="text-[10px] text-text-tertiary font-mono mt-2">
          {totalDefs}{isKO ? '개 Symbol' : ' symbols'}
        </p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {totalDefs === 0 ? (
          <p className="text-xs text-text-tertiary p-4 text-center">
            {isKO ? '정의된 Symbol 없음' : 'No symbols defined'}
          </p>
        ) : (
          <ul className="space-y-1">
            {KIND_ORDER.map((kind) => {
              const defs = filtered[kind];
              if (defs.length === 0) return null;
              const Icon = KIND_ICON[kind];
              const collapsed = collapsedKinds.has(kind);
              const label = isKO ? KIND_LABEL_KO[kind] : KIND_LABEL_EN[kind];
              return (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => toggleKind(kind)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-tertiary/30 text-left"
                    aria-expanded={!collapsed}
                  >
                    {collapsed ? (
                      <ChevronRight className="w-3 h-3 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-text-tertiary" />
                    )}
                    <Icon className="w-3.5 h-3.5 text-accent-purple" />
                    <span className="text-xs font-bold text-text-primary">{label}</span>
                    <span className="ml-auto text-[10px] text-text-tertiary">{defs.length}</span>
                  </button>
                  {!collapsed && (
                    <ul className="ml-5 mt-1 space-y-0.5">
                      {defs.map((def) => (
                        <li key={def.id}>
                          <button
                            type="button"
                            onClick={() => handleClick(def)}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-tertiary/30 text-left text-xs text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
                            title={def.definition}
                          >
                            <span className="truncate">{def.name}</span>
                            {def.aliases.length > 0 && (
                              <span className="text-[10px] text-text-tertiary font-mono">
                                +{def.aliases.length}
                              </span>
                            )}
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
    </aside>
  );
};

export default SymbolOutlinePanel;
