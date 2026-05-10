"use client";
// ============================================================
// BreakpointGutter — 브레이크포인트 list 표시 + toggle.
// 본문 에디터 좌측 거터 클릭 통합은 NovelEditor 측 책임 (CustomEvent).
// ============================================================

import React from 'react';
import { Circle, CheckCircle2, Trash2 } from 'lucide-react';
import type { Breakpoint } from '@/lib/story-debugger/types';

export interface BreakpointGutterProps {
  breakpoints: Breakpoint[];
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const BreakpointGutter: React.FC<BreakpointGutterProps> = ({
  breakpoints,
  language = 'KO',
  onToggle,
  onRemove,
}) => {
  const isKO = language === 'KO';

  if (breakpoints.length === 0) {
    return (
      <div className="p-4 text-xs text-text-tertiary text-center">
        {isKO ? '거터 클릭으로 추가' : 'Click gutter to add'}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {breakpoints.map((bp) => (
        <li key={bp.id}>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-bg-tertiary/30">
            <button
              type="button"
              onClick={() => onToggle?.(bp.id)}
              className="flex-shrink-0"
              aria-label={bp.enabled ? (isKO ? '비활성화' : 'Disable') : (isKO ? '활성화' : 'Enable')}
            >
              {bp.enabled ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-red fill-current" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-text-tertiary" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-text-primary">
                EP{bp.location.episodeId} · ¶{bp.location.paragraphIdx}
              </div>
              {bp.label && <div className="text-[10px] text-text-tertiary truncate">{bp.label}</div>}
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(bp.id)}
                className="p-1 text-text-tertiary hover:text-accent-red rounded"
                aria-label={isKO ? '삭제' : 'Remove'}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
