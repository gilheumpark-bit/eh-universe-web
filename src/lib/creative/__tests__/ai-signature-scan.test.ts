import { scanAISignature } from '../ai-signature-scan';

describe('scanAISignature', () => {
  // 1) 정상 — 4종 패턴 모두 적중
  it('hedging/formulaic/tell/generic 패턴을 모두 검출한다', () => {
    const text =
      '그는 슬픈 듯 보였다. 하늘은 붉은 같았다. 그것은 단순한 우연이 아니었다. ' +
      '나는 분노를 느꼈다. 그는 이렇게 생각했다. 모든 게 끝난 것이었다.';
    const r = scanAISignature(text);
    const kinds = new Set(r.hits.map((h) => h.kind));
    expect(kinds.has('hedging')).toBe(true);
    expect(kinds.has('formulaic')).toBe(true);
    expect(kinds.has('tell')).toBe(true);
    expect(kinds.has('generic')).toBe(true);
    expect(r.score).toBeGreaterThan(0);
  });

  // 2) 빈 입력 — score 0, hits 빈 배열
  it('빈 문자열은 score 0 + 빈 hits 반환', () => {
    const r = scanAISignature('');
    expect(r.score).toBe(0);
    expect(r.hits).toEqual([]);
  });

  // 3) 이상값 — null/undefined/비문자열 가드
  it('null/undefined/숫자 입력에도 크래시 없이 빈 결과 반환', () => {
    // @ts-expect-error 의도적 잘못된 타입 주입
    expect(scanAISignature(null)).toEqual({ hits: [], score: 0 });
    // @ts-expect-error 의도적 잘못된 타입 주입
    expect(scanAISignature(undefined)).toEqual({ hits: [], score: 0 });
    // @ts-expect-error 의도적 잘못된 타입 주입
    expect(scanAISignature(12345)).toEqual({ hits: [], score: 0 });
  });

  // 4) 인간적 텍스트 — 시그니처 없으면 score 낮음(0)
  it('시그니처 없는 본문은 score 0 + hits 없음', () => {
    const text = '칼날이 빛을 갈랐다. 피가 튀었고, 비명이 골목을 메웠다. 그는 달렸다.';
    const r = scanAISignature(text);
    expect(r.hits).toHaveLength(0);
    expect(r.score).toBe(0);
  });

  // 5) 카운트 누적 + 내림차순 정렬
  it('동일 패턴 반복 시 count 누적되고 내림차순 정렬된다', () => {
    const text = '느꼈다 느꼈다 느꼈다. 같았다. 같았다.';
    const r = scanAISignature(text);
    const tell = r.hits.find((h) => h.pattern === '느꼈다');
    expect(tell?.count).toBe(3);
    // 첫 항목이 가장 큰 count
    for (let i = 1; i < r.hits.length; i++) {
      expect(r.hits[i - 1].count).toBeGreaterThanOrEqual(r.hits[i].count);
    }
  });

  // 6) 경계 — score 상한 100 클램프(시그니처 밀도 과다)
  it('시그니처 밀도가 매우 높아도 score는 100을 넘지 않는다', () => {
    // 문장부호 없이 시그니처만 다량 → ratio 폭증 유도
    const text = '느꼈다같았다듯했다것이었다뿐이었다느꼈다같았다듯했다것이었다뿐이었다';
    const r = scanAISignature(text);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThan(0);
  });

  // 7) 'A가 아니라 B' formulaic 단독 검출
  it("'A가 아니라 B' 구문을 formulaic으로 분류한다", () => {
    const r = scanAISignature('그것은 끝이 아니라 시작이었다.');
    const f = r.hits.find((h) => h.pattern === 'A가 아니라 B');
    expect(f).toBeDefined();
    expect(f?.kind).toBe('formulaic');
  });

  // 8) 공백만 있는 입력 — score 0
  it('공백만 있는 입력은 score 0', () => {
    const r = scanAISignature('   \n  \t ');
    expect(r.score).toBe(0);
    expect(r.hits).toHaveLength(0);
  });
});
