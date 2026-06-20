"use client";
// ============================================================
// CmdPaletteOverlay — Ctrl+P 명령 팔레트 UI overlay.
// useCmdPalette hook 의 state 를 받아 표시.
// 인체공학 §"마우스 의존도 감축" P0.
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import type { CmdItem, UseCmdPaletteResult } from '@/hooks/useCmdPalette';

export interface CmdPaletteOverlayProps {
  /**
   * [P0-1 — 2026-05-09] palette state 를 props 로 받음.
   * 이전 버전: 내부에서 useCmdPalette() 호출 → 새 인스턴스 생성 → 다른 register 호출 결과 미공유.
   * 수정 버전: 부모(StudioShell)가 hook 1회 호출 → overlay 와 register 호출자 모두 같은 인스턴스 공유.
   */
  palette: UseCmdPaletteResult;
  language?: 'ko' | 'en' | 'ja' | 'zh';
}

/**
 * CmdPaletteOverlay — Studio Shell 에 mount 하면 Ctrl+P 작동.
 *
 * 부모가 useCmdPalette hook 호출 + register() 로 명령 등록.
 * 본 overlay 는 open === true 시만 렌더.
 */
export function CmdPaletteOverlay({ palette, language = 'ko' }: CmdPaletteOverlayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // open 시 input focus
  useEffect(() => {
    if (palette.open) {
       
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [palette.open]);

  if (!palette.open) return null;
  const isKo = language === 'ko';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isKo ? '명령 팔레트' : 'Command palette'}
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-32 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => palette.setOpen(false)}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-xl bg-bg-secondary/95 border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 입력 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            value={palette.query}
            onChange={(e) => palette.setQuery(e.target.value)}
            placeholder={isKo ? '명령 검색…' : 'Search commands…'}
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary"
            aria-label={isKo ? '명령 검색' : 'Search commands'}
          />
          <kbd className="text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 rounded bg-bg-tertiary border border-border">
            ESC
          </kbd>
          <button
            type="button"
            onClick={() => palette.setOpen(false)}
            className="text-text-tertiary hover:text-text-primary transition-colors p-1"
            aria-label={isKo ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 결과 list */}
        <div className="max-h-96 overflow-y-auto">
          {palette.filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-text-tertiary">
              {palette.items.length === 0
                ? (isKo ? '등록된 명령이 없습니다.' : 'No commands registered.')
                : (isKo ? '일치 결과 없음' : 'No matches')}
            </div>
          ) : (
            <ul role="listbox">
              {palette.filtered.slice(0, 30).map((item) => (
                <CmdItemRow
                  key={item.id}
                  item={item}
                  language={language}
                  onSelect={() => {
                    palette.setOpen(false);
                    palette.setQuery('');
                    void item.action();
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        {/* 하단 hint */}
        <div className="px-4 py-2 border-t border-border bg-bg-tertiary/30 text-[10px] text-text-tertiary flex items-center justify-between">
          <span>{isKo ? `${palette.items.length} 명령` : `${palette.items.length} commands`}</span>
          <span className="font-mono">Ctrl+P · Cmd+P</span>
        </div>
      </div>
    </div>
  );
}

function CmdItemRow({
  item,
  language,
  onSelect,
}: {
  item: CmdItem;
  language: 'ko' | 'en' | 'ja' | 'zh';
  onSelect: () => void;
}) {
  const label = item.i18n?.[language] ?? item.label;
  return (
    // [a11y — 2026-05-10] role="option" 은 aria-selected 필수 (jsx-a11y/role-has-required-aria-props).
    // 현 컴포넌트는 키보드 활성 상태 추적 없음 — 항상 false (시각적 hover 만 표시).
    <li role="option" aria-selected={false}>
      <button
        type="button"
        onClick={onSelect}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] text-text-primary truncate">{label}</span>
          {item.category && (
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">
              {item.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.shortcut && (
            <kbd className="text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 rounded bg-bg-tertiary border border-border">
              {item.shortcut}
            </kbd>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
        </div>
      </button>
    </li>
  );
}

export default CmdPaletteOverlay;
