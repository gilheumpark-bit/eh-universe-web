/**
 * Novel Studio Plugin Sandbox — Worker-based isolation runtime.
 *
 * External plugins (bundled=false) are executed inside a dedicated Web Worker
 * instantiated from a `blob:` URL so CSP stays tight (no inline-script / no
 * direct `eval`). The host retains full control: terminate-on-timeout,
 * postMessage rate-limit, capability-scoped context.
 *
 * Bundled plugins are trusted and do NOT pass through this runtime — the
 * Marketplace host layer decides which code path to use (see
 * `novel-plugin-registry.ts` → `loadExternalPlugin`).
 *
 * Design notes
 *   - Worker code is a small bootstrap stub that awaits `{ type: 'init' }`
 *     carrying the remote plugin source URL + declared permissions. The stub
 *     `importScripts()`-loads the source and forwards lifecycle calls.
 *   - Capabilities (readManuscript / writeManuscript / storage / network) are
 *     NOT exposed to the Worker directly — the Worker asks the host via
 *     postMessage, and the host applies permission enforcement before
 *     responding. This keeps the permission boundary on the trusted side.
 *   - Host guarantees `terminate()` on timeout, rate-limit breach, or
 *     explicit unload.
 */
import { logger } from '@/lib/logger';
import type {
  NovelPluginManifest,
  NovelPluginPermission,
  PluginContext,
} from '@/lib/novel-plugin-registry';

// ============================================================
// PART 1 — Types, constants, safety helpers
// ============================================================

/** Wall-clock ms the host waits for a Worker response before terminating. */
export const SANDBOX_RESPONSE_TIMEOUT_MS = 5_000;

/** Max postMessage rate per sliding second — breach triggers terminate. */
export const SANDBOX_RATE_LIMIT_PER_SEC = 100;

/** Max cumulative postMessage count before terminate (defense-in-depth). */
export const SANDBOX_MAX_MESSAGES = 10_000;

/**
 * Public handle returned to the caller.
 *
 * The caller must not retain the raw Worker reference outside this module —
 * use `postMessage` / `terminate` only.
 */
export interface SandboxedPlugin {
  id: string;
  worker: Worker;
  manifest: NovelPluginManifest;
  postMessage: (msg: unknown) => void;
  terminate: () => void;
}

/** Envelope for every message going *into* the Worker. */
interface InboundMessage {
  type: 'init' | 'activate' | 'deactivate' | 'capability-response';
  payload?: unknown;
  requestId?: string;
}

/** Envelope for every message coming *out* of the Worker. */
interface OutboundMessage {
  type: 'ready' | 'capability-request' | 'emit' | 'error' | 'log';
  payload?: unknown;
  requestId?: string;
}

/**
 * Check at module load — fails fast in runtimes without Worker/Blob/URL.
 * Node 18+ has Worker (`node:worker_threads` shape), but NOT a browser Worker.
 * In that environment the test suite supplies a Jest mock (see tests).
 */
function ensureWorkerSupport(): void {
  if (typeof Worker === 'undefined') {
    throw new Error('[plugin-sandbox] Worker API is not available in this runtime.');
  }
  if (typeof Blob === 'undefined') {
    throw new Error('[plugin-sandbox] Blob API is not available in this runtime.');
  }
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('[plugin-sandbox] URL.createObjectURL is not available.');
  }
}

/**
 * Defensive schema check on messages coming FROM the worker.
 * We treat any malformed structure as hostile and terminate the plugin.
 */
function isOutboundMessage(v: unknown): v is OutboundMessage {
  if (!v || typeof v !== 'object') return false;
  const t = (v as { type?: unknown }).type;
  if (typeof t !== 'string') return false;
  return (
    t === 'ready' ||
    t === 'capability-request' ||
    t === 'emit' ||
    t === 'error' ||
    t === 'log'
  );
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=SandboxedPlugin,constants

// ============================================================
// PART 2 — Worker bootstrap source + capability router
// ============================================================

/**
 * Source code of the tiny bootstrap loaded into every sandbox Worker.
 *
 * This stub:
 *   1. Waits for an { init, payload: { src, permissions } } message.
 *   2. importScripts(src) — CSP-compliant: the external URL must live in the
 *      site's `worker-src` allowlist.
 *   3. Forwards activate/deactivate calls to the loaded plugin. The plugin
 *      exports a global `__NovelPlugin` with { activate, deactivate }.
 *   4. Exposes a synthetic `ctx` that proxies every capability call back to
 *      the host via postMessage (host enforces permissions).
 *
 * Kept inside this module as a string so the build pipeline does not need a
 * separate worker file — any external plugin code still loads via
 * `importScripts(src)`, which the browser CSP controls.
 */
const WORKER_BOOTSTRAP_SRC = `
  'use strict';
  (function () {
    var pluginMod = null;
    var pendingResolvers = Object.create(null);

    function postSafe(msg) {
      try { self.postMessage(msg); } catch (e) { /* worker closing */ }
    }

    function callHost(method, args) {
      return new Promise(function (resolve, reject) {
        var requestId = String(Date.now()) + ':' + Math.random().toString(36).slice(2);
        pendingResolvers[requestId] = { resolve: resolve, reject: reject };
        postSafe({ type: 'capability-request', requestId: requestId, payload: { method: method, args: args } });
      });
    }

    var ctx = {
      readManuscript: function () { return callHost('readManuscript', []); },
      writeManuscript: function (content) { return callHost('writeManuscript', [content]); },
      emit: function (event, data) { postSafe({ type: 'emit', payload: { event: event, data: data } }); },
    };

    self.addEventListener('message', function (ev) {
      var msg = ev && ev.data;
      if (!msg || typeof msg !== 'object') return;
      try {
        if (msg.type === 'init') {
          var p = msg.payload || {};
          if (typeof p.src === 'string' && p.src.length > 0) {
            try {
              importScripts(p.src);
            } catch (impErr) {
              postSafe({ type: 'error', payload: { message: 'importScripts failed: ' + String(impErr) } });
              return;
            }
          }
          pluginMod = self.__NovelPlugin || null;
          postSafe({ type: 'ready' });
        } else if (msg.type === 'activate') {
          if (pluginMod && typeof pluginMod.activate === 'function') {
            Promise.resolve(pluginMod.activate(ctx)).catch(function (err) {
              postSafe({ type: 'error', payload: { message: 'activate threw: ' + String(err) } });
            });
          }
        } else if (msg.type === 'deactivate') {
          if (pluginMod && typeof pluginMod.deactivate === 'function') {
            Promise.resolve(pluginMod.deactivate()).catch(function (err) {
              postSafe({ type: 'error', payload: { message: 'deactivate threw: ' + String(err) } });
            });
          }
        } else if (msg.type === 'capability-response') {
          var rid = msg.requestId;
          if (rid && pendingResolvers[rid]) {
            pendingResolvers[rid].resolve(msg.payload);
            delete pendingResolvers[rid];
          }
        }
      } catch (e) {
        postSafe({ type: 'error', payload: { message: String(e) } });
      }
    });
  })();
`;

/**
 * Build a blob: URL carrying the bootstrap script. Caller owns revokeObjectURL.
 */
function buildBootstrapBlobUrl(): string {
  const blob = new Blob([WORKER_BOOTSTRAP_SRC], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// IDENTITY_SEAL: PART-2 | role=Bootstrap | inputs=none | outputs=WORKER_BOOTSTRAP_SRC,buildBootstrapBlobUrl

// ============================================================
// PART 3 — Sandbox loader + message channel + permission router
// ============================================================

/**
 * Load and boot a sandboxed plugin from an external manifest URL.
 *
 * The returned promise resolves once the Worker has sent `{ type: 'ready' }`
 * (after successful `importScripts`). If the Worker does not respond within
 * `SANDBOX_RESPONSE_TIMEOUT_MS`, the Worker is terminated and the promise
 * rejects.
 *
 * Note: this function does NOT register the loaded plugin with the global
 * `NovelPluginRegistry` — callers (Marketplace UI) decide whether to install.
 */
export async function loadPluginInSandbox(
  manifestUrl: string,
  permissions: NovelPluginPermission[],
  capabilities?: Partial<PluginContext>,
): Promise<SandboxedPlugin> {
  ensureWorkerSupport();
  if (typeof manifestUrl !== 'string' || manifestUrl.length === 0) {
    throw new Error('[plugin-sandbox] manifestUrl must be a non-empty string.');
  }

  const bootstrapUrl = buildBootstrapBlobUrl();
  const worker = new Worker(bootstrapUrl);
  // Best-effort cleanup; some mocks don't implement revokeObjectURL.
  try { URL.revokeObjectURL(bootstrapUrl); } catch { /* noop */ }

  // Stub manifest — caller will swap in the real manifest after fetching.
  const manifest: NovelPluginManifest = {
    id: 'sandboxed-external',
    name: { ko: 'External Plugin', en: 'External Plugin', ja: 'External Plugin', zh: 'External Plugin' },
    description: { ko: '', en: '', ja: '', zh: '' },
    version: '0.0.0',
    category: 'utility',
    author: 'external',
    entryPoint: manifestUrl,
    bundled: false,
    permissions,
  };

  // Arm channel with capability routing enabled — the host can still
  // override later via createPluginMessageChannel (adds a second handler).
  // When caps are undefined, any request is answered with undefined, i.e.
  // effectively a denial — stays consistent with the permission model.
  const { postMessage, terminate } = armMessageChannel(worker, {
    permissions,
    capabilities,
    routeCapabilities: true,
  });

  // Wait for ready-or-timeout.
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => {
      terminate();
      reject(new Error('[plugin-sandbox] init timed out (5s).'));
    }, SANDBOX_RESPONSE_TIMEOUT_MS);

    const readyHandler = (ev: MessageEvent<unknown>) => {
      if (isOutboundMessage(ev.data) && ev.data.type === 'ready') {
        clearTimeout(to);
        worker.removeEventListener('message', readyHandler);
        resolve();
      } else if (isOutboundMessage(ev.data) && ev.data.type === 'error') {
        clearTimeout(to);
        worker.removeEventListener('message', readyHandler);
        terminate();
        const p = (ev.data.payload ?? {}) as { message?: string };
        reject(new Error(`[plugin-sandbox] init error: ${p.message ?? 'unknown'}`));
      }
    };
    worker.addEventListener('message', readyHandler);
    // Kick off init.
    postMessage({ type: 'init', payload: { src: manifestUrl, permissions } });
  });

  return {
    id: manifest.id,
    worker,
    manifest,
    postMessage,
    terminate,
  };
}

/**
 * Options bag for `createPluginMessageChannel` — keeps the signature stable
 * if additional host-side hooks are added later (e.g. audit callbacks).
 */
interface ChannelOptions {
  permissions: NovelPluginPermission[];
  /** Optional partial host capabilities — enforced per-permission. */
  capabilities?: Partial<PluginContext>;
  /** Optional audit hook fired whenever a capability call is requested. */
  onCapabilityCall?: (method: string, granted: boolean) => void;
  /** When false, the channel only enforces rate-limit + schema, not capability routing. */
  routeCapabilities?: boolean;
}

/**
 * Wire the host side of the message channel: schema validation, rate limit,
 * permission enforcement for capability-request, and a `terminate` that is
 * idempotent even if the Worker is already gone.
 */
function armMessageChannel(
  worker: Worker,
  opts: ChannelOptions,
): { postMessage: (msg: unknown) => void; terminate: () => void } {
  let terminated = false;
  let messageCount = 0;
  let windowStart = Date.now();
  let windowCount = 0;
  const perms = new Set<NovelPluginPermission>(opts.permissions);

  const doTerminate = (): void => {
    if (terminated) return;
    terminated = true;
    try { worker.terminate(); } catch (err) {
      logger.warn('plugin-sandbox', 'terminate threw', err);
    }
  };

  const send = (msg: unknown): void => {
    if (terminated) return;
    try { worker.postMessage(msg); } catch (err) {
      logger.warn('plugin-sandbox', 'postMessage failed', err);
    }
  };

  const handler = (ev: MessageEvent<unknown>): void => {
    if (terminated) return;

    // Rate limit — sliding 1-second window.
    const now = Date.now();
    if (now - windowStart > 1000) {
      windowStart = now;
      windowCount = 0;
    }
    windowCount += 1;
    messageCount += 1;
    if (windowCount > SANDBOX_RATE_LIMIT_PER_SEC || messageCount > SANDBOX_MAX_MESSAGES) {
      logger.warn('plugin-sandbox', 'rate limit exceeded — terminating');
      doTerminate();
      return;
    }

    // Schema check — anything unrecognized is hostile.
    if (!isOutboundMessage(ev.data)) {
      logger.warn('plugin-sandbox', 'malformed message — terminating');
      doTerminate();
      return;
    }

    const msg = ev.data;
    if (msg.type === 'capability-request' && opts.routeCapabilities !== false) {
      const p = (msg.payload ?? {}) as { method?: string; args?: unknown[] };
      const method = typeof p.method === 'string' ? p.method : '';
      const args = Array.isArray(p.args) ? p.args : [];
      const result = routeCapability(method, args, perms, opts.capabilities);
      opts.onCapabilityCall?.(method, result.granted);
      send({
        type: 'capability-response',
        requestId: msg.requestId,
        payload: result.value,
      });
    }
    // `emit` / `error` / `log` are handled by the caller — they may attach
    // their own listeners for those. We only intercept capability-request.
  };

  worker.addEventListener('message', handler);

  return {
    postMessage: send,
    terminate: doTerminate,
  };
}

/**
 * Map a Worker-requested capability call to a host-side function, gated by
 * the plugin's declared permissions. Unknown methods and unpermitted methods
 * return `{ granted: false, value: undefined }` so the Worker sees undefined
 * rather than the real data — effectively strips the capability.
 */
function routeCapability(
  method: string,
  args: unknown[],
  perms: Set<NovelPluginPermission>,
  caps: Partial<PluginContext> | undefined,
): { granted: boolean; value: unknown } {
  const capBag = caps ?? {};
  if (method === 'readManuscript') {
    if (!perms.has('read-manuscript')) return { granted: false, value: undefined };
    const fn = capBag.readManuscript;
    if (typeof fn !== 'function') return { granted: false, value: undefined };
    try { return { granted: true, value: fn() }; } catch (err) {
      logger.warn('plugin-sandbox', 'readManuscript threw', err);
      return { granted: false, value: undefined };
    }
  }
  if (method === 'writeManuscript') {
    if (!perms.has('write-manuscript')) return { granted: false, value: undefined };
    const fn = capBag.writeManuscript;
    if (typeof fn !== 'function') return { granted: false, value: undefined };
    const content = typeof args[0] === 'string' ? args[0] : '';
    try { fn(content); return { granted: true, value: true }; } catch (err) {
      logger.warn('plugin-sandbox', 'writeManuscript threw', err);
      return { granted: false, value: undefined };
    }
  }
  return { granted: false, value: undefined };
}

/**
 * Public API counterpart used by tests/host wiring.
 *
 * Typical usage (non-test):
 *   ```ts
 *   const sandboxed = await loadPluginInSandbox(url, perms);
 *   createPluginMessageChannel(sandboxed.worker, {
 *     readManuscript: () => editor.getText(),
 *   });
 *   ```
 *
 * The function attaches an additional message listener that services
 * capability requests with the provided partial context. Permission
 * enforcement uses the manifest's `permissions` array.
 */
export function createPluginMessageChannel(
  worker: Worker,
  capabilities: Partial<PluginContext>,
  permissions: NovelPluginPermission[] = [],
): void {
  armMessageChannel(worker, { capabilities, permissions, routeCapabilities: true });
}

// IDENTITY_SEAL: PART-3 | role=Loader | inputs=manifestUrl,permissions | outputs=SandboxedPlugin

// ============================================================
// PART 4 — Integrity (SHA-256 via Web Crypto)
// ============================================================

/**
 * Result returned by integrity verification — both the computed hash and a
 * verdict are included so callers can surface the hash to users (UI chip).
 */
export interface IntegrityResult {
  valid: boolean;
  sha256: string;
  warnings: string[];
}

/**
 * Compute SHA-256 of the given UTF-8 string.
 *
 * Resolution order:
 *   1. WebCrypto `crypto.subtle.digest` (browsers, modern runtimes).
 *   2. Node's built-in `crypto` (test env / SSR).
 *   3. Pure-JS fallback (defense-in-depth, marked [TEST-ONLY]).
 */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof input !== 'string') return '';
  // Path 1 — WebCrypto.
  const g = globalThis as unknown as {
    crypto?: { subtle?: SubtleCrypto };
  };
  if (g.crypto?.subtle?.digest && typeof TextEncoder !== 'undefined') {
    try {
      const enc = new TextEncoder().encode(input);
      const buf = await g.crypto.subtle.digest('SHA-256', enc);
      const bytes = new Uint8Array(buf);
      let out = '';
      for (let i = 0; i < bytes.length; i += 1) {
        out += bytes[i].toString(16).padStart(2, '0');
      }
      return out;
    } catch (err) {
      logger.warn('plugin-sandbox', 'sha256 webcrypto failed — using node crypto', err);
      // fall through
    }
  }
  // Path 2 — Node built-in crypto (jest-environment-jsdom).
  try {
    // Inline require so browser bundlers don't try to polyfill Node's crypto.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto') as { createHash?: (a: string) => { update: (s: string) => { digest: (e: string) => string } } };
    if (typeof nodeCrypto?.createHash === 'function') {
      return nodeCrypto.createHash('sha256').update(input).digest('hex');
    }
  } catch (err) {
    logger.warn('plugin-sandbox', 'node crypto unavailable — using pure-JS fallback', err);
  }
  // Path 3 — Minimal SHA-256 fallback (no external dependency).
  return sha256HexFallback(input);
}

// --- Minimal SHA-256 (pure JS, for test environments only) ---
// Source: public-domain pseudo-code translated to TS. Kept local and private.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ref: comment below
type _unused = never; void 0 as _unused;

function sha256HexFallback(message: string): string {
  function rightRot(n: number, x: number): number { return (x >>> n) | (x << (32 - n)); }
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  // UTF-8 encode
  const bytes: number[] = [];
  for (let i = 0; i < message.length; i += 1) {
    const c = message.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) { bytes.push(0xc0 | (c >> 6)); bytes.push(0x80 | (c & 0x3f)); }
    else { bytes.push(0xe0 | (c >> 12)); bytes.push(0x80 | ((c >> 6) & 0x3f)); bytes.push(0x80 | (c & 0x3f)); }
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i -= 1) bytes.push((bitLen >>> (i * 8)) & 0xff);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const w = new Array<number>(64).fill(0);
    for (let i = 0; i < 16; i += 1) {
      w[i] = ((bytes[chunk + i * 4] << 24) |
              (bytes[chunk + i * 4 + 1] << 16) |
              (bytes[chunk + i * 4 + 2] << 8) |
              (bytes[chunk + i * 4 + 3])) >>> 0;
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRot(7, w[i - 15]) ^ rightRot(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rightRot(17, w[i - 2]) ^ rightRot(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rightRot(6, e) ^ rightRot(11, e) ^ rightRot(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rightRot(2, a) ^ rightRot(13, a) ^ rightRot(22, a);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

// IDENTITY_SEAL: PART-4 | role=Integrity | inputs=string | outputs=sha256Hex
