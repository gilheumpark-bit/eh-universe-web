import {
  isRetryableError,
  backoffDelayMs,
  retryWithBackoff,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY_MS,
} from '../retry-classify';

describe('isRetryableError — RETRYABLE vs TERMINAL 분류', () => {
  it('429 / rate limit / quota 는 RETRYABLE', () => {
    expect(isRetryableError('openai API 429: rate limited')).toBe(true);
    expect(isRetryableError('Too Many Requests')).toBe(true);
    expect(isRetryableError('RESOURCE_EXHAUSTED quota')).toBe(true);
  });

  it('5xx 는 RETRYABLE', () => {
    expect(isRetryableError('groq API 503: service unavailable')).toBe(true);
    expect(isRetryableError('502 Bad Gateway')).toBe(true);
    expect(isRetryableError('gateway timeout')).toBe(true);
  });

  it('네트워크/타임아웃 계열은 RETRYABLE', () => {
    expect(isRetryableError('fetch failed')).toBe(true);
    expect(isRetryableError('ETIMEDOUT')).toBe(true);
    expect(isRetryableError('ECONNRESET')).toBe(true);
    expect(isRetryableError('The operation was aborted')).toBe(true);
    expect(isRetryableError('socket hang up')).toBe(true);
  });

  it('4xx (rate limit 제외) 는 TERMINAL', () => {
    expect(isRetryableError('claude API 401: unauthorized')).toBe(false);
    expect(isRetryableError('403 forbidden')).toBe(false);
    expect(isRetryableError('Invalid provider')).toBe(false);
    expect(isRetryableError('400 bad request')).toBe(false);
    expect(isRetryableError('404 not found')).toBe(false);
  });

  it('빈 문자열·분류 불가는 보수적으로 TERMINAL (비용 폭증 방지)', () => {
    expect(isRetryableError('')).toBe(false);
    expect(isRetryableError('some opaque failure')).toBe(false);
  });

  it('429 우선순위 — 4xx 패턴보다 retryable 이 먼저 매칭', () => {
    // "429" 는 \b4\d{2}\b 에도 매칭되지만 retryable 분기가 먼저라 true.
    expect(isRetryableError('status 429')).toBe(true);
  });
});

describe('backoffDelayMs — full jitter 상한', () => {
  it('rand=1 일 때 base * 2^attempt 미만 (floor)', () => {
    // floor(0.999... * ceil) 이지만 rand=1 이면 ceil 자체 = floor(ceil) — 상한 동일.
    expect(backoffDelayMs(0, 250, () => 0.999999)).toBeLessThan(250);
    expect(backoffDelayMs(1, 250, () => 0.999999)).toBeLessThan(500);
    expect(backoffDelayMs(2, 250, () => 0.999999)).toBeLessThan(1000);
  });

  it('rand=0 이면 0', () => {
    expect(backoffDelayMs(0, 250, () => 0)).toBe(0);
    expect(backoffDelayMs(5, 250, () => 0)).toBe(0);
  });

  it('지수적으로 상한 증가', () => {
    const half = () => 0.5;
    expect(backoffDelayMs(0, 250, half)).toBe(125);
    expect(backoffDelayMs(1, 250, half)).toBe(250);
    expect(backoffDelayMs(2, 250, half)).toBe(500);
  });
});

describe('retryWithBackoff — bounded 재시도', () => {
  const noSleep = async () => {};
  type Res = { ok: boolean; error?: string };

  it('성공이면 즉시 반환 (재시도 0)', async () => {
    const fn = jest.fn().mockResolvedValue({ ok: true });
    const r = await retryWithBackoff<Res>(fn, (x: Res) => !x.ok, () => '', { sleep: noSleep });
    expect(r).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('TERMINAL(4xx) 실패는 재시도 없이 즉시 반환', async () => {
    const fn = jest.fn().mockResolvedValue({ ok: false, error: '401 unauthorized' });
    const r = await retryWithBackoff<Res>(fn, (x: Res) => !x.ok, (x: Res) => (x.ok ? '' : x.error ?? ''), { sleep: noSleep });
    expect(r).toEqual({ ok: false, error: '401 unauthorized' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('RETRYABLE 가 끝까지 실패하면 총 시도 = 1 + maxRetries 상한 엄수', async () => {
    const fn = jest.fn().mockResolvedValue({ ok: false, error: '503 service unavailable' });
    const r = await retryWithBackoff<Res>(fn, (x: Res) => !x.ok, (x: Res) => (x.ok ? '' : x.error ?? ''), { sleep: noSleep });
    expect(r).toEqual({ ok: false, error: '503 service unavailable' });
    // 1 (초기) + DEFAULT_MAX_RETRIES (재시도) = 4
    expect(fn).toHaveBeenCalledTimes(1 + DEFAULT_MAX_RETRIES);
  });

  it('RETRYABLE 실패 후 성공하면 멈춤 (불필요한 재시도 X)', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, error: '429 rate limit' })
      .mockResolvedValueOnce({ ok: false, error: 'ETIMEDOUT' })
      .mockResolvedValue({ ok: true });
    const r = await retryWithBackoff<Res>(fn, (x: Res) => !x.ok, (x: Res) => (x.ok ? '' : x.error ?? ''), { sleep: noSleep });
    expect(r).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(3); // 실패2 + 성공1
  });

  it('maxRetries=0 이면 재시도 없이 1회만', async () => {
    const fn = jest.fn().mockResolvedValue({ ok: false, error: '503' });
    await retryWithBackoff<Res>(fn, (x: Res) => !x.ok, (x: Res) => (x.ok ? '' : x.error ?? ''), { sleep: noSleep, maxRetries: 0 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('sleep 은 매 재시도 직전에만 호출 (성공 경로 지연 0)', async () => {
    const sleep = jest.fn(async () => {});
    const fn = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, error: '503' })
      .mockResolvedValue({ ok: true });
    await retryWithBackoff<Res>(fn, (x: Res) => !x.ok, (x: Res) => (x.ok ? '' : x.error ?? ''), { sleep });
    expect(sleep).toHaveBeenCalledTimes(1); // 재시도 1회 → sleep 1회
  });

  it('DEFAULT 상수 노출 확인 (회귀 가드)', () => {
    expect(DEFAULT_MAX_RETRIES).toBe(3);
    expect(DEFAULT_BASE_DELAY_MS).toBe(250);
  });
});
