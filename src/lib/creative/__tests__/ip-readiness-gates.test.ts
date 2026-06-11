import {
  evaluateReadinessGates,
  computeIPReadiness,
  READINESS_GATE_THRESHOLDS,
  READINESS_BAND_THRESHOLDS,
  type IPReadinessParts,
  type ReadinessGateEvidence,
  type ReadinessGateId,
  type ReadinessBandLabel,
} from '@/lib/creative/ip-readiness';

// 5축 동일 값 헬퍼 (가중치 합=100 → cap 미발동 시 score == v)
function uniform(v: number): IPReadinessParts {
  return {
    rights: v,
    market: v,
    adaptation: v,
    assetPackage: v,
    riskControl: v,
  };
}

// G0/G4/G5 비점수 증빙 완비 헬퍼
const FULL_EVIDENCE: ReadinessGateEvidence = {
  hasPremise: true,
  hasEnding: true,
  hasArc: true,
  hasRevisionLog: true,
  packageComplete: true,
  criticalRedFlags: 0,
};

function gateOf(
  r: ReturnType<typeof evaluateReadinessGates>,
  id: ReadinessGateId,
) {
  const g = r.gates.find((x) => x.id === id);
  if (!g) throw new Error(`gate ${id} 누락`);
  return g;
}

describe('evaluateReadinessGates — 6 Gate(G0~G5) 판정기', () => {
  // ============================================================
  // 사양 §4 판정 임계 (85/75/60/45/0) — 경계 위/아래
  // ============================================================
  describe('verdict band — 임계 경계값 85/75/60/45/0', () => {
    const cases: ReadonlyArray<[number, ReadinessBandLabel]> = [
      [85, '외부 영업 즉시 가능'],
      [84.9, '보강 후 피칭 가능'],
      [75, '보강 후 피칭 가능'],
      [74.9, '내부 패키지 보강'],
      [60, '내부 패키지 보강'],
      [59.9, '내부 보강 필요'],
      [45, '내부 보강 필요'],
      [44.9, '외부 제출 금지'],
      [0, '외부 제출 금지'],
      [100, '외부 영업 즉시 가능'],
    ];

    it.each(cases)('uniform(%p) → band "%s"', (v, label) => {
      const r = evaluateReadinessGates(uniform(v), 100, FULL_EVIDENCE);
      expect(r.verdict.score).toBe(v);
      expect(r.verdict.label).toBe(label);
    });

    it('band 임계 상수는 사양 §4 그대로 (85/75/60/45/0)', () => {
      expect(READINESS_BAND_THRESHOLDS.immediate).toBe(85);
      expect(READINESS_BAND_THRESHOLDS.pitchAfterFix).toBe(75);
      expect(READINESS_BAND_THRESHOLDS.internalPackage).toBe(60);
      expect(READINESS_BAND_THRESHOLDS.internalFix).toBe(45);
      expect(READINESS_BAND_THRESHOLDS.blocked).toBe(0);
    });

    it('verdict.score 는 기존 computeIPReadiness(cap 포함)와 동일', () => {
      // rights 50(<60) → cap 69 발동 케이스
      const parts: IPReadinessParts = {
        rights: 50,
        market: 100,
        adaptation: 100,
        assetPackage: 100,
        riskControl: 100,
      };
      const r = evaluateReadinessGates(parts, 100, FULL_EVIDENCE);
      expect(r.verdict.score).toBe(computeIPReadiness(parts).score);
      expect(r.verdict.score).toBe(69);
      expect(r.verdict.label).toBe('내부 패키지 보강'); // 60~74 band
    });
  });

  // ============================================================
  // 0점 / 만점 전이
  // ============================================================
  describe('0점 / 만점 전이', () => {
    it('전 축 0 + 증빙 없음 → score 0 · 외부 제출 금지 · gate G0(UNPROVEN) · 진입 불가', () => {
      const r = evaluateReadinessGates(uniform(0), 0);
      expect(r.verdict.score).toBe(0);
      expect(r.verdict.label).toBe('외부 제출 금지');
      expect(r.gate).toBe<ReadinessGateId>('G0');
      expect(gateOf(r, 'G0').status).toBe('UNPROVEN');
      expect(r.allPassed).toBe(false);
      expect(r.canEnterNextGate).toBe(false);
      expect(r.blocking.length).toBeGreaterThan(0);
    });

    it('전 축 0 + 증빙 완비 → G0 PASS, 첫 차단은 G1(권리성 FAIL)', () => {
      const r = evaluateReadinessGates(uniform(0), 0, FULL_EVIDENCE);
      expect(gateOf(r, 'G0').status).toBe('PASS');
      expect(r.gate).toBe<ReadinessGateId>('G1');
      expect(gateOf(r, 'G1').status).toBe('FAIL');
      expect(r.canEnterNextGate).toBe(false);
    });

    it('만점(전 축 100 + media-fit 100 + 증빙 완비) → 6 게이트 전부 PASS · G5 · 진입 가능', () => {
      const r = evaluateReadinessGates(uniform(100), 100, FULL_EVIDENCE);
      expect(r.allPassed).toBe(true);
      expect(r.gate).toBe<ReadinessGateId>('G5');
      expect(r.canEnterNextGate).toBe(true);
      expect(r.blocking).toEqual([]);
      expect(r.gates.every((g) => g.status === 'PASS')).toBe(true);
      expect(r.verdict.score).toBe(100);
      expect(r.verdict.label).toBe('외부 영업 즉시 가능');
    });
  });

  // ============================================================
  // 게이트별 통과 조건 (사양 §3 그대로: G1 70+ · G2 65+ · G3 75+)
  // ============================================================
  describe('게이트별 임계 — 사양 §3', () => {
    it('게이트 임계 상수는 사양 그대로 (70/65/75)', () => {
      expect(READINESS_GATE_THRESHOLDS.g1Rights).toBe(70);
      expect(READINESS_GATE_THRESHOLDS.g2Market).toBe(65);
      expect(READINESS_GATE_THRESHOLDS.g3MediaFit).toBe(75);
    });

    it('G1 권리성: rights 70 → PASS · 69.9 → FAIL', () => {
      const pass = evaluateReadinessGates(
        { ...uniform(100), rights: 70 },
        100,
        FULL_EVIDENCE,
      );
      expect(gateOf(pass, 'G1').status).toBe('PASS');

      const fail = evaluateReadinessGates(
        { ...uniform(100), rights: 69.9 },
        100,
        FULL_EVIDENCE,
      );
      expect(gateOf(fail, 'G1').status).toBe('FAIL');
      expect(fail.gate).toBe<ReadinessGateId>('G1');
      expect(gateOf(fail, 'G1').reason).toContain('자산 제외/대체/표기');
    });

    it('G2 시장성: market 65 → PASS · 64.9 → FAIL', () => {
      const pass = evaluateReadinessGates(
        { ...uniform(100), market: 65 },
        100,
        FULL_EVIDENCE,
      );
      expect(gateOf(pass, 'G2').status).toBe('PASS');

      const fail = evaluateReadinessGates(
        { ...uniform(100), market: 64.9 },
        100,
        FULL_EVIDENCE,
      );
      expect(gateOf(fail, 'G2').status).toBe('FAIL');
      expect(fail.gate).toBe<ReadinessGateId>('G2');
      expect(gateOf(fail, 'G2').reason).toContain('타겟/톤/샘플');
    });

    it('G3 매체 전환성: mediaFitAvg 75 → PASS (avg≥75 ⇒ max≥75 보장)', () => {
      const r = evaluateReadinessGates(uniform(100), 75, FULL_EVIDENCE);
      expect(gateOf(r, 'G3').status).toBe('PASS');
    });

    it('G3: mediaFitAvg 74.9 → UNPROVEN (평균만으로 "최소 1개 산업 75+" 증명 불가 → 보수 차단)', () => {
      const r = evaluateReadinessGates(uniform(100), 74.9, FULL_EVIDENCE);
      const g3 = gateOf(r, 'G3');
      expect(g3.status).toBe('UNPROVEN');
      expect(g3.reason).toContain('증명 불가');
      expect(r.gate).toBe<ReadinessGateId>('G3');
      expect(r.canEnterNextGate).toBe(false);
    });
  });

  // ============================================================
  // G0 / G4 / G5 — 비점수 증빙 게이트
  // ============================================================
  describe('증빙 게이트 G0/G4/G5', () => {
    it('G0: 4개 산출물 중 하나라도 false → FAIL + 사양 조치(인간 기여 로그 보강)', () => {
      const r = evaluateReadinessGates(uniform(100), 100, {
        ...FULL_EVIDENCE,
        hasRevisionLog: false,
      });
      const g0 = gateOf(r, 'G0');
      expect(g0.status).toBe('FAIL');
      expect(g0.reason).toContain('revision log');
      expect(g0.reason).toContain('인간 기여 로그');
      expect(r.gate).toBe<ReadinessGateId>('G0');
    });

    it('G0: false 없이 일부 미제공 → UNPROVEN (증명 불가 표기)', () => {
      const r = evaluateReadinessGates(uniform(100), 100, {
        ...FULL_EVIDENCE,
        hasArc: undefined,
      });
      const g0 = gateOf(r, 'G0');
      expect(g0.status).toBe('UNPROVEN');
      expect(g0.reason).toContain('arc');
    });

    it('G4: packageComplete false → FAIL(누락 파일 생성) · 미제공 → UNPROVEN', () => {
      const fail = evaluateReadinessGates(uniform(100), 100, {
        ...FULL_EVIDENCE,
        packageComplete: false,
      });
      expect(gateOf(fail, 'G4').status).toBe('FAIL');
      expect(gateOf(fail, 'G4').reason).toContain('누락 파일');

      const { packageComplete: _omit, ...rest } = FULL_EVIDENCE;
      const unproven = evaluateReadinessGates(uniform(100), 100, rest);
      expect(gateOf(unproven, 'G4').status).toBe('UNPROVEN');
    });

    it('G5: criticalRedFlags 0 → PASS · 1+ → FAIL(검토 보류) · 미제공/음수 → UNPROVEN', () => {
      const pass = evaluateReadinessGates(uniform(100), 100, FULL_EVIDENCE);
      expect(gateOf(pass, 'G5').status).toBe('PASS');

      const fail = evaluateReadinessGates(uniform(100), 100, {
        ...FULL_EVIDENCE,
        criticalRedFlags: 2,
      });
      expect(gateOf(fail, 'G5').status).toBe('FAIL');
      expect(gateOf(fail, 'G5').reason).toContain('검토 보류');
      expect(fail.gate).toBe<ReadinessGateId>('G5');

      const negative = evaluateReadinessGates(uniform(100), 100, {
        ...FULL_EVIDENCE,
        criticalRedFlags: -1,
      });
      expect(gateOf(negative, 'G5').status).toBe('UNPROVEN');
    });
  });

  // ============================================================
  // 순차 진행 · blocking 목록
  // ============================================================
  describe('순차 진행 · blocking', () => {
    it('복수 게이트 미통과 시 gate 는 첫 미통과, blocking 은 전체 사유 나열(G0→G5 순)', () => {
      const r = evaluateReadinessGates(
        { ...uniform(100), rights: 10, market: 10 },
        100,
        FULL_EVIDENCE,
      );
      expect(r.gate).toBe<ReadinessGateId>('G1');
      expect(r.blocking).toHaveLength(2);
      expect(r.blocking[0]).toMatch(/^G1 권리성:/);
      expect(r.blocking[1]).toMatch(/^G2 시장성:/);
    });

    it('gates 배열은 항상 G0→G5 6개 순서 고정', () => {
      const r = evaluateReadinessGates(uniform(50), 50);
      expect(r.gates.map((g) => g.id)).toEqual(['G0', 'G1', 'G2', 'G3', 'G4', 'G5']);
    });
  });

  // ============================================================
  // 방어 (이상값 · null) · confidence
  // ============================================================
  describe('방어 · confidence', () => {
    it('null parts / NaN mediaFitAvg 도 크래시 없이 보수 판정', () => {
      const r = evaluateReadinessGates(
        null as unknown as IPReadinessParts,
        NaN,
      );
      expect(r.verdict.score).toBe(0);
      expect(r.verdict.label).toBe('외부 제출 금지');
      expect(gateOf(r, 'G3').status).toBe('UNPROVEN'); // NaN → clamp 0 < 75
      expect(r.allPassed).toBe(false);
    });

    it('mediaFitAvg 100 초과는 clamp 후 판정 (999 → 100 → G3 PASS)', () => {
      const r = evaluateReadinessGates(uniform(100), 999, FULL_EVIDENCE);
      expect(gateOf(r, 'G3').status).toBe('PASS');
    });

    it('confidence: 증빙 0 → 0.55 · 증빙 완비 → 0.65 (자동 추정 한계 명시 범위)', () => {
      const none = evaluateReadinessGates(uniform(100), 100);
      expect(none.confidence).toBe(0.55);

      const full = evaluateReadinessGates(uniform(100), 100, FULL_EVIDENCE);
      expect(full.confidence).toBe(0.65);

      // 부분 증빙은 항상 0.55~0.65 사이
      const partial = evaluateReadinessGates(uniform(100), 100, {
        packageComplete: true,
      });
      expect(partial.confidence).toBeGreaterThanOrEqual(0.55);
      expect(partial.confidence).toBeLessThanOrEqual(0.65);
    });
  });

  // ============================================================
  // 기존 export 보존 (additive 회귀 가드)
  // ============================================================
  it('기존 computeIPReadiness 시그니처·산식은 변경 없음 (uniform 80 → score 80 · tier B)', () => {
    const r = computeIPReadiness(uniform(80));
    expect(r.score).toBe(80);
    expect(r.tier).toBe('B');
    expect(r.breakdown.weighted.rights).toBe(20);
  });
});
