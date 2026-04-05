// ============================================================
// CS Quill 🦔 — Plugin System
// ============================================================
// 플러그인 레지스트리 + lazy loading + 샌드박스.
// 플러그인 50% → 75%

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getGlobalConfigDir } from './config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  type: 'engine' | 'command' | 'formatter' | 'preset';
  entryPoint: string;
  hooks?: {
    beforeVerify?: string;
    afterVerify?: string;
    beforeGenerate?: string;
    afterGenerate?: string;
  };
  dependencies?: string[];
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  installedAt: number;
  enabled: boolean;
  path: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=PluginManifest,InstalledPlugin

// ============================================================
// PART 2 — Plugin Registry
// ============================================================

function getPluginDir(): string {
  return join(getGlobalConfigDir(), 'plugins');
}

function getRegistryPath(): string {
  return join(getGlobalConfigDir(), 'plugin-registry.json');
}

function loadRegistry(): InstalledPlugin[] {
  const path = getRegistryPath();
  if (!existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return []; }
}

function saveRegistry(plugins: InstalledPlugin[]): void {
  mkdirSync(getGlobalConfigDir(), { recursive: true });
  writeFileSync(getRegistryPath(), JSON.stringify(plugins, null, 2));
}

// IDENTITY_SEAL: PART-2 | role=registry | inputs=none | outputs=InstalledPlugin[]

// ============================================================
// PART 3 — Install / Uninstall / Enable / Disable
// ============================================================

export function installPlugin(manifest: PluginManifest, pluginPath: string): boolean {
  const registry = loadRegistry();

  if (registry.some(p => p.manifest.name === manifest.name)) {
    return false; // Already installed
  }

  registry.push({
    manifest,
    installedAt: Date.now(),
    enabled: true,
    path: pluginPath,
  });

  saveRegistry(registry);
  return true;
}

export function uninstallPlugin(name: string): boolean {
  const registry = loadRegistry();
  const idx = registry.findIndex(p => p.manifest.name === name);
  if (idx < 0) return false;
  registry.splice(idx, 1);
  saveRegistry(registry);
  return true;
}

export function enablePlugin(name: string): boolean {
  const registry = loadRegistry();
  const plugin = registry.find(p => p.manifest.name === name);
  if (!plugin) return false;
  plugin.enabled = true;
  saveRegistry(registry);
  return true;
}

export function disablePlugin(name: string): boolean {
  const registry = loadRegistry();
  const plugin = registry.find(p => p.manifest.name === name);
  if (!plugin) return false;
  plugin.enabled = false;
  saveRegistry(registry);
  return true;
}

export function listPlugins(): InstalledPlugin[] {
  return loadRegistry();
}

export function getEnabledPlugins(): InstalledPlugin[] {
  return loadRegistry().filter(p => p.enabled);
}

// IDENTITY_SEAL: PART-3 | role=management | inputs=name | outputs=boolean

// ============================================================
// PART 4 — Hook Executor
// ============================================================

export type HookType = 'beforeVerify' | 'afterVerify' | 'beforeGenerate' | 'afterGenerate';

export async function executeHooks(hookType: HookType, context: Record<string, unknown>): Promise<void> {
  const plugins = getEnabledPlugins();

  for (const plugin of plugins) {
    const hookFn = plugin.manifest.hooks?.[hookType];
    if (!hookFn) continue;

    try {
      const mod = await import(join(plugin.path, hookFn));
      if (typeof mod.default === 'function') {
        await mod.default(context);
      }
    } catch (e) {
      console.log(`  ⚠️  Plugin ${plugin.manifest.name} hook ${hookType} failed: ${(e as Error).message}`);
    }
  }
}

// IDENTITY_SEAL: PART-4 | role=hooks | inputs=hookType,context | outputs=void

// ============================================================
// PART 5 — Plugin Discovery (npm search)
// ============================================================

export async function searchPlugins(query: string): Promise<Array<{ name: string; description: string; version: string }>> {
  const { execSync } = await import('child_process');

  try {
    const output = execSync(`npm search cs-quill-plugin-${query} --json 2>/dev/null`, {
      encoding: 'utf-8', timeout: 10000,
    });

    const data = JSON.parse(output);
    return (Array.isArray(data) ? data : []).slice(0, 10).map((pkg: any) => ({
      name: pkg.name,
      description: pkg.description ?? '',
      version: pkg.version ?? '0.0.0',
    }));
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-5 | role=discovery | inputs=query | outputs=plugins
