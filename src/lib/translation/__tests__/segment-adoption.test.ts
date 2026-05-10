// ============================================================
// segment-adoption — 시장 분석 4차 §8 §11 번역가 워크플로 logic.
// ============================================================

import {
  buildSegments,
  setSegmentAction,
  finalizeSegments,
  summarizeAdoption,
} from '../segment-adoption';

describe('segment-adoption', () => {
  const SOURCE = '원문 단락 1\n\n원문 단락 2\n\n원문 단락 3';
  const FAITHFUL = 'Faithful para 1\n\nFaithful para 2\n\nFaithful para 3';
  const MARKET = 'Market para 1\n\nMarket para 2\n\nMarket para 3';

  it('buildSegments — 3 단락 → 3 segment 생성', () => {
    const segs = buildSegments(SOURCE, FAITHFUL, MARKET);
    expect(segs).toHaveLength(3);
    expect(segs[0].source).toBe('원문 단락 1');
    expect(segs[0].faithful).toBe('Faithful para 1');
    expect(segs[0].market).toBe('Market para 1');
    expect(segs[0].action).toBe('pending');
  });

  it('단락 수 불일치 — max 기준 정렬', () => {
    const shorterFaithful = 'Faithful 1';
    const segs = buildSegments(SOURCE, shorterFaithful, MARKET);
    expect(segs).toHaveLength(3);
    expect(segs[1].faithful).toBe(null);
    expect(segs[1].market).toBe('Market para 2');
  });

  it('faithful 또는 market 결여도 build 가능', () => {
    const onlyFaithful = buildSegments(SOURCE, FAITHFUL, null);
    expect(onlyFaithful[0].faithful).toBe('Faithful para 1');
    expect(onlyFaithful[0].market).toBe(null);
  });

  it('setSegmentAction — immutable 갱신', () => {
    const segs = buildSegments(SOURCE, FAITHFUL, MARKET);
    const next = setSegmentAction(segs, 1, 'market');
    expect(next[1].action).toBe('market');
    expect(segs[1].action).toBe('pending'); // 원본 불변
    expect(next[0].action).toBe('pending');
  });

  it('finalizeSegments — 채택 결과 → 최종 본문', () => {
    let segs = buildSegments(SOURCE, FAITHFUL, MARKET);
    segs = setSegmentAction(segs, 0, 'faithful');
    segs = setSegmentAction(segs, 1, 'market');
    segs = setSegmentAction(segs, 2, 'manual', { manualText: '직접 편집한 단락' });
    const final = finalizeSegments(segs);
    expect(final).toContain('Faithful para 1');
    expect(final).toContain('Market para 2');
    expect(final).toContain('직접 편집한 단락');
  });

  it('summarizeAdoption — 채택 통계', () => {
    let segs = buildSegments(SOURCE, FAITHFUL, MARKET);
    segs = setSegmentAction(segs, 0, 'faithful');
    segs = setSegmentAction(segs, 1, 'market');
    // 2번 segment는 pending
    const stats = summarizeAdoption(segs);
    expect(stats.total).toBe(3);
    expect(stats.faithful).toBe(1);
    expect(stats.market).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.completionRate).toBeCloseTo(2 / 3, 2);
  });

  it('finalize 시 pending 은 market → faithful 순 fallback', () => {
    const segs = buildSegments(SOURCE, FAITHFUL, MARKET);
    // 모두 pending
    const final = finalizeSegments(segs);
    // market 가 채택 (fallback)
    expect(final).toContain('Market para 1');
  });
});
