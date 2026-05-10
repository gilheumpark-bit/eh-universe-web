"use client";
// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// useSymbolShortcuts — Symbol IDE 전용 글로벌 단축키.
//
// 등록 키:
//   - Shift+F12  → Find All References
//   - Ctrl+T     → Symbol Quick Jump (Ctrl+K 와 충돌 회피용 별도 키)
//   - Ctrl+Shift+O → Symbol Outline 토글
//
// useStudioKeyboard 와 격리 — 기존 단축키 정합성 유지.
// useGoToDefinition (F12) 와 분리 — Symbol Quick Jump / Find Refs 만 처리.
//
// [C] SSR 가드 / 핸들러 미주입 시 no-op
// [G] 단일 listener 등록 + cleanup
// [K] Ctrl+T 는 브라우저 새 탭 단축키 — preventDefault 명시 (Studio 진입 시 IDE 우선)
// ============================================================

import { useEffect } from 'react';

// ============================================================
// PART 2 — Hook
// ============================================================

export interface UseSymbolShortcutsOptions {
  /** Shift+F12 — 현재 선택 텍스트의 모든 참조 검색 */
  onFindAllReferences?: (selection: string) => void;
  /** Ctrl+T — Symbol Quick Jump 모달 오픈 */
  onSymbolQuickJump?: () => void;
  /** Ctrl+Shift+O — Symbol Outline 토글 */
  onToggleSymbolOutline?: () => void;
  /** true 면 모든 단축키 비활성 (모달·텍스트 입력 시) */
  disabled?: boolean;
}

export function useSymbolShortcuts(opts: UseSymbolShortcutsOptions): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (opts.disabled) return;

    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Shift+F12 → Find All References (텍스트 선택 필요)
      if (e.key === 'F12' && shift) {
        if (!opts.onFindAllReferences) return;
        const sel = window.getSelection()?.toString().trim() ?? '';
        if (!sel) return;
        e.preventDefault();
        opts.onFindAllReferences(sel);
        return;
      }

      // Ctrl+T → Symbol Quick Jump
      if (ctrl && !shift && e.key.toLowerCase() === 't') {
        if (!opts.onSymbolQuickJump) return;
        e.preventDefault(); // 브라우저 새 탭 차단
        opts.onSymbolQuickJump();
        return;
      }

      // Ctrl+Shift+O → Outline 토글
      if (ctrl && shift && e.key.toLowerCase() === 'o') {
        if (!opts.onToggleSymbolOutline) return;
        e.preventDefault();
        opts.onToggleSymbolOutline();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts]);
}
