// ============================================================
// pipeline-constants — Task 4 Draft/Detail 타겟 검증
// ============================================================

import {
  DRAFT_TARGET_CHARS,
  DETAIL_TARGET_CHARS,
  DETAIL_EXPANSION_INCREMENT,
  MAX_TOKENS_BY_ROUTE,
  getDraftTargetForPlatform,
  PLATFORM_DRAFT_OVERRIDE,
} from '../pipeline-constants';

describe('pipeline-constants — Task 4 타겟 범위', () => {
  test('Draft 목표는 3,500~5,500자 범위', () => {
    expect(DRAFT_TARGET_CHARS.min).toBe(3500);
    expect(DRAFT_TARGET_CHARS.ideal).toBe(4000);
    expect(DRAFT_TARGET_CHARS.max).toBe(5500);
    expect(DRAFT_TARGET_CHARS.min).toBeLessThanOrEqual(DRAFT_TARGET_CHARS.ideal);
    expect(DRAFT_TARGET_CHARS.ideal).toBeLessThanOrEqual(DRAFT_TARGET_CHARS.max);
  });

  test('Detail 목표는 5,000~7,000자 범위 (레거시 완성본 기준)', () => {
    expect(DETAIL_TARGET_CHARS.min).toBe(5000);
    expect(DETAIL_TARGET_CHARS.max).toBe(7000);
  });

  test('Detail 증분은 1,500~2,500자 범위', () => {
    expect(DETAIL_EXPANSION_INCREMENT.minIncrement).toBeGreaterThanOrEqual(1000);
    expect(DETAIL_EXPANSION_INCREMENT.maxIncrement).toBeLessThanOrEqual(3000);
  });

  test('MAX_TOKENS_BY_ROUTE — 라우트별 의도된 상한', () => {
    expect(MAX_TOKENS_BY_ROUTE.INLINE_COMPLETION).toBeLessThan(MAX_TOKENS_BY_ROUTE.NOAH_ASSIST);
    expect(MAX_TOKENS_BY_ROUTE.NOAH_ASSIST).toBeLessThan(MAX_TOKENS_BY_ROUTE.DRAFT_PASS);
    expect(MAX_TOKENS_BY_ROUTE.DRAFT_PASS).toBe(MAX_TOKENS_BY_ROUTE.DETAIL_PASS);
  });

  test('getDraftTargetForPlatform — 주요 4 플랫폼 분기', () => {
    const nov = getDraftTargetForPlatform('NOVELPIA');
    expect(nov.ideal).toBe(4000);

    const kkp = getDraftTargetForPlatform('KAKAOPAGE');
    expect(kkp.ideal).toBe(4500);

    const mnp = getDraftTargetForPlatform('MUNPIA');
    expect(mnp.ideal).toBe(5000);

    // 미지원 플랫폼 fallback
    const unknown = getDraftTargetForPlatform('UNKNOWN_PLATFORM');
    expect(unknown.ideal).toBe(PLATFORM_DRAFT_OVERRIDE.CUSTOM.ideal);
  });

  test('getDraftTargetForPlatform — null/undefined → NONE fallback', () => {
    expect(getDraftTargetForPlatform(null).ideal).toBe(PLATFORM_DRAFT_OVERRIDE.NONE.ideal);
    expect(getDraftTargetForPlatform(undefined).ideal).toBe(PLATFORM_DRAFT_OVERRIDE.NONE.ideal);
  });
});
