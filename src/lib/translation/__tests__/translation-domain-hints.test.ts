/**
 * translation-domain-hints.test.ts (2026-05-10 — P-04 / G-test 검증)
 */

import {
  getTranslationDomainHint,
  getMarketFor,
} from '../translation-domain-hints';

describe('translation-domain-hints — getMarketFor', () => {
  it('정상 lang code', () => {
    expect(getMarketFor('ko')).toBe('ko');
    expect(getMarketFor('en')).toBe('en');
    expect(getMarketFor('ja')).toBe('ja');
    expect(getMarketFor('zh')).toBe('zh');
  });

  it('비표준 별칭 흡수', () => {
    expect(getMarketFor('KR')).toBe('ko');
    expect(getMarketFor('jp')).toBe('ja');
    expect(getMarketFor('cn')).toBe('zh');
    expect(getMarketFor('tw')).toBe('zh');
  });

  it('미지 → en fallback', () => {
    expect(getMarketFor('xx')).toBe('en');
    expect(getMarketFor('')).toBe('en');
  });
});

describe('translation-domain-hints — getTranslationDomainHint', () => {
  describe('동일 시장 (source = target)', () => {
    it('ko → ko 한국 웹소설 정형만', () => {
      const hint = getTranslationDomainHint('ko', 'ko');
      expect(hint).toContain('Korean web-novel');
      expect(hint).toContain('cliffhanger');
    });

    it('en → en Western fantasy 정형만', () => {
      const hint = getTranslationDomainHint('en', 'en');
      expect(hint).toContain('Western fantasy');
    });

    it('ja → ja 라노벨 정형만', () => {
      const hint = getTranslationDomainHint('ja', 'ja');
      expect(hint).toContain('Japanese light-novel');
    });

    it('zh → zh 선협 정형만', () => {
      const hint = getTranslationDomainHint('zh', 'zh');
      expect(hint).toContain('Chinese xianxia');
    });
  });

  describe('cross-market override', () => {
    it('ko → en — Korean web-novel + Western override', () => {
      const hint = getTranslationDomainHint('ko', 'en');
      expect(hint).toContain('Western fantasy');
      expect(hint).toContain('Source: Korean web-novel');
    });

    it('ja → ko — Japanese 라노벨 → 한국 웹소설 override', () => {
      const hint = getTranslationDomainHint('ja', 'ko');
      expect(hint).toContain('Korean web-novel');
      expect(hint).toContain('Source: Japanese light novel');
      expect(hint).toContain('헌터물');
    });

    it('zh → ko — 仙侠 → 한국 무협 override', () => {
      const hint = getTranslationDomainHint('zh', 'ko');
      expect(hint).toContain('Korean web-novel');
      expect(hint).toContain('Source: Chinese xianxia');
    });

    it('en → ja — Western → Japanese override', () => {
      const hint = getTranslationDomainHint('en', 'ja');
      expect(hint).toContain('Japanese light-novel');
      expect(hint).toContain('Source: Western fiction');
    });
  });

  describe('미정의 조합 fallback', () => {
    it('ja → zh — override 정의됨 (확인)', () => {
      const hint = getTranslationDomainHint('ja', 'zh');
      expect(hint).toContain('Chinese xianxia');
    });
  });

  describe('비표준 입력 안전', () => {
    it('미지 source → en source 처리', () => {
      const hint = getTranslationDomainHint('xx', 'ko');
      expect(hint).toContain('Korean web-novel');
    });

    it('미지 target → en market', () => {
      const hint = getTranslationDomainHint('ko', 'xx');
      expect(hint).toContain('Western fantasy'); // en fallback
    });
  });
});
