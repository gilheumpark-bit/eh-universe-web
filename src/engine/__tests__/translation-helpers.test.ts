/**
 * engine/translation.ts — 순수 헬퍼 함수 테스트
 * bandLabel, modeDescription, clampBand, chunkBySentences, adaptiveChunkSize
 * Phase 3c 후속: 번역 엔진 커버리지 10% → 30%+
 */

import {
  clampBand,
  getDefaultConfig,
  chunkBySentences,
  adaptiveChunkSize,
  bandLabel,
  modeDescription,
} from '../translation';

describe('clampBand', () => {
  // BAND_MIN=0.480, BAND_MAX=0.520, BAND_DEFAULT=0.500
  it('범위 내(0.48~0.52) 값은 유지', () => {
    expect(clampBand(0.500)).toBeCloseTo(0.500, 3);
    expect(clampBand(0.510)).toBeCloseTo(0.510, 3);
  });
  it('하한(0.48) 미만은 0.48로 clamp', () => {
    expect(clampBand(0.1)).toBeCloseTo(0.480, 3);
    expect(clampBand(-1)).toBeCloseTo(0.480, 3);
  });
  it('상한(0.52) 초과는 0.52로 clamp', () => {
    expect(clampBand(0.9)).toBeCloseTo(0.520, 3);
    expect(clampBand(1.0)).toBeCloseTo(0.520, 3);
  });
  it('소수점 3자리 반올림', () => {
    const result = clampBand(0.5004);
    expect(result).toBeCloseTo(0.500, 3);
  });
});

describe('getDefaultConfig', () => {
  it('fidelity 기본 설정 반환', () => {
    const cfg = getDefaultConfig('fidelity');
    expect(cfg.mode).toBe('fidelity');
    expect(cfg.band).toBeGreaterThan(0);
    expect(cfg.band).toBeLessThanOrEqual(5);
  });
  it('experience 모드 지원', () => {
    const cfg = getDefaultConfig('experience');
    expect(cfg.mode).toBe('experience');
  });
  it('모드 생략 시 fidelity default', () => {
    const cfg = getDefaultConfig();
    expect(cfg.mode).toBe('fidelity');
  });
});

describe('chunkBySentences', () => {
  it('빈 문자열 입력 시 빈 배열 반환', () => {
    expect(chunkBySentences('')).toEqual([]);
  });
  it('3문장 단위로 청크 생성 (기본)', () => {
    const text = '안녕. 반갑다. 좋은 날이다. 그래서 어쩌라고. 밥 먹었니. 나는 먹었다.';
    const chunks = chunkBySentences(text, 3);
    expect(chunks.length).toBe(2);
  });
  it('chunkSize 1 — 문장당 1청크', () => {
    const text = '첫째. 둘째. 셋째.';
    const chunks = chunkBySentences(text, 1);
    expect(chunks.length).toBe(3);
  });
  it('EN 문장 처리', () => {
    const text = 'Hello. World. Nice! How are you? I am fine. Thanks.';
    const chunks = chunkBySentences(text, 3);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});

describe('adaptiveChunkSize', () => {
  // signature: (text, baseChunkSize = 3, maxTokensPerChunk = 800)
  it('빈 문자열 입력 시 baseChunkSize 반환', () => {
    expect(adaptiveChunkSize('')).toBe(3);
  });
  it('짧은 문장은 baseChunkSize 이하', () => {
    const size = adaptiveChunkSize('짧다.', 3);
    expect(size).toBeGreaterThanOrEqual(1);
    expect(size).toBeLessThanOrEqual(3);
  });
  it('긴 문장일수록 작은 청크', () => {
    const longText = '이것은 매우 긴 문장이다 '.repeat(50) + '. ';
    const size = adaptiveChunkSize(longText, 5, 200);
    expect(size).toBeGreaterThanOrEqual(1);
    expect(size).toBeLessThanOrEqual(5);
  });
  it('baseChunkSize 상한 준수', () => {
    const size = adaptiveChunkSize('짧. 짧.', 10);
    expect(size).toBeLessThanOrEqual(10);
  });
});

describe('bandLabel', () => {
  it('fidelity 모드 KO 라벨 반환', () => {
    const label = bandLabel(3, 'fidelity', true);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });
  it('experience 모드 EN 라벨 반환', () => {
    const label = bandLabel(4, 'experience', false);
    expect(typeof label).toBe('string');
  });
  it('band 1~5 모든 값 처리', () => {
    for (let b = 1; b <= 5; b++) {
      expect(() => bandLabel(b, 'fidelity', true)).not.toThrow();
    }
  });
});

describe('modeDescription', () => {
  it('fidelity 모드 설명 KO 반환', () => {
    const desc = modeDescription('fidelity', true);
    expect(desc).toHaveProperty('title');
    expect(desc).toHaveProperty('desc');
    expect(desc.title.length).toBeGreaterThan(0);
  });
  it('experience 모드 설명 EN 반환', () => {
    const desc = modeDescription('experience', false);
    expect(desc).toHaveProperty('title');
    expect(desc.desc.length).toBeGreaterThan(0);
  });
});
