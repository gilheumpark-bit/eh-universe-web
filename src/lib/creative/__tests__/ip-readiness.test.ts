import {
  computeIPReadiness,
  IP_WEIGHTS,
  type IPReadinessParts,
  type IPTier,
} from '@/lib/creative/ip-readiness';

// 5축을 동일 값으로 채우는 헬퍼 (가중치 합=100 이므로 score == v, cap 미발동 시)
function uniform(v: number): IPReadinessParts {
  return {
    rights: v,
    market: v,
    adaptation: v,
    assetPackage: v,
    riskControl: v,
  };
}

describe('computeIPReadiness — IP 준비도 산식', () => {
  // --- 가중치 검증 ---
  it('IP_WEIGHTS 합은 정확히 100', () => {
    const sum = Object.values(IP_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  // --- 정상: tier 경계별 매핑 (cap 미발동 영역) ---
  it('85+ 균등 점수는 tier A', () => {
    const r = computeIPReadiness(uniform(90));
    expect(r.score).toBe(90);
    expect(r.tier).toBe<IPTier>('A');
  });

  it('75~84 균등 점수는 tier B', () => {
    const r = computeIPReadiness(uniform(80));
    expect(r.score).toBe(80);
    expect(r.tier).toBe<IPTier>('B');
  });

  it('60~74 균등 점수는 tier C', () => {
    const r = computeIPReadiness(uniform(70));
    expect(r.score).toBe(70);
    expect(r.tier).toBe<IPTier>('C');
  });

  it('전 축 만점 균등은 tier A이며 score 100', () => {
    const r = computeIPReadiness(uniform(100));
    expect(r.score).toBe(100);
    expect(r.tier).toBe<IPTier>('A');
  });

  // --- tier 경계값 정밀 ---
  it('tier 경계값 정확히: 85→A · 75→B · 60→C · 45→D · 44.9→E', () => {
    expect(computeIPReadiness(uniform(85)).tier).toBe<IPTier>('A');
    expect(computeIPReadiness(uniform(75)).tier).toBe<IPTier>('B');
    // 60 균등이면 rights 60 → RIGHTS_GATE 미발동, score 60 → C
    expect(computeIPReadiness(uniform(60)).tier).toBe<IPTier>('C');
    expect(computeIPReadiness(uniform(45)).tier).toBe<IPTier>('D');
    // 44.9 → cap 영향 없음(rights 44.9<60 이지만 cap 69 상한은 이미 충족), E
    expect(computeIPReadiness(uniform(44.9)).tier).toBe<IPTier>('E');
  });

  // --- 가중치 비대칭 검증 ---
  it('rights/adaptation 비중(25)이 riskControl(10)보다 크게 반영', () => {
    // adaptation만 100, 나머지 0 → score = 100 * 25/100 = 25
    const r = computeIPReadiness({
      rights: 0,
      market: 0,
      adaptation: 100,
      assetPackage: 0,
      riskControl: 0,
    });
    // 단, rights 0<60 → cap 69, riskControl 0<50 → cap 59. min → 25 (이미 낮아 cap 무영향)
    expect(r.score).toBe(25);
    expect(r.breakdown.weighted.adaptation).toBe(25);
    expect(r.breakdown.weighted.riskControl).toBe(0);
  });

  // --- cap 규칙: rights<60 ---
  it('rights<60 이면 score는 69 상한 (높은 다른 축 무력화)', () => {
    // rights 50(<60), 나머지 100 → 미적용 score = 50*0.25 + 100*0.75 = 87.5
    // rights cap → min(69, 87.5) = 69. riskControl 100 → RISK cap 미발동
    const r = computeIPReadiness({
      rights: 50,
      market: 100,
      adaptation: 100,
      assetPackage: 100,
      riskControl: 100,
    });
    expect(r.score).toBe(69);
    expect(r.tier).toBe<IPTier>('C'); // 69 → C
  });

  it('rights 정확히 60이면 RIGHTS_GATE 미발동 (< 60 만 cap)', () => {
    // rights 60, 나머지 100 → score = 60*0.25 + 100*0.75 = 90 → cap 없음 A
    const r = computeIPReadiness({
      rights: 60,
      market: 100,
      adaptation: 100,
      assetPackage: 100,
      riskControl: 100,
    });
    expect(r.score).toBe(90);
    expect(r.tier).toBe<IPTier>('A');
  });

  // --- cap 규칙: riskControl<50 ---
  it('riskControl<50 이면 score는 59 상한', () => {
    // riskControl 40(<50), 나머지 100 → 미적용 = 100*0.9 + 40*0.1 = 94
    // rights 100 → RIGHTS cap 미발동. risk cap → min(59, 94) = 59
    const r = computeIPReadiness({
      rights: 100,
      market: 100,
      adaptation: 100,
      assetPackage: 100,
      riskControl: 40,
    });
    expect(r.score).toBe(59);
    expect(r.tier).toBe<IPTier>('D'); // 59 → D
  });

  it('riskControl 정확히 50이면 RISK_GATE 미발동 (< 50 만 cap)', () => {
    // riskControl 50, 나머지 100 → score = 100*0.9 + 50*0.1 = 95 → A
    const r = computeIPReadiness({
      rights: 100,
      market: 100,
      adaptation: 100,
      assetPackage: 100,
      riskControl: 50,
    });
    expect(r.score).toBe(95);
    expect(r.tier).toBe<IPTier>('A');
  });

  // --- cap 동시 발동: 더 낮은 상한 우선 ---
  it('rights<60 AND riskControl<50 동시 → 더 낮은 상한(59) 우선', () => {
    // rights 50, riskControl 40, 나머지 100
    // 미적용 = 50*0.25 + 100*0.45 + 40*0.1 = 12.5 + 45 + 4 = 61.5
    // rights cap → min(69, 61.5)=61.5, risk cap → min(59, 61.5)=59
    const r = computeIPReadiness({
      rights: 50,
      market: 100,
      adaptation: 100,
      assetPackage: 100,
      riskControl: 40,
    });
    expect(r.score).toBe(59);
    expect(r.tier).toBe<IPTier>('D');
  });

  // --- breakdown 정확성 ---
  it('breakdown.raw 와 weighted 가 정확히 분해된다', () => {
    const r = computeIPReadiness(uniform(80));
    expect(r.breakdown.raw.rights).toBe(80);
    expect(r.breakdown.raw.riskControl).toBe(80);
    // rights weighted = 80 * 25 / 100 = 20
    expect(r.breakdown.weighted.rights).toBe(20);
    // riskControl weighted = 80 * 10 / 100 = 8
    expect(r.breakdown.weighted.riskControl).toBe(8);
    // 전체 합 = 80
    const total = Object.values(r.breakdown.weighted).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(80, 5);
  });

  // --- 이상값/방어 ---
  it('100 초과 / 음수 점수는 clamp 후 산정', () => {
    const r = computeIPReadiness({
      rights: 999, // → 100
      market: -50, // → 0
      adaptation: 100,
      assetPackage: 100,
      riskControl: 100,
    });
    // score = 100*0.25 + 0*0.2 + 100*0.25 + 100*0.2 + 100*0.1 = 80
    expect(r.score).toBe(80);
    expect(r.tier).toBe<IPTier>('B');
    expect(r.breakdown.raw.rights).toBe(100);
    expect(r.breakdown.raw.market).toBe(0);
  });

  it('NaN / Infinity 점수는 0으로 흡수', () => {
    const r = computeIPReadiness({
      rights: NaN,
      market: Infinity,
      adaptation: -Infinity,
      assetPackage: 100,
      riskControl: 100,
    });
    // rights 0 → RIGHTS cap 발동, riskControl 100 → risk cap 미발동
    // 미적용 = 0 + 0 + 0 + 100*0.2 + 100*0.1 = 30
    // rights cap → min(69, 30) = 30 (이미 낮음)
    expect(r.score).toBe(30);
    expect(r.tier).toBe<IPTier>('E');
  });

  it('빈 객체 입력은 전 축 0 → score 0, tier E', () => {
    const r = computeIPReadiness({} as IPReadinessParts);
    expect(r.score).toBe(0);
    expect(r.tier).toBe<IPTier>('E');
    expect(r.breakdown.raw.rights).toBe(0);
  });

  it('null / undefined 입력도 크래시 없이 score 0 · tier E 반환', () => {
    const rn = computeIPReadiness(null as unknown as IPReadinessParts);
    expect(rn.score).toBe(0);
    expect(rn.tier).toBe<IPTier>('E');
    const ru = computeIPReadiness(undefined as unknown as IPReadinessParts);
    expect(ru.score).toBe(0);
    expect(ru.tier).toBe<IPTier>('E');
  });

  it('부동소수 잔차는 소수 1자리로 정리된다', () => {
    // rights 33, 나머지 0 → 33*0.25 = 8.25 (rights<60 cap 무영향)
    const r = computeIPReadiness({
      rights: 33,
      market: 0,
      adaptation: 0,
      assetPackage: 0,
      riskControl: 0,
    });
    expect(r.score).toBe(8.3); // round(8.25*10)/10 = round(82.5)/10 = 83/10 = 8.3
  });
});
