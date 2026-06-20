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
  derivRatingFromPrism,
  getEffectiveRating,
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

// ============================================================
// derivRatingFromPrism — prismMode → ContentRating 매핑
// ============================================================
describe('derivRatingFromPrism', () => {
  it('OFF → null (선언 안 함)', () => {
    expect(derivRatingFromPrism({ prismMode: 'OFF' })).toBeNull();
  });
  it('FREE → null (NOA 자율은 선언 안 함)', () => {
    expect(derivRatingFromPrism({ prismMode: 'FREE' })).toBeNull();
  });
  it('ALL → all', () => {
    expect(derivRatingFromPrism({ prismMode: 'ALL' })).toBe('all');
  });
  it('T15 → 15+', () => {
    expect(derivRatingFromPrism({ prismMode: 'T15' })).toBe('15+');
  });
  it('M18 → 19+', () => {
    expect(derivRatingFromPrism({ prismMode: 'M18' })).toBe('19+');
  });
  it('CUSTOM 성적 4 → 19+', () => {
    expect(derivRatingFromPrism({
      prismMode: 'CUSTOM',
      prismCustom: { sexual: 4, violence: 1, profanity: 0 },
    })).toBe('19+');
  });
  it('CUSTOM 폭력 3 → 15+', () => {
    expect(derivRatingFromPrism({
      prismMode: 'CUSTOM',
      prismCustom: { sexual: 1, violence: 3, profanity: 2 },
    })).toBe('15+');
  });
  it('CUSTOM 비속어 2 → 12+', () => {
    expect(derivRatingFromPrism({
      prismMode: 'CUSTOM',
      prismCustom: { sexual: 0, violence: 0, profanity: 2 },
    })).toBe('12+');
  });
  it('CUSTOM 전 축 0-1 → all', () => {
    expect(derivRatingFromPrism({
      prismMode: 'CUSTOM',
      prismCustom: { sexual: 1, violence: 0, profanity: 1 },
    })).toBe('all');
  });
  it('CUSTOM prismCustom 없을 때 → all', () => {
    expect(derivRatingFromPrism({ prismMode: 'CUSTOM' })).toBe('all');
  });
  it('prismMode undefined → null (OFF 동작)', () => {
    expect(derivRatingFromPrism({})).toBeNull();
  });
});

// ============================================================
// getEffectiveRating — prismMode 우선 / localStorage fallback
// ============================================================
describe('getEffectiveRating', () => {
  beforeEach(() => { localStorage.clear(); });

  it('prismMode=M18이면 localStorage 덮어씀', () => {
    setRating('proj1', 'all');
    const eff = getEffectiveRating('proj1', { prismMode: 'M18' });
    expect(eff.rating).toBe('19+');
  });
  it('prismMode=T15이면 15+', () => {
    setRating('proj1', 'all');
    const eff = getEffectiveRating('proj1', { prismMode: 'T15' });
    expect(eff.rating).toBe('15+');
  });
  it('prismMode=OFF이면 localStorage 등급 사용', () => {
    setRating('proj1', '19+');
    const eff = getEffectiveRating('proj1', { prismMode: 'OFF' });
    expect(eff.rating).toBe('19+');
  });
  it('prismMode=FREE이면 localStorage 등급 사용', () => {
    setRating('proj1', '15+');
    const eff = getEffectiveRating('proj1', { prismMode: 'FREE' });
    expect(eff.rating).toBe('15+');
  });
  it('config 인자 없으면 localStorage만', () => {
    setRating('proj1', '19+');
    const eff = getEffectiveRating('proj1');
    expect(eff.rating).toBe('19+');
  });
  it('warnings는 localStorage에서 가져옴 (prismMode 파생에도)', () => {
    setRating('proj1', 'all', ['violence', 'sexual']);
    const eff = getEffectiveRating('proj1', { prismMode: 'M18' });
    expect(eff.rating).toBe('19+');
    expect(eff.warnings).toEqual(['violence', 'sexual']);
  });
});
