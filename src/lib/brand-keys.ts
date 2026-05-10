// ============================================================
// PART 1 — Module Header
// ============================================================
//
// brand-keys.ts — Loreguard 정체성 4언어 byte-level 상수.
//
// translations-{ko,en,ja,zh}.ts 가 자동 생성 파일이라 신규 키 추가가
// generator 변경을 요함 — 우회로 본 모듈 신설.
//
// 호출 패턴:
//   import { BRAND_IDENTITY, getBrandTagline } from '@/lib/brand-keys';
//   const tagline = getBrandTagline(language); // 'KO' → '소설가의 IDE'
//
// [C] byte-level 고정 — 키 변경 시 grep 검증 필수
// [G] 정적 상수 — 런타임 비용 0
// [K] 단일 책임 — 정체성 카피만
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 2 — 4언어 byte-level 상수
// ============================================================

/** 표어 — "소설가의 IDE" 4언어 */
export const BRAND_TAGLINE = {
  KO: '소설가의 IDE',
  EN: 'The IDE for Novelists',
  JP: '小説家のためのIDE',
  CN: '小说家的 IDE',
} as const;

/** 부제 — "코드처럼 검증되는 소설" 4언어 */
export const BRAND_SUBTITLE = {
  KO: '코드처럼 검증되는 소설',
  EN: 'Novels, verified like code.',
  JP: 'コードのように検証される小説',
  CN: '像代码一样被验证的小说',
} as const;

/** 카테고리 명칭 — Novel IDE */
export const BRAND_CATEGORY = {
  KO: '소설 IDE',
  EN: 'Novel IDE',
  JP: '小説 IDE',
  CN: '小说 IDE',
} as const;

/** 정체성 — "Loreguard — 소설가의 IDE" 결합 형식 */
export const BRAND_IDENTITY = {
  KO: 'Loreguard — 소설가의 IDE',
  EN: 'Loreguard — The IDE for Novelists',
  JP: 'Loreguard — 小説家のためのIDE',
  CN: 'Loreguard — 小说家的 IDE',
} as const;

/** 카테고리 레퍼런스 — VS Code / Photoshop / Logic Pro / Final Cut Pro */
export const BRAND_CATEGORY_REFS = {
  code: 'VS Code',
  design: 'Photoshop / Illustrator',
  music: 'Logic Pro',
  video: 'Final Cut Pro',
  novel: 'Loreguard',
} as const;

// ============================================================
// PART 3 — Helpers
// ============================================================

/** AppLanguage → 표어 lookup */
export function getBrandTagline(lang: AppLanguage): string {
  return BRAND_TAGLINE[lang] ?? BRAND_TAGLINE.KO;
}

export function getBrandSubtitle(lang: AppLanguage): string {
  return BRAND_SUBTITLE[lang] ?? BRAND_SUBTITLE.KO;
}

export function getBrandCategory(lang: AppLanguage): string {
  return BRAND_CATEGORY[lang] ?? BRAND_CATEGORY.KO;
}

export function getBrandIdentity(lang: AppLanguage): string {
  return BRAND_IDENTITY[lang] ?? BRAND_IDENTITY.KO;
}

/** AppLanguage → 4 키 객체 — 한 번에 받기 */
export function getBrandPack(lang: AppLanguage): {
  tagline: string;
  subtitle: string;
  category: string;
  identity: string;
} {
  return {
    tagline: getBrandTagline(lang),
    subtitle: getBrandSubtitle(lang),
    category: getBrandCategory(lang),
    identity: getBrandIdentity(lang),
  };
}
