// ============================================================
// beat-bank 단위 테스트
// 정상 / 빈입력 / 경계 / 이상값 커버 (≥6 케이스)
// ============================================================

import {
  BEAT_BANK,
  beatLabel,
  tensionMacroCurve,
  suggestNextBeat,
  type BeatType,
} from '../beat-bank';

describe('BEAT_BANK', () => {
  it('7개 비트 전부 매핑 + 긴장도는 0~100 범위, climax가 정점(100)', () => {
    const order: BeatType[] = [
      'setup',
      'inciting',
      'rising',
      'midpoint',
      'crisis',
      'climax',
      'resolution',
    ];
    expect(Object.keys(BEAT_BANK).sort()).toEqual([...order].sort());
    for (const b of order) {
      expect(BEAT_BANK[b].tensionLevel).toBeGreaterThanOrEqual(0);
      expect(BEAT_BANK[b].tensionLevel).toBeLessThanOrEqual(100);
      expect(typeof BEAT_BANK[b].hint).toBe('string');
      expect(BEAT_BANK[b].hint.length).toBeGreaterThan(0);
    }
    // climax가 최고 긴장, setup이 최저 긴장 영역
    expect(BEAT_BANK.climax.tensionLevel).toBe(100);
    expect(BEAT_BANK.crisis.tensionLevel).toBeLessThan(BEAT_BANK.climax.tensionLevel);
    expect(BEAT_BANK.setup.tensionLevel).toBeLessThan(BEAT_BANK.rising.tensionLevel);
  });
});

describe('beatLabel', () => {
  it('정상: 한국어 라벨 반환', () => {
    expect(beatLabel('setup')).toBe('도입');
    expect(beatLabel('climax')).toBe('절정');
    expect(beatLabel('resolution')).toBe('결말');
  });

  it('이상값: 알 수 없는 비트 → 빈 문자열', () => {
    // @ts-expect-error 의도적 비표준 비트
    expect(beatLabel('twist')).toBe('');
    // @ts-expect-error 의도적 undefined
    expect(beatLabel(undefined)).toBe('');
  });
});

describe('tensionMacroCurve', () => {
  it('정상: 비트 시퀀스를 긴장도 숫자 배열로 변환 (입력 순서 유지)', () => {
    const curve = tensionMacroCurve(['setup', 'rising', 'climax', 'resolution']);
    expect(curve).toEqual([10, 50, 100, 20]);
  });

  it('빈입력/경계: 빈 배열 → [], 비배열 → []', () => {
    expect(tensionMacroCurve([])).toEqual([]);
    // @ts-expect-error 의도적 null
    expect(tensionMacroCurve(null)).toEqual([]);
    // @ts-expect-error 의도적 undefined
    expect(tensionMacroCurve(undefined)).toEqual([]);
  });

  it('이상값: 알 수 없는 비트는 0으로 처리, 길이는 입력과 동일', () => {
    // @ts-expect-error 의도적 비표준 비트 혼입
    const curve = tensionMacroCurve(['setup', 'unknown', 'climax']);
    expect(curve).toEqual([10, 0, 100]);
    expect(curve).toHaveLength(3);
  });

  it('정상: 표준 전개 곡선은 climax(100)에서 정점, 단조 증가 후 이완', () => {
    const curve = tensionMacroCurve([
      'setup',
      'inciting',
      'rising',
      'midpoint',
      'crisis',
      'climax',
      'resolution',
    ]);
    expect(curve).toHaveLength(7);
    expect(Math.max(...curve)).toBe(100);
    // climax 직전까지 비감소(상승) 확인
    const upToClimax = curve.slice(0, 6);
    for (let i = 1; i < upToClimax.length; i++) {
      expect(upToClimax[i]).toBeGreaterThanOrEqual(upToClimax[i - 1]);
    }
    // resolution에서 이완
    expect(curve[6]).toBeLessThan(curve[5]);
  });
});

describe('suggestNextBeat', () => {
  it('정상: 표준 전개상 한 칸 뒤 비트 반환', () => {
    expect(suggestNextBeat('setup')).toBe('inciting');
    expect(suggestNextBeat('rising')).toBe('midpoint');
    expect(suggestNextBeat('crisis')).toBe('climax');
  });

  it('경계: 마지막(resolution) → resolution(종착 유지)', () => {
    expect(suggestNextBeat('resolution')).toBe('resolution');
    expect(suggestNextBeat('climax')).toBe('resolution');
  });

  it('이상값: 알 수 없는 비트 → resolution 폴백', () => {
    // @ts-expect-error 의도적 비표준 비트
    expect(suggestNextBeat('twist')).toBe('resolution');
    // @ts-expect-error 의도적 undefined
    expect(suggestNextBeat(undefined)).toBe('resolution');
  });
});
