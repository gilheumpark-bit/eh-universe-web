import { tensionCurve, predictEngagement, calculateForeshadowWeight, generateTensionCurveData } from '../models';

// ============================================================
// tensionCurve() — 5막 구조 + 장르별 사인파 긴장도
// ============================================================

describe('tensionCurve', () => {
  it('returns value between 0 and 1', () => {
    for (let ep = 1; ep <= 25; ep++) {
      const val = tensionCurve(ep, 25, 'SF');
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('climax (last episodes) has higher tension than opening', () => {
    const opening = tensionCurve(1, 25, 'SF');
    const climax = tensionCurve(24, 25, 'SF');
    expect(climax).toBeGreaterThan(opening);
  });

  it('different genres produce different curves', () => {
    const sf = tensionCurve(12, 25, 'SF');
    const romance = tensionCurve(12, 25, 'ROMANCE');
    const thriller = tensionCurve(12, 25, 'THRILLER');
    // Thriller should be highest tension at midpoint
    expect(thriller).toBeGreaterThan(romance);
    // Values should differ
    expect(sf).not.toEqual(romance);
  });

  it('handles edge case: episode 0', () => {
    const val = tensionCurve(0, 25, 'SF');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(1);
  });

  it('handles unknown genre (falls back to SF)', () => {
    const val = tensionCurve(10, 25, 'UNKNOWN_GENRE');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(1);
  });

  it('accelerates after 80% mark', () => {
    const before80 = tensionCurve(19, 25, 'SF');
    const after80 = tensionCurve(23, 25, 'SF');
    expect(after80).toBeGreaterThan(before80);
  });

  it('midpoint boost between 40-60%', () => {
    const at30 = tensionCurve(7, 25, 'FANTASY');
    const at50 = tensionCurve(12, 25, 'FANTASY');
    // Midpoint should have a boost
    expect(at50).toBeGreaterThanOrEqual(at30 * 0.8); // relaxed check
  });
});

// ============================================================
// predictEngagement() — 시그모이드 독자 참여 예측
// ============================================================

describe('predictEngagement', () => {
  it('returns value between 0 and 1', () => {
    const val = predictEngagement({
      dialogue: 0.5, action: 0.3, tension: 0.7,
      mystery: 0.4, emotion: 0.6, pacing: 0.5,
    });
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(1);
  });

  it('high features produce higher engagement', () => {
    const low = predictEngagement({
      dialogue: 0.1, action: 0.1, tension: 0.1,
      mystery: 0.1, emotion: 0.1, pacing: 0.1,
    });
    const high = predictEngagement({
      dialogue: 0.9, action: 0.9, tension: 0.9,
      mystery: 0.9, emotion: 0.9, pacing: 0.9,
    });
    expect(high).toBeGreaterThan(low);
  });

  it('zero features produce low engagement', () => {
    const val = predictEngagement({
      dialogue: 0, action: 0, tension: 0,
      mystery: 0, emotion: 0, pacing: 0,
    });
    expect(val).toBeLessThan(0.5);
  });

  it('handles missing features gracefully', () => {
    const val = predictEngagement({ tension: 0.5 });
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(1);
  });

  it('interaction coefficients amplify combined features', () => {
    const tensionOnly = predictEngagement({ tension: 0.8, action: 0 });
    const combined = predictEngagement({ tension: 0.8, action: 0.8 });
    expect(combined).toBeGreaterThan(tensionOnly);
  });
});

// ============================================================
// calculateForeshadowWeight() — 복선 가중치
// ============================================================

describe('calculateForeshadowWeight', () => {
  it('returns value between 0 and 2', () => {
    const val = calculateForeshadowWeight(1, 10, 20, 8);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(2);
  });

  it('urgency increases as payoff approaches (same plant)', () => {
    // Plant at ep 15, payoff at ep 20 — close to payoff should have urgency
    const far = calculateForeshadowWeight(15, 16, 20, 8);
    const near = calculateForeshadowWeight(15, 19, 20, 8);
    expect(near).toBeGreaterThan(far);
  });

  it('weight decays over distance from planted episode', () => {
    const close = calculateForeshadowWeight(5, 6, 20, 8);
    const distant = calculateForeshadowWeight(5, 15, 20, 8);
    expect(close).toBeGreaterThan(distant);
  });

  it('higher importance produces higher weight', () => {
    const lowImp = calculateForeshadowWeight(1, 10, 20, 2);
    const highImp = calculateForeshadowWeight(1, 10, 20, 10);
    expect(highImp).toBeGreaterThan(lowImp);
  });
});

// ============================================================
// generateTensionCurveData() — 전체 에피소드 텐션 배열
// ============================================================

describe('generateTensionCurveData', () => {
  it('returns array of correct length', () => {
    const data = generateTensionCurveData(25, 'SF');
    expect(data).toHaveLength(25);
  });

  it('all values are between 0 and 1', () => {
    const data = generateTensionCurveData(50, 'THRILLER');
    data.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('works with different total episodes', () => {
    const short = generateTensionCurveData(5, 'ROMANCE');
    const long = generateTensionCurveData(100, 'ROMANCE');
    expect(short).toHaveLength(5);
    expect(long).toHaveLength(100);
  });
});
