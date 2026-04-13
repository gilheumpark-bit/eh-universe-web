"use strict";
// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Plugin System
// ============================================================
// 플러그인 레지스트리 + lazy loading + 샌드박스.
// 플러그인 50% → 75%
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateManifest = validateManifest;
exports.installPlugin = installPlugin;
exports.uninstallPlugin = uninstallPlugin;
exports.enablePlugin = enablePlugin;
exports.disablePlugin = disablePlugin;
exports.listPlugins = listPlugins;
exports.getEnabledPlugins = getEnabledPlugins;
exports.executeHooks = executeHooks;
exports.searchPlugins = searchPlugins;
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("./config");
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=PluginManifest,InstalledPlugin
// ============================================================
// PART 2 — Plugin Registry
// ============================================================
function _getPluginDir() {
    return (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'plugins');
}
function getRegistryPath() {
    return (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'plugin-registry.json');
}
function loadRegistry() {
    const path = getRegistryPath();
    if (!(0, fs_1.existsSync)(path))
        return [];
    try {
        return JSON.parse((0, fs_1.readFileSync)(path, 'utf-8'));
    }
    catch {
        return [];
    }
}
function saveRegistry(plugins) {
    (0, fs_1.mkdirSync)((0, config_1.getGlobalConfigDir)(), { recursive: true });
    (0, fs_1.writeFileSync)(getRegistryPath(), JSON.stringify(plugins, null, 2));
}
// IDENTITY_SEAL: PART-2 | role=registry | inputs=none | outputs=InstalledPlugin[]
// ============================================================
// PART 3 — Install / Uninstall / Enable / Disable
// ============================================================
// ── Manifest Validation (Zod-like schema) ──
const VALID_TYPES = new Set(['engine', 'command', 'formatter', 'preset']);
const VALID_HOOKS = new Set(['beforeVerify', 'afterVerify', 'beforeGenerate', 'afterGenerate']);
const NAME_REGEX = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/;
const PATH_BLACKLIST = /\.\.|~|\/etc|\/usr|process\.env|require\s*\(|child_process/;
function validateManifest(manifest) {
    const errors = [];
    const m = manifest;
    if (!m || typeof m !== 'object')
        return { valid: false, errors: ['매니페스트가 객체가 아닙니다'] };
    if (typeof m.name !== 'string' || !NAME_REGEX.test(m.name))
        errors.push(`name 형식 오류: "${m.name}" (소문자+숫자+하이픈만)`);
    if (typeof m.version !== 'string' || !/^\d+\.\d+\.\d+/.test(m.version))
        errors.push(`version 형식 오류: "${m.version}" (semver 필요)`);
    if (typeof m.type !== 'string' || !VALID_TYPES.has(m.type))
        errors.push(`type 오류: "${m.type}" (${[...VALID_TYPES].join('|')} 중 선택)`);
    if (typeof m.entryPoint !== 'string')
        errors.push('entryPoint 누락');
    if (typeof m.entryPoint === 'string' && PATH_BLACKLIST.test(m.entryPoint))
        errors.push(`entryPoint 보안 위반: "${m.entryPoint}"`);
    if (m.hooks && typeof m.hooks === 'object') {
        for (const [key, val] of Object.entries(m.hooks)) {
            if (!VALID_HOOKS.has(key))
                errors.push(`미지원 훅: "${key}"`);
            if (typeof val === 'string' && PATH_BLACKLIST.test(val))
                errors.push(`훅 경로 보안 위반: "${val}"`);
        }
    }
    return { valid: errors.length === 0, errors };
}
function installPlugin(manifest, pluginPath) {
    // 매니페스트 검증
    const validation = validateManifest(manifest);
    if (!validation.valid)
        return { success: false, errors: validation.errors };
    // 경로 화이트리스트: resolve() 후 canonical path 비교 (traversal 방지)
    const { resolve } = require('path');
    const pluginDir = getPluginDir();
    const canonical = resolve(pluginPath);
    const isWhitelisted = canonical.startsWith(resolve(pluginDir)) || canonical.includes(`${require('path').sep}node_modules${require('path').sep}`);
    if (!isWhitelisted || canonical.includes('..'))
        return { success: false, errors: [`경로 거부: "${pluginPath}" (플러그인 디렉토리 외부)`] };
    const registry = loadRegistry();
    if (registry.some(p => p.manifest.name === manifest.name)) {
        return { success: false, errors: ['이미 설치됨'] };
    }
    registry.push({
        manifest,
        installedAt: Date.now(),
        enabled: true,
        path: pluginPath,
    });
    saveRegistry(registry);
    return { success: true };
}
function uninstallPlugin(name) {
    const registry = loadRegistry();
    const idx = registry.findIndex(p => p.manifest.name === name);
    if (idx < 0)
        return false;
    registry.splice(idx, 1);
    saveRegistry(registry);
    return true;
}
function enablePlugin(name) {
    const registry = loadRegistry();
    const plugin = registry.find(p => p.manifest.name === name);
    if (!plugin)
        return false;
    plugin.enabled = true;
    saveRegistry(registry);
    return true;
}
function disablePlugin(name) {
    const registry = loadRegistry();
    const plugin = registry.find(p => p.manifest.name === name);
    if (!plugin)
        return false;
    plugin.enabled = false;
    saveRegistry(registry);
    return true;
}
function listPlugins() {
    return loadRegistry();
}
function getEnabledPlugins() {
    return loadRegistry().filter(p => p.enabled);
}
async function executeHooks(hookType, context) {
    const plugins = getEnabledPlugins();
    for (const plugin of plugins) {
        const hookFn = plugin.manifest.hooks?.[hookType];
        if (!hookFn)
            continue;
        // 보안: 경로 검증
        const hookPath = (0, path_1.join)(plugin.path, hookFn);
        if (PATH_BLACKLIST.test(hookPath)) {
            console.log(`  🔒 Plugin ${plugin.manifest.name}: 보안 위반 경로 차단 "${hookPath}"`);
            continue;
        }
        try {
            // VM 격리 실행 (process.env, child_process 접근 차단)
            const { readFileSync: readFs } = require('fs');
            const vm = require('vm');
            const hookCode = readFs(hookPath, 'utf-8');
            const safeContext = vm.createContext({
                module: { exports: {} },
                exports: {},
                console: { log: console.log, warn: console.warn, error: console.error },
                JSON,
                Math,
                Date,
                // 명시적으로 process, require, child_process 차단
                __context: { ...context },
            }, {
                codeGeneration: { strings: false, wasm: false },
            });
            vm.runInContext(hookCode, safeContext, { timeout: 5000, displayErrors: true });
            const hookExport = safeContext.module?.exports?.default ?? safeContext.exports?.default;
            if (typeof hookExport === 'function') {
                await hookExport(context);
            }
        }
        catch (e) {
            console.log(`  ⚠️  Plugin ${plugin.manifest.name} hook ${hookType} failed: ${e.message}`);
        }
    }
}
// IDENTITY_SEAL: PART-4 | role=hooks | inputs=hookType,context | outputs=void
// ============================================================
// PART 5 — Plugin Discovery (npm search)
// ============================================================
async function searchPlugins(query) {
    const { execSync } = require('child_process');
    try {
        const output = execSync(`npm search cs-quill-plugin-${query} --json 2>/dev/null`, {
            encoding: 'utf-8', timeout: 10000,
        });
        const data = JSON.parse(output);
        return (Array.isArray(data) ? data : []).slice(0, 10).map((pkg) => ({
            name: pkg.name,
            description: pkg.description ?? '',
            version: pkg.version ?? '0.0.0',
        }));
    }
    catch {
        return [];
    }
}
// IDENTITY_SEAL: PART-5 | role=discovery | inputs=query | outputs=plugins
