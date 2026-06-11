// ============================================================
// [QA-robustness (2)] 업스트림 호출 실패 분류 + bounded backoff-with-jitter
// ============================================================
// 에러 문자열을 RETRYABLE(429·5xx·network/timeout) vs TERMINAL(4xx) 로 분류하고,
// RETRYABLE 만 상한이 정해진 full-jitter 백오프로 재시도한다.
//
// 설계 의도:
//  - 과도 재시도로 인한 비용 폭증 차단 (총 시도 ≤ 1 + maxRetries 엄수).
//  - 정상(ok) / TERMINAL 실패면 즉시 반환 — 기존 흐름 무파괴.
//  - 분류 불가 에러는 보수적으로 TERMINAL 취급 (재시도 X).

export const DEFAULT_MAX_RETRIES = 3;        // 총 시도 ≤ 1 + 3 = 4
export const DEFAULT_BASE_DELAY_MS = 250;    // 250 → 500 → 1000 (지수) + jitter

/**
 * 에러 문자열이 재시도 가치가 있는지 분류.
 *  - RETRYABLE: 429 / rate limit / quota / 5xx / 네트워크·타임아웃 계열
 *  - TERMINAL : 명시적 4xx, 그리고 분류 불가(보수적)
 */
export function isRetryableError(raw: string): boolean {
  if (!raw) return false;
  if (/429|rate.?limit|too many requests|resource[_\s-]?exhausted|quota/i.test(raw)) return true;
  // 5xx
  if (/\b5\d{2}\b|server error|bad gateway|service unavailable|gateway timeout/i.test(raw)) return true;
  // network / timeout 계열
  if (/timeout|timed out|abort|network|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|fetch failed|socket hang up/i.test(raw)) return true;
  // 명시적 4xx 는 terminal
  if (/\b4\d{2}\b|unauthorized|forbidden|invalid|not found/i.test(raw)) return false;
  // 분류 불가 — 비용 폭증 방지 위해 보수적으로 terminal (재시도 X)
  return false;
}

/** full jitter: random(0, base * 2^attempt). attempt 는 0-based. */
export function backoffDelayMs(
  attempt: number,
  baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  rand: () => number = Math.random,
): number {
  const ceil = baseDelayMs * Math.pow(2, attempt);
  return Math.floor(rand() * ceil);
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  /** 테스트 주입용 — 기본은 실제 setTimeout 기반 sleep. */
  sleep?: (ms: number) => Promise<void>;
  rand?: () => number;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * `fn` 을 호출하고, 결과가 `isFailure` 이며 에러가 RETRYABLE 일 때만 bounded backoff 재시도.
 * 성공/ TERMINAL 실패는 즉시 반환. 매 재시도 직전에만 sleep (성공 경로 지연 0).
 *
 * 제네릭 — 결과 타입 R 은 호출자가 정의. `isFailure` 가 true 면 `getError` 로 에러 문자열을 얻어 분류.
 */
export async function retryWithBackoff<R>(
  fn: () => Promise<R>,
  isFailure: (r: R) => boolean,
  getError: (r: R) => string,
  opts: RetryOptions = {},
): Promise<R> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const sleep = opts.sleep ?? realSleep;
  const rand = opts.rand ?? Math.random;

  let result = await fn();
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    if (!isFailure(result)) return result;            // 성공
    if (!isRetryableError(getError(result))) return result; // TERMINAL — 즉시 중단
    await sleep(backoffDelayMs(attempt, baseDelayMs, rand));
    result = await fn();
  }
  return result; // 상한 소진 — 마지막 결과 반환
}
