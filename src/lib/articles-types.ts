// ============================================================
// articles-types.ts — ArticleData type 격리.
//
// [2026-05-09] 순환 의존성 회피.
// 이전: articles-core/timeline/factions/technology/geography/military/classified/reports
//        모두 `import type { ArticleData } from './articles'` — 순환 (madge 8건).
// 수정: type 만 본 모듈에서 export — articles.ts 는 본 모듈을 re-export.
// ============================================================

export type ArticleData = {
  title: { ko: string; en: string; ja?: string; zh?: string };
  level: string;
  category: string;
  content: { ko: string; en: string; ja?: string; zh?: string };
  image?: string;
  related?: string[];
};
