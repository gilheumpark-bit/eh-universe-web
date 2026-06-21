import { analyzeText, computeCPM, estimateMinutesToGoal, topRepeatedWords } from '../writing-stats';

describe('analyzeText', () => {
  it('빈 문자열 안전', () => {
    expect(analyzeText('')).toEqual({ chars: 0, sentences: 0, dialoguePct: 0, avgLen: 0, repetitionPct: 0 });
  });
  it('문장·대사·평균 산출', () => {
    const s = analyzeText('그는 걸었다. "안녕?" 그녀가 웃었다.');
    expect(s.chars).toBeGreaterThan(0);
    expect(s.sentences).toBe(3); // . ? .
    expect(s.dialoguePct).toBeGreaterThan(0); // "안녕?" 포함
    expect(s.avgLen).toBeGreaterThan(0);
  });
  it('반복어 비율 — 같은 단어 반복 시 상승', () => {
    expect(analyzeText('마법 마법 마법 마법').repetitionPct).toBeGreaterThan(50);
    expect(analyzeText('하늘 바다 숲 강').repetitionPct).toBe(0);
  });
});

describe('computeCPM', () => {
  it('분당 글자수', () => {
    expect(computeCPM(600, 60000)).toBe(600); // 600자 / 1분
    expect(computeCPM(300, 120000)).toBe(150); // 300자 / 2분
  });
  it('경계 — 0/음수 방어', () => {
    expect(computeCPM(0, 60000)).toBe(0);
    expect(computeCPM(100, 0)).toBe(0);
    expect(computeCPM(100, -5)).toBe(0);
  });
});

describe('estimateMinutesToGoal', () => {
  it('남은 분량 / 속도', () => {
    expect(estimateMinutesToGoal(1000, 5500, 300)).toBe(15); // 4500자 / 300cpm
  });
  it('도달·정지 시 null', () => {
    expect(estimateMinutesToGoal(5500, 5000, 300)).toBeNull();
    expect(estimateMinutesToGoal(1000, 5000, 0)).toBeNull();
  });
});

describe('topRepeatedWords', () => {
  it('2회+ 단어 빈도 내림차순', () => {
    const r = topRepeatedWords('검을 검을 검을 마법 마법 하늘', 5);
    expect(r[0]).toEqual({ word: '검을', count: 3 });
    expect(r[1]).toEqual({ word: '마법', count: 2 });
    expect(r.find((x) => x.word === '하늘')).toBeUndefined(); // 1회 제외
  });
  it('빈 입력 안전', () => {
    expect(topRepeatedWords('', 5)).toEqual([]);
  });
});
