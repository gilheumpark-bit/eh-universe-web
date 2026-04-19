/**
 * novel-plugin-registry — Plugin registry infrastructure for Novel Studio.
 *
 * Stage: SKELETON ONLY.
 *   - Bundled plugins (shipped with Novel Studio) can be registered and toggled.
 *   - External plugin loading is intentionally NOT implemented — the API
 *     surface is reserved with `// TODO` markers so future work does not
 *     need to reshape consumer code.
 *   - Permission model is declared and runtime-enforced (PermissionEnforcer)
 *     plus compile-time capability stripping (`buildScopedContext`).
 *
 * See: AGENTS.md § "Novel Studio Plugin Marketplace" (pending).
 *
 * @module novel-plugin-registry
 * @example
 * import { NovelPluginRegistry } from '@/lib/novel-plugin-registry';
 *
 * const registry = new NovelPluginRegistry();
 * registry.register({
 *   manifest: {
 *     id: 'word-count-badge',
 *     name: { ko: '단어 카운터', en: 'Word Counter', ja: 'ワードカウンター', zh: '字数统计' },
 *     description: { ko: '', en: 'Show a live word count.', ja: '', zh: '' },
 *     version: '1.0.0',
 *     category: 'utility',
 *     author: 'NOA',
 *     entryPoint: 'built-in://word-count-badge',
 *     permissions: ['read-manuscript'],
 *     bundled: true,
 *   },
 *   activate: () => { ... },
 * });
 *
 * await registry.enable('word-count-badge', ctx);
 */
import type { ReactNode } from 'react';
import type { AppLanguage, ChatSession } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types (manifest + runtime plugin shape + context)
// ============================================================

/**
 * Functional category for catalog filtering.
 * Kept narrow on purpose — adding a new category should be a deliberate
 * decision (UI labels + icon mapping both depend on this union).
 */
export type NovelPluginCategory =
  | 'analysis'       // quality / analysis tools
  | 'visualization'  // charts / visualizations
  | 'export'         // output / conversion
  | 'ai-enhancer'    // AI auxiliary tools
  | 'ui-theme'       // theme / UI customization
  | 'utility';       // general utility

/**
 * 4-language localized label. Mirrors the shape consumed by
 * `src/lib/i18n.ts#L4` so manifests can be passed through directly.
 */
export interface L4Label {
  ko: string;
  en: string;
  ja: string;
  zh: string;
}

/**
 * Declared permissions a plugin *says* it needs.
 *
 * The runtime does not currently enforce these — the future sandbox will.
 * Today they serve only as informed-consent metadata shown in the UI so
 * the user can make an allow/deny decision before enabling.
 */
export type NovelPluginPermission =
  | 'read-manuscript'
  | 'write-manuscript'
  | 'read-characters'
  | 'write-characters'
  | 'read-storage'
  | 'write-storage'
  | 'storage'         // legacy — kept for backward compat with existing manifests
  | 'network'
  | 'show-ui';

export interface NovelPluginManifest {
  /** Unique id. Recommended kebab-case, no spaces. e.g. 'word-count-badge' */
  id: string;
  /** Localized display name. */
  name: L4Label;
  /** Localized one-line description. */
  description: L4Label;
  /** Semver-ish version string. */
  version: string;
  category: NovelPluginCategory;
  /** Free-form author attribution. */
  author: string;
  /** Optional lucide-react icon name (e.g. 'Hash'). */
  iconLucide?: string;
  /**
   * Entry point.
   *   - 'built-in://<id>' for bundled plugins
   *   - URL / relative path for external plugins (NOT YET SUPPORTED)
   */
  entryPoint: string;
  /** Declared permissions — surfaced to user before enable. */
  permissions?: NovelPluginPermission[];
  /** true = shipped inside Novel Studio; false/undefined = external. */
  bundled?: boolean;
  /**
   * Optional integrity metadata. When present, the host computes the SHA-256
   * of the bundle content at install time and refuses installation on
   * mismatch. `signature` is reserved — real signature verification TBD.
   */
  integrity?: { sha256: string; signature?: string };
}

/**
 * Context handed to a plugin's lifecycle hooks.
 *
 * Only capabilities consistent with the plugin's declared permissions
 * should be populated — the registry handles that filtering on enable().
 */
export interface PluginContext {
  language: AppLanguage;
  currentSession: ChatSession | null;
  /** Fire an app-level event. Plugins should namespace: 'noa:plugin:<id>:*'. */
  emit: (event: string, data: unknown) => void;
  /** Present only if 'read-manuscript' permission granted. */
  readManuscript?: () => string;
  /** Present only if 'write-manuscript' permission granted. */
  writeManuscript?: (content: string) => void;
}

/**
 * Runtime plugin instance — manifest + optional lifecycle hooks + render.
 */
export interface NovelPlugin {
  manifest: NovelPluginManifest;
  /** Called when the user enables the plugin. */
  activate?: (ctx: PluginContext) => void | Promise<void>;
  /** Called when the user disables or unloads the plugin. */
  deactivate?: () => void | Promise<void>;
  /**
   * Optional panel UI renderer.
   * Note: current consumers render bundled plugins only — the iframe/worker
   * sandbox for third-party `renderPanel` is future work.
   */
  renderPanel?: (ctx: PluginContext) => ReactNode;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=NovelPluginManifest,NovelPlugin,PluginContext

// ============================================================
// PART 2 — Registry class + persistence
// ============================================================

const STORAGE_KEY = 'noa_enabled_plugins';

/**
 * Safe localStorage read. Returns [] on SSR / quota errors / malformed JSON.
 */
function readEnabledIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive filter — strings only.
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch (err) {
    logger.warn('novel-plugin-registry', 'readEnabledIds failed', err);
    return [];
  }
}

function writeEnabledIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    logger.warn('novel-plugin-registry', 'writeEnabledIds failed', err);
  }
}

/**
 * In-memory registry of Novel Studio plugins.
 *
 * This class is intentionally NOT a React-integrated store — integration
 * layers (hooks, context providers) can wrap it as needed. Tests can
 * instantiate fresh copies via the exported `NovelPluginRegistry` class.
 */
export class NovelPluginRegistry {
  private plugins = new Map<string, NovelPlugin>();
  private enabled = new Set<string>();

  constructor() {
    // Hydrate enabled-ids from localStorage (if available).
    for (const id of readEnabledIds()) {
      this.enabled.add(id);
    }
  }

  /**
   * Register a plugin. Duplicate ids overwrite — callers should guard.
   */
  register(plugin: NovelPlugin): void {
    if (!plugin?.manifest?.id) {
      logger.warn('novel-plugin-registry', 'register: missing manifest.id');
      return;
    }
    this.plugins.set(plugin.manifest.id, plugin);
  }

  /**
   * Unregister a plugin. If enabled, also removes it from enabled-ids
   * (and attempts deactivate on a best-effort basis — errors swallowed).
   */
  unregister(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin && this.enabled.has(id)) {
      Promise.resolve(plugin.deactivate?.()).catch((err) => {
        logger.warn('novel-plugin-registry', `unregister/deactivate(${id})`, err);
      });
    }
    this.plugins.delete(id);
    if (this.enabled.delete(id)) {
      writeEnabledIds(Array.from(this.enabled));
    }
  }

  /**
   * List manifests, optionally filtered by category.
   */
  list(category?: NovelPluginCategory): NovelPluginManifest[] {
    const all = Array.from(this.plugins.values(), (p) => p.manifest);
    if (!category) return all;
    return all.filter((m) => m.category === category);
  }

  /**
   * Get the full runtime plugin by id.
   */
  get(id: string): NovelPlugin | undefined {
    return this.plugins.get(id);
  }

  isEnabled(id: string): boolean {
    return this.enabled.has(id);
  }

  /**
   * Enable a plugin — adds to enabled set, persists, runs activate().
   *
   * Errors from activate() are caught so a misbehaving plugin cannot
   * crash the host. The id remains in the enabled set on activate
   * failure so the user can diagnose; future work may add a quarantine.
   */
  async enable(id: string, ctx: PluginContext): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      logger.warn('novel-plugin-registry', `enable: unknown plugin "${id}"`);
      return;
    }
    if (this.enabled.has(id)) return;
    this.enabled.add(id);
    writeEnabledIds(Array.from(this.enabled));
    const scopedCtx = this.buildScopedContext(plugin.manifest, ctx);
    try {
      await plugin.activate?.(scopedCtx);
    } catch (err) {
      logger.error('novel-plugin-registry', `activate(${id}) threw`, err);
    }
  }

  /**
   * Disable a plugin — removes from enabled set, persists, runs deactivate().
   */
  async disable(id: string): Promise<void> {
    if (!this.enabled.has(id)) return;
    const plugin = this.plugins.get(id);
    this.enabled.delete(id);
    writeEnabledIds(Array.from(this.enabled));
    if (plugin) {
      try {
        await plugin.deactivate?.();
      } catch (err) {
        logger.error('novel-plugin-registry', `deactivate(${id}) threw`, err);
      }
    }
  }

  /**
   * Snapshot of enabled plugin ids (persisted via localStorage).
   */
  getEnabledIds(): string[] {
    return Array.from(this.enabled);
  }

  /**
   * Project the caller-supplied ctx down to only the capabilities the
   * plugin declared it needs. Capability methods not declared are
   * dropped to undefined — cheap defense-in-depth.
   *
   * The runtime guard (PermissionEnforcer) complements this compile-time
   * capability stripping: even if a bundled plugin ignores the undefined
   * check and smuggles a reference, runtime enforcement logs + revokes.
   */
  private buildScopedContext(
    manifest: NovelPluginManifest,
    ctx: PluginContext,
  ): PluginContext {
    const perms = new Set<NovelPluginPermission>(manifest.permissions ?? []);
    const id = manifest.id;
    const wrap = <T extends (...args: never[]) => unknown>(
      permission: NovelPluginPermission,
      fn: T | undefined,
    ): T | undefined => {
      if (!perms.has(permission) || typeof fn !== 'function') return undefined;
      // Wrap so every call is audited at runtime.
      return ((...args: Parameters<T>) => {
        const granted = permissionEnforcer.check(id, permission);
        if (!granted) return undefined;
        try {
          return (fn as (...a: Parameters<T>) => unknown)(...args);
        } catch (err) {
          logger.warn('novel-plugin-registry', `capability ${permission} threw`, err);
          return undefined;
        }
      }) as T;
    };
    return {
      language: ctx.language,
      currentSession: ctx.currentSession,
      emit: ctx.emit,
      readManuscript: wrap('read-manuscript', ctx.readManuscript),
      writeManuscript: wrap('write-manuscript', ctx.writeManuscript),
    };
  }
}

// IDENTITY_SEAL: PART-2 | role=Registry | inputs=NovelPlugin | outputs=NovelPluginRegistry

// ============================================================
// PART 2B — Permission enforcer + integrity verifier
// ============================================================

/**
 * Per-call record produced every time a plugin exercises a capability.
 * Writable-only from inside PermissionEnforcer — external code uses audit().
 */
export interface PermissionAuditLog {
  pluginId: string;
  permission: NovelPluginPermission | string;
  timestamp: number;
  granted: boolean;
  caller?: string;
}

/**
 * Runtime permission gatekeeper.
 *
 * Complementary to `buildScopedContext` compile-time stripping — if a
 * revoked plugin somehow retains a reference to a capability closure
 * (e.g. cached before revoke), `check()` flips to `granted=false` and
 * the wrapper in buildScopedContext returns undefined.
 *
 * Designed for hot-path use: O(1) check, bounded log (most recent 500).
 */
export class PermissionEnforcer {
  private log: PermissionAuditLog[] = [];
  private revoked = new Set<string>();
  private maxLog = 500;

  /**
   * Query + audit. Returns true when the plugin may proceed.
   */
  check(pluginId: string, permission: NovelPluginPermission | string, caller?: string): boolean {
    const granted = !this.revoked.has(pluginId);
    const entry: PermissionAuditLog = {
      pluginId,
      permission,
      timestamp: Date.now(),
      granted,
      caller,
    };
    this.log.push(entry);
    if (this.log.length > this.maxLog) {
      // Trim oldest — cheap shift is acceptable at 500-entry cap.
      this.log.splice(0, this.log.length - this.maxLog);
    }
    return granted;
  }

  /**
   * Snapshot of the audit log. Caller gets a defensive copy.
   */
  audit(): PermissionAuditLog[] {
    return this.log.slice();
  }

  /**
   * Mark a plugin's permissions revoked. Subsequent check() returns false.
   * Intended for emergency kill-switch (timeout, rate-limit breach).
   */
  revoke(pluginId: string): void {
    this.revoked.add(pluginId);
  }

  /** Undo revoke — useful for tests and administrative re-enable. */
  reinstate(pluginId: string): void {
    this.revoked.delete(pluginId);
  }
}

/** Process-wide enforcer used by the registry's scoped context wrapper. */
export const permissionEnforcer = new PermissionEnforcer();

/**
 * Compute SHA-256 of `bundleContent` and compare against
 * `manifest.integrity.sha256` (when provided). Uses Web Crypto when
 * available, falling back to a pure-JS implementation for Node test envs.
 *
 * Signature verification is NOT implemented — a `TODO` is emitted when a
 * signature is present so the UI can display an "unsigned" warning chip.
 */
export async function verifyPluginIntegrity(
  manifest: NovelPluginManifest,
  bundleContent: string,
): Promise<{ valid: boolean; sha256: string; warnings: string[] }> {
  const warnings: string[] = [];
  // Lazy import to avoid pulling plugin-sandbox into registry's init path
  // when integrity verification isn't needed (bundled plugins).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { sha256Hex } = require('./plugin-sandbox') as typeof import('./plugin-sandbox');
  const actual = await sha256Hex(bundleContent);
  const declared = manifest.integrity?.sha256;
  let valid = false;
  if (typeof declared !== 'string' || declared.length === 0) {
    warnings.push('no-declared-hash');
  } else if (declared.toLowerCase() !== actual.toLowerCase()) {
    warnings.push(`hash-mismatch: declared=${declared} actual=${actual}`);
  } else {
    valid = true;
  }
  if (manifest.integrity?.signature) {
    // Signature verification is declared but not yet implemented (ed25519 key pinning planned).
    // Fail-closed: a signed plugin whose signature cannot be verified MUST NOT be trusted.
    // The warning remains for diagnostics; `valid` is forced to false so the marketplace
    // cannot load signature-declared plugins until verification ships.
    warnings.push('signature-declared-but-unverifiable');
    valid = false;
  }
  return { valid, sha256: actual, warnings };
}

// IDENTITY_SEAL: PART-2B | role=Permission+Integrity | inputs=manifest,content | outputs=PermissionEnforcer,verifyPluginIntegrity

// ============================================================
// PART 3 — Singleton + bundled bootstrap + external loader
// ============================================================

/** Process-wide registry singleton (safe in SSR — localStorage guarded). */
export const pluginRegistry = new NovelPluginRegistry();

/**
 * Register all bundled (in-tree) plugins.
 *
 * Intentionally called at app boot — re-calling is safe (register()
 * overwrites by id). Keep this import list small; large plugin code
 * should live inside the plugin module, not here.
 */
export function registerBundledPlugins(registry: NovelPluginRegistry = pluginRegistry): void {
  // Lazy require avoids hard coupling at module init (SSR-safe).
  // Using dynamic static imports is fine — bundlers will tree-shake.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { wordCountBadge } = require('./novel-plugins/word-count-badge') as typeof import('./novel-plugins/word-count-badge');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readingTimeEstimator } = require('./novel-plugins/reading-time-estimator') as typeof import('./novel-plugins/reading-time-estimator');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { emotionColorHint } = require('./novel-plugins/emotion-color-hint') as typeof import('./novel-plugins/emotion-color-hint');
  registry.register(wordCountBadge);
  registry.register(readingTimeEstimator);
  registry.register(emotionColorHint);
}

/**
 * External plugin loader — Worker-sandboxed.
 *
 * Flow:
 *   1. Instantiates a sandboxed Worker via `plugin-sandbox.loadPluginInSandbox`.
 *   2. Wraps the resulting Worker handle as a `NovelPlugin` whose activate /
 *      deactivate forward messages into the sandbox.
 *   3. Bundled plugins never go through this path — see PART 3 comment.
 *
 * Returns a NovelPlugin suitable for `NovelPluginRegistry.register()`.
 * The caller is responsible for the Worker lifecycle (the returned object
 * keeps a reference under `__sandboxHandle` for teardown by tests/admin UI).
 */
export async function loadExternalPlugin(
  url: string,
  declaredPermissions: NovelPluginPermission[] = [],
): Promise<NovelPlugin> {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('loadExternalPlugin: url must be a non-empty string.');
  }
  // Lazy import — only external path touches the sandbox module, so bundled
  // apps that never load externals do not pay the cost at init.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { loadPluginInSandbox } = require('./plugin-sandbox') as typeof import('./plugin-sandbox');
  const handle = await loadPluginInSandbox(url, declaredPermissions);
  const novelPlugin: NovelPlugin & { __sandboxHandle?: unknown } = {
    manifest: { ...handle.manifest, permissions: declaredPermissions, bundled: false },
    activate: () => {
      try { handle.postMessage({ type: 'activate' }); } catch (err) {
        logger.warn('novel-plugin-registry', 'activate postMessage failed', err);
      }
    },
    deactivate: () => {
      try { handle.postMessage({ type: 'deactivate' }); } catch { /* worker gone */ }
      // Force-terminate regardless of deactivate outcome — belt-and-braces.
      try { handle.terminate(); } catch (err) {
        logger.warn('novel-plugin-registry', 'terminate failed', err);
      }
    },
    __sandboxHandle: handle,
  };
  return novelPlugin;
}

// IDENTITY_SEAL: PART-3 | role=Bootstrap | inputs=pluginRegistry | outputs=registerBundledPlugins,loadExternalPlugin
