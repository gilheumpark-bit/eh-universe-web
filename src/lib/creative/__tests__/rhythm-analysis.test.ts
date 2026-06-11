// ============================================================
// rhythm-analysis 테스트 — 정상·빈입력·경계·이상값 커버
// ============================================================

import {
  analyzeRhythm,
  compareEpisodes,
} from '@/lib/creative/rhythm-analysis';

describe('analyzeRhythm — 거시/미시 단일 분석', () => {
  it('정상: 여러 문장+단락을 거시/미시로 계측한다', () => {
    const text = '짧다. 조금 더 긴 문장이다.\n\n새 단락의 문장이다!';
    const r = analyzeRhythm(text);
    // 문장 3개로 분해
    expect(r.micro.sentenceLengths).toHaveLength(3);
    // 단락 2개(빈 줄 기준)
    expect(r.macro.paragraphCount).toBe(2);
    // 평균 길이 양수
    expect(r.macro.avgLen).toBeGreaterThan(0);
    // 길이가 들쭉날쭉하므로 변동계수 > 0
    expect(r.micro.burstiness).toBeGreaterThan(0);
  });

  it('빈입력: 빈 문자열은 모든 수치 0, 배열 빈', () => {
    const r = analyzeRhythm('');
    expect(r.macro.avgLen).toBe(0);
    expect(r.macro.paragraphCount).toBe(0);
    expect(r.micro.sentenceLengths).toEqual([]);
    expect(r.micro.burstiness).toBe(0);
  });

  it('경계: 공백/개행만 있는 입력도 0으로 방어', () => {
    const r = analyzeRhythm('   \n\n  \t ');
    expect(r.macro.paragraphCount).toBe(0);
    expect(r.micro.sentenceLengths).toEqual([]);
    expect(r.micro.burstiness).toBe(0);
  });

  it('경계: 균일한 길이의 문장은 burstiness 0', () => {
    // 동일 길이 문장 3개 → 변동계수 0
    const text = '가나다라. 마바사아. 자차카타.';
    const r = analyzeRhythm(text);
    expect(r.micro.sentenceLengths).toEqual([4, 4, 4]);
    expect(r.micro.burstiness).toBe(0);
  });

  it('경계: 종결부호 없는 단일 문장은 단락 1, 문장 1', () => {
    const r = analyzeRhythm('종결 부호 없는 한 줄');
    expect(r.macro.paragraphCount).toBe(1);
    expect(r.micro.sentenceLengths).toHaveLength(1);
    expect(r.micro.burstiness).toBe(0);
  });

  it('이상값: 극단적 길이 편차는 큰 burstiness 산출', () => {
    // 1자 vs 매우 긴 문장 → CV 큼
    const text = '아. ' + '글'.repeat(200) + '.';
    const r = analyzeRhythm(text);
    expect(r.micro.sentenceLengths[0]).toBe(1);
    expect(r.micro.sentenceLengths[1]).toBe(200);
    expect(r.micro.burstiness).toBeGreaterThan(0.5);
  });

  it('방어: null/undefined 유사 입력도 안전(타입 강제 우회)', () => {
    // 런타임에서 비문자열이 흘러와도 0 방어
    const r = analyzeRhythm(undefined as unknown as string);
    expect(r.macro.avgLen).toBe(0);
    expect(r.micro.sentenceLengths).toEqual([]);
  });
});

describe('compareEpisodes — 대조 렌즈', () => {
  it('정상: B가 더 들쭉날쭉하면 deltaBurstiness 양수 + 리듬 다양성 증가', () => {
    const a = '가나다라. 마바사아. 자차카타.'; // 균일(burstiness 0)
    const b = '아. ' + '글'.repeat(100) + '. 끝.'; // 편차 큼
    const c = compareEpisodes(a, b);
    expect(c.deltaBurstiness).toBeGreaterThan(0);
    expect(c.verdict).toContain('리듬 다양성 증가');
  });

  it('빈입력: 둘 다 빈 문자열이면 delta 0 + 리듬/길이 유지', () => {
    const c = compareEpisodes('', '');
    expect(c.deltaAvgLen).toBe(0);
    expect(c.deltaBurstiness).toBe(0);
    expect(c.verdict).toBe('리듬 유지 · 평균 길이 유지');
  });

  it('경계: 평균 길이가 5자 초과 늘면 문장 늘어짐 판정', () => {
    const a = '짧다.'; // avgLen 작음
    const b = '아주아주아주아주 길게 늘어지는 한 문장으로 작성된 본문이다.';
    const c = compareEpisodes(a, b);
    expect(c.deltaAvgLen).toBeGreaterThan(5);
    expect(c.verdict).toContain('문장 늘어짐');
  });

  it('대칭: A↔B 교환 시 delta 부호가 반전된다', () => {
    const a = '가나다라. 마바사아. 자차카타.';
    const b = '아. ' + '글'.repeat(100) + '. 끝.';
    const ab = compareEpisodes(a, b);
    const ba = compareEpisodes(b, a);
    expect(ba.deltaBurstiness).toBeCloseTo(-ab.deltaBurstiness, 4);
    expect(ba.deltaAvgLen).toBe(-ab.deltaAvgLen);
  });
});
