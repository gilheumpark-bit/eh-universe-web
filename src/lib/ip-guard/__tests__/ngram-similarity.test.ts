/**
 * ngram-similarity.test.ts (2026-05-12 — Doc 3 ⑦ T-04 / F-test)
 * L3 IP guard 핵심 유틸 검증.
 */

import {
  buildNGramSet,
  jaccardSimilarity,
  textSimilarity,
  detectSimilarPassages,
  detectSuspiciousPassages,
} from '../ngram-similarity';

describe('ngram-similarity — buildNGramSet', () => {
  it('짧은 텍스트 (n 미만) 빈 set 반환', () => {
    expect(buildNGramSet('가', 3).size).toBe(0);
    expect(buildNGramSet('', 3).size).toBe(0);
  });

  it('정확히 n 길이 — single shingle', () => {
    const s = buildNGramSet('가나다', 3);
    expect(s.size).toBe(1);
    expect(s.has('가나다')).toBe(true);
  });

  it('반복 shingle 중복 제거 (Set 특성)', () => {
    const s = buildNGramSet('aaaaa', 3);
    // 'aaa' single — 모든 위치 same
    expect(s.size).toBe(1);
  });

  it('한글 음절 단위 n-gram', () => {
    const s = buildNGramSet('새벽의 그림자', 3);
    // 공백 포함 — 새벽의, 벽의 , 의 그, ...
    expect(s.size).toBeGreaterThan(0);
  });
});

describe('ngram-similarity — jaccardSimilarity', () => {
  it('동일 set → 1', () => {
    const a = new Set(['ab', 'bc', 'cd']);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it('완전 분리 set → 0', () => {
    const a = new Set(['ab', 'bc']);
    const b = new Set(['xy', 'yz']);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it('빈 set 시 0 (NaN 방어)', () => {
    expect(jaccardSimilarity(new Set(), new Set(['ab']))).toBe(0);
    expect(jaccardSimilarity(new Set(['ab']), new Set())).toBe(0);
  });

  it('부분 교집합 — 정확한 Jaccard', () => {
    const a = new Set(['ab', 'bc', 'cd']);  // 3
    const b = new Set(['bc', 'cd', 'de']);  // 3
    // 교집합 {bc, cd} = 2, 합집합 {ab, bc, cd, de} = 4 → 0.5
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });
});

describe('ngram-similarity — textSimilarity', () => {
  it('동일 텍스트 → 1', () => {
    expect(textSimilarity('새벽의 그림자', '새벽의 그림자')).toBe(1);
  });

  it('완전 다른 텍스트 → 0', () => {
    expect(textSimilarity('새벽의 그림자', '오후의 햇살')).toBe(0);
  });

  it('정규화 — 공백·문장부호 무시', () => {
    const a = '새벽의, 그림자!';
    const b = '새벽의 그림자';
    // 둘 다 정규화 후 동일 → 1
    expect(textSimilarity(a, b)).toBeCloseTo(1, 1);
  });

  it('대소문자 무시', () => {
    expect(textSimilarity('Hello World', 'hello world')).toBe(1);
  });

  it('빈 텍스트 → 0', () => {
    expect(textSimilarity('', '새벽')).toBe(0);
    expect(textSimilarity('새벽', '')).toBe(0);
  });

  it('options.normalize = false — 정규화 안 함', () => {
    // 공백 포함 그대로 비교
    const sim = textSimilarity('a b c', 'abc', { normalize: false, n: 2 });
    expect(sim).toBeLessThan(1);
  });

  it('options.n = 5 — 더 긴 shingle (장편 권장)', () => {
    const a = '잠들지 못한 사람들이 모이는 시간이 있다';
    const b = '잠들지 못한 사람들이 모이는 곳';
    const sim3 = textSimilarity(a, b, { n: 3 });
    const sim5 = textSimilarity(a, b, { n: 5 });
    // n 클수록 더 엄격 (의미적으로 다른 문장에서 유사도 ↓)
    expect(sim5).toBeLessThanOrEqual(sim3);
  });
});

describe('ngram-similarity — detectSimilarPassages', () => {
  it('빈 draft / 빈 corpus → 빈 배열', () => {
    expect(detectSimilarPassages('', [{ id: 'a', text: '안녕' }])).toEqual([]);
    expect(detectSimilarPassages('안녕', [])).toEqual([]);
  });

  it('similarity 내림차순 정렬', () => {
    const draft = '새벽의 그림자가 길어진다';
    const corpus = [
      { id: 'low', text: '오후의 햇살이 밝다' },           // similarity 낮음 또는 0
      { id: 'high', text: '새벽의 그림자가 짙어진다' },     // similarity 높음
      { id: 'medium', text: '새벽의 햇살이 든다' },         // 중간
    ];
    const results = detectSimilarPassages(draft, corpus);
    // 내림차순
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it('threshold 초과 시 suspicious true', () => {
    const draft = '잠들지 못한 사람들이 모이는 시간이 있다';
    const corpus = [
      { id: 'plagiarism', text: '잠들지 못한 사람들이 모이는 시간이 있다' }, // 동일
    ];
    const results = detectSimilarPassages(draft, corpus, { threshold: 0.3 });
    expect(results.length).toBe(1);
    expect(results[0].similarity).toBeCloseTo(1, 1);
    expect(results[0].suspicious).toBe(true);
  });

  it('similarity 0 entry skip', () => {
    const draft = '가나다라마';
    const corpus = [
      { id: 'unrelated', text: 'xyz123' },
    ];
    const results = detectSimilarPassages(draft, corpus);
    // similarity 0이면 결과에서 제외 (line 162: if (similarity <= 0) continue)
    expect(results.length).toBe(0);
  });

  it('overlap 카운트 — 교집합 크기', () => {
    const draft = '잠들지 못한 사람들';
    const corpus = [
      { id: 'partial', text: '잠들지 못한' },
    ];
    const results = detectSimilarPassages(draft, corpus, { n: 3 });
    if (results.length > 0) {
      expect(results[0].overlap).toBeGreaterThan(0);
      expect(results[0].overlap).toBeLessThanOrEqual(buildNGramSet('잠들지못한', 3).size);
    }
  });

  it('maxLength — 매우 긴 텍스트 잘림', () => {
    const longText = 'A'.repeat(200_000);
    const refText = 'A'.repeat(200_000);
    // maxLength 100,000으로 자름 → 둘 다 같은 길이로 trim
    const results = detectSimilarPassages(longText, [{ id: 'long', text: refText }], {
      maxLength: 100_000,
      n: 3,
    });
    expect(results.length).toBe(1);
    expect(results[0].similarity).toBe(1); // 둘 다 같은 trim 결과
  });
});

describe('ngram-similarity — detectSuspiciousPassages', () => {
  it('threshold 미만 항목 필터링', () => {
    const draft = '새벽의 그림자가 길어진다';
    const corpus = [
      { id: 'high', text: '새벽의 그림자가 짙어진다' },
      { id: 'low', text: '햇살이 든다' },
    ];
    const results = detectSuspiciousPassages(draft, corpus, { threshold: 0.5 });
    // 모두 suspicious 만
    results.forEach((r) => expect(r.suspicious).toBe(true));
  });

  it('아무것도 매칭 안 되면 빈 배열', () => {
    const results = detectSuspiciousPassages('가', [{ id: 'a', text: 'xyz' }], { threshold: 0.5 });
    expect(results).toEqual([]);
  });
});
