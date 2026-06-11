// ============================================================
// cliche-transform 단위 테스트
// 정상 / 빈입력 / 경계 / 이상값 / 불변성 커버
// ============================================================

import {
  TECHNIQUES,
  techniqueLabel,
  suggestTransforms,
  transformPrinciples,
  type TransformTechnique,
} from '../cliche-transform';

describe('TECHNIQUES', () => {
  it('7개 기법 전부 매핑 + 각 엔트리는 라벨/설명/예시를 가진다', () => {
    const keys: TransformTechnique[] = [
      'inversion',
      'deconstruction',
      'blending',
      'exaggeration',
      'literalization',
      'role-swap',
      'recontextualize',
    ];
    expect(Object.keys(TECHNIQUES).sort()).toEqual([...keys].sort());
    for (const k of keys) {
      expect(TECHNIQUES[k].label.length).toBeGreaterThan(0);
      expect(TECHNIQUES[k].description.length).toBeGreaterThan(0);
      expect(TECHNIQUES[k].example.length).toBeGreaterThan(0);
    }
  });

  it('불변: 동결되어 변형 시 값이 바뀌지 않는다', () => {
    expect(Object.isFrozen(TECHNIQUES)).toBe(true);
    'use strict';
    try {
      // @ts-expect-error 의도적 동결 위반 시도
      TECHNIQUES.inversion = { label: 'X', description: 'X', example: 'X' };
    } catch {
      /* strict 모드에서 throw 가능 — 무시 */
    }
    expect(TECHNIQUES.inversion.label).toBe('전복');
  });
});

describe('techniqueLabel', () => {
  it('정상: 기법 라벨 반환', () => {
    expect(techniqueLabel('inversion')).toBe('전복');
    expect(techniqueLabel('role-swap')).toBe('역할 교환');
    expect(techniqueLabel('recontextualize')).toBe('재맥락화');
  });

  it('이상값: 알 수 없는 기법 → 빈 문자열', () => {
    // @ts-expect-error 의도적 비표준 기법
    expect(techniqueLabel('nonsense')).toBe('');
    // @ts-expect-error 의도적 undefined
    expect(techniqueLabel(undefined)).toBe('');
  });
});

describe('suggestTransforms', () => {
  it('빈입력: 빈 문자열/공백/비문자열 → 빈 배열', () => {
    expect(suggestTransforms('')).toEqual([]);
    expect(suggestTransforms('   ')).toEqual([]);
    // @ts-expect-error 의도적 null
    expect(suggestTransforms(null)).toEqual([]);
    // @ts-expect-error 의도적 number
    expect(suggestTransforms(123)).toEqual([]);
  });

  it('정상: 키워드 매칭 시 해당 기법이 후보에 포함된다', () => {
    const r1 = suggestTransforms('회귀해서 인생을 다시 산다');
    expect(r1.map((s) => s.technique)).toContain('deconstruction');

    const r2 = suggestTransforms('선택받은 용사가 세계를 구한다');
    expect(r2.map((s) => s.technique)).toContain('inversion');

    const r3 = suggestTransforms('먼치킨 최강 주인공');
    expect(r3.map((s) => s.technique)).toContain('exaggeration');
  });

  it('영어 키워드도 대소문자 무관하게 매칭된다', () => {
    const r = suggestTransforms('A CHOSEN HERO will SAVE the world');
    expect(r.map((s) => s.technique)).toContain('inversion');
  });

  it('매칭 없는 일반 입력 → 범용 3기법 폴백 + 기법 중복 없음', () => {
    const r = suggestTransforms('평범하고 일반적인 문장입니다');
    expect(r.length).toBe(3);
    const techs = r.map((s) => s.technique);
    expect(new Set(techs).size).toBe(techs.length); // 중복 없음
    expect(techs).toContain('inversion');
  });

  it('모든 제안은 비어있지 않은 hint를 가진다', () => {
    const r = suggestTransforms('던전 공략 학원물');
    expect(r.length).toBeGreaterThan(0);
    for (const s of r) {
      expect(typeof s.hint).toBe('string');
      expect(s.hint.length).toBeGreaterThan(0);
    }
  });

  it('단일 키워드 매칭 시 후보 폭을 넓혀 2개 이상 제안한다', () => {
    // '심장'만 매칭(literalization) → 범용 보강으로 2개 이상
    const r = suggestTransforms('심장을 도둑맞았다');
    expect(r.map((s) => s.technique)).toContain('literalization');
    expect(r.length).toBeGreaterThanOrEqual(2);
  });
});

describe('transformPrinciples', () => {
  it('정상: 전복 3원칙 반환', () => {
    const p = transformPrinciples();
    expect(p.length).toBe(3);
    for (const line of p) {
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it('불변: 매 호출마다 새 배열 반환(원본 오염 방지)', () => {
    const a = transformPrinciples();
    const b = transformPrinciples();
    expect(a).not.toBe(b);
    a[0] = 'MUTATED';
    expect(transformPrinciples()[0]).not.toBe('MUTATED');
  });
});
