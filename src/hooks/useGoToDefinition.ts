"use client";
// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// useGoToDefinition — F12 단축키로 Symbol 정의 점프.
//
// 동작:
//   1. 본문 에디터에서 캐럿(또는 선택 텍스트) 위치 단어 추출
//   2. SymbolIndex.surfaceMap 조회
//   3. jumpTarget.tab 기반 CustomEvent 디스패치 ('noa:goto-definition')
//   4. StudioShell 등 상위에서 listener 가 탭 전환
//
// [C] index 비어있으면 no-op / 윈도우 없으면 SSR 가드
// [G] 단축키 핸들러 1개만 등록, cleanup
// [K] 직접 라우팅 X — CustomEvent 로 분리 (테스트 가능)
// ============================================================

import { useEffect, useCallback } from 'react';
import type { SymbolIndex, FindDefinitionResult } from '@/lib/symbol-index/types';
import { findDefinitionBySurface } from '@/lib/symbol-index/find-definition';

// ============================================================
// PART 2 — Selection helpers
// ============================================================

/** 현재 window.getSelection 의 선택 문자열 (없으면 빈 문자열) */
function getCurrentSelection(): string {
  if (typeof window === 'undefined') return '';
  const sel = window.getSelection();
  if (!sel) return '';
  return sel.toString().trim();
}

// ============================================================
// PART 3 — Hook
// ============================================================

export interface GoToDefinitionResult extends FindDefinitionResult {
  surface: string;
}

/**
 * F12 단축키 등록 + 프로그램틱 trigger 함수 반환.
 *
 * @param index 현재 SymbolIndex
 * @param onResult 점프 결과 핸들러 (UI 측 구현 — Tab 전환·alert 등)
 */
export function useGoToDefinition(
  index: SymbolIndex,
  onResult: (result: GoToDefinitionResult) => void,
): { triggerGoToDefinition: (surface: string) => void } {
  /** 단어 → 정의 lookup → onResult 호출 */
  const trigger = useCallback(
    (surface: string) => {
      const trimmed = surface.trim();
      if (!trimmed) {
        onResult({ found: false, surface: '' });
        return;
      }
      const result = findDefinitionBySurface(trimmed, index);
      onResult({ ...result, surface: trimmed });
    },
    [index, onResult],
  );

  /** F12 글로벌 listener */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F12' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // 브라우저 DevTools F12 와 충돌 — preventDefault X (사용자가 IDE F12 선호 시 별도 정책)
        // 현재는 선택 텍스트가 있을 때만 우선 처리
        const sel = getCurrentSelection();
        if (sel) {
          e.preventDefault();
          trigger(sel);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [trigger]);

  return { triggerGoToDefinition: trigger };
}

// ============================================================
// PART 4 — CustomEvent helper (StudioShell 측 listener 정합)
// ============================================================

/** 'noa:goto-definition' CustomEvent dispatch — UI 라우터 구독 */
export function dispatchGoToDefinition(symbolId: string, jumpTarget: { tab: string; subId?: string }): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('noa:goto-definition', {
      detail: { symbolId, jumpTarget },
    }),
  );
}
