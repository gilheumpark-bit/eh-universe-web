import {
  CURRENT_MARKET_STANDARDS,
  CURRENT_MARKET_STANDARDS_CHECKED_AT,
  CURRENT_MARKET_STANDARDS_EXPIRES_AT,
  FONT_LICENSE_PROFILES,
  TRADEMARK_SEARCH_PROFILES,
  buildCurrentStandardsAudit,
  getCurrentMarketStandard,
  isMarketStandardStale,
  listCurrentMarketStandards,
  type MarketStandardId,
} from '../current-market-standards';

const MARKET_IDS: MarketStandardId[] = [
  'kr-webnovel-serial',
  'global-wattpad-serial',
  'us-kdp-ebook',
  'webtoon-canvas',
  'jp-light-novel',
  'cn-webnovel-serial',
];

describe('current-market-standards', () => {
  it('provides the 2026-06 dated market registry', () => {
    expect(Object.keys(CURRENT_MARKET_STANDARDS).sort()).toEqual([...MARKET_IDS].sort());
    expect(listCurrentMarketStandards()).toHaveLength(MARKET_IDS.length);
    expect(CURRENT_MARKET_STANDARDS_CHECKED_AT).toBe('2026-06-13');
    expect(CURRENT_MARKET_STANDARDS_EXPIRES_AT).toBe('2026-07-13');
  });

  it('keeps market-average length targets out of hard-rule status', () => {
    const kr = CURRENT_MARKET_STANDARDS['kr-webnovel-serial'];
    const wattpad = CURRENT_MARKET_STANDARDS['global-wattpad-serial'];
    const cn = CURRENT_MARKET_STANDARDS['cn-webnovel-serial'];

    expect(kr.lengthTarget.unit).toBe('chars-no-spaces');
    expect(kr.lengthTarget.recommendedMin).toBe(5_500);
    expect(kr.lengthTarget.recommendedMax).toBe(7_000);
    expect(kr.lengthTarget.hardRule).toBe(false);

    expect(wattpad.lengthTarget.unit).toBe('words');
    expect(wattpad.lengthTarget.hardRule).toBe(false);

    expect(cn.lengthTarget.unit).toBe('chars');
    expect(cn.lengthTarget.hardRule).toBe(false);
  });

  it('separates official formatting and manual-review profiles from serial averages', () => {
    expect(CURRENT_MARKET_STANDARDS['us-kdp-ebook'].evidenceLevel).toBe('official-formatting');
    expect(CURRENT_MARKET_STANDARDS['us-kdp-ebook'].lengthTarget.unit).toBe('not-fixed');
    expect(CURRENT_MARKET_STANDARDS['jp-light-novel'].evidenceLevel).toBe('manual-review');
    expect(CURRENT_MARKET_STANDARDS['jp-light-novel'].lengthTarget.recommendedMin).toBeNull();
  });

  it('requires dated source references for every market profile', () => {
    for (const profile of Object.values(CURRENT_MARKET_STANDARDS)) {
      expect(profile.checkedAt).toBe(CURRENT_MARKET_STANDARDS_CHECKED_AT);
      expect(profile.expiresAt).toBe(CURRENT_MARKET_STANDARDS_EXPIRES_AT);
      expect(profile.sourceReferences.length).toBeGreaterThan(0);
      for (const source of profile.sourceReferences) {
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.checkedAt).toBe(CURRENT_MARKET_STANDARDS_CHECKED_AT);
      }
    }
  });

  it('provides official trademark search entry points by region', () => {
    expect(TRADEMARK_SEARCH_PROFILES.map((item) => item.region).sort()).toEqual(['EU', 'JP', 'KR', 'US']);
    for (const profile of TRADEMARK_SEARCH_PROFILES) {
      expect(profile.url).toMatch(/^https:\/\//);
      expect(profile.requiredQueryKo.length).toBeGreaterThan(0);
    }
  });

  it('provides font license sources for free and subscription font decisions', () => {
    expect(FONT_LICENSE_PROFILES.map((item) => item.id).sort()).toEqual([
      'adobe-fonts',
      'google-fonts',
      'naver-nanum',
      'pretendard',
    ]);
    for (const profile of FONT_LICENSE_PROFILES) {
      expect(profile.url).toMatch(/^https:\/\//);
      expect(profile.releaseCheckKo.length).toBeGreaterThan(0);
    }
  });

  it('audits stale standards by expiry date', () => {
    expect(isMarketStandardStale(CURRENT_MARKET_STANDARDS['kr-webnovel-serial'], '2026-06-30')).toBe(false);
    expect(isMarketStandardStale(CURRENT_MARKET_STANDARDS['kr-webnovel-serial'], '2026-07-14')).toBe(true);

    expect(buildCurrentStandardsAudit('2026-06-30')).toMatchObject({
      ready: true,
      staleMarketStandardIds: [],
    });
    const staleAudit = buildCurrentStandardsAudit('2026-07-14');
    expect(staleAudit.ready).toBe(false);
    expect(staleAudit.staleMarketStandardIds).toContain('kr-webnovel-serial');
    expect(staleAudit.staleSourceUrls.length).toBeGreaterThan(0);
  });

  it('falls back to the Korean webnovel profile for unknown ids', () => {
    expect(getCurrentMarketStandard('unknown').id).toBe('kr-webnovel-serial');
  });
});
