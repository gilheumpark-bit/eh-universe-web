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

/** [Batch 1 rank 4 — 2026-06-07] useCmdPalette 옵션 — 영역별 단축키 분리. */
export interface UseCmdPaletteOptions {
  /**
   * 내부 Ctrl+P 단축키 비활성. true 면 caller 가 keyboard-manager 등으로 외부 트리거.
   * Translation Studio (Cmd+K) / Code Studio (Ctrl+K) 등 4-way 키 표준에서 사용.
   * 기본 false — 기존 Studio Ctrl+P 호출자 호환 유지.
   */
  disableInternalShortcut?: boolean;
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

export function useCmdPalette(options?: UseCmdPaletteOptions): UseCmdPaletteResult {
  const disableInternalShortcut = options?.disableInternalShortcut ?? false;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [registry, setRegistry] = useState<Record<string, CmdItem[]>>({});

  // 단축키 — Ctrl+P (Cmd+P). disableInternalShortcut 시 외부 트리거 위임 (Esc 핸들러만 유지).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      // disableInternalShortcut: Ctrl+P 트리거 스킵, Escape 닫기만 유지.
      if (disableInternalShortcut) {
        if (open && e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
          setQuery('');
        }
        return;
      }
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
  }, [open, disableInternalShortcut]);

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

  // [R-01 fix — 2026-05-12] return 객체 안정화 — caller 가 deps 에 cmdPalette 통째를 넣을 때
  // 매 렌더 새 ref 로 발산하지 않도록 useMemo. setOpen/setQuery 는 React state setter 라 stable,
  // register 는 useCallback([]) 라 stable, open/query/items/filtered 만 deps 로 충분.
  return useMemo(
    () => ({ open, setOpen, query, setQuery, items, filtered, register }),
    [open, query, items, filtered, register],
  );
}
