"use client";
// ============================================================
// PART 1 — Module Header
// ============================================================
//
// useCmdPalette — Ctrl+P 명령 팔레트 hook.
// 인체공학 분석 §"Cmd Palette" P0:
//   마우스 의존도 70% → 30% 이하로 감축.
//
// 하는 일:
//   - Ctrl+P (or Cmd+P) 단축키 등록
//   - palette open/close state
//   - 명령 목록 register/unregister
//   - 입력 → 명령 fuzzy filter
//
// UI 컴포넌트는 별도 — 본 hook 은 state·키 등록만.
//
// [C] 입력 필드 안에서는 단축키 무시 (브라우저 기본 인쇄와 충돌)
// [C] open 시 e.preventDefault() — 브라우저 인쇄 다이얼로그 차단
// [G] 단순 fuzzy match (substring + score)
// [K] React state hook
// ============================================================

import { useEffect, useState, useCallback, useMemo } from 'react';

// ============================================================
// PART 2 — Types
// ============================================================

export interface CmdItem {
  id: string;
  label: string;
  /** 4언어 라벨 (옵션) */
  i18n?: { ko?: string; en?: string; ja?: string; zh?: string };
  /** 단축키 표시 (예: "Ctrl+S") */
  shortcut?: string;
  /** 카테고리 (예: "Navigation", "AI", "Translation") */
  category?: string;
  /** 실행 함수 */
  action: () => void | Promise<void>;
  /** 검색 가산점 키워드 */
  keywords?: string[];
}

/** [P0-1 — 2026-05-09] CmdPaletteOverlay 에 props 로 전달용 export */
export interface UseCmdPaletteResult {
  open: boolean;
  setOpen: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
  items: CmdItem[];
  filtered: CmdItem[];
  register: (items: CmdItem[]) => () => void;
}

// ============================================================
// PART 3 — Fuzzy filter
// ============================================================

function fuzzyScore(label: string, query: string): number {
  if (!query) return 1;
  const ql = query.toLowerCase();
  const ll = label.toLowerCase();
  if (ll === ql) return 100;
  if (ll.startsWith(ql)) return 90;
  if (ll.includes(ql)) return 70;
  // 모든 문자가 순서대로 등장하는지
  let i = 0;
  for (const c of ll) {
    if (c === ql[i]) i++;
    if (i >= ql.length) return 50;
  }
  return 0;
}

// ============================================================
// PART 4 — Hook
// ============================================================

export function useCmdPalette(): UseCmdPaletteResult {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [registry, setRegistry] = useState<Record<string, CmdItem[]>>({});

  // 단축키 — Ctrl+P (Cmd+P)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // 입력 필드 안에서는 무시 (textarea / input / contenteditable)
      const target = e.target as HTMLElement | null;
      const inEditor =
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.isContentEditable);

      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'p') {
        if (inEditor) {
          // 인쇄 다이얼로그 막기 (작가 명령 팔레트 우선)
          e.preventDefault();
          setOpen(true);
          return;
        }
        e.preventDefault();
        setOpen(true);
      }
      if (open && e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const register = useCallback((newItems: CmdItem[]): (() => void) => {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setRegistry((prev) => ({ ...prev, [groupId]: newItems }));
    return () => {
      setRegistry((prev) => {
        const { [groupId]: _, ...rest } = prev;
        return rest;
      });
    };
  }, []);

  const items = useMemo(() => {
    const all: CmdItem[] = [];
    Object.values(registry).forEach((group) => all.push(...group));
    return all;
  }, [registry]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map((item) => ({ item, score: fuzzyScore(item.label, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [items, query]);

  return { open, setOpen, query, setQuery, items, filtered, register };
}
