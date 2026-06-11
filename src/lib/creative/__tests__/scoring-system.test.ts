import {
  scoreWorld,
  scoreLength,
  scoreGenreFit,
  type WorldParts,
  type LengthFormat,
} from '@/lib/creative/scoring-system';

// ============================================================
// scoreWorld — 세계관 가중 합산 (laws 0.3 · characters 0.3 · consistency 0.4)
// ============================================================
describe('scoreWorld — 세계관 점수', () => {
  it('전 요소 만점이면 100', () => {
    expect(scoreWorld({ laws: 100, characters: 100, consistency: 100 })).toBe(
      100,
    );
  });

  it('가중치가 반영된다 (consistency 0.4 비중 확인)', () => {
    // consistency만 100 → 100 * 0.4 = 40
    expect(scoreWorld({ laws: 0, characters: 0, consistency: 100 })).toBe(40);
    // laws만 100 → 100 * 0.3 = 30
    expect(scoreWorld({ laws: 100, characters: 0, consistency: 0 })).toBe(30);
  });

  it('100 초과 / 음수는 clamp 후 산정', () => {
    // laws 999→100, characters -50→0, consistency 100
    // = 100*0.3 + 0*0.3 + 100*0.4 = 70
    expect(scoreWorld({ laws: 999, characters: -50, consistency: 100 })).toBe(
      70,
    );
  });

  it('NaN / Infinity 요소는 0으로 흡수', () => {
    expect(
      scoreWorld({
        laws: NaN,
        characters: Infinity,
        consistency: -Infinity,
      }),
    ).toBe(0);
  });

  it('빈 객체 / 누락 키는 전 축 0 → 0점', () => {
    expect(scoreWorld({} as WorldParts)).toBe(0);
    expect(scoreWorld({ laws: 80 } as WorldParts)).toBe(24); // 80*0.3
  });

  it('null / undefined 입력도 크래시 없이 0', () => {
    expect(scoreWorld(null as unknown as WorldParts)).toBe(0);
    expect(scoreWorld(undefined as unknown as WorldParts)).toBe(0);
  });
});

// ============================================================
// scoreLength — 분량 범위 판정 (단편<15k · 중편15~50k · 장편50k+)
// ============================================================
describe('scoreLength — 분량 점수', () => {
  it('단편 범위 내(1~15k)는 100점·withinRange', () => {
    const r = scoreLength(10_000, 'short');
    expect(r.score).toBe(100);
    expect(r.withinRange).toBe(true);
    expect(r.note).toContain('단편');
  });

  it('중편 범위 내(15k~50k)는 100점', () => {
    const r = scoreLength(30_000, 'mid');
    expect(r.score).toBe(100);
    expect(r.withinRange).toBe(true);
  });

  it('장편 범위(50k+)는 상한 없음 — 큰 값도 100점', () => {
    const r = scoreLength(5_000_000, 'long');
    expect(r.score).toBe(100);
    expect(r.withinRange).toBe(true);
    expect(r.note).toContain('장편');
  });

  it('경계값: 단편 정확히 15,000자는 적합(상한 포함)', () => {
    expect(scoreLength(15_000, 'short').withinRange).toBe(true);
  });

  it('경계값: 중편 하한 15,000자 적합 · 장편 하한 50,000자 적합', () => {
    expect(scoreLength(15_000, 'mid').withinRange).toBe(true);
    expect(scoreLength(50_000, 'long').withinRange).toBe(true);
  });

  it('분량 부족 시 선형 감점 + 부족 안내', () => {
    // mid 하한 15,000, 실제 7,500 → 이탈 7,500/15,000=0.5 → 100*0.5=50
    const r = scoreLength(7_500, 'mid');
    expect(r.withinRange).toBe(false);
    expect(r.score).toBe(50);
    expect(r.note).toContain('부족');
  });

  it('분량 초과 시 선형 감점 + 초과 안내', () => {
    // short 상한 15,000, 실제 22,500 → 이탈 7,500/15,000=0.5 → 50
    const r = scoreLength(22_500, 'short');
    expect(r.withinRange).toBe(false);
    expect(r.score).toBe(50);
    expect(r.note).toContain('초과');
  });

  it('극단 초과는 0점으로 하한 클램프', () => {
    // short 상한 15,000, 실제 100,000 → 이탈 >1 → 0
    expect(scoreLength(100_000, 'short').score).toBe(0);
  });

  it('0자 / 음수 / NaN 글자수 방어 (크래시 없음)', () => {
    expect(scoreLength(0, 'mid').withinRange).toBe(false);
    expect(scoreLength(-100, 'short').score).toBeGreaterThanOrEqual(0);
    expect(() => scoreLength(NaN, 'long')).not.toThrow();
    expect(scoreLength(Infinity, 'short').withinRange).toBe(false);
  });

  it('비정상 포맷 문자열은 단편(short) 폴백', () => {
    const r = scoreLength(10_000, 'xxx' as LengthFormat);
    expect(r.note).toContain('단편');
    expect(r.withinRange).toBe(true);
  });
});

// ============================================================
// scoreGenreFit — 장르 기준점 + 템포 일치 가중
// ============================================================
describe('scoreGenreFit — 장르 적합 점수', () => {
  it('등록 장르 + 템포 완전 일치는 base보다 상승', () => {
    // fantasy base 70, tempo 1 → 70*0.55 + 100*1*0.45 = 38.5 + 45 = 83.5 → 84
    expect(scoreGenreFit('fantasy', 1)).toBe(84);
  });

  it('템포 0이면 base 비중만 (base * 0.55)', () => {
    // fantasy 70 * 0.55 = 38.5 → 39
    expect(scoreGenreFit('fantasy', 0)).toBe(39);
  });

  it('미등록 장르는 중립 기준점(55) 사용', () => {
    // 55 * 0.55 + 100*1*0.45 = 30.25 + 45 = 75.25 → 75
    expect(scoreGenreFit('unknown-genre', 1)).toBe(75);
  });

  it('대소문자 / 공백 정규화', () => {
    expect(scoreGenreFit('  FANTASY  ', 1)).toBe(scoreGenreFit('fantasy', 1));
  });

  it('tempoMatch 범위 밖(>1, 음수)은 clamp', () => {
    expect(scoreGenreFit('romance', 5)).toBe(scoreGenreFit('romance', 1));
    expect(scoreGenreFit('romance', -3)).toBe(scoreGenreFit('romance', 0));
  });

  it('NaN / Infinity 템포는 0으로 흡수', () => {
    expect(scoreGenreFit('hunter', NaN)).toBe(scoreGenreFit('hunter', 0));
    expect(scoreGenreFit('hunter', Infinity)).toBe(scoreGenreFit('hunter', 0));
  });

  it('빈 / 비문자열 genreId 방어 (중립 기준점)', () => {
    expect(scoreGenreFit('', 1)).toBe(75); // unknown 경로
    expect(scoreGenreFit(null as unknown as string, 1)).toBe(75);
    expect(() => scoreGenreFit(undefined as unknown as string, 0.5)).not.toThrow();
  });

  it('결과는 항상 0~100 정수 범위', () => {
    const r = scoreGenreFit('martial', 0.73);
    expect(Number.isInteger(r)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });
});
