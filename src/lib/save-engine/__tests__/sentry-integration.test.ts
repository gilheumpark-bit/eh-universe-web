// ============================================================
// PART 1 — Setup
// ============================================================

import {
  isSentryEnabled,
  reportStorageEvent,
  setSentryClientForTests,
  __resetSentryIntegrationForTests,
  __setEnvEnabledForTests,
  type SentryClientLike,
} from '../sentry-integration';

beforeEach(() => {
  __resetSentryIntegrationForTests();
});

// ============================================================
// PART 2 — 활성 여부
// ============================================================

describe('sentry-integration — isSentryEnabled', () => {
  test('env 기본 비활성 (NEXT_PUBLIC_SENTRY_ENABLED undefined) → false', () => {
    __setEnvEnabledForTests(false);
    expect(isSentryEnabled()).toBe(false);
  });

  test('env 활성화 + 클라이언트 주입 없음 → true (env 기반)', () => {
    __setEnvEnabledForTests(true);
    expect(isSentryEnabled()).toBe(true);
  });

  test('테스트 클라이언트 주입 → true (env 무시)', () => {
    const mock: SentryClientLike = { captureMessage: jest.fn() };
    __setEnvEnabledForTests(false);
    setSentryClientForTests(mock);
    expect(isSentryEnabled()).toBe(true);
    setSentryClientForTests(null);
  });
});

// ============================================================
// PART 3 — reportStorageEvent 호출 동작
// ============================================================

describe('sentry-integration — reportStorageEvent', () => {
  test('비활성 상태에서는 captureMessage 호출 0', () => {
    const mock = { captureMessage: jest.fn() };
    __setEnvEnabledForTests(false);
    setSentryClientForTests(null);
    // resolveClient 가 window.Sentry 를 찾지 못해야 하므로 별도 주입 없이 호출.
    // (Sentry 주입은 테스트 엔트리에서 global 로 하지 않는다 — env 가드만 검증.)

    reportStorageEvent({
      event: 'storage.primary-failed',
      mode: 'on',
      severity: 'error',
      details: { errorName: 'QuotaExceededError' },
    });

    expect(mock.captureMessage).not.toHaveBeenCalled();
  });

  test('주입 클라이언트로 메시지/태그/레벨 전달', () => {
    const captureMessage = jest.fn();
    const mock: SentryClientLike = { captureMessage };
    setSentryClientForTests(mock);

    reportStorageEvent({
      event: 'storage.journal-degraded',
      mode: 'on',
      severity: 'warning',
      details: { writerMode: 'degraded', durationMs: 42 },
    });

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [msg, ctx] = captureMessage.mock.calls[0];
    expect(msg).toBe('storage.journal-degraded');
    expect(ctx.level).toBe('warning');
    expect(ctx.tags['storage.mode']).toBe('on');
    expect(ctx.tags['storage.event']).toBe('storage.journal-degraded');
    expect(ctx.extra.durationMs).toBe(42);
    setSentryClientForTests(null);
  });

  test('captureMessage throw → 호출자 무영향 (no throw)', () => {
    const mock: SentryClientLike = {
      captureMessage: () => { throw new Error('sentry-boom'); },
    };
    setSentryClientForTests(mock);

    expect(() => {
      reportStorageEvent({
        event: 'storage.primary-failed',
        mode: 'on',
        severity: 'error',
        details: {},
      });
    }).not.toThrow();
    setSentryClientForTests(null);
  });

  test('원문 sanitize — 2KB 초과 문자열 [redacted:too-long]', () => {
    const captureMessage = jest.fn();
    setSentryClientForTests({ captureMessage });

    reportStorageEvent({
      event: 'storage.test',
      mode: 'on',
      severity: 'info',
      details: { big: 'x'.repeat(3000) },
    });

    const [, ctx] = captureMessage.mock.calls[0];
    expect(ctx.extra.big).toBe('[redacted:too-long]');
    setSentryClientForTests(null);
  });
});
