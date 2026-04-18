// ============================================================
// content-rating — 자가 선언 등급 + 휴리스틱 + export 라벨
// ============================================================

import {
  setRating,
  getRating,
  clearRating,
  getRecommendedRating,
  warnIfMinorAccess,
  hasConfirmedAge,
  confirmAge,
  formatRatingLabel,
  formatWarnings,
  filenamePrefix,
  buildAdultWarning,
  epubAudience,
} from '../content-rating';

describe('content-rating', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to all-ages with no warnings', () => {
    const meta = getRating('p1');
    expect(meta.rating).toBe('all');
    expect(meta.warnings).toEqual([]);
  });

  it('set/get round-trips the rating + warnings', () => {
    setRating('p1', '19+', ['sexual', 'violence']);
    const meta = getRating('p1');
    expect(meta.rating).toBe('19+');
    expect(meta.warnings.sort()).toEqual(['sexual', 'violence']);
    expect(meta.declaredAt).not.toBe('');
  });

  it('deduplicates warnings on set', () => {
    setRating('p2', '15+', ['violence', 'violence', 'language']);
    expect(getRating('p2').warnings.sort()).toEqual(['language', 'violence']);
  });

  it('clearRating removes record', () => {
    setRating('p3', '19+');
    clearRating('p3');
    expect(getRating('p3').rating).toBe('all');
  });

  it('getRecommendedRating classifies sexual content as 19+', () => {
    const text = '그녀의 알몸이 드러나며 성관계가 시작되었다.';
    expect(getRecommendedRating(text)).toBe('19+');
  });

  it('getRecommendedRating downgrades clean text to all', () => {
    expect(getRecommendedRating('평범한 아침 햇살이 창문을 비췄다.')).toBe('all');
  });

  it('warnIfMinorAccess fires only for 19+', () => {
    expect(warnIfMinorAccess('all')).toBe(false);
    expect(warnIfMinorAccess('15+')).toBe(false);
    expect(warnIfMinorAccess('19+')).toBe(true);
  });

  it('hasConfirmedAge/confirmAge toggle localStorage flag', () => {
    expect(hasConfirmedAge()).toBe(false);
    confirmAge();
    expect(hasConfirmedAge()).toBe(true);
  });

  it('formatRatingLabel returns localized strings', () => {
    expect(formatRatingLabel('19+', 'KO')).toContain('성인');
    expect(formatRatingLabel('19+', 'EN')).toContain('Adult');
  });

  it('formatWarnings joins with comma', () => {
    expect(formatWarnings(['sexual', 'violence'], 'KO')).toBe('선정성, 폭력');
    expect(formatWarnings([], 'KO')).toBe('');
  });

  it('filenamePrefix only labels 19+', () => {
    expect(filenamePrefix('all')).toBe('');
    expect(filenamePrefix('15+')).toBe('');
    expect(filenamePrefix('19+')).toBe('[19+] ');
  });

  it('buildAdultWarning is empty for non-19+', () => {
    expect(buildAdultWarning({ rating: 'all', warnings: [], declaredAt: '' }, 'KO')).toBe('');
    expect(buildAdultWarning({ rating: '15+', warnings: [], declaredAt: '' }, 'KO')).toBe('');
  });

  it('buildAdultWarning mentions 19+ for adult rating', () => {
    const msg = buildAdultWarning(
      { rating: '19+', warnings: ['violence'], declaredAt: 'now' },
      'KO',
    );
    expect(msg).toContain('19');
    expect(msg).toContain('폭력');
  });

  it('epubAudience returns Adult/Teen/Juvenile/null', () => {
    expect(epubAudience('19+')).toBe('Adult');
    expect(epubAudience('15+')).toBe('Teen');
    expect(epubAudience('12+')).toBe('Juvenile');
    expect(epubAudience('all')).toBeNull();
  });
});
