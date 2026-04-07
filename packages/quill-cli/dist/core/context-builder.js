"use strict";
// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Context Builder (명령어 진입 전 자동 래핑)
// ============================================================
// 모든 명령어가 공유하는 실행 컨텍스트를 단일 객체로 조립.
// Preset + Fix-Memory + Style + Config → CommandContext
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCommandContext = buildCommandContext;
exports.invalidateContext = invalidateContext;
exports.buildAISystemHeader = buildAISystemHeader;
const terminal_compat_1 = require("./terminal-compat");
const progress_1 = require("../tui/progress");
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CommandContext
// ============================================================
// PART 2 — Builder
// ============================================================
let _cachedCtx = null;
async function buildCommandContext(cwd) {
    if (_cachedCtx && _cachedCtx.cwd === (cwd ?? process.cwd()))
        return _cachedCtx;
    const workDir = cwd ?? process.cwd();
    const projectName = workDir.split(/[/\\]/).pop() ?? 'unknown';
    // Config
    let framework;
    let lang = 'ko';
    try {
        const { loadMergedConfig } = require('./config');
        const config = loadMergedConfig();
        framework = config.framework;
        lang = config.language ?? 'ko';
    }
    catch { /* no config */ }
    // i18n
    let translate;
    try {
        const { t, setLanguage } = require('./i18n');
        setLanguage(lang);
        translate = t;
    }
    catch {
        translate = (key) => key;
    }
    // Preset directive
    let presetDirective = '';
    try {
        const { getPresetsForFramework, buildPresetDirective } = require('../commands/preset');
        if (framework) {
            const presets = getPresetsForFramework(framework);
            presetDirective = buildPresetDirective(presets);
        }
    }
    catch { /* no presets */ }
    // Fix-memory (과거 실수 기록)
    let pastMistakes = '';
    try {
        const { getTopPatterns } = require('./fix-memory');
        const patterns = getTopPatterns(5);
        if (patterns.length > 0) {
            pastMistakes = '[AVOID_MISTAKES]\n' + patterns.map(p => `- ${p.description}: ${p.beforePattern} → ${p.afterPattern} (신뢰도: ${Math.round(p.confidence * 100)}%)`).join('\n');
        }
    }
    catch { /* no memory */ }
    // Style directive
    let styleDirective = '';
    try {
        const { loadProfile, buildStyleDirective } = require('./style-learning');
        const profile = loadProfile(projectName);
        if (profile)
            styleDirective = buildStyleDirective(profile);
    }
    catch { /* no style */ }
    _cachedCtx = {
        ui: {
            printHeader: terminal_compat_1.printHeader,
            printScore: terminal_compat_1.printScore,
            printSection: terminal_compat_1.printSection,
            icons: terminal_compat_1.icons,
            colors: terminal_compat_1.colors,
            divider: terminal_compat_1.compatDivider,
            progressBar: terminal_compat_1.compatProgressBar,
            spinner: (label) => new progress_1.Spinner(label),
            timer: (label, total) => new progress_1.ProgressTimer(label, total),
        },
        t: translate,
        lang,
        cwd: workDir,
        projectName,
        framework,
        presetDirective,
        pastMistakes,
        styleDirective,
    };
    return _cachedCtx;
}
function invalidateContext() {
    _cachedCtx = null;
}
// IDENTITY_SEAL: PART-2 | role=builder | inputs=cwd | outputs=CommandContext
// ============================================================
// PART 3 — AI System Header 조립
// ============================================================
function buildAISystemHeader(ctx) {
    const parts = [];
    if (ctx.presetDirective)
        parts.push(ctx.presetDirective);
    if (ctx.styleDirective)
        parts.push(ctx.styleDirective);
    if (ctx.pastMistakes)
        parts.push(ctx.pastMistakes);
    return parts.join('\n\n');
}
// IDENTITY_SEAL: PART-3 | role=ai-header | inputs=CommandContext | outputs=string
