// ============================================================
// limitation-text.test.ts — byte-level 디스클레이머 + 금지어 검증
// ============================================================

import {
  LIMITATION_TEXT_4LANG,
  LIMITATION_TEXT_VERSION,
  FORBIDDEN_WORDS_4LANG,
  assertNoForbiddenWords,
} from '../limitation-text';

describe('limitation-text — 4언어 디스클레이머 byte-level 고정', () => {
  it('한국어 디스클레이머 정확 일치 (M-06 — 1.1.0 강도 보강)', () => {
    expect(LIMITATION_TEXT_4LANG.ko).toBe(
      '이 문서는 법적 효력을 가지지 않으며, 사법 절차의 증거로 사용될 수 없습니다. 작가가 Loreguard에서 작업한 과정을 기록한 정보 자료입니다.',
    );
  });

  it('영문 디스클레이머에 3대 위험 단어 명시 부정 (certification·attestation·evidence)', () => {
    const en = LIMITATION_TEXT_4LANG.en;
    expect(en).toContain('not a legal certification');
    expect(en).toContain('attestation');
    expect(en).toContain('evidence');
    expect(en).toContain('judicial proceeding');
  });

  it('일본어 디스클레이머에 "法的効力" + 司法手続き 포함 (M-06)', () => {
    expect(LIMITATION_TEXT_4LANG.ja).toContain('法的効力');
    expect(LIMITATION_TEXT_4LANG.ja).toContain('司法手続');
  });

  it('중국어 디스클레이머에 "法律效力" 포함', () => {
    expect(LIMITATION_TEXT_4LANG.zh).toContain('法律效力');
  });

  it('LIMITATION_TEXT_VERSION 은 1.x 로 시작 (변경 추적)', () => {
    expect(LIMITATION_TEXT_VERSION).toMatch(/^1\./);
  });
});

describe('limitation-text — 금지어 검증 throw', () => {
  it('한국어 금지어 throw', () => {
    expect(() => assertNoForbiddenWords('이 작품은 보증된 정품입니다', 'ko')).toThrow(/보증/);
    expect(() => assertNoForbiddenWords('인증된 작가', 'ko')).toThrow(/인증/);
  });

  it('영문 금지어 throw (case-insensitive)', () => {
    expect(() => assertNoForbiddenWords('This is certified work', 'en')).toThrow(/certified/);
    expect(() => assertNoForbiddenWords('CERTIFIED CONTENT', 'en')).toThrow(/certified/);
    expect(() => assertNoForbiddenWords('Used as evidence', 'en')).toThrow(/evidence/);
  });

  it('일본어 금지어 throw', () => {
    expect(() => assertNoForbiddenWords('この作品は保証されています', 'ja')).toThrow(/保証/);
  });

  it('중국어 금지어 throw', () => {
    expect(() => assertNoForbiddenWords('本作品已认证', 'zh')).toThrow(/认证/);
  });

  it('LIMITATION_TEXT 자체는 검사 skip (디스클레이머는 통과)', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      const text = LIMITATION_TEXT_4LANG[lang];
      expect(() => assertNoForbiddenWords(text, lang)).not.toThrow();
    }
  });

  it('빈 문자열 안전 (no-op)', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      expect(() => assertNoForbiddenWords('', lang)).not.toThrow();
    }
  });

  it('금지어 없는 일반 텍스트 통과', () => {
    expect(() => assertNoForbiddenWords('일반 작가의 일반 작품', 'ko')).not.toThrow();
    expect(() => assertNoForbiddenWords('A regular author writing', 'en')).not.toThrow();
  });

  it('FORBIDDEN_WORDS_4LANG — 4언어 모두 비어있지 않음', () => {
    expect(FORBIDDEN_WORDS_4LANG.ko.length).toBeGreaterThan(0);
    expect(FORBIDDEN_WORDS_4LANG.en.length).toBeGreaterThan(0);
    expect(FORBIDDEN_WORDS_4LANG.ja.length).toBeGreaterThan(0);
    expect(FORBIDDEN_WORDS_4LANG.zh.length).toBeGreaterThan(0);
  });
});
