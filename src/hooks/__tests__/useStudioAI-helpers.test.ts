/**
 * useStudioAI temperature 통합 연결 테스트.
 * computeTemperature / getTemperatureOverride가 올바른 경로에서
 * import되는지 확인하고, 훅이 의존하는 순수 함수들의 동작을 검증한다.
 */
import { computeTemperature, getTemperatureOverride } from '@/lib/temperature-settings';

describe('useStudioAI — temperature helpers', () => {
  afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  test('computeTemperature를 @/lib/temperature-settings에서 import할 수 있다', () => {
    expect(typeof computeTemperature).toBe('function');
  });

  test('getTemperatureOverride를 @/lib/temperature-settings에서 import할 수 있다', () => {
    expect(typeof getTemperatureOverride).toBe('function');
  });

  test('localStorage 미설정 시 computeTemperature는 genre 온도를 그대로 사용', () => {
    const genreTemp = 0.95; // 예: THRILLER
    const depth = 1.0;     // 중립 depth
    const result = computeTemperature(genreTemp, depth, getTemperatureOverride());
    // override 없고 depth=1.0 → 보정 0 → 0.95
    expect(result).toBeCloseTo(0.95, 5);
  });

  test('localStorage에 온도가 있으면 override로 사용', () => {
    localStorage.setItem('noa_temperature', '0.7');
    const genreTemp = 0.95;
    const depth = 1.0;
    const result = computeTemperature(genreTemp, depth, getTemperatureOverride());
    // override=0.7, depth=1.0 → 0.7
    expect(result).toBeCloseTo(0.7, 5);
  });

  test('depth=1.5 + override 없으면 genre 온도에서 0.2 상승', () => {
    const genreTemp = 0.82;
    const depth = 1.5;
    const result = computeTemperature(genreTemp, depth, undefined);
    // 0.82 + (1.5 - 1.0) * 0.4 = 0.82 + 0.2 = 1.02
    expect(result).toBeCloseTo(1.02, 5);
  });

  test('depth=0.9 + override 없으면 genre 온도에서 0.04 하락', () => {
    const genreTemp = 0.82;
    const depth = 0.9;
    const result = computeTemperature(genreTemp, depth, undefined);
    // 0.82 + (0.9 - 1.0) * 0.4 = 0.82 - 0.04 = 0.78
    expect(result).toBeCloseTo(0.78, 5);
  });

  test('결과는 항상 [0.1, 1.5] 범위 내', () => {
    const extremeHigh = computeTemperature(1.5, 1.5, 2.0);
    const extremeLow = computeTemperature(0.1, 0.9, -1.0);
    expect(extremeHigh).toBeLessThanOrEqual(1.5);
    expect(extremeLow).toBeGreaterThanOrEqual(0.1);
  });
});
