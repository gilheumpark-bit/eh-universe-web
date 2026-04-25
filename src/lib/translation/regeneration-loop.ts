// ============================================================
// Auto-Regeneration Loop — score < threshold 시 temperature 상승 + 재생성
// ============================================================
// README.ko.md "자동 재창조 — 점수 < 0.70 → temperature 상승 + 재생성 (최대 2회)"
// 약속의 실제 구현 (2026-04-25).
//
// 이전 상태: 약속 카피만, 실제 retry 루프 코드 0.
// 이후 상태: translateWithAutoRegen() — 시도마다 temp += 0.1, 최대 2회 재시도, best-of 반환.
// ============================================================

import { logger } from '@/lib/logger';
import { scoreToBand, bandPassed, type BandResult } from './bands';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export interface AutoRegenOptions {
  /** 시작 temperature (기본 0.5) */
  initialTemperature?: number;
  /** 통과 임계 점수 (0~1, 기본 0.70) */
  threshold?: number;
  /** 최대 재시도 횟수 (기본 2 — 총 시도 3회) */
  maxRetries?: number;
  /** 재시도 시 temperature 증가량 (기본 0.1) */
  temperatureStep?: number;
  /** temperature 상한 (기본 1.0) */
  temperatureCap?: number;
}

export interface AutoRegenAttempt {
  attempt: number;
  temperature: number;
  text: string;
  score: number;
  band: BandResult;
  durationMs: number;
}

export interface AutoRegenResult {
  /** best-of 텍스트 (최고 점수) */
  text: string;
  /** best-of 점수 (0~1) */
  score: number;
  /** best-of 41-band */
  band: BandResult;
  /** 실제 재시도 횟수 (0 ~ maxRetries) */
  retries: number;
  /** 임계 통과 여부 — bandPassed(band) */
  passed: boolean;
  /** 시도별 메타 — 디버그·UI 표시 */
  attempts: AutoRegenAttempt[];
  /** 총 소요 시간 (ms) */
  totalMs: number;
}

const DEFAULTS: Required<AutoRegenOptions> = {
  initialTemperature: 0.5,
  threshold: 0.70,
  maxRetries: 2,
  temperatureStep: 0.1,
  temperatureCap: 1.0,
};

// ============================================================
// PART 2 — Core loop
// ============================================================

/**
 * 자동 재창조 루프.
 *
 * @param translateFn  (temperature) => Promise<번역 텍스트>
 * @param scoreFn      (텍스트) => Promise<점수 0~1>
 * @param opts         AutoRegenOptions
 * @returns            AutoRegenResult — best-of + 모든 시도 메타
 *
 * 동작:
 *  1. initialTemperature 로 1차 시도
 *  2. score >= threshold 면 즉시 반환
 *  3. 미달 시 temperature += step (cap 까지) 로 재시도
 *  4. maxRetries 회 후 종료, best-of 반환
 *
 * [C] translateFn / scoreFn 예외 발생 시 해당 attempt skip + 다음 시도 (전체 실패 시 마지막 best-of)
 * [G] sequential — parallel 시 LLM API rate limit 안정성 우선
 * [K] 시도별 메타 보존 — UI 가 "1차 0.62 → 2차 0.71 (통과)" 표시 가능
 */
export async function translateWithAutoRegen(
  translateFn: (temperature: number) => Promise<string>,
  scoreFn: (text: string) => Promise<number>,
  opts: AutoRegenOptions = {},
): Promise<AutoRegenResult> {
  const cfg: Required<AutoRegenOptions> = { ...DEFAULTS, ...opts };
  const attempts: AutoRegenAttempt[] = [];
  const start = Date.now();
  let temperature = cfg.initialTemperature;
  let bestText = '';
  let bestScore = 0;
  let bestBand: BandResult = scoreToBand(0);
  let retries = 0;

  for (let i = 0; i <= cfg.maxRetries; i++) {
    const attemptStart = Date.now();
    let text = '';
    let score = 0;
    try {
      text = await translateFn(temperature);
      score = await scoreFn(text);
      if (!Number.isFinite(score)) score = 0;
      score = Math.max(0, Math.min(1, score));
    } catch (err) {
      logger.warn('auto-regen', `attempt ${i + 1} failed`, err);
      attempts.push({
        attempt: i + 1,
        temperature,
        text: '',
        score: 0,
        band: scoreToBand(0),
        durationMs: Date.now() - attemptStart,
      });
      // 실패해도 다음 시도로 — temperature 만 증가
      temperature = Math.min(cfg.temperatureCap, temperature + cfg.temperatureStep);
      retries = i;
      continue;
    }

    const band = scoreToBand(score);
    attempts.push({
      attempt: i + 1,
      temperature,
      text,
      score,
      band,
      durationMs: Date.now() - attemptStart,
    });

    if (score > bestScore) {
      bestText = text;
      bestScore = score;
      bestBand = band;
    }

    // 통과 시 즉시 종료
    if (score >= cfg.threshold) {
      return {
        text: bestText,
        score: bestScore,
        band: bestBand,
        retries: i,
        passed: true,
        attempts,
        totalMs: Date.now() - start,
      };
    }

    retries = i;
    temperature = Math.min(cfg.temperatureCap, temperature + cfg.temperatureStep);
  }

  return {
    text: bestText,
    score: bestScore,
    band: bestBand,
    retries,
    passed: bandPassed(bestBand),
    attempts,
    totalMs: Date.now() - start,
  };
}

// IDENTITY_SEAL: regeneration-loop | role=auto-retry-temp-up | inputs=translateFn+scoreFn | outputs=best-of+attempts
