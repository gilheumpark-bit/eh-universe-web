/**
 * Unit tests for src/lib/novel-plugin-registry.ts
 *
 * Covers: register / unregister, list + category filter, get existence,
 *         enable / disable lifecycle, localStorage persistence,
 *         getEnabledIds snapshot.
 */
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  NovelPluginRegistry,
  PermissionEnforcer,
  permissionEnforcer,
  verifyPluginIntegrity,
  type NovelPlugin,
  type PluginContext,
  type NovelPluginManifest,
} from '@/lib/novel-plugin-registry';

// ============================================================
// PART 1 — Fixtures
// ============================================================

const STORAGE_KEY = 'noa_enabled_plugins';

function mkManifest(overrides: Partial<NovelPluginManifest> = {}): NovelPluginManifest {
  return {
    id: 'test-plugin',
    name: { ko: '테스트', en: 'Test', ja: 'テスト', zh: '测试' },
    description: { ko: '설명', en: 'desc', ja: '説明', zh: '描述' },
    version: '1.0.0',
    category: 'utility',
    author: 'NOA',
    entryPoint: 'built-in://test-plugin',
    bundled: true,
    permissions: ['read-manuscript'],
    ...overrides,
  };
}

function mkPlugin(id: string, category: NovelPluginManifest['category'] = 'utility'): NovelPlugin {
  const activate = jest.fn();
  const deactivate = jest.fn();
  return {
    manifest: mkManifest({ id, category }),
    activate,
    deactivate,
  };
}

function mkCtx(): PluginContext {
  return {
    language: 'KO',
    currentSession: null,
    emit: jest.fn(),
    readManuscript: () => 'hello world',
    writeManuscript: jest.fn(),
  };
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe('NovelPluginRegistry', () => {
  beforeEach(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // jsdom localStorage always available — defensive catch anyway.
    }
  });

  test('register stores plugin; unregister removes it', () => {
    const reg = new NovelPluginRegistry();
    const plugin = mkPlugin('p1');
    reg.register(plugin);
    expect(reg.get('p1')).toBe(plugin);
    reg.unregister('p1');
    expect(reg.get('p1')).toBeUndefined();
  });

  test('list returns every registered manifest', () => {
    const reg = new NovelPluginRegistry();
    reg.register(mkPlugin('a'));
    reg.register(mkPlugin('b'));
    reg.register(mkPlugin('c'));
    const ids = reg.list().map((m) => m.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  test('list(category) filters by category', () => {
    const reg = new NovelPluginRegistry();
    reg.register(mkPlugin('analysis-1', 'analysis'));
    reg.register(mkPlugin('analysis-2', 'analysis'));
    reg.register(mkPlugin('theme-1', 'ui-theme'));
    const analysisIds = reg.list('analysis').map((m) => m.id).sort();
    expect(analysisIds).toEqual(['analysis-1', 'analysis-2']);
    expect(reg.list('ui-theme').map((m) => m.id)).toEqual(['theme-1']);
  });

  test('get returns undefined for unknown id', () => {
    const reg = new NovelPluginRegistry();
    expect(reg.get('nope')).toBeUndefined();
    reg.register(mkPlugin('here'));
    expect(reg.get('here')).toBeDefined();
  });

  test('enable marks plugin enabled and runs activate', async () => {
    const reg = new NovelPluginRegistry();
    const plugin = mkPlugin('p1');
    reg.register(plugin);
    expect(reg.isEnabled('p1')).toBe(false);
    await reg.enable('p1', mkCtx());
    expect(reg.isEnabled('p1')).toBe(true);
    expect(plugin.activate).toHaveBeenCalledTimes(1);
  });

  test('disable clears enabled flag and runs deactivate', async () => {
    const reg = new NovelPluginRegistry();
    const plugin = mkPlugin('p1');
    reg.register(plugin);
    await reg.enable('p1', mkCtx());
    await reg.disable('p1');
    expect(reg.isEnabled('p1')).toBe(false);
    expect(plugin.deactivate).toHaveBeenCalledTimes(1);
  });

  test('enable persists ids to localStorage', async () => {
    const reg = new NovelPluginRegistry();
    reg.register(mkPlugin('alpha'));
    reg.register(mkPlugin('beta'));
    await reg.enable('alpha', mkCtx());
    await reg.enable('beta', mkCtx());
    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const ids = JSON.parse(stored as string) as string[];
    expect(ids.sort()).toEqual(['alpha', 'beta']);
  });

  test('getEnabledIds returns only currently-enabled ids', async () => {
    const reg = new NovelPluginRegistry();
    reg.register(mkPlugin('a'));
    reg.register(mkPlugin('b'));
    reg.register(mkPlugin('c'));
    await reg.enable('a', mkCtx());
    await reg.enable('c', mkCtx());
    expect(reg.getEnabledIds().sort()).toEqual(['a', 'c']);
    await reg.disable('a');
    expect(reg.getEnabledIds()).toEqual(['c']);
  });

  test('constructor rehydrates enabled ids from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['alpha', 'beta']));
    const reg = new NovelPluginRegistry();
    expect(reg.isEnabled('alpha')).toBe(true);
    expect(reg.isEnabled('beta')).toBe(true);
    expect(reg.isEnabled('gamma')).toBe(false);
  });

  test('enable on unknown id is a safe no-op', async () => {
    const reg = new NovelPluginRegistry();
    await reg.enable('ghost', mkCtx());
    expect(reg.isEnabled('ghost')).toBe(false);
  });

  test('scoped context strips capabilities the manifest did not request', async () => {
    const reg = new NovelPluginRegistry();
    const activate = jest.fn();
    const plugin: NovelPlugin = {
      // No permissions declared → read/write manuscript stripped.
      manifest: mkManifest({ id: 'sandboxed', permissions: [] }),
      activate,
    };
    reg.register(plugin);
    await reg.enable('sandboxed', mkCtx());
    const receivedCtx = activate.mock.calls[0][0] as PluginContext;
    expect(receivedCtx.readManuscript).toBeUndefined();
    expect(receivedCtx.writeManuscript).toBeUndefined();
    expect(typeof receivedCtx.emit).toBe('function');
  });

  test('PermissionEnforcer records granted calls and revoke flips to false', () => {
    const enforcer = new PermissionEnforcer();
    expect(enforcer.check('p1', 'read-manuscript')).toBe(true);
    enforcer.revoke('p1');
    expect(enforcer.check('p1', 'read-manuscript')).toBe(false);
    const log = enforcer.audit();
    // At least the two calls we made show up in order.
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log[log.length - 1].granted).toBe(false);
    expect(log[log.length - 2].granted).toBe(true);
    enforcer.reinstate('p1');
    expect(enforcer.check('p1', 'read-manuscript')).toBe(true);
  });

  test('verifyPluginIntegrity matches a correct SHA-256 and rejects mismatches', async () => {
    // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const good = mkManifest({
      id: 'integrity-ok',
      integrity: { sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' },
    });
    const okRes = await verifyPluginIntegrity(good, 'hello');
    expect(okRes.valid).toBe(true);
    expect(okRes.sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');

    const bad = mkManifest({
      id: 'integrity-bad',
      integrity: { sha256: 'deadbeef' },
    });
    const badRes = await verifyPluginIntegrity(bad, 'hello');
    expect(badRes.valid).toBe(false);
    expect(badRes.warnings.some((w) => w.includes('hash-mismatch'))).toBe(true);

    const unsigned = mkManifest({ id: 'integrity-none' });
    const unsignedRes = await verifyPluginIntegrity(unsigned, 'hello');
    expect(unsignedRes.valid).toBe(false);
    expect(unsignedRes.warnings).toContain('no-declared-hash');
  });

  test('bundled plugin uses runtime enforcer wrapper but does not route through sandbox', async () => {
    // bundled=true path — capabilities still pass through the audit log but
    // do not require the Worker sandbox (which is for external only).
    const reg = new NovelPluginRegistry();
    const activate = jest.fn();
    const plugin: NovelPlugin = {
      manifest: mkManifest({
        id: 'bundled-with-perm',
        bundled: true,
        permissions: ['read-manuscript'],
      }),
      activate,
    };
    reg.register(plugin);
    // Clear enforcer log baseline for a clean assertion.
    permissionEnforcer.reinstate('bundled-with-perm');
    const before = permissionEnforcer.audit().length;

    await reg.enable('bundled-with-perm', mkCtx());
    const ctx = activate.mock.calls[0][0] as PluginContext;
    expect(typeof ctx.readManuscript).toBe('function');
    const out = ctx.readManuscript?.();
    expect(out).toBe('hello world');

    const after = permissionEnforcer.audit();
    expect(after.length).toBeGreaterThan(before);
    expect(after[after.length - 1].pluginId).toBe('bundled-with-perm');
    expect(after[after.length - 1].granted).toBe(true);
  });
});
