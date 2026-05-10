/**
 * token-meter.ts (2026-05-10 신설 — P-01 수리)
 *
 * AI prompt token 사용량 측정 + budget 임계 경고.
 *
 * 배경:
 *   - DGX vLLM Qwen 3.6-35B max_model_len = 8192 (input + output 합계)
 *   - studio-draft 의 buildSystemInstruction 출력이 4,000~5,000 tokens
 *   - 본문 출력 5,500~7,000 tokens 가산 시 max_model_len 초과 위험
 *   - 현재는 silent 절삭 또는 generation 실패 — 가시화 필요
 *
 * 측정 방식:
 *   - CJK 글자: ~1.5 tokens / char
 *   - ASCII 단어: ~1.3 tokens / word (~0.25 tokens / char)
 *   - 혼합: CJK 비율 기반 가중 평균 (engine/pipeline.ts 패턴 차용)
 *
 * 임계 경고:
 *   - 60% (light): 정보성 noa:token-budget-info
 *   - 80% (warn): noa:token-budget-warning
 *   - 95% (critical): noa:token-budget-critical
 *
 * [C] 안전성: 미정의 입력 fallback 0
 * [G] 성능: 정규식 한 번 + 산술 — runtime ~0.5ms per 5K chars
 * [K] 간결성: 함수 4개 — measure / classify / dispatchWarning / withBudgetCheck
 */

// ============================================================
// PART 1 — Constants
// ============================================================

/** vLLM Qwen 3.6-35B-A3B max_model_len. dgx-models.ts 참조. */
export const DEFAULT_MAX_MODEL_LEN = 8192;

/** 출력에 할당할 최소 token (5,500자 한국어 ≈ 7,000 tokens 대비 보수적). */
export const DEFAULT_OUTPUT_RESERVE = 7000;

/** budget 임계 비율. */
export const TOKEN_PRESSURE_THRESHOLDS = {
  info: 0.60,
  warn: 0.80,
  critical: 0.95,
} as const;

export type TokenPressureLevel = 'safe' | 'info' | 'warn' | 'critical';

export interface TokenMeasurement {
  charCount: number;
  cjkChars: number;
  cjkRatio: number;
  estimatedTokens: number;
  /** budget = max_model_len - output_reserve 기준 */
  inputBudget: number;
  utilizationRatio: number;
  pressureLevel: TokenPressureLevel;
}

// ============================================================
// PART 2 — 측정
// ============================================================

/**
 * 텍스트의 token 추정. CJK/ASCII 가중 평균.
 *
 * @param text 측정 대상 prompt
 * @param options.maxModelLen vLLM max_model_len (기본 8192)
 * @param options.outputReserve 출력에 할당할 token (기본 7000)
 */
export function measureTokens(
  text: string,
  options: { maxModelLen?: number; outputReserve?: number } = {},
): TokenMeasurement {
  const maxModelLen = options.maxModelLen ?? DEFAULT_MAX_MODEL_LEN;
  const outputReserve = options.outputReserve ?? DEFAULT_OUTPUT_RESERVE;
  const inputBudget = Math.max(maxModelLen - outputReserve, 0);

  if (!text || text.length === 0) {
    return {
      charCount: 0, cjkChars: 0, cjkRatio: 0,
      estimatedTokens: 0, inputBudget, utilizationRatio: 0,
      pressureLevel: 'safe',
    };
  }

  const charCount = text.length;
  const cjkChars = (text.match(/[　-鿿가-힯]/g) || []).length;
  const cjkRatio = charCount > 0 ? cjkChars / charCount : 0;
  // CJK ~1.5, ASCII ~0.25 per char
  const tokensPerChar = cjkRatio * 1.5 + (1 - cjkRatio) * 0.35;
  const estimatedTokens = Math.round(charCount * tokensPerChar);
  const utilizationRatio = inputBudget > 0 ? estimatedTokens / inputBudget : 1;

  return {
    charCount, cjkChars, cjkRatio,
    estimatedTokens, inputBudget, utilizationRatio,
    pressureLevel: classifyPressure(utilizationRatio),
  };
}

function classifyPressure(ratio: number): TokenPressureLevel {
  if (ratio >= TOKEN_PRESSURE_THRESHOLDS.critical) return 'critical';
  if (ratio >= TOKEN_PRESSURE_THRESHOLDS.warn) return 'warn';
  if (ratio >= TOKEN_PRESSURE_THRESHOLDS.info) return 'info';
  return 'safe';
}

// ============================================================
// PART 3 — 경고 디스패치 (브라우저 CustomEvent)
// ============================================================

export interface TokenPressureEventDetail {
  agentId?: string;
  measurement: TokenMeasurement;
  source: string;
}

/**
 * TokenMeasurement 결과를 noa:token-budget-* CustomEvent 로 디스패치.
 * 서버 사이드에서는 silent (window 미정의).
 */
export function dispatchTokenPressure(detail: TokenPressureEventDetail): void {
  if (typeof window === 'undefined') return;
  const level = detail.measurement.pressureLevel;
  if (level === 'safe') return;
  const eventName = `noa:token-budget-${level}`;
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch {
    // CustomEvent 미지원 환경 — silent
  }
}

// ============================================================
// PART 4 — 통합 측정 + 경고 헬퍼
// ============================================================

/**
 * prompt 측정 + 임계 초과 시 자동 디스패치.
 *
 * 사용:
 *   const measurement = measureAndWarn(systemPrompt, {
 *     agentId: 'studio-draft',
 *     source: 'engine/pipeline.ts buildSystemInstruction',
 *   });
 *   if (measurement.pressureLevel === 'critical') {
 *     // 호출 측이 절삭 결정
 *   }
 */
export function measureAndWarn(
  text: string,
  options: {
    agentId?: string;
    source: string;
    maxModelLen?: number;
    outputReserve?: number;
  },
): TokenMeasurement {
  const measurement = measureTokens(text, {
    maxModelLen: options.maxModelLen,
    outputReserve: options.outputReserve,
  });
  dispatchTokenPressure({
    agentId: options.agentId,
    measurement,
    source: options.source,
  });
  return measurement;
}
