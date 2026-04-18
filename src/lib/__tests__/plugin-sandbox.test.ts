/**
 * Unit tests for src/lib/plugin-sandbox.ts
 *
 * Covers:
 *   1. Worker creation from blob: URL
 *   2. Capability stripping when permission not declared
 *   3. 5s timeout → terminate
 *   4. Rate-limit breach → terminate
 *   5. Malformed message schema → terminate
 *   6. SHA-256 integrity computation
 *   7. postMessage after terminate is a safe no-op
 *   8. deactivate + terminate ordering
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ============================================================
// PART 1 — Worker / Blob / URL mocks
// ============================================================

interface MockWorkerInstance {
  url: string | URL;
  postMessage: jest.Mock;
  terminate: jest.Mock;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  _listeners: Array<(ev: MessageEvent<unknown>) => void>;
  _fire: (data: unknown) => void;
}

function installMocks() {
  const workerInstances: MockWorkerInstance[] = [];

  class MockWorker {
    url: string | URL;
    postMessage: jest.Mock;
    terminate: jest.Mock;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    _listeners: Array<(ev: MessageEvent<unknown>) => void> = [];
    _fire: (data: unknown) => void;

    constructor(url: string | URL) {
      this.url = url;
      this.postMessage = jest.fn();
      this.terminate = jest.fn();
      this.addEventListener = jest.fn((evt: string, cb: (ev: MessageEvent<unknown>) => void) => {
        if (evt === 'message') this._listeners.push(cb);
      });
      this.removeEventListener = jest.fn((evt: string, cb: (ev: MessageEvent<unknown>) => void) => {
        if (evt === 'message') {
          this._listeners = this._listeners.filter((l) => l !== cb);
        }
      });
      this._fire = (data: unknown): void => {
        for (const l of this._listeners.slice()) {
          l({ data } as MessageEvent<unknown>);
        }
      };
      workerInstances.push(this as unknown as MockWorkerInstance);
    }
  }

  (global as unknown as { Worker: typeof MockWorker }).Worker = MockWorker;

  class MockBlob {
    parts: unknown[];
    size: number;
    type: string;
    constructor(parts: unknown[], opts?: { type?: string }) {
      this.parts = parts;
      this.size = 0;
      this.type = opts?.type ?? '';
    }
  }
  (global as unknown as { Blob: typeof MockBlob }).Blob = MockBlob;

  const createUrlMock = jest.fn(() => 'blob:mock-url');
  const revokeUrlMock = jest.fn();
  if (typeof (global as unknown as { URL?: unknown }).URL === 'undefined') {
    (global as unknown as { URL: { createObjectURL: typeof createUrlMock; revokeObjectURL: typeof revokeUrlMock } }).URL = {
      createObjectURL: createUrlMock,
      revokeObjectURL: revokeUrlMock,
    };
  } else {
    (global as unknown as { URL: { createObjectURL: typeof createUrlMock; revokeObjectURL: typeof revokeUrlMock } }).URL.createObjectURL = createUrlMock;
    (global as unknown as { URL: { createObjectURL: typeof createUrlMock; revokeObjectURL: typeof revokeUrlMock } }).URL.revokeObjectURL = revokeUrlMock;
  }

  return { workerInstances };
}

// ============================================================
// PART 2 — Test cases
// ============================================================

describe('plugin-sandbox', () => {
  let workerInstances: MockWorkerInstance[];

  beforeEach(() => {
    jest.useFakeTimers();
    ({ workerInstances } = installMocks());
    jest.resetModules();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('1. loadPluginInSandbox creates a Worker from a blob: URL', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox('https://example.com/plug.js', []);

    // Fire ready immediately to satisfy the init handshake.
    await Promise.resolve();
    workerInstances[0]._fire({ type: 'ready' });
    const handle = await promise;

    expect(handle.worker).toBe(workerInstances[0]);
    expect(workerInstances[0].url).toBe('blob:mock-url');
    expect(workerInstances[0].postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'init' }),
    );
  });

  test('2. capability without declared permission returns undefined', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox('https://example.com/p.js', []);
    await Promise.resolve();
    workerInstances[0]._fire({ type: 'ready' });
    await promise;

    // Worker requests readManuscript, but declared permissions = [].
    workerInstances[0]._fire({
      type: 'capability-request',
      requestId: 'r1',
      payload: { method: 'readManuscript', args: [] },
    });

    const response = workerInstances[0].postMessage.mock.calls.find(
      (c) => (c[0] as { type?: string }).type === 'capability-response',
    );
    expect(response).toBeDefined();
    expect((response?.[0] as { payload?: unknown }).payload).toBeUndefined();
  });

  test('3. init timeout after 5s terminates the Worker', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox('https://example.com/p.js', []);

    // Advance past the 5s timeout — never fire ready.
    jest.advanceTimersByTime(mod.SANDBOX_RESPONSE_TIMEOUT_MS + 10);

    await expect(promise).rejects.toThrow(/timed out/i);
    expect(workerInstances[0].terminate).toHaveBeenCalled();
  });

  test('4. rate-limit breach terminates the Worker', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox('https://example.com/p.js', []);
    await Promise.resolve();
    workerInstances[0]._fire({ type: 'ready' });
    await promise;

    // Blast > SANDBOX_RATE_LIMIT_PER_SEC messages inside the same 1s window.
    for (let i = 0; i < mod.SANDBOX_RATE_LIMIT_PER_SEC + 5; i += 1) {
      workerInstances[0]._fire({ type: 'emit', payload: { event: 'x', data: i } });
    }
    expect(workerInstances[0].terminate).toHaveBeenCalled();
  });

  test('5. malformed message triggers terminate', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox('https://example.com/p.js', []);
    await Promise.resolve();
    workerInstances[0]._fire({ type: 'ready' });
    await promise;

    // Non-object / missing `type` — schema violation.
    workerInstances[0]._fire('not-an-object');
    expect(workerInstances[0].terminate).toHaveBeenCalled();
  });

  test('6. sha256Hex produces the correct SHA-256 for a known string', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const empty = await mod.sha256Hex('');
    expect(empty).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const abc = await mod.sha256Hex('abc');
    expect(abc).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('7. postMessage after terminate is a safe no-op', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox('https://example.com/p.js', []);
    await Promise.resolve();
    workerInstances[0]._fire({ type: 'ready' });
    const handle = await promise;

    handle.terminate();
    expect(workerInstances[0].terminate).toHaveBeenCalled();

    const before = workerInstances[0].postMessage.mock.calls.length;
    handle.postMessage({ type: 'activate' });
    const after = workerInstances[0].postMessage.mock.calls.length;
    // No new postMessage on the mock worker after terminate.
    expect(after).toBe(before);
  });

  test('8. terminate is idempotent', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox('https://example.com/p.js', []);
    await Promise.resolve();
    workerInstances[0]._fire({ type: 'ready' });
    const handle = await promise;

    handle.terminate();
    handle.terminate();
    handle.terminate();
    expect(workerInstances[0].terminate).toHaveBeenCalledTimes(1);
  });

  test('9. readManuscript with granted permission invokes host capability', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../plugin-sandbox') as typeof import('../plugin-sandbox');
    const promise = mod.loadPluginInSandbox(
      'https://example.com/p.js',
      ['read-manuscript'],
      { readManuscript: () => 'hello' },
    );
    await Promise.resolve();
    workerInstances[0]._fire({ type: 'ready' });
    const handle = await promise;
    expect(handle.id).toBe('sandboxed-external');

    workerInstances[0]._fire({
      type: 'capability-request',
      requestId: 'r7',
      payload: { method: 'readManuscript', args: [] },
    });

    const match = workerInstances[0].postMessage.mock.calls.find(
      (c) => (c[0] as { type?: string; requestId?: string }).requestId === 'r7',
    );
    expect(match).toBeDefined();
    expect((match?.[0] as { payload?: unknown }).payload).toBe('hello');
  });
});
