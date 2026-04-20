// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// useEpisodeTransition — 에피소드 간 연결 제안 훅.
// 이전 화 클리프 → 다음 화 훅 / 복선 회수 / 텐션 연속성을 자동 감지.
// 작가 확인 후에만 적용 — 자동 주입 절대 금지(M3 원칙 #4).
//
// 입력: currentEpisode + episodeSceneSheets (화별 SceneDirectionData snapshot)
// 출력: suggestions 배열 + apply / dismiss 함수
//
// [C] N-1 화 없으면 빈 배열, 잘못된 데이터 방어
// [G] useMemo로 suggestions 캐시
// [K] dismiss 상태는 sessionStorage(휘발) — 영속화 미필요

import { useCallback, useMemo, useState } from 'react';
import type { SceneDirectionData } from '@/lib/studio-types';

// ============================================================
// PART 2 — Type definitions
// ============================================================

export type TransitionReason =
  | 'cliff-to-hook'        // 전 화 클리프 → 이번 화 훅
  | 'foreshadow-payoff'    // 전 화 복선 → 이번 화 회수 후보
  | 'tension-continuity';  // 텐션 곡선 연속성

export interface TransitionSuggestion {
  id: string;
  fromEpisode: number;
  toEpisode: number;
  field: keyof SceneDirectionData;
  previousValue: unknown;
  suggestedValue: unknown;
  reason: TransitionReason;
  reasonText: { ko: string; en: string; ja: string; zh: string };
}

export interface UseEpisodeTransitionOptions {
  currentEpisode: number;
  episodeSceneSheets: Record<number, SceneDirectionData>;
}

export interface UseEpisodeTransitionResult {
  suggestions: TransitionSuggestion[];
  /** 적용 — 호출자가 sceneDirection 업데이트 책임. 반환값을 머지하면 됨. */
  apply: (suggestionId: string) => Partial<SceneDirectionData> | null;
  /** 무시 — 화면에서만 제거(다음 마운트 시 재나타남). */
  dismiss: (suggestionId: string) => void;
  /** 모든 제안 무시 (한 번에 닫기) */
  dismissAll: () => void;
}

// ============================================================
// PART 3 — Suggestion builders (pure functions, testable)
// ============================================================

/**
 * 이전 화 클리프 → 이번 화 오프닝 훅 제안.
 */
export function buildCliffToHookSuggestion(
  prevEp: number,
  currentEp: number,
  prevSheet: SceneDirectionData,
  currentSheet: SceneDirectionData
): TransitionSuggestion | null {
  const prevCliff = prevSheet.cliffhanger;
  if (!prevCliff || !prevCliff.desc) return null;

  // 이미 오프닝 훅이 있으면 제안 안 함(중복 방지)
  const hasOpeningHook = (currentSheet.hooks ?? []).some(h => h.position === 'opening');
  if (hasOpeningHook) return null;

  return {
    id: `cliff-to-hook-${prevEp}-${currentEp}`,
    fromEpisode: prevEp,
    toEpisode: currentEp,
    field: 'hooks',
    previousValue: prevCliff,
    suggestedValue: [
      ...(currentSheet.hooks ?? []),
      {
        position: 'opening',
        hookType: prevCliff.cliffType || 'shock',
        desc: `${prevEp}화 클리프 회수: ${prevCliff.desc}`,
      },
    ],
    reason: 'cliff-to-hook',
    reasonText: {
      ko: `${prevEp}화 클리프를 ${currentEp}화 오프닝 훅으로`,
      en: `Episode ${prevEp} cliff → Episode ${currentEp} opening hook`,
      ja: `${prevEp}話のクリフを${currentEp}話のオープニングフックへ`,
      zh: `${prevEp}话悬念 → ${currentEp}话开场钩`,
    },
  };
}

/**
 * 미회수 복선 → 회수 후보 제안.
 * prevSheet의 미회수 foreshadows 중 첫 번째를 추천.
 */
export function buildForeshadowSuggestion(
  prevEp: number,
  currentEp: number,
  prevSheet: SceneDirectionData,
  currentSheet: SceneDirectionData
): TransitionSuggestion | null {
  const unresolved = (prevSheet.foreshadows ?? []).filter(f => !f.resolved);
  if (unresolved.length === 0) return null;
  const target = unresolved[0];

  // 이번 화 foreshadows에 같은 planted가 이미 있으면 스킵
  const exists = (currentSheet.foreshadows ?? []).some(f => f.planted === target.planted);
  if (exists) return null;

  return {
    id: `foreshadow-${prevEp}-${currentEp}-${target.planted.slice(0, 20)}`,
    fromEpisode: prevEp,
    toEpisode: currentEp,
    field: 'foreshadows',
    previousValue: target,
    suggestedValue: [
      ...(currentSheet.foreshadows ?? []),
      { ...target, episode: currentEp, resolved: false },
    ],
    reason: 'foreshadow-payoff',
    reasonText: {
      ko: `미회수 복선 "${target.planted.slice(0, 30)}" 회수 후보`,
      en: `Unresolved foreshadow "${target.planted.slice(0, 30)}" payoff candidate`,
      ja: `未回収伏線 "${target.planted.slice(0, 30)}" 回収候補`,
      zh: `未回收伏笔 "${target.planted.slice(0, 30)}" 回收候选`,
    },
  };
}

/**
 * 텐션 곡선 연속성 — 이전 화 마지막 텐션 레벨 → 이번 화 첫 점.
 */
export function buildTensionContinuitySuggestion(
  prevEp: number,
  currentEp: number,
  prevSheet: SceneDirectionData,
  currentSheet: SceneDirectionData
): TransitionSuggestion | null {
  const prevCurve = prevSheet.tensionCurve ?? [];
  if (prevCurve.length === 0) return null;

  // 이번 화에 이미 텐션 곡선이 있으면 스킵
  if ((currentSheet.tensionCurve ?? []).length > 0) return null;

  const lastPoint = prevCurve[prevCurve.length - 1];
  if (!lastPoint) return null;

  // 연속성: 약간 낮춰서 시작 (텐션 회복 자연스러움)
  const startLevel = Math.max(20, lastPoint.level - 15);

  return {
    id: `tension-continuity-${prevEp}-${currentEp}`,
    fromEpisode: prevEp,
    toEpisode: currentEp,
    field: 'tensionCurve',
    previousValue: lastPoint,
    suggestedValue: [
      { position: 0, level: startLevel, label: `${prevEp}화 연결` },
    ],
    reason: 'tension-continuity',
    reasonText: {
      ko: `${prevEp}화 마지막 텐션(${lastPoint.level}%)을 ${currentEp}화 시작점에`,
      en: `Episode ${prevEp} final tension (${lastPoint.level}%) → Episode ${currentEp} start`,
      ja: `${prevEp}話の最終テンション(${lastPoint.level}%)を${currentEp}話の開始点に`,
      zh: `${prevEp}话最终紧张度 (${lastPoint.level}%) → ${currentEp}话起始点`,
    },
  };
}

/**
 * 모든 제안 빌더를 호출하여 suggestions 배열 생성.
 */
export function buildAllSuggestions(
  currentEpisode: number,
  episodeSheets: Record<number, SceneDirectionData>
): TransitionSuggestion[] {
  if (currentEpisode <= 1) return [];
  const prevEp = currentEpisode - 1;
  const prevSheet = episodeSheets[prevEp];
  const currentSheet = episodeSheets[currentEpisode] ?? {};
  if (!prevSheet) return [];

  const builders = [
    buildCliffToHookSuggestion,
    buildForeshadowSuggestion,
    buildTensionContinuitySuggestion,
  ];

  const result: TransitionSuggestion[] = [];
  for (const builder of builders) {
    const suggestion = builder(prevEp, currentEpisode, prevSheet, currentSheet);
    if (suggestion) result.push(suggestion);
  }
  return result;
}

// ============================================================
// PART 4 — Hook
// ============================================================

export function useEpisodeTransition(
  options: UseEpisodeTransitionOptions
): UseEpisodeTransitionResult {
  const { currentEpisode, episodeSceneSheets } = options;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const allSuggestions = useMemo(
    () => buildAllSuggestions(currentEpisode, episodeSceneSheets),
    [currentEpisode, episodeSceneSheets]
  );

  const suggestions = useMemo(
    () => allSuggestions.filter(s => !dismissedIds.has(s.id)),
    [allSuggestions, dismissedIds]
  );

  const apply = useCallback(
    (suggestionId: string): Partial<SceneDirectionData> | null => {
      const s = allSuggestions.find(x => x.id === suggestionId);
      if (!s) return null;
      // 적용 후 자동 dismiss
      setDismissedIds(prev => new Set(prev).add(suggestionId));
      return { [s.field]: s.suggestedValue } as Partial<SceneDirectionData>;
    },
    [allSuggestions]
  );

  const dismiss = useCallback((suggestionId: string) => {
    setDismissedIds(prev => new Set(prev).add(suggestionId));
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds(new Set(allSuggestions.map(s => s.id)));
  }, [allSuggestions]);

  return { suggestions, apply, dismiss, dismissAll };
}

// IDENTITY_SEAL: useEpisodeTransition | role=transition suggestion hook | inputs=options | outputs=hook result
