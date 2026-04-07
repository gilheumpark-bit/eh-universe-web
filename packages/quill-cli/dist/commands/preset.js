"use strict";
// ============================================================
// CS Quill 🦔 — cs preset command
// ============================================================
// 커뮤니티 프리셋 관리. 최신 프레임워크 규칙 공유.
// 로컬 프리셋 디렉토리: ~/.cs/presets/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresetsForFramework = getPresetsForFramework;
exports.buildPresetDirective = buildPresetDirective;
exports.runPreset = runPreset;
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("../core/config");
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=Preset
// ============================================================
// PART 2 — Built-in Presets
// ============================================================
const BUILTIN_PRESETS = [
    {
        name: 'react-19', version: '1.0.0', framework: 'React', frameworkVersion: '19.x', createdAt: Date.now(),
        rules: {
            patterns: ['Server Components by default', 'use client directive for client-only', 'use() hook for promises', 'ref as prop (no forwardRef)'],
            antiPatterns: ['forwardRef (removed in 19)', 'getServerSideProps (Next.js pages router)', 'class components'],
            deprecated: ['React.FC (unnecessary)', 'defaultProps on function components', 'propTypes'],
            conventions: ['Prefer server components', 'Collocate loading.tsx/error.tsx', 'Use Suspense boundaries'],
        },
    },
    {
        name: 'next-16', version: '1.0.0', framework: 'Next.js', frameworkVersion: '16.x', createdAt: Date.now(),
        rules: {
            patterns: ['App Router only', 'Server Actions for mutations', 'Metadata API for SEO', 'Route Handlers for API'],
            antiPatterns: ['pages/ directory', 'getServerSideProps', 'getStaticProps', 'next/router (use next/navigation)'],
            deprecated: ['next/head (use Metadata)', 'next/image legacy loader', '_app.tsx/_document.tsx'],
            conventions: ['app/ directory structure', 'layout.tsx for shared UI', 'loading.tsx for Suspense', 'error.tsx for boundaries'],
        },
    },
    {
        name: 'tailwind-4', version: '1.0.0', framework: 'Tailwind CSS', frameworkVersion: '4.x', createdAt: Date.now(),
        rules: {
            patterns: ['CSS-first configuration', '@theme directive', 'Container queries native', 'Composable variants'],
            antiPatterns: ['tailwind.config.js (use CSS)', '@apply in components (prefer inline)', 'JIT purge config'],
            deprecated: ['tailwind.config.js', 'purge option', '@variants directive'],
            conventions: ['Semantic token classes', '4px grid spacing', 'Mobile-first breakpoints'],
        },
    },
    {
        name: 'typescript-5', version: '1.0.0', framework: 'TypeScript', frameworkVersion: '5.x', createdAt: Date.now(),
        rules: {
            patterns: ['satisfies operator', 'const type parameters', 'Decorator metadata', 'Module resolution bundler'],
            antiPatterns: ['enum (prefer const object)', 'namespace', 'any type (use unknown)', 'non-null assertion !'],
            deprecated: ['DefinitelyTyped for built-in types', 'paths without baseUrl'],
            conventions: ['strict: true always', 'Prefer interfaces for objects', 'Use type for unions/intersections'],
        },
    },
];
// IDENTITY_SEAL: PART-2 | role=builtins | inputs=none | outputs=BUILTIN_PRESETS
// ============================================================
// PART 2.5 — Version Detection & Conflict Checking
// ============================================================
/** Detect installed framework versions from project package.json */
function detectProjectVersions() {
    const versions = {};
    try {
        const pkgPath = (0, path_1.join)(process.cwd(), 'package.json');
        if (!(0, fs_1.existsSync)(pkgPath))
            return versions;
        const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const mapping = {
            react: 'React', 'react-dom': 'React', next: 'Next.js',
            tailwindcss: 'Tailwind CSS', typescript: 'TypeScript',
            vue: 'Vue', angular: 'Angular', svelte: 'Svelte',
        };
        for (const [dep, framework] of Object.entries(mapping)) {
            if (allDeps[dep]) {
                versions[framework] = String(allDeps[dep]).replace(/[\^~>=<]*/g, '');
            }
        }
    }
    catch { /* skip */ }
    return versions;
}
/** Check if a preset's frameworkVersion matches the installed version */
function checkVersionCompatibility(preset, installedVersions) {
    const installed = installedVersions[preset.framework];
    if (!installed)
        return { compatible: true, message: 'Not installed — cannot verify' };
    // Extract major version from both
    const presetMajor = parseInt(preset.frameworkVersion.replace(/[^0-9]/g, ''), 10);
    const installedMajor = parseInt(installed.split('.')[0], 10);
    if (isNaN(presetMajor) || isNaN(installedMajor))
        return { compatible: true, installed };
    if (installedMajor === presetMajor)
        return { compatible: true, installed };
    if (installedMajor < presetMajor)
        return { compatible: false, installed, message: `Installed ${preset.framework} ${installed} is older than preset target ${preset.frameworkVersion}` };
    return { compatible: false, installed, message: `Installed ${preset.framework} ${installed} is newer than preset target ${preset.frameworkVersion}` };
}
/** Detect conflicts between presets (e.g. overlapping anti-patterns/patterns) */
function checkPresetConflicts(presets) {
    const conflicts = [];
    for (let i = 0; i < presets.length; i++) {
        for (let j = i + 1; j < presets.length; j++) {
            const a = presets[i];
            const b = presets[j];
            // Check if one preset's patterns conflict with another's antiPatterns
            for (const pattern of a.rules.patterns) {
                const lower = pattern.toLowerCase();
                for (const anti of b.rules.antiPatterns) {
                    if (anti.toLowerCase().includes(lower.slice(0, 15)) || lower.includes(anti.toLowerCase().slice(0, 15))) {
                        conflicts.push({ presetA: a.name, presetB: b.name, conflict: `"${pattern}" (${a.name}) vs "${anti}" (${b.name})` });
                    }
                }
            }
            // Check deprecated overlap
            for (const dep of a.rules.deprecated) {
                if (b.rules.patterns.some(p => p.toLowerCase().includes(dep.toLowerCase().slice(0, 12)))) {
                    conflicts.push({ presetA: a.name, presetB: b.name, conflict: `"${dep}" deprecated in ${a.name} but used in ${b.name}` });
                }
            }
        }
    }
    return conflicts;
}
// IDENTITY_SEAL: PART-2.5 | role=version-compat | inputs=package.json | outputs=compat-report
// ============================================================
// PART 3 — Preset Management
// ============================================================
function getPresetDir() {
    return (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'presets');
}
function loadInstalledPresets() {
    const dir = getPresetDir();
    if (!(0, fs_1.existsSync)(dir))
        return [];
    return (0, fs_1.readdirSync)(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
        try {
            return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(dir, f), 'utf-8'));
        }
        catch {
            return null;
        }
    })
        .filter((p) => p !== null);
}
function getAllPresets() {
    return [...BUILTIN_PRESETS, ...loadInstalledPresets()];
}
function getPresetsForFramework(framework) {
    return getAllPresets().filter(p => p.framework.toLowerCase().includes(framework.toLowerCase()));
}
function buildPresetDirective(presets) {
    if (presets.length === 0)
        return '';
    const lines = ['[Framework Presets]'];
    for (const p of presets) {
        lines.push(`\n--- ${p.name} (${p.framework} ${p.frameworkVersion}) ---`);
        if (p.rules.patterns.length > 0)
            lines.push(`USE: ${p.rules.patterns.join(', ')}`);
        if (p.rules.antiPatterns.length > 0)
            lines.push(`AVOID: ${p.rules.antiPatterns.join(', ')}`);
        if (p.rules.deprecated.length > 0)
            lines.push(`DEPRECATED: ${p.rules.deprecated.join(', ')}`);
    }
    return lines.join('\n');
}
// IDENTITY_SEAL: PART-3 | role=management | inputs=framework | outputs=Preset[]
// ============================================================
// PART 4 — Preset Runner
// ============================================================
async function runPreset(action, args) {
    switch (action) {
        case 'list': {
            const all = getAllPresets();
            const installed = loadInstalledPresets();
            const versions = detectProjectVersions();
            console.log('🦔 CS Quill — 프리셋\n');
            // Show detected project versions
            const detectedKeys = Object.keys(versions);
            if (detectedKeys.length > 0) {
                console.log('  🔍 프로젝트 감지:');
                for (const [fw, ver] of Object.entries(versions)) {
                    console.log(`     ${fw} ${ver}`);
                }
                console.log('');
            }
            console.log('  📦 내장:');
            for (const p of BUILTIN_PRESETS) {
                const compat = checkVersionCompatibility(p, versions);
                const tag = compat.installed
                    ? (compat.compatible ? ' ✅' : ` ⚠️  (${compat.message})`)
                    : '';
                console.log(`     ${p.name} (${p.framework} ${p.frameworkVersion})${tag}`);
            }
            if (installed.length > 0) {
                console.log('\n  📥 설치됨:');
                for (const p of installed) {
                    const compat = checkVersionCompatibility(p, versions);
                    const tag = compat.installed
                        ? (compat.compatible ? ' ✅' : ` ⚠️  (${compat.message})`)
                        : '';
                    console.log(`     ${p.name} (${p.framework} ${p.frameworkVersion})${tag}`);
                }
            }
            // Show conflicts among installed presets
            if (installed.length > 1) {
                const conflicts = checkPresetConflicts(installed);
                if (conflicts.length > 0) {
                    console.log('\n  ⚠️  프리셋 충돌:');
                    for (const c of conflicts) {
                        console.log(`     ${c.conflict}`);
                    }
                }
            }
            console.log(`\n  총: ${all.length}개\n`);
            break;
        }
        case 'show': {
            if (!args || args.length < 1) {
                console.log('  사용법: cs preset show <name>');
                return;
            }
            const preset = getAllPresets().find(p => p.name === args[0]);
            if (!preset) {
                console.log(`  ⚠️  "${args[0]}" 프리셋 없음`);
                return;
            }
            const versions = detectProjectVersions();
            const compat = checkVersionCompatibility(preset, versions);
            console.log(`\n  📦 ${preset.name} (${preset.framework} ${preset.frameworkVersion})`);
            if (compat.installed) {
                console.log(`  📌 설치됨: ${preset.framework} ${compat.installed} ${compat.compatible ? '✅ 호환' : '⚠️  ' + compat.message}`);
            }
            console.log('');
            console.log('  ✅ 사용:');
            for (const p of preset.rules.patterns)
                console.log(`     - ${p}`);
            console.log('\n  ❌ 금지:');
            for (const p of preset.rules.antiPatterns)
                console.log(`     - ${p}`);
            console.log('\n  ⚠️  Deprecated:');
            for (const p of preset.rules.deprecated)
                console.log(`     - ${p}`);
            if (preset.rules.conventions.length > 0) {
                console.log('\n  📐 컨벤션:');
                for (const c of preset.rules.conventions)
                    console.log(`     - ${c}`);
            }
            // Check conflicts with other installed presets
            const installed = loadInstalledPresets();
            if (installed.length > 0) {
                const conflicts = checkPresetConflicts([preset, ...installed.filter(p => p.name !== preset.name)]);
                if (conflicts.length > 0) {
                    console.log('\n  ⚠️  다른 프리셋과 충돌:');
                    for (const c of conflicts)
                        console.log(`     ${c.conflict}`);
                }
            }
            console.log('');
            break;
        }
        case 'install': {
            if (!args || args.length < 1) {
                console.log('  사용법: cs preset install <name>');
                return;
            }
            const builtin = BUILTIN_PRESETS.find(p => p.name === args[0]);
            if (!builtin) {
                console.log(`  ⚠️  "${args[0]}" 프리셋 없음`);
                return;
            }
            // Version compatibility check before install
            const versions = detectProjectVersions();
            const compat = checkVersionCompatibility(builtin, versions);
            if (!compat.compatible && compat.message) {
                console.log(`  ⚠️  버전 주의: ${compat.message}`);
                console.log(`     프리셋은 ${builtin.framework} ${builtin.frameworkVersion} 대상이지만 ${compat.installed} 설치됨`);
            }
            // Conflict check against already-installed presets
            const existing = loadInstalledPresets();
            if (existing.length > 0) {
                const conflicts = checkPresetConflicts([builtin, ...existing]);
                if (conflicts.length > 0) {
                    console.log('  ⚠️  기존 프리셋과 충돌 발견:');
                    for (const c of conflicts)
                        console.log(`     ${c.conflict}`);
                }
            }
            const dir = getPresetDir();
            (0, fs_1.mkdirSync)(dir, { recursive: true });
            (0, fs_1.writeFileSync)((0, path_1.join)(dir, `${args[0]}.json`), JSON.stringify(builtin, null, 2));
            console.log(`  ✅ ${args[0]} 설치됨\n`);
            break;
        }
        case 'remove': {
            if (!args || args.length < 1) {
                console.log('  사용법: cs preset remove <name>');
                return;
            }
            const path = (0, path_1.join)(getPresetDir(), `${args[0]}.json`);
            if (!(0, fs_1.existsSync)(path)) {
                console.log(`  ⚠️  "${args[0]}" 설치되지 않음`);
                return;
            }
            (0, fs_1.unlinkSync)(path);
            console.log(`  🗑️  ${args[0]} 제��됨\n`);
            break;
        }
        default:
            console.log('  사용법: cs preset <list|show|install|remove>');
    }
}
// IDENTITY_SEAL: PART-4 | role=runner | inputs=action,args | outputs=console
