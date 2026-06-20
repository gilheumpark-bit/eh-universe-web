/**
 * token-meter.test.ts (2026-05-10 — G-test-1 검증)
 *
 * P-01 token 측정 + budget 임계 분류 검증.
 */

import {
  measureTokens,
  DEFAULT_MAX_MODEL_LEN,
  DEFAULT_OUTPUT_RESERVE,
  TOKEN_PRESSURE_THRESHOLDS,
} from '../token-meter';

describe('token-meter — measureTokens', () => {
  describe('빈 입력 안전성', () => {
    it('빈 문자열 → estimatedTokens 0, safe', () => {
      const m = measureTokens('');
      expect(m.charCount).toBe(0);
      expect(m.estimatedTokens).toBe(0);
      expect(m.utilizationRatio).toBe(0);
      expect(m.pressureLevel).toBe('safe');
    });

    it('미정의 입력 안전 (string 비강제)', () => {
      // @ts-expect-error — 의도적 invalid 입력
      const m = measureTokens(null);
      expect(m.estimatedTokens).toBe(0);
    });
  });

  describe('CJK 비율 계산', () => {
    it('순수 한글 — CJK ratio 1.0, ~1.5 tokens/char', () => {
      const text = '한국어소설본문';
      const m = measureTokens(text);
      expect(m.cjkRatio).toBeGreaterThan(0.95);
      // 7 chars × 1.5 = ~10 tokens
      expect(m.estimatedTokens).toBeGreaterThanOrEqual(9);
      expect(m.estimatedTokens).toBeLessThanOrEqual(11);
    });

    it('순수 ASCII — CJK ratio 0, ~0.35 tokens/char', () => {
      const text = 'Hello world this is plain English';
      const m = measureTokens(text);
      expect(m.cjkRatio).toBe(0);
      // 33 chars × 0.35 = ~12 tokens
      expect(m.estimatedTokens).toBeGreaterThanOrEqual(10);
      expect(m.estimatedTokens).toBeLessThanOrEqual(14);
    });

    it('혼합 — CJK ratio 0.5 부근, 가중 평균', () => {
      const text = 'Korean 한국어 mixed 혼합';
      const m = measureTokens(text);
      expect(m.cjkRatio).toBeGreaterThan(0.2);
      expect(m.cjkRatio).toBeLessThan(0.6);
    });
  });

  describe('budget 임계 분류', () => {
    it('< 60% → safe', () => {
      // 8192 - 7000 = 1192 budget. 600 chars (~900 tokens) → 75%? 너무 높음.
      // 작은 입력 — 50 chars (~75 tokens) → 6% safe
      const text = 'a'.repeat(50);
      const m = measureTokens(text);
      expect(m.pressureLevel).toBe('safe');
    });

    it('60% ~ 80% → info', () => {
      // budget 1192. 60% = 715 tokens. ~2040 ASCII chars (× 0.35).
      const text = 'a'.repeat(2100); // ~735 tokens, ratio 0.62
      const m = measureTokens(text);
      expect(m.pressureLevel).toBe('info');
    });

    it('80% ~ 95% → warn', () => {
      // 80% = 953 tokens. ~2720 chars
      const text = 'a'.repeat(2800); // ~980 tokens, ratio 0.82
      const m = measureTokens(text);
      expect(m.pressureLevel).toBe('warn');
    });

    it('>= 95% → critical', () => {
      // 95% = 1132 tokens. ~3234 chars
      const text = 'a'.repeat(3300); // ~1155 tokens, ratio 0.97
      const m = measureTokens(text);
      expect(m.pressureLevel).toBe('critical');
    });

    it('한글 1000자 → critical (CJK 무게 ↑)', () => {
      const text = '한'.repeat(1000); // 1000 × 1.5 = 1500 tokens > 1192
      const m = measureTokens(text);
      expect(m.pressureLevel).toBe('critical');
    });
  });

  describe('options 커스터마이징', () => {
    it('maxModelLen override', () => {
      const text = 'a'.repeat(100);
      const m = measureTokens(text, { maxModelLen: 1000, outputReserve: 500 });
      // budget 500. 100 × 0.35 = 35 tokens. ratio 0.07 safe.
      expect(m.inputBudget).toBe(500);
      expect(m.pressureLevel).toBe('safe');
    });

    it('outputReserve = maxModelLen 시 budget 0', () => {
      const m = measureTokens('a'.repeat(100), { maxModelLen: 1000, outputReserve: 1000 });
      expect(m.inputBudget).toBe(0);
      // utilizationRatio = 1 (division by zero 방지)
      expect(m.utilizationRatio).toBe(1);
    });
  });

  describe('상수 검증', () => {
    it('DEFAULT_MAX_MODEL_LEN = 8192 (Qwen 3.6-35B)', () => {
      expect(DEFAULT_MAX_MODEL_LEN).toBe(8192);
    });

    it('DEFAULT_OUTPUT_RESERVE = 7000', () => {
      expect(DEFAULT_OUTPUT_RESERVE).toBe(7000);
    });

    it('TOKEN_PRESSURE_THRESHOLDS 단조 증가', () => {
      expect(TOKEN_PRESSURE_THRESHOLDS.info).toBeLessThan(TOKEN_PRESSURE_THRESHOLDS.warn);
      expect(TOKEN_PRESSURE_THRESHOLDS.warn).toBeLessThan(TOKEN_PRESSURE_THRESHOLDS.critical);
      expect(TOKEN_PRESSURE_THRESHOLDS.critical).toBeLessThanOrEqual(1.0);
    });
  });
});
