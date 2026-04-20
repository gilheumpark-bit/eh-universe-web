/**
 * env-sanity tests — M7 boot-time environment probe.
 *
 * Covers: status matrix (ok / degraded / unknown), missing-API reporting,
 * and event emission contract.
 */

import {
  checkEnvironment,
  checkEnvironmentAtBoot,
  ENVIRONMENT_DEGRADED_EVENT,
} from '../env-sanity';

describe('env-sanity', () => {
  const originalIndexedDB = (globalThis as { indexedDB?: unknown }).indexedDB;
  const originalBroadcastChannel = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalNavigator = (globalThis as { navigator?: Navigator }).navigator;
  const originalCrypto = (globalThis as { crypto?: Crypto }).crypto;

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Degraded env intentionally warns — silence to keep test output clean.
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore globals touched by each test
    if (originalIndexedDB !== undefined) {
      (globalThis as { indexedDB?: unknown }).indexedDB = originalIndexedDB;
    }
    if (originalBroadcastChannel !== undefined) {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcastChannel;
    }
    if (originalNavigator !== undefined) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
    if (originalCrypto !== undefined) {
      (globalThis as { crypto?: Crypto }).crypto = originalCrypto;
    }
    warnSpy.mockRestore();
    jest.restoreAllMocks();
  });

  test('checkEnvironment returns ok-or-degraded (never throws)', async () => {
    const report = await checkEnvironment();
    expect(['ok', 'degraded', 'unknown']).toContain(report.status);
    expect(Array.isArray(report.missing)).toBe(true);
    expect(Array.isArray(report.warnings)).toBe(true);
    expect(typeof report.checkedAt).toBe('number');
  });

  test('missing IndexedDB → degraded + flagged', async () => {
    // Delete indexedDB on globalThis
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
    const report = await checkEnvironment();
    expect(report.missing).toContain('IndexedDB');
    expect(report.status).toBe('degraded');
  });

  test('missing BroadcastChannel → degraded + flagged', async () => {
    delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    const report = await checkEnvironment();
    expect(report.missing).toContain('BroadcastChannel');
    expect(report.status).toBe('degraded');
  });

  test('checkEnvironmentAtBoot emits noa:environment-degraded event when degraded', async () => {
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
    const listener = jest.fn();
    window.addEventListener(ENVIRONMENT_DEGRADED_EVENT, listener as EventListener);
    try {
      await checkEnvironmentAtBoot();
      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as CustomEvent;
      expect(event.detail.missing).toContain('IndexedDB');
    } finally {
      window.removeEventListener(ENVIRONMENT_DEGRADED_EVENT, listener as EventListener);
    }
  });

  test('checkEnvironmentAtBoot does NOT emit event when env is ok', async () => {
    // jsdom provides IndexedDB/BroadcastChannel/crypto by default — if this
    // test env has them, event should not fire.
    const listener = jest.fn();
    window.addEventListener(ENVIRONMENT_DEGRADED_EVENT, listener as EventListener);
    try {
      const report = await checkEnvironmentAtBoot();
      if (report.status === 'ok') {
        expect(listener).not.toHaveBeenCalled();
      } else {
        // If jsdom is missing something, at least verify event did fire.
        expect(listener).toHaveBeenCalled();
      }
    } finally {
      window.removeEventListener(ENVIRONMENT_DEGRADED_EVENT, listener as EventListener);
    }
  });
});
