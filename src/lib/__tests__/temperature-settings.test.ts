import { computeTemperature, getTemperatureOverride } from '../temperature-settings';

// ============================================================
// computeTemperature 순수 함수 테스트
// ============================================================

describe('computeTemperature', () => {
  test('override 없을 때 genre 기반 온도 반환 (depth=1.0이면 보정 0)', () => {
    const result = computeTemperature(0.82, 1.0, undefined);
    // depth 1.0 → 보정 = (1.0 - 1.0) * 0.4 = 0 → 0.82 그대로
    expect(result).toBeCloseTo(0.82, 5);
  });

  test('override 값이 있으면 override 우선 적용 (genre 무시)', () => {
    const result = computeTemperature(0.82, 1.0, 1.2);
    // base=1.2, depth=1.0 → 보정 0 → 1.2
    expect(result).toBeCloseTo(1.2, 5);
  });

  test('결과는 항상 0.1 이상 (최솟값 클램프)', () => {
    // override=-5, depth=0.9 → 극단적으로 낮은 값
    const result = computeTemperature(0.5, 0.9, -5);
    expect(result).toBeGreaterThanOrEqual(0.1);
  });

  test('결과는 항상 1.5 이하 (최댓값 클램프)', () => {
    // override=2.0, depth=1.5 → 2.0 + 0.2 = 2.2 → 클램프 → 1.5
    const result = computeTemperature(0.82, 1.5, 2.0);
    expect(result).toBeLessThanOrEqual(1.5);
  });

  test('narrativeDepth가 높으면 온도 상승 (depth 1.0 → 1.5 비교)', () => {
    const low = computeTemperature(0.82, 1.0, undefined);
    const high = computeTemperature(0.82, 1.5, undefined);
    expect(high).toBeGreaterThan(low);
  });

  test('narrativeDepth 0.9이면 온도 하락 (depth 0.9 → baseline 1.0 비교)', () => {
    const baseline = computeTemperature(0.82, 1.0, undefined);
    const shallow = computeTemperature(0.82, 0.9, undefined);
    expect(shallow).toBeLessThan(baseline);
  });

  test('override가 NaN이면 genreBaseTemp 사용', () => {
    const result = computeTemperature(0.82, 1.0, NaN);
    expect(result).toBeCloseTo(0.82, 5);
  });
});

// ============================================================
// getTemperatureOverride — SSR 환경 (window 미정의) 처리
// ============================================================

describe('getTemperatureOverride', () => {
  afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  // SSR 케이스(window undefined)는 jest 30+ jsdom에서 window 재정의 불가능 —
  // 함수 내부 `typeof window !== 'undefined'` 가드는 직접 검증이 아닌
  // 구현 코드 검사로 대체 (implementation 확인)

  test('localStorage에 값이 없으면 undefined 반환', () => {
    localStorage.removeItem('noa_temperature');
    expect(getTemperatureOverride()).toBeUndefined();
  });

  test('유효한 숫자 문자열이 있으면 number 반환', () => {
    localStorage.setItem('noa_temperature', '1.1');
    expect(getTemperatureOverride()).toBeCloseTo(1.1, 5);
  });

  test('파싱 불가 문자열이면 undefined 반환', () => {
    localStorage.setItem('noa_temperature', 'notanumber');
    expect(getTemperatureOverride()).toBeUndefined();
  });

  test('빈 문자열이면 undefined 반환', () => {
    localStorage.setItem('noa_temperature', '');
    expect(getTemperatureOverride()).toBeUndefined();
  });

  test('0 값도 유효한 숫자로 반환', () => {
    localStorage.setItem('noa_temperature', '0');
    expect(getTemperatureOverride()).toBe(0);
  });
});
