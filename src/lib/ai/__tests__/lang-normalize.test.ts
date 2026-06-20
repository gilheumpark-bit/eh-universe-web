/**
 * lang-normalize.test.ts (2026-05-10 — I-01 / G-test 검증)
 */

import {
  toAgentLang,
  toAppLang,
  isAppLanguage,
  isAgentLanguage,
  normalizeToAgentLang,
  normalizeToAppLang,
} from '../lang-normalize';

describe('lang-normalize — toAgentLang', () => {
  it('정상 AppLanguage 변환', () => {
    expect(toAgentLang('KO')).toBe('ko');
    expect(toAgentLang('EN')).toBe('en');
    expect(toAgentLang('JP')).toBe('ja');
    expect(toAgentLang('CN')).toBe('zh');
  });

  it('소문자 입력 정규화', () => {
    expect(toAgentLang('ko' as 'KO')).toBe('ko');
  });

  it('미지/null/undefined → ko fallback', () => {
    expect(toAgentLang(undefined)).toBe('ko');
    expect(toAgentLang(null)).toBe('ko');
    expect(toAgentLang('XX')).toBe('ko');
    expect(toAgentLang('')).toBe('ko');
  });
});

describe('lang-normalize — toAppLang', () => {
  it('정상 AgentLanguage 변환', () => {
    expect(toAppLang('ko')).toBe('KO');
    expect(toAppLang('en')).toBe('EN');
    expect(toAppLang('ja')).toBe('JP');
    expect(toAppLang('zh')).toBe('CN');
  });

  it('대문자 입력 정규화', () => {
    expect(toAppLang('KO' as 'ko')).toBe('KO');
  });

  it('미지/null → KO fallback', () => {
    expect(toAppLang(undefined)).toBe('KO');
    expect(toAppLang(null)).toBe('KO');
    expect(toAppLang('xx')).toBe('KO');
  });
});

describe('lang-normalize — type guards', () => {
  it('isAppLanguage', () => {
    expect(isAppLanguage('KO')).toBe(true);
    expect(isAppLanguage('EN')).toBe(true);
    expect(isAppLanguage('JP')).toBe(true);
    expect(isAppLanguage('CN')).toBe(true);
    expect(isAppLanguage('ko')).toBe(false);
    expect(isAppLanguage('XX')).toBe(false);
    expect(isAppLanguage(null)).toBe(false);
    expect(isAppLanguage(123)).toBe(false);
  });

  it('isAgentLanguage', () => {
    expect(isAgentLanguage('ko')).toBe(true);
    expect(isAgentLanguage('en')).toBe(true);
    expect(isAgentLanguage('ja')).toBe(true);
    expect(isAgentLanguage('zh')).toBe(true);
    expect(isAgentLanguage('KO')).toBe(false);
    expect(isAgentLanguage('xx')).toBe(false);
  });
});

describe('lang-normalize — normalizeToAgentLang (관대)', () => {
  it('비표준 별칭 흡수', () => {
    expect(normalizeToAgentLang('kr')).toBe('ko');
    expect(normalizeToAgentLang('KR')).toBe('ko');
    expect(normalizeToAgentLang('jp')).toBe('ja');
    expect(normalizeToAgentLang('cn')).toBe('zh');
    expect(normalizeToAgentLang('tw')).toBe('zh');
    expect(normalizeToAgentLang('us')).toBe('en');
    expect(normalizeToAgentLang('gb')).toBe('en');
  });

  it('정상 표기 통과', () => {
    expect(normalizeToAgentLang('ko')).toBe('ko');
    expect(normalizeToAgentLang('en')).toBe('en');
    expect(normalizeToAgentLang('ja')).toBe('ja');
    expect(normalizeToAgentLang('zh')).toBe('zh');
  });

  it('미지 입력 → ko fallback', () => {
    expect(normalizeToAgentLang('xx')).toBe('ko');
    expect(normalizeToAgentLang(undefined)).toBe('ko');
    expect(normalizeToAgentLang(null)).toBe('ko');
    expect(normalizeToAgentLang(123)).toBe('ko');
  });

  it('첫 2자만 추출 (ko-KR / en-US 등)', () => {
    expect(normalizeToAgentLang('ko-KR')).toBe('ko');
    expect(normalizeToAgentLang('en-US')).toBe('en');
  });
});

describe('lang-normalize — normalizeToAppLang', () => {
  it('비표준 → AppLanguage', () => {
    expect(normalizeToAppLang('kr')).toBe('KO');
    expect(normalizeToAppLang('jp')).toBe('JP');
    expect(normalizeToAppLang('cn')).toBe('CN');
    expect(normalizeToAppLang('us')).toBe('EN');
  });
});
