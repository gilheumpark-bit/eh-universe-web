"use strict";
// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Configuration System
// ============================================================
// ~/.cs/config.toml 기반 설정 관리.
// 글로벌(~/.cs/) + 로컬(.cs.toml) 머지.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalConfigDir = getGlobalConfigDir;
exports.getGlobalConfigPath = getGlobalConfigPath;
exports.getLocalConfigPath = getLocalConfigPath;
exports.getGeneratedDir = getGeneratedDir;
exports.getReceiptDir = getReceiptDir;
exports.loadGlobalConfig = loadGlobalConfig;
exports.loadLocalConfig = loadLocalConfig;
exports.loadMergedConfig = loadMergedConfig;
exports.saveGlobalConfig = saveGlobalConfig;
exports.saveLocalConfig = saveLocalConfig;
exports.addKey = addKey;
exports.removeKey = removeKey;
exports.getKeyForRole = getKeyForRole;
exports.getAIConfig = getAIConfig;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const DEFAULT_CONFIG = {
    language: 'en',
    level: 'normal',
    structure: 'auto',
    fileMode: 'safe',
    keys: [],
};
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=KeyConfig,CSConfig
// ============================================================
// PART 2 — Path Helpers
// ============================================================
function getGlobalConfigDir() {
    return (0, path_1.join)((0, os_1.homedir)(), '.cs');
}
function getGlobalConfigPath() {
    return (0, path_1.join)(getGlobalConfigDir(), 'config.json');
}
function getLocalConfigPath() {
    return (0, path_1.join)(process.cwd(), '.cs.json');
}
function getGeneratedDir() {
    return (0, path_1.join)(process.cwd(), '.cs', 'generated');
}
function getReceiptDir() {
    return (0, path_1.join)(process.cwd(), '.cs', 'receipts');
}
// IDENTITY_SEAL: PART-2 | role=paths | inputs=none | outputs=string
// ============================================================
// PART 3 — Load / Save / Merge
// ============================================================
function loadGlobalConfig() {
    const configPath = getGlobalConfigPath();
    if (!(0, fs_1.existsSync)(configPath))
        return { ...DEFAULT_CONFIG };
    try {
        const raw = (0, fs_1.readFileSync)(configPath, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
    catch (e) {
        console.error(`  ⚠️  설정 파일 손상 (${configPath}): ${e.message}. 기본값 사용.`);
        return { ...DEFAULT_CONFIG };
    }
}
function loadLocalConfig() {
    const configPath = getLocalConfigPath();
    if (!(0, fs_1.existsSync)(configPath))
        return null;
    try {
        return JSON.parse((0, fs_1.readFileSync)(configPath, 'utf-8'));
    }
    catch {
        return null;
    }
}
function loadMergedConfig() {
    const global = loadGlobalConfig();
    const local = loadLocalConfig();
    if (!local)
        return global;
    return {
        ...global,
        ...local,
        keys: local.keys ?? global.keys,
    };
}
function saveGlobalConfig(config) {
    const dir = getGlobalConfigDir();
    (0, fs_1.mkdirSync)(dir, { recursive: true });
    (0, fs_1.writeFileSync)(getGlobalConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}
function saveLocalConfig(config) {
    (0, fs_1.writeFileSync)(getLocalConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}
// ============================================================
// PART 4 — Key Management
// ============================================================
function addKey(config, key) {
    const existing = config.keys.findIndex(k => k.id === key.id);
    if (existing >= 0) {
        config.keys[existing] = key;
    }
    else {
        config.keys.push(key);
    }
    return config;
}
function removeKey(config, keyId) {
    config.keys = config.keys.filter(k => k.id !== keyId);
    return config;
}
function getKeyForRole(config, role) {
    return config.keys.find(k => k.roles.includes(role)) ?? config.keys[0];
}
// IDENTITY_SEAL: PART-4 | role=key-management | inputs=CSConfig,KeyConfig | outputs=CSConfig
// ============================================================
// PART 5 — AI Config Helper
// ============================================================
function getAIConfig() {
    const config = loadMergedConfig();
    const primaryKey = config.keys?.[0];
    return {
        provider: primaryKey?.provider ?? config.provider ?? 'groq',
        model: primaryKey?.model ?? config.model ?? 'llama-3.3-70b-versatile',
        apiKey: primaryKey?.key ?? process.env.CS_API_KEY ?? '',
        baseUrl: config.baseUrl,
    };
}
// IDENTITY_SEAL: PART-5 | role=ai-config-helper | inputs=none | outputs=config
