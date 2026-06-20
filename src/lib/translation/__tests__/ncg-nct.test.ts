// ============================================================
// ncg-nct — IR 보고서 §"NCG/NCT" 본질 매핑 검증.
// ============================================================

import { runNCG, runNCT } from '../ncg-nct';

describe('NCG (pre-flight gate)', () => {
  const valid = {
    source: 'a'.repeat(200),
    srcLang: 'ko' as const,
    tgtLang: 'en' as const,
  };

  it('정상 source → pass', () => {
    const r = runNCG(valid);
    expect(r.decision).toBe('pass');
    expect(r.shouldProceed).toBe(true);
  });

  it('source 너무 짧음 (< 50) → block', () => {
    const r = runNCG({ ...valid, source: 'short' });
    expect(r.decision).toBe('block');
    expect(r.shouldProceed).toBe(false);
    expect(r.violations.find((v) => v.kind === 'source-too-short')).toBeDefined();
  });

  it('source 너무 김 (> 500K) → block', () => {
    const r = runNCG({ ...valid, source: 'a'.repeat(500_001) });
    expect(r.decision).toBe('block');
    expect(r.violations.find((v) => v.kind === 'source-too-long')).toBeDefined();
  });

  it('IP flagged term 발견 → warn', () => {
    const r = runNCG({
      ...valid,
      source: '게이트 ' + 'a'.repeat(200),
      ipFlaggedTerms: ['게이트'],
    });
    expect(r.decision).toBe('warn');
    expect(r.violations.find((v) => v.kind === 'ip-flagged-term')).toBeDefined();
  });

  it('srcLang === tgtLang → warn', () => {
    const r = runNCG({ ...valid, tgtLang: 'ko' });
    expect(r.decision).toBe('warn');
  });

  it('dual mode + glossary 비어있음 → info (block X)', () => {
    const r = runNCG({ ...valid, track: 'dual' });
    // info 만 있으면 decision='pass' (info 는 warn 격상 X)
    expect(r.decision).toBe('pass');
    expect(r.violations.some((v) => v.kind === 'glossary-empty-but-required')).toBe(true);
  });
});

describe('NCT (post-completion test)', () => {
  const ctx = {
    source: '원문 단락 1\n\n원문 단락 2',
    srcLang: 'ko' as const,
    tgtLang: 'en' as const,
  };

  it('두 결과 정상 → publish', () => {
    const r = runNCT({
      ...ctx,
      faithful: 'Faithful 1\n\nFaithful 2',
      market: 'Market 1\n\nMarket 2',
    });
    expect(r.recommendation).toBe('publish');
  });

  it('faithful fail → reject', () => {
    const r = runNCT({
      ...ctx,
      faithful: 'only one para', // 단락 수 불일치
      market: 'Market 1\n\nMarket 2',
    });
    expect(['review', 'reject']).toContain(r.recommendation);
  });

  it('glossary 누락 → review', () => {
    const r = runNCT({
      ...ctx,
      faithful: 'Faithful 1\n\nFaithful 2',
      market: 'Market 1\n\nMarket 2',
      glossary: [
        { source: 'X', target: 'Required Term', locked: true, category: 'term' },
      ],
    });
    expect(r.recommendation).toBe('review');
    expect(r.glossaryMisses.length).toBeGreaterThan(0);
  });
});
