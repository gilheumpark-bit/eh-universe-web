/**
 * prism-rejection-detector.test.ts (2026-05-10 — G-test-2 검증)
 *
 * M-05 PRISM 거절 감지 + 4언어 친화 메시지 검증.
 */

import {
  isPrismRejection,
  getPrismRejectionSuggestion,
  checkAndExplainRejection,
} from '../prism-rejection-detector';

describe('prism-rejection-detector — isPrismRejection', () => {
  describe('영어 거절 패턴', () => {
    it('"I cannot..." 시작 → 거절', () => {
      expect(isPrismRejection('I cannot help with that request.')).toBe(true);
    });

    it('"I can\'t..." 시작 → 거절', () => {
      expect(isPrismRejection("I can't generate explicit content.")).toBe(true);
    });

    it('"As an AI..." 시작 → 거절', () => {
      expect(isPrismRejection('As an AI, I am unable to do that.')).toBe(true);
    });

    it('"I\'m sorry, but..." → 거절', () => {
      expect(isPrismRejection("I'm sorry, but I cannot.")).toBe(true);
    });
  });

  describe('한국어 거절 패턴', () => {
    it('"죄송하지만..." → 거절', () => {
      expect(isPrismRejection('죄송하지만 이러한 콘텐츠를 생성할 수 없습니다.')).toBe(true);
    });

    it('"저는 AI..." → 거절', () => {
      expect(isPrismRejection('저는 AI입니다. 해당 요청은 처리할 수 없습니다.')).toBe(true);
    });
  });

  describe('일본어 거절 패턴', () => {
    it('"申し訳ありません..." → 거절', () => {
      expect(isPrismRejection('申し訳ありません、そのコンテンツは生成できません。')).toBe(true);
    });
  });

  describe('중국어 거절 패턴', () => {
    it('"对不起..." → 거절', () => {
      expect(isPrismRejection('对不起,我无法生成此类内容。')).toBe(true);
    });

    it('"作为AI..." → 거절', () => {
      expect(isPrismRejection('作为AI助手,我不能完成此请求。')).toBe(true);
    });
  });

  describe('정상 응답 false positive 회피', () => {
    it('소설 본문 — 첫 문장이 "그가" 시작 → 정상', () => {
      const novel = '그가 어두운 거리를 걸었다. 비가 내리고 있었다.';
      expect(isPrismRejection(novel)).toBe(false);
    });

    it('영문 소설 본문 — "He walked..." → 정상', () => {
      const novel = 'He walked through the dark streets, the rain falling heavily.';
      expect(isPrismRejection(novel)).toBe(false);
    });

    it('번역 결과 — 일반 텍스트 → 정상', () => {
      expect(isPrismRejection('The dragon roared, breathing flame upon the village.')).toBe(false);
    });

    it('빈 응답 → 거절 X', () => {
      expect(isPrismRejection('')).toBe(false);
    });

    it('200자 이후 거절 패턴 등장 → 미감지 (보수적)', () => {
      const text = 'a'.repeat(250) + ' I cannot help.';
      expect(isPrismRejection(text)).toBe(false);
    });
  });
});

describe('prism-rejection-detector — getPrismRejectionSuggestion', () => {
  it('all-ages level + ko', () => {
    const msg = getPrismRejectionSuggestion('all-ages', 'ko');
    expect(msg).toContain('전체이용가');
    expect(msg).toContain('PRISM');
  });

  it('teen-15 level + en', () => {
    const msg = getPrismRejectionSuggestion('teen-15', 'en');
    expect(msg).toContain('Teen 15');
  });

  it('mature-18 level + ja', () => {
    const msg = getPrismRejectionSuggestion('mature-18', 'ja');
    expect(msg).toContain('AI');
  });

  it('undefined level → unknown fallback', () => {
    const msg = getPrismRejectionSuggestion(undefined, 'ko');
    expect(msg).toContain('PRISM');
  });

  it('4언어 모두 비어있지 않음', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      for (const level of ['all-ages', 'teen-15', 'mature-18'] as const) {
        const msg = getPrismRejectionSuggestion(level, lang);
        expect(msg.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('prism-rejection-detector — checkAndExplainRejection', () => {
  it('거절 응답 → 친화 메시지 반환', () => {
    const result = checkAndExplainRejection('I cannot generate that.', 'mature-18', 'ko');
    expect(result).not.toBeNull();
    expect(result).toContain('AI');
  });

  it('정상 응답 → null', () => {
    const result = checkAndExplainRejection('정상적인 소설 본문입니다.', 'mature-18', 'ko');
    expect(result).toBeNull();
  });

  it('빈 응답 → null', () => {
    const result = checkAndExplainRejection('', 'all-ages', 'en');
    expect(result).toBeNull();
  });

  it('level undefined 시 unknown fallback', () => {
    const result = checkAndExplainRejection('I cannot.', undefined, 'ko');
    expect(result).not.toBeNull();
  });
});
