// ============================================================
// PART 1 — Imports
// ============================================================

import {
  findGlossaryUsage,
  findKOBoundaryMatch,
  findJPBoundaryMatch,
} from '@/hooks/useTranslation';

// ============================================================
// PART 2 — 한국어 경계 매칭 (KO)
// ============================================================

describe('findKOBoundaryMatch — 한국어 경계 인식', () => {
  it('조사 "가" 붙음 → 매치 ("그림자가" 안 "그림자")', () => {
    expect(findKOBoundaryMatch('그림자가 드리운다', '그림자')).toBe(true);
  });

  it('앞 한글 복합단어 차단 → 비매치 ("큰그림자" 안 "그림자")', () => {
    expect(findKOBoundaryMatch('큰그림자가 드리운다', '그림자')).toBe(false);
  });

  it('조사 "는" 붙음 → 매치', () => {
    expect(findKOBoundaryMatch('그림자는 깊다', '그림자')).toBe(true);
  });

  it('뒤 한글 조사 아님 → 비매치 ("그림자마을" 안 "그림자")', () => {
    expect(findKOBoundaryMatch('그림자마을에 들어간다', '그림자')).toBe(false);
  });

  it('문장부호 뒤 → 매치 ("그림자." 안 "그림자")', () => {
    expect(findKOBoundaryMatch('그림자.', '그림자')).toBe(true);
  });

  it('target === text 정확 일치 → 매치', () => {
    expect(findKOBoundaryMatch('그림자', '그림자')).toBe(true);
  });

  it('공백 경계 → 매치 ("그림자 는" 안 "그림자")', () => {
    expect(findKOBoundaryMatch('깊은 그림자 속에', '그림자')).toBe(true);
  });

  it('조사 "에서" 붙음 → 매치 (긴 조사 우선)', () => {
    expect(findKOBoundaryMatch('그림자에서 나왔다', '그림자')).toBe(true);
  });

  it('빈 target → 비매치', () => {
    expect(findKOBoundaryMatch('그림자가', '')).toBe(false);
  });

  it('빈 text → 비매치', () => {
    expect(findKOBoundaryMatch('', '그림자')).toBe(false);
  });
});

// ============================================================
// PART 3 — 일본어 경계 매칭 (JP)
// ============================================================

describe('findJPBoundaryMatch — 일본어 경계 인식', () => {
  it('조사 "は" 붙음 → 매치 ("魔王は" 안 "魔王")', () => {
    expect(findJPBoundaryMatch('魔王は強い', '魔王')).toBe(true);
  });

  it('앞 한자 복합단어 차단 → 비매치 ("大魔王" 안 "魔王")', () => {
    expect(findJPBoundaryMatch('大魔王が現れた', '魔王')).toBe(false);
  });

  it('조사 "だ" 붙음 → 매치', () => {
    expect(findJPBoundaryMatch('魔王だ', '魔王')).toBe(true);
  });

  it('문장부호 뒤 → 매치 ("魔王。" 안 "魔王")', () => {
    expect(findJPBoundaryMatch('魔王。', '魔王')).toBe(true);
  });

  it('조사 "が" 붙음 → 매치', () => {
    expect(findJPBoundaryMatch('魔王が笑う', '魔王')).toBe(true);
  });

  it('target === text → 매치', () => {
    expect(findJPBoundaryMatch('魔王', '魔王')).toBe(true);
  });

  it('빈 target → 비매치', () => {
    expect(findJPBoundaryMatch('魔王は', '')).toBe(false);
  });

  it('공백 뒤 → 매치', () => {
    expect(findJPBoundaryMatch('魔王 現る', '魔王')).toBe(true);
  });
});

// ============================================================
// PART 4 — 통합 findGlossaryUsage (영문/중문/혼합)
// ============================================================

describe('findGlossaryUsage — 통합 매칭', () => {
  it('EN: word boundary 매치 ("The king" 안 "king")', () => {
    const result = findGlossaryUsage(
      [{ source: '왕', target: 'king' }],
      'The king rules here.'
    );
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('king');
  });

  it('EN: word boundary 차단 ("kingdom" 안 "king")', () => {
    const result = findGlossaryUsage(
      [{ source: '왕', target: 'king' }],
      'The kingdom is vast.'
    );
    expect(result).toHaveLength(0);
  });

  it('CN: 한자만 target 포함 매치', () => {
    const result = findGlossaryUsage(
      [{ source: '왕', target: '魔王' }],
      '魔王说了什么'
    );
    expect(result).toHaveLength(1);
  });

  it('KO: 복합단어 false positive 차단', () => {
    const result = findGlossaryUsage(
      [{ source: 'shadow', target: '그림자' }],
      '큰그림자가 있다'
    );
    expect(result).toHaveLength(0);
  });

  it('KO: 조사 붙은 정상 매치', () => {
    const result = findGlossaryUsage(
      [{ source: 'shadow', target: '그림자' }],
      '그림자는 어둡다'
    );
    expect(result).toHaveLength(1);
  });

  it('JP: 복합단어 차단', () => {
    const result = findGlossaryUsage(
      [{ source: 'king', target: '魔王' }],
      '大魔王が来た'
    );
    // "魔王" 은 JP_HIRAGANA_KATAKANA_REGEX 비매치 (한자만) → CN 경로로 fallback.
    // CN 경로는 단순 includes 로 매치함. JP 전용 경계는 히라가나/카타카나 섞인 target 일 때 적용.
    // 한자만 있는 target 은 중국어/일본어 구분이 어려워 기존 includes 유지.
    expect(result).toHaveLength(1);
  });

  it('JP 히라가나 target: "おに" 앞에 한자 있으면 차단', () => {
    const result = findGlossaryUsage(
      [{ source: 'ogre', target: 'おに' }],
      '大おにが来た'
    );
    // 앞 "大" (한자) → JP boundary 차단
    expect(result).toHaveLength(0);
  });

  it('JP 히라가나 target: 조사 뒤 매치', () => {
    const result = findGlossaryUsage(
      [{ source: 'ogre', target: 'おに' }],
      'おにだ'
    );
    expect(result).toHaveLength(1);
  });

  it('빈 glossary → 빈 배열', () => {
    expect(findGlossaryUsage([], '어떤 텍스트')).toEqual([]);
  });

  it('빈 translatedText → 빈 배열', () => {
    expect(findGlossaryUsage([{ source: 'a', target: 'king' }], '')).toEqual([]);
  });

  it('1글자 target skip (minimum length guard)', () => {
    const result = findGlossaryUsage(
      [{ source: 'a', target: '왕' }],
      '왕이 말했다'
    );
    expect(result).toHaveLength(0);
  });

  it('null target 가드', () => {
    const result = findGlossaryUsage(
      [{ source: 'a', target: '' }],
      '텍스트'
    );
    expect(result).toHaveLength(0);
  });

  it('여러 항목 중 유효 매치만 반환', () => {
    const result = findGlossaryUsage(
      [
        { source: 'shadow', target: '그림자' },      // "큰그림자" → 차단
        { source: 'king',   target: 'king' },        // "kingdom" → 차단
        { source: 'hero',   target: '영웅' },        // "영웅이" → 매치
      ],
      '큰그림자가 kingdom 안에서 영웅이 싸운다'
    );
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('영웅');
  });
});
