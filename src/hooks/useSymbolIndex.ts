"use client";
// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// useSymbolIndex — Symbol Table 빌드/캐시 React 훅.
//
// 정책:
//   - manuscript hash 변경 시점에만 재빌드 (그 외 useMemo cache 유지)
//   - SSR 안전 (typeof window 가드 불필요 — 순수 데이터 처리)
//
// [C] config 또는 episodes null/undefined → empty index
// [G] useMemo dependency = [config, episodes] — episodes hash 만 변경되면 재빌드
// [K] 단일 책임 — 빌드만. find-* 는 별도 호출
// ============================================================

import { useMemo } from 'react';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import type { SymbolIndex } from '@/lib/symbol-index/types';
import { buildSymbolIndex, createEmptyIndex } from '@/lib/symbol-index/builder';

// ============================================================
// PART 2 — Hook
// ============================================================

/**
 * 작품 데이터 → SymbolIndex.
 *
 * @param config StoryConfig (캐릭터·아이템·스킬·월드)
 * @param episodes 본문 (manuscript hash 산출용)
 * @returns SymbolIndex — useMemo 캐시
 */
export function useSymbolIndex(
  config: StoryConfig | null | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
): SymbolIndex {
  return useMemo(() => {
    if (!config) return createEmptyIndex();
    return buildSymbolIndex(config, episodes ?? []);
    // [C] dependency: config 객체 ref 변경 + episodes 배열 ref 변경 시 재빌드
    // 깊은 비교는 비용 — 호출 측이 immutable 패턴 (setConfig spread) 사용 가정
  }, [config, episodes]);
}
