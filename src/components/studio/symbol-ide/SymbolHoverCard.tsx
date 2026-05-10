"use client";
// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// SymbolHoverCard — 본문 hover 시 Symbol Quick Info 표시.
//
// 표시 내용:
//   - Symbol 이름 + kind 아이콘
//   - definition (요약)
//   - 캐릭터 한정: 말투 시그니처 (speechStyle 80자)
//   - 최근 5화 등장 + 총 등장 횟수
//   - "정의로 이동" 버튼 (F12 동등)
//
// [C] hoverInfo null → null 반환 (렌더 X)
// [G] 메모이제이션 단순 — props 적음
// [K] 코드 IDE Quick Info 패널과 동일한 정보 밀도
// ============================================================

import React from 'react';
import { Users, MapPin, Package, Lightbulb, Zap } from 'lucide-react';
import type { HoverInfo, SymbolKind } from '@/lib/symbol-index/types';
import { dispatchGoToDefinition } from '@/hooks/useGoToDefinition';

// ============================================================
// PART 2 — Icon mapping
// ============================================================

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
  character: 'Character',
  place: 'Place',
  item: 'Item',
  concept: 'Concept',
  event: 'Event',
};

// ============================================================
// PART 3 — Component
// ============================================================

export interface SymbolHoverCardProps {
  hoverInfo: HoverInfo | null;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  /** 위치 (px) — 부모가 hover 좌표 계산 후 주입 */
  position?: { x: number; y: number };
  onClose?: () => void;
}

export const SymbolHoverCard: React.FC<SymbolHoverCardProps> = ({
  hoverInfo,
  language = 'KO',
  position,
  onClose,
}) => {
  if (!hoverInfo) return null;
  const { symbol, recentEpisodes, totalReferences, speechSignature } = hoverInfo;
  const Icon = KIND_ICON[symbol.kind];
  const isKO = language === 'KO';
  const kindLabel = isKO ? KIND_LABEL_KO[symbol.kind] : KIND_LABEL_EN[symbol.kind];

  const handleGoToDef = () => {
    dispatchGoToDefinition(symbol.id, symbol.jumpTarget);
    onClose?.();
  };

  const style: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y, zIndex: 50 }
    : {};

  return (
    <div
      style={style}
      className="w-[320px] bg-bg-secondary border border-border rounded-xl shadow-2xl p-4 backdrop-blur-sm"
      role="tooltip"
      aria-label={`${kindLabel}: ${symbol.name}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-accent-purple" />
        <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
          {kindLabel}
        </span>
        <span className="ml-auto text-xs text-text-tertiary">
          {totalReferences}{isKO ? '회' : 'x'}
        </span>
      </div>

      {/* Name */}
      <h3 className="text-base font-bold text-text-primary mb-2">{symbol.name}</h3>

      {/* Definition */}
      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-3">
        {symbol.definition}
      </p>

      {/* Speech signature (character only) */}
      {speechSignature && (
        <div className="mb-3 p-2 bg-bg-tertiary/40 rounded-md border border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
            {isKO ? '말투 시그니처' : 'Voice Signature'}
          </div>
          <p className="text-xs text-text-secondary italic">{speechSignature}</p>
        </div>
      )}

      {/* Recent episodes */}
      {recentEpisodes.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
            {isKO ? '최근 등장' : 'Recent'}
          </div>
          <div className="flex flex-wrap gap-1">
            {recentEpisodes.map((ep) => (
              <span
                key={ep}
                className="px-2 py-0.5 text-[10px] bg-accent-purple/15 text-accent-purple rounded font-mono"
              >
                EP{ep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <button
        type="button"
        onClick={handleGoToDef}
        className="w-full py-2 text-xs font-bold uppercase tracking-wider bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
      >
        {isKO ? '정의로 이동 (F12)' : 'Go to Definition (F12)'}
      </button>
    </div>
  );
};

export default SymbolHoverCard;
