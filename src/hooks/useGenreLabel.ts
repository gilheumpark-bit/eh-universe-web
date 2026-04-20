"use client";

/**
 * M5 Genre Translation Layer — useGenreLabel hook.
 *
 * 현재 언어(LangContext)와 명시적으로 전달된 genreMode를 결합해
 * LabelKey → GenreLabel 조회 함수를 반환한다.
 *
 * 설계 결정:
 *   - genreMode는 호출자가 넘긴다 (StoryConfig는 프로젝트별이라 hook 내부
 *     에서 단일 소스로 잡기 애매함). undefined면 'novel'로 폴백.
 *   - lang은 전역 LangContext에서 읽는다 — 이미 SceneSheet 등에서 이 컨텍스트
 *     를 사용중.
 *   - useMemo로 (mode, lang) 페어마다 반환 함수를 메모이즈 — 리렌더마다
 *     재생성되지 않는다.
 *   - formatted 편의 헬퍼도 같이 반환 (formatLabel(entry, lang) 래핑).
 *
 * @example
 *   const { getLabel, formatted } = useGenreLabel(config.genreMode);
 *   const gogumaEntry = getLabel('goguma');    // GenreLabel
 *   const display = formatted('goguma');        // '갈등 밀도 (고구마)' (webtoon+ko)
 */

import { useMemo } from 'react';
import { useLang } from '@/lib/LangContext';
import {
  getGenreLabel,
  formatLabel,
  type GenreLabel,
  type GenreMode,
  type LabelKey,
} from '@/lib/genre-labels';

// ============================================================
// PART 1 — Hook
// ============================================================

export interface UseGenreLabelResult {
  /** (key) → GenreLabel 엔트리 조회 */
  getLabel: (key: LabelKey) => GenreLabel;
  /** (key) → 언어/장르 맞게 포매팅된 문자열 (한국어 웹툰일 때만 괄호 병기) */
  formatted: (key: LabelKey) => string;
  /** 실제 사용 중인 장르 모드 (undefined → 'novel'로 해석된 결과) */
  mode: GenreMode;
}

/**
 * 현재 LangContext 언어 + 전달된 genreMode 로 장르 라벨 조회기를 생성.
 *
 * @param genreMode - StoryConfig.genreMode (없으면 'novel'로 폴백)
 * @returns getLabel / formatted / mode
 */
export function useGenreLabel(genreMode: GenreMode | undefined): UseGenreLabelResult {
  const { lang } = useLang();
  const mode: GenreMode = genreMode ?? 'novel';

  return useMemo(() => {
    const getLabel = (key: LabelKey): GenreLabel => getGenreLabel(mode, key, lang);
    const formatted = (key: LabelKey): string => formatLabel(getLabel(key), lang);
    return { getLabel, formatted, mode };
  }, [mode, lang]);
}
