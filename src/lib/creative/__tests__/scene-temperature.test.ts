// ============================================================
// scene-temperature 단위 테스트
// 정상 / 빈입력 / 경계 / 이상값 커버
// ============================================================

import {
  TEMPERATURE_SPEC,
  temperatureLabel,
  temperatureToDirection,
  buildTensionCurve,
  type SceneTemperature,
} from '../scene-temperature';

describe('TEMPERATURE_SPEC', () => {
  it('5개 온도 전부 매핑 + 고온일수록 카메라 근접(D-내림) & 검증 강화', () => {
    const order: SceneTemperature[] = ['cold', 'cool', 'warm', 'hot', 'blazing'];
    expect(Object.keys(TEMPERATURE_SPEC).sort()).toEqual([...order].sort());
    // 저온은 정보/원경/느슨, 고온은 체험/근접/엄격
    expect(TEMPERATURE_SPEC.cold.cameraDistance).toBe('D5');
    expect(TEMPERATURE_SPEC.cold.mode).toBe('info');
    expect(TEMPERATURE_SPEC.cold.verificationStrict).toBe(false);
    expect(TEMPERATURE_SPEC.blazing.cameraDistance).toBe('D1');
    expect(TEMPERATURE_SPEC.blazing.mode).toBe('experience');
    expect(TEMPERATURE_SPEC.blazing.verificationStrict).toBe(true);
  });
});

describe('temperatureLabel', () => {
  it('정상: 4언어 라벨 반환', () => {
    expect(temperatureLabel('blazing', 'ko')).toBe('작열');
    expect(temperatureLabel('blazing', 'en')).toBe('Blazing');
    expect(temperatureLabel('warm', 'ja')).toBe('温');
    expect(temperatureLabel('cool', 'zh')).toBe('凉');
  });

  it('이상값: 알 수 없는 언어 → ko 폴백 / 알 수 없는 온도 → 빈 문자열', () => {
    // @ts-expect-error 의도적 비표준 언어
    expect(temperatureLabel('warm', 'fr')).toBe('온화');
    // @ts-expect-error 의도적 비표준 온도
    expect(temperatureLabel('molten', 'ko')).toBe('');
  });
});

describe('temperatureToDirection', () => {
  it('정상: hot은 체험·근접·엄격', () => {
    const d = temperatureToDirection('hot');
    expect(d.cameraDistance).toBe('D2');
    expect(d.mode).toBe('experience');
    expect(d.verificationStrict).toBe(true);
    expect(typeof d.hint).toBe('string');
    expect(d.hint.length).toBeGreaterThan(0);
  });

  it('이상값: 알 수 없는 온도 → cold 기본값', () => {
    // @ts-expect-error 의도적 비표준 온도
    const d = temperatureToDirection(undefined);
    expect(d.cameraDistance).toBe('D5');
    expect(d.mode).toBe('info');
    expect(d.verificationStrict).toBe(false);
  });
});

describe('buildTensionCurve', () => {
  it('빈입력/경계: episodeCount<=0 → []', () => {
    expect(buildTensionCurve(0)).toEqual([]);
    expect(buildTensionCurve(-5)).toEqual([]);
    expect(buildTensionCurve(NaN)).toEqual([]);
    expect(buildTensionCurve(Infinity)).toEqual([]);
  });

  it('경계: 단일 에피소드 → [blazing]', () => {
    expect(buildTensionCurve(1)).toEqual(['blazing']);
  });

  it('정상: 곡선은 도입(저온)에서 시작하고 정확히 하나의 blazing(절정)을 포함', () => {
    const curve = buildTensionCurve(10);
    expect(curve).toHaveLength(10);
    expect(curve.filter((t) => t === 'blazing')).toHaveLength(1);
    // 첫 화는 절정이 아님 (도입은 저온)
    expect(curve[0]).not.toBe('blazing');
    expect(['cold', 'cool', 'warm']).toContain(curve[0]);
  });

  it('정상: climaxAt 지정 시 해당 위치(1-기반)에 blazing', () => {
    const curve = buildTensionCurve(8, 3);
    expect(curve[2]).toBe('blazing');
    expect(curve.filter((t) => t === 'blazing')).toHaveLength(1);
  });

  it('이상값: climaxAt 범위 밖(0, 999, 음수) → 자동 배치로 폴백, 길이/절정 유지', () => {
    for (const bad of [0, 999, -3, 2.5]) {
      const curve = buildTensionCurve(6, bad);
      expect(curve).toHaveLength(6);
      expect(curve.filter((t) => t === 'blazing').length).toBeGreaterThanOrEqual(1);
    }
  });

  it('정상: 비정수 episodeCount는 floor 적용', () => {
    expect(buildTensionCurve(4.9)).toHaveLength(4);
  });
});
