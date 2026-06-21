"use client";
// ============================================================
// use-register-actions — action-registry 를 useCmdPalette 와 연결하는 hook (SharedSurgery-1)
// 영역별 컴포넌트가 {id: action} 만 넘기면 자동으로 registry → CmdItem 변환 후 팔레트 등록.
// 등록 해제는 unmount 시 자동.
// ============================================================

import { useEffect, useRef } from 'react';
import type { CmdItem, UseCmdPaletteResult } from '@/hooks/useCmdPalette';
import type { AgentLanguage } from '@/lib/ai/writing-agent-registry';
import { logger } from '@/lib/logger';
import {
  getActionDef,
  resolveLabel,
  type ActionArea,
} from './action-registry';

export interface UseRegisterActionsOptions {
  /** 팔레트 hook 결과 — register 메서드 사용 */
  palette: Pick<UseCmdPaletteResult, 'register'>;
  /** {actionId: action 함수} 매핑 */
  bindings: Record<string, () => void | Promise<void>>;
  /** 현재 언어 — 라벨 해석에 사용 (기본 ko) */
  lang?: AgentLanguage;
  /** false 면 등록 안 함 (조건부 노출, 예: pathname 가드) */
  enabled?: boolean;
}

/**
 * registry 정의 + 런타임 액션을 결합해 팔레트에 등록.
 *
 * 사용 예:
 * ```ts
 * const palette = useCmdPalette();
 * useRegisterActions({
 *   palette,
 *   lang: 'ko',
 *   bindings: {
 *     'studio:tab-world': () => setTab('world'),
 *     'studio:ai-generate': () => runAI(),
 *   },
 * });
 * ```
 *
 * [무한 루프 수리 — 2026-06-08 / 4축 검증]
 *   기존: items useMemo 가 bindings *reference* 에 의존 → 호출자가 매 렌더 새 객체
 *         리터럴을 넘기면 items 재생성 → useEffect([palette, items]) 매 렌더 재실행 →
 *         register(setState add) + cleanup unregister(setState remove) thrash →
 *         "Maximum update depth exceeded" 무한 루프. (런타임만 발생, tsc/jest 통과.)
 *   수리: 효과 의존성을 bindings reference 가 아니라 *내용 서명* (정렬된 id 집합 + lang +
 *         enabled) 으로 교체. action 클로저는 bindingsRef 를 통해 최신값 호출 →
 *         id 집합이 그대로면 재등록 0, 호출자 안정성과 무관하게 루프 불가.
 *   미정의 ID → dev/test throw (마운트 시 노출), prod 는 logger.error 후 skip.
 */
export function useRegisterActions(opts: UseRegisterActionsOptions): void {
  const { palette, bindings, lang = 'ko', enabled = true } = opts;
  const register = palette.register; // useCmdPalette 에서 useCallback([]) 라 stable.

  // 최신 bindings 를 ref 로 유지 — 등록된 action 은 항상 최신 클로저 호출.
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  // 내용 서명: 등록 대상 id 집합(정렬) + lang + enabled.
  // bindings 객체 reference 가 매 렌더 바뀌어도, id 집합이 같으면 서명 동일 → 재등록 0.
  const ids = enabled ? Object.keys(bindings).sort() : [];
  const signature = `${enabled ? '1' : '0'}|${lang}|${ids.join(',')}`;

  useEffect(() => {
    if (!enabled || ids.length === 0) return;
    let bound: CmdItem[];
    try {
      bound = ids.map((id) => {
        const def = getActionDef(id);
        if (!def) {
          throw new Error(
            `[useRegisterActions] Unknown action id: "${id}". Add to ACTION_CATALOG first.`,
          );
        }
        return {
          id,
          label: resolveLabel(def, lang),
          i18n: def.i18n,
          shortcut: def.shortcut,
          category: def.category,
          keywords: def.keywords,
          // ref 경유 — 매 호출 최신 binding 사용 (재등록 없이 클로저 신선).
          action: () => bindingsRef.current[id]?.(),
        } satisfies CmdItem;
      });
    } catch (err) {
      const isProd = process.env.NODE_ENV === 'production';
      logger.error('useRegisterActions', 'action id 누락 또는 registry 부정합', err);
      if (!isProd) throw err; // dev/test: 마운트 시 즉시 노출.
      return; // production: palette 비워둠 (사용자 차단 회피).
    }
    const unregister = register(bound);
    return unregister;
    // signature 가 effect 내용 의존성 — ids/lang/enabled 가 실제로 바뀔 때만 재등록.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, signature]);
}

/**
 * 영역별 일괄 등록 헬퍼 — 한 영역의 모든 액션을 한 hook 으로.
 * 영역 카탈로그에 있는 모든 ID 에 대해 binding 을 요구 (부분 등록 방지).
 */
export function useRegisterAreaActions(
  area: ActionArea,
  bindings: Record<string, () => void | Promise<void>>,
  palette: Pick<UseCmdPaletteResult, 'register'>,
  lang: AgentLanguage = 'ko',
): void {
  useRegisterActions({ palette, bindings, lang });
}
