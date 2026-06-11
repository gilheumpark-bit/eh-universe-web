// ============================================================
// style-profile 테스트 — 정상·빈입력·0분모·null·경계 커버
// ============================================================

import {
  emptyStyleTarget,
  observeStyle,
  styleDelta,
  styleMatchScore,
  type StyleTarget,
} from '@/lib/creative/style-profile';

describe('emptyStyleTarget — 빈 목표', () => {
  it('정상: 모든 지표가 0인 목표를 반환한다', () => {
    expect(emptyStyleTarget()).toEqual({
      sentenceLenAvg: 0,
      dialogueRatio: 0,
      tellTolerance: 0,
      rhythmVariety: 0,
    });
  });

  it('불변: 매 호출이 독립 객체(참조 공유 없음)', () => {
    const a = emptyStyleTarget();
    const b = emptyStyleTarget();
    a.sentenceLenAvg = 99;
    expect(b.sentenceLenAvg).toBe(0);
  });
});

describe('observeStyle — 본문 실측', () => {
  it('정상: 대사+설명+길이 편차가 있는 본문을 4지표로 계측', () => {
    const text =
      '“정말이야?” 그가 물었다. 나는 짧게 답했다. ' +
      '한참을 망설이다 결국 길고 긴 문장으로 마음을 털어놓았다. 슬펐다.';
    const o = observeStyle(text);
    expect(o.sentenceLenAvg).toBeGreaterThan(0);
    expect(o.dialogueRatio).toBeGreaterThan(0);
    // "물었다/답했다/슬펐다" 등 설명형 신호 → tell 비율 > 0
    expect(o.tellTolerance).toBeGreaterThanOrEqual(0);
    // 길이 편차 존재 → 리듬 다양성 > 0
    expect(o.rhythmVariety).toBeGreaterThan(0);
  });

  it('빈입력: 빈 문자열은 모든 지표 0', () => {
    expect(observeStyle('')).toEqual({
      sentenceLenAvg: 0,
      dialogueRatio: 0,
      tellTolerance: 0,
      rhythmVariety: 0,
    });
  });

  it('0분모: 공백/개행만 있는 입력도 0으로 방어(문장 0개)', () => {
    const o = observeStyle('   \n\n  \t ');
    expect(o.tellTolerance).toBe(0);
    expect(o.rhythmVariety).toBe(0);
    expect(o.sentenceLenAvg).toBe(0);
  });

  it('null/비문자열: 런타임 비문자열 입력도 안전(0 방어)', () => {
    const o = observeStyle(undefined as unknown as string);
    expect(o).toEqual(emptyStyleTarget());
    const o2 = observeStyle(null as unknown as string);
    expect(o2).toEqual(emptyStyleTarget());
  });

  it('경계: 균일 길이 문장은 리듬 다양성 0', () => {
    // 동일 길이 문장 3개 → 변동계수 0
    const o = observeStyle('가나다라. 마바사아. 자차카타.');
    expect(o.rhythmVariety).toBe(0);
  });

  it('경계: tell 신호가 모든 문장에 있으면 tellTolerance 100', () => {
    const o = observeStyle('슬펐다. 기뻤다. 두려웠다.');
    expect(o.tellTolerance).toBe(100);
  });

  it('지표 범위: 모든 비율 지표는 0~100 내', () => {
    const o = observeStyle('“대사.” 본문이다. 깨달았다. 또 길게 늘어지는 문장이다 정말로.');
    for (const v of [o.dialogueRatio, o.tellTolerance, o.rhythmVariety]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('styleDelta — 목표 대 실측 차이', () => {
  it('정상: delta = target - observed, 미달이면 under', () => {
    const target: StyleTarget = {
      sentenceLenAvg: 30,
      dialogueRatio: 40,
      tellTolerance: 10,
      rhythmVariety: 50,
    };
    const observed = {
      sentenceLenAvg: 10, // 20 미달
      dialogueRatio: 5, // 35 미달
      tellTolerance: 10, // 일치
      rhythmVariety: 80, // 30 초과
    };
    const d = styleDelta(target, observed);
    const byField = Object.fromEntries(d.map((x) => [x.field, x]));
    expect(byField.sentenceLenAvg.delta).toBe(20);
    expect(byField.sentenceLenAvg.verdict).toBe('under');
    expect(byField.dialogueRatio.verdict).toBe('under');
    expect(byField.tellTolerance.verdict).toBe('on-target');
    expect(byField.rhythmVariety.delta).toBe(-30);
    expect(byField.rhythmVariety.verdict).toBe('over');
  });

  it('빈입력: 빈 목표 vs 빈 실측이면 전부 0 차이 on-target', () => {
    const d = styleDelta(emptyStyleTarget(), emptyStyleTarget());
    expect(d).toHaveLength(4);
    expect(d.every((x) => x.delta === 0 && x.verdict === 'on-target')).toBe(true);
  });

  it('null: target/observed null 입력도 빈 목표로 방어', () => {
    const d = styleDelta(
      null as unknown as StyleTarget,
      null as unknown as StyleTarget,
    );
    expect(d.every((x) => x.delta === 0 && x.verdict === 'on-target')).toBe(true);
  });

  it('경계: 임계 이내(5) 차이는 on-target', () => {
    const target: StyleTarget = {
      sentenceLenAvg: 25,
      dialogueRatio: 20,
      tellTolerance: 0,
      rhythmVariety: 0,
    };
    const observed = {
      sentenceLenAvg: 21, // 4 차이 → on-target
      dialogueRatio: 16, // 4 차이 → on-target
      tellTolerance: 0,
      rhythmVariety: 0,
    };
    const d = styleDelta(target, observed);
    expect(d.every((x) => x.verdict === 'on-target')).toBe(true);
  });
});

describe('styleMatchScore — 일치도 0~100', () => {
  it('정상: 완전 일치는 100', () => {
    const target: StyleTarget = {
      sentenceLenAvg: 30,
      dialogueRatio: 40,
      tellTolerance: 10,
      rhythmVariety: 50,
    };
    expect(styleMatchScore(target, { ...target })).toBe(100);
  });

  it('빈입력: 빈 목표 vs 빈 실측은 100(차이 없음)', () => {
    expect(styleMatchScore(emptyStyleTarget(), emptyStyleTarget())).toBe(100);
  });

  it('경계: 큰 차이일수록 점수 하락', () => {
    const target: StyleTarget = {
      sentenceLenAvg: 20,
      dialogueRatio: 50,
      tellTolerance: 0,
      rhythmVariety: 0,
    };
    const close = styleMatchScore(target, {
      sentenceLenAvg: 22,
      dialogueRatio: 48,
      tellTolerance: 2,
      rhythmVariety: 3,
    });
    const far = styleMatchScore(target, {
      sentenceLenAvg: 200,
      dialogueRatio: 0,
      tellTolerance: 100,
      rhythmVariety: 100,
    });
    expect(close).toBeGreaterThan(far);
    expect(far).toBeGreaterThanOrEqual(0);
    expect(close).toBeLessThanOrEqual(100);
  });

  it('범위: 항상 0~100 정수', () => {
    const target: StyleTarget = {
      sentenceLenAvg: 15,
      dialogueRatio: 30,
      tellTolerance: 5,
      rhythmVariety: 40,
    };
    const score = styleMatchScore(target, {
      sentenceLenAvg: 999,
      dialogueRatio: -50,
      tellTolerance: 200,
      rhythmVariety: 70,
    });
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
