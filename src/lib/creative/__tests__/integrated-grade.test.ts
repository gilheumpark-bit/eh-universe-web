import {
  computeIntegratedGrade,
  WEIGHTS,
  type AxisScores,
  type Grade,
} from '@/lib/creative/integrated-grade';

// 6축을 동일 값으로 채우는 헬퍼 (가중치 합=1 이므로 weighted == v)
function uniform(v: number): AxisScores {
  return { world: v, character: v, scene: v, direction: v, writing: v, revision: v };
}

describe('computeIntegratedGrade — 통합등급 산식', () => {
  // --- 정상: 등급 경계별 매핑 ---
  it('90+ 균등 점수는 대성공', () => {
    const r = computeIntegratedGrade(uniform(95));
    expect(r.weighted).toBe(95);
    expect(r.grade).toBe<Grade>('대성공');
  });

  it('75~89 균등 점수는 성공상위', () => {
    expect(computeIntegratedGrade(uniform(80)).grade).toBe<Grade>('성공상위');
  });

  it('60~74 균등 점수는 성공', () => {
    expect(computeIntegratedGrade(uniform(65)).grade).toBe<Grade>('성공');
  });

  it('60 미만 균등 점수는 평작', () => {
    expect(computeIntegratedGrade(uniform(50)).grade).toBe<Grade>('평작');
  });

  // --- 가중치 검증 ---
  it('WEIGHTS 합은 정확히 1', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('가중 평균이 단순 평균과 다르게 반영된다 (집필 비중 확인)', () => {
    // 집필만 100, 나머지 0 → weighted = 100 * 0.25 = 25
    const r = computeIntegratedGrade({
      world: 0,
      character: 0,
      scene: 0,
      direction: 0,
      writing: 100,
      revision: 0,
    });
    expect(r.weighted).toBe(25);
    expect(r.weakest).not.toBe('집필'); // 집필은 최약축이 아님
  });

  // --- cap 강등 규칙 ---
  it('한 축이 40 미만이면 등급 한 단계 강등', () => {
    // 5축 100, 1축 39 → weighted 높지만 cap 발동
    const noCapHigh = computeIntegratedGrade({
      world: 100,
      character: 100,
      scene: 100,
      direction: 100,
      writing: 100,
      revision: 100,
    });
    expect(noCapHigh.grade).toBe<Grade>('대성공');

    const capped = computeIntegratedGrade({
      world: 100,
      character: 100,
      scene: 100,
      direction: 100,
      writing: 100,
      revision: 39, // < 40
    });
    // weighted = 100*0.9 + 39*0.1 = 93.9 → base 대성공 → 강등 → 성공상위
    expect(capped.weighted).toBeCloseTo(93.9, 5);
    expect(capped.grade).toBe<Grade>('성공상위');
    expect(capped.weakest).toBe('퇴고');
  });

  it('이미 평작인데 cap 발동해도 평작 유지 (하한 클램프)', () => {
    const r = computeIntegratedGrade({
      world: 30,
      character: 30,
      scene: 30,
      direction: 30,
      writing: 30,
      revision: 30,
    });
    expect(r.grade).toBe<Grade>('평작');
  });

  it('cap 임계 경계값 40 정확히는 강등 없음 (< 40 만 강등)', () => {
    const r = computeIntegratedGrade({
      world: 100,
      character: 100,
      scene: 100,
      direction: 100,
      writing: 100,
      revision: 40, // 정확히 40 → 강등 안 함
    });
    // weighted = 100*0.9 + 40*0.1 = 94 → 대성공 유지
    expect(r.weighted).toBe(94);
    expect(r.grade).toBe<Grade>('대성공');
  });

  // --- 최약축(weakest) ---
  it('최저 점수 축의 라벨을 weakest로 반환', () => {
    const r = computeIntegratedGrade({
      world: 90,
      character: 90,
      scene: 90,
      direction: 90,
      writing: 90,
      revision: 12, // 최저
    });
    expect(r.weakest).toBe('퇴고');
  });

  // --- 이상값/방어 ---
  it('100 초과 / 음수 점수는 clamp 후 산정', () => {
    const r = computeIntegratedGrade({
      world: 999,
      character: -50,
      scene: 100,
      direction: 100,
      writing: 100,
      revision: 100,
    });
    // world→100, character→0(최약, cap 발동)
    expect(r.weakest).toBe('캐릭터');
    // weighted = (100*0.15)+(0*0.25)+(100*0.1)+(100*0.15)+(100*0.25)+(100*0.1)=75
    expect(r.weighted).toBe(75);
    // base 성공상위 → character 0 < 40 → 강등 → 성공
    expect(r.grade).toBe<Grade>('성공');
  });

  it('NaN / Infinity 점수는 0으로 흡수', () => {
    const r = computeIntegratedGrade({
      world: NaN,
      character: Infinity,
      scene: -Infinity,
      direction: 100,
      writing: 100,
      revision: 100,
    });
    // NaN→0, Infinity→100? 아님: Infinity는 finite 아님 → 0
    // world 0, character 0, scene 0
    expect(r.weighted).toBe(
      Math.round((0 * 0.15 + 0 * 0.25 + 0 * 0.1 + 100 * 0.15 + 100 * 0.25 + 100 * 0.1) * 10) / 10,
    );
    expect(r.grade).toBe<Grade>('평작');
  });

  it('빈 객체 입력은 전 축 0 → 평작, 첫 축 weakest', () => {
    const r = computeIntegratedGrade({} as AxisScores);
    expect(r.weighted).toBe(0);
    expect(r.grade).toBe<Grade>('평작');
    expect(r.weakest).toBe('세계관');
  });

  it('null / undefined 입력도 크래시 없이 평작 반환', () => {
    expect(computeIntegratedGrade(null as unknown as AxisScores).grade).toBe<Grade>('평작');
    expect(computeIntegratedGrade(undefined as unknown as AxisScores).weighted).toBe(0);
  });

  it('전 축 만점 균등은 대성공이며 weighted 100', () => {
    const r = computeIntegratedGrade(uniform(100));
    expect(r.weighted).toBe(100);
    expect(r.grade).toBe<Grade>('대성공');
  });
});
