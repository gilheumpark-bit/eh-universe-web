/**
 * safety-registry.test.ts (2026-05-10 — I-07 / G-test 검증)
 */

import {
  getSafetyGuard,
  buildSafetyEnhancedPrompt,
  listPrismLevels,
  isPrismLevel,
  PRISM_LABELS,
} from '../safety-registry';

describe('safety-registry — getSafetyGuard', () => {
  it('all-ages 가드 본문', () => {
    const g = getSafetyGuard('all-ages');
    expect(g).toContain('PRISM ALL-AGES');
    expect(g).toContain('inappropriate');
  });

  it('teen-15 가드 본문', () => {
    const g = getSafetyGuard('teen-15');
    expect(g).toContain('PRISM TEEN 15+');
  });

  it('mature-18 가드 본문', () => {
    const g = getSafetyGuard('mature-18');
    expect(g).toContain('PRISM MATURE 18+');
  });
});

describe('safety-registry — buildSafetyEnhancedPrompt', () => {
  it('base prompt 끝에 가드 첨부', () => {
    const result = buildSafetyEnhancedPrompt('You are a writer.', 'all-ages');
    expect(result).toContain('You are a writer.');
    expect(result).toContain('PRISM ALL-AGES');
    expect(result.indexOf('You are a writer.')).toBeLessThan(result.indexOf('PRISM ALL-AGES'));
  });

  it('이미 같은 등급 가드 박혀 있으면 dedup', () => {
    const base = 'You are a writer.\n\n[PRISM ALL-AGES] existing guard.';
    const result = buildSafetyEnhancedPrompt(base, 'all-ages');
    expect(result).toBe(base); // unchanged
  });

  it('다른 등급은 추가 (dedup X)', () => {
    const base = 'You are a writer.\n\n[PRISM ALL-AGES] existing.';
    const result = buildSafetyEnhancedPrompt(base, 'mature-18');
    expect(result).toContain('PRISM ALL-AGES');
    expect(result).toContain('PRISM MATURE 18+');
  });
});

describe('safety-registry — listPrismLevels / isPrismLevel', () => {
  it('listPrismLevels 3개', () => {
    expect(listPrismLevels()).toEqual(['all-ages', 'teen-15', 'mature-18']);
  });

  it('isPrismLevel 검증', () => {
    expect(isPrismLevel('all-ages')).toBe(true);
    expect(isPrismLevel('teen-15')).toBe(true);
    expect(isPrismLevel('mature-18')).toBe(true);
    expect(isPrismLevel('XX')).toBe(false);
    expect(isPrismLevel('')).toBe(false);
    expect(isPrismLevel(null)).toBe(false);
    expect(isPrismLevel(123)).toBe(false);
  });
});

describe('safety-registry — PRISM_LABELS 4언어', () => {
  it('4언어 × 3 level 모두 정의', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      for (const level of ['all-ages', 'teen-15', 'mature-18'] as const) {
        const label = PRISM_LABELS[lang][level];
        expect(label).toBeDefined();
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('한국어 라벨', () => {
    expect(PRISM_LABELS.ko['all-ages']).toBe('전체이용가');
    expect(PRISM_LABELS.ko['teen-15']).toContain('15');
    expect(PRISM_LABELS.ko['mature-18']).toContain('18');
  });
});
