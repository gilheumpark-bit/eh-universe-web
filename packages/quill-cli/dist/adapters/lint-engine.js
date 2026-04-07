"use strict";
// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Lint Engine Adapter
// ============================================================
// 6 packages: eslint, @typescript-eslint, biome, prettier, jscpd, madge
Object.defineProperty(exports, "__esModule", { value: true });
exports.runESLint = runESLint;
exports.checkPrettier = checkPrettier;
exports.runJSCPD = runJSCPD;
exports.runMadge = runMadge;
exports.runBiome = runBiome;
exports.runAutoFix = runAutoFix;
exports.aggregateSeverity = aggregateSeverity;
exports.runFullLintAnalysis = runFullLintAnalysis;
// ============================================================
// PART 1 — ESLint + TypeScript-ESLint
// ============================================================
async function runESLint(filePath) {
    const { ESLint } = require('eslint');
    const eslint = new ESLint({ fix: false, overrideConfigFile: undefined });
    const results = await eslint.lintFiles([filePath]);
    const findings = results.flatMap(r => r.messages.map(m => ({
        file: r.filePath,
        line: m.line,
        message: m.message,
        severity: m.severity === 2 ? 'error' : 'warning',
        rule: m.ruleId ?? 'unknown',
    })));
    return { findings, errorCount: results.reduce((s, r) => s + r.errorCount, 0) };
}
// IDENTITY_SEAL: PART-1 | role=eslint | inputs=filePath | outputs=findings
// ============================================================
// PART 2 — Prettier (포맷 검증)
// ============================================================
async function checkPrettier(code, filePath = 'temp.ts') {
    const prettier = require('prettier');
    const options = await prettier.resolveConfig(filePath) ?? {};
    const formatted = await prettier.format(code, { ...options, filepath: filePath });
    const isFormatted = formatted === code;
    return {
        isFormatted,
        diff: isFormatted ? null : { original: code.length, formatted: formatted.length },
    };
}
// IDENTITY_SEAL: PART-2 | role=prettier | inputs=code | outputs={isFormatted}
// ============================================================
// PART 3 — JSCPD (중복 코드 탐지)
// ============================================================
async function runJSCPD(rootPath) {
    const { detectClones } = require('jscpd');
    const clones = await detectClones({
        path: [rootPath],
        pattern: '**/*.{ts,tsx,js,jsx}',
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
        minLines: 5,
        minTokens: 50,
        output: undefined,
        silent: true,
    });
    return {
        duplicateCount: clones.length,
        findings: clones.map((c) => ({
            fileA: c.duplicationA?.sourceId ?? 'unknown',
            fileB: c.duplicationB?.sourceId ?? 'unknown',
            lines: c.lines ?? 0,
            tokens: c.tokens ?? 0,
        })),
    };
}
// IDENTITY_SEAL: PART-3 | role=jscpd | inputs=rootPath | outputs=duplicates
// ============================================================
// PART 4 — Madge (순환 의존성)
// ============================================================
async function runMadge(rootPath) {
    const madge = (require('madge')).default;
    const result = await madge(rootPath, {
        fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
        excludeRegExp: [/node_modules/, /\.next/, /dist/],
        tsConfig: undefined,
    });
    const circular = result.circular();
    const orphans = result.orphans();
    return {
        circularCount: circular.length,
        circular: circular.slice(0, 20),
        orphanCount: orphans.length,
        orphans: orphans.slice(0, 20),
        totalModules: Object.keys(result.obj()).length,
    };
}
// IDENTITY_SEAL: PART-4 | role=madge | inputs=rootPath | outputs=circular,orphans
// ============================================================
// PART 5 — Biome Lint (ESLint 대안)
// ============================================================
async function runBiome(rootPath, filePath) {
    const { execSync } = require('child_process');
    const { existsSync } = require('fs');
    const { join } = require('path');
    // Detect biome config
    const biomeConfigs = ['biome.json', 'biome.jsonc', '.biome.json'];
    const hasBiomeConfig = biomeConfigs.some(c => existsSync(join(rootPath, c)));
    if (!hasBiomeConfig) {
        return { available: false, findings: [], errorCount: 0, warningCount: 0 };
    }
    const target = filePath || rootPath;
    try {
        const output = execSync(`npx @biomejs/biome lint --reporter=json "${target}" 2>/dev/null`, { cwd: rootPath, encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
        const data = JSON.parse(output);
        const findings = (data.diagnostics ?? []).map((d) => ({
            file: d.file?.path ?? filePath ?? 'unknown',
            line: d.location?.span?.start?.line ?? 0,
            message: d.message ?? d.summary ?? 'unknown',
            severity: d.severity === 'error' ? 'error' : 'warning',
            rule: d.category ?? 'unknown',
        }));
        return {
            available: true,
            findings,
            errorCount: findings.filter(f => f.severity === 'error').length,
            warningCount: findings.filter(f => f.severity === 'warning').length,
        };
    }
    catch (e) {
        // Biome may exit non-zero when lint issues found; try parsing stderr
        const stderr = e.stderr ?? '';
        try {
            const data = JSON.parse(stderr);
            const findings = (data.diagnostics ?? []).map((d) => ({
                file: d.file?.path ?? 'unknown',
                line: d.location?.span?.start?.line ?? 0,
                message: d.summary ?? 'unknown',
                severity: d.severity === 'error' ? 'error' : 'warning',
                rule: d.category ?? 'unknown',
            }));
            return { available: true, findings, errorCount: findings.filter(f => f.severity === 'error').length, warningCount: findings.filter(f => f.severity === 'warning').length };
        }
        catch {
            return { available: true, findings: [], errorCount: 0, warningCount: 0 };
        }
    }
}
// IDENTITY_SEAL: PART-5 | role=biome | inputs=rootPath,filePath | outputs=findings
// ============================================================
// PART 6 — Auto-Fix Mode
// ============================================================
async function runAutoFix(rootPath, filePath, engines) {
    const { readFileSync, writeFileSync, existsSync } = require('fs');
    const { join } = require('path');
    const fixes = [];
    const useEngines = engines ?? ['eslint', 'prettier', 'biome'];
    // ESLint auto-fix
    if (useEngines.includes('eslint')) {
        try {
            const { ESLint } = require('eslint');
            const eslint = new ESLint({ fix: true });
            const results = await eslint.lintFiles([filePath]);
            await ESLint.outputFixes(results);
            const fixCount = results.reduce((s, r) => s + (r.fixableErrorCount + r.fixableWarningCount), 0);
            fixes.push({ engine: 'eslint', applied: fixCount > 0, detail: `${fixCount} fixes applied` });
        }
        catch {
            fixes.push({ engine: 'eslint', applied: false, detail: 'not available' });
        }
    }
    // Prettier auto-fix
    if (useEngines.includes('prettier')) {
        try {
            const prettier = require('prettier');
            const code = readFileSync(filePath, 'utf-8');
            const options = await prettier.resolveConfig(filePath) ?? {};
            const formatted = await prettier.format(code, { ...options, filepath: filePath });
            if (formatted !== code) {
                writeFileSync(filePath, formatted, 'utf-8');
                fixes.push({ engine: 'prettier', applied: true, detail: 'reformatted' });
            }
            else {
                fixes.push({ engine: 'prettier', applied: false, detail: 'already formatted' });
            }
        }
        catch {
            fixes.push({ engine: 'prettier', applied: false, detail: 'not available' });
        }
    }
    // Biome auto-fix
    if (useEngines.includes('biome')) {
        const biomeConfigs = ['biome.json', 'biome.jsonc', '.biome.json'];
        const hasBiome = biomeConfigs.some(c => existsSync(join(rootPath, c)));
        if (hasBiome) {
            try {
                const { execSync } = require('child_process');
                execSync(`npx @biomejs/biome lint --write "${filePath}" 2>/dev/null`, {
                    cwd: rootPath, encoding: 'utf-8', timeout: 15000,
                });
                fixes.push({ engine: 'biome', applied: true, detail: 'auto-fixed' });
            }
            catch {
                fixes.push({ engine: 'biome', applied: false, detail: 'fix failed' });
            }
        }
    }
    return { fixes, totalApplied: fixes.filter(f => f.applied).length };
}
function aggregateSeverity(findings) {
    const errors = findings.filter(f => f.severity === 'error').length;
    const warnings = findings.filter(f => f.severity === 'warning').length;
    const infos = findings.filter(f => f.severity === 'info').length;
    // Group by rule
    const ruleMap = new Map();
    for (const f of findings) {
        const rule = f.rule ?? 'unknown';
        const existing = ruleMap.get(rule);
        if (existing) {
            existing.count++;
        }
        else {
            ruleMap.set(rule, { count: 1, severity: f.severity });
        }
    }
    const byRule = Array.from(ruleMap.entries())
        .map(([rule, data]) => ({ rule, count: data.count, severity: data.severity }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    // Group by file
    const fileMap = new Map();
    for (const f of findings) {
        const file = f.file ?? 'unknown';
        const existing = fileMap.get(file);
        if (existing) {
            if (f.severity === 'error')
                existing.errors++;
            else
                existing.warnings++;
        }
        else {
            fileMap.set(file, { errors: f.severity === 'error' ? 1 : 0, warnings: f.severity !== 'error' ? 1 : 0 });
        }
    }
    const byFile = Array.from(fileMap.entries())
        .map(([file, data]) => ({ file, ...data }))
        .sort((a, b) => (b.errors + b.warnings) - (a.errors + a.warnings))
        .slice(0, 20);
    const worstFiles = byFile.slice(0, 5).map(f => f.file);
    return { total: findings.length, errors, warnings, infos, byRule, byFile, worstFiles };
}
// IDENTITY_SEAL: PART-7 | role=severity-aggregation | inputs=findings | outputs=SeverityReport
// ============================================================
// PART 8 — Unified Lint Runner
// ============================================================
/** Detect which linters are available in the project */
function detectLinters(rootPath) {
    const { existsSync } = require('fs');
    const { join } = require('path');
    const eslintConfigs = ['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts'];
    const biomeConfigs = ['biome.json', 'biome.jsonc', '.biome.json'];
    const prettierConfigs = ['.prettierrc', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.toml', 'prettier.config.js', 'prettier.config.cjs'];
    return {
        eslint: eslintConfigs.some(c => existsSync(join(rootPath, c))),
        biome: biomeConfigs.some(c => existsSync(join(rootPath, c))),
        prettier: prettierConfigs.some(c => existsSync(join(rootPath, c))),
    };
}
async function runFullLintAnalysis(rootPath, sampleFile) {
    const results = [];
    const allFindings = [];
    const detected = detectLinters(rootPath);
    // ESLint
    if (sampleFile && detected.eslint) {
        try {
            const eslintResult = await runESLint(sampleFile);
            const score = Math.max(0, 100 - eslintResult.errorCount * 5);
            results.push({ engine: 'eslint', score, detail: `${eslintResult.findings.length} issues` });
            allFindings.push(...eslintResult.findings);
        }
        catch {
            results.push({ engine: 'eslint', score: 50, detail: 'not configured' });
        }
    }
    else if (sampleFile) {
        results.push({ engine: 'eslint', score: 50, detail: 'no config detected' });
    }
    // Biome (multi-linter support)
    if (detected.biome) {
        try {
            const biomeResult = await runBiome(rootPath, sampleFile);
            if (biomeResult.available) {
                const score = Math.max(0, 100 - biomeResult.errorCount * 5 - biomeResult.warningCount * 2);
                results.push({ engine: 'biome', score, detail: `${biomeResult.findings.length} issues` });
                allFindings.push(...biomeResult.findings);
            }
        }
        catch {
            results.push({ engine: 'biome', score: 50, detail: 'error' });
        }
    }
    // Prettier
    if (sampleFile && detected.prettier) {
        try {
            const { readFileSync } = require('fs');
            const code = readFileSync(sampleFile, 'utf-8');
            const prettierResult = await checkPrettier(code, sampleFile);
            results.push({ engine: 'prettier', score: prettierResult.isFormatted ? 100 : 70, detail: prettierResult.isFormatted ? 'formatted' : 'needs formatting' });
        }
        catch {
            results.push({ engine: 'prettier', score: 50, detail: 'not configured' });
        }
    }
    // JSCPD
    try {
        const jscpdResult = await runJSCPD(rootPath);
        const score = Math.max(0, 100 - jscpdResult.duplicateCount * 10);
        results.push({ engine: 'jscpd', score, detail: `${jscpdResult.duplicateCount} duplicates` });
    }
    catch {
        results.push({ engine: 'jscpd', score: 50, detail: 'error' });
    }
    // Madge
    try {
        const madgeResult = await runMadge(rootPath);
        const score = madgeResult.circularCount === 0 ? 100 : Math.max(0, 100 - madgeResult.circularCount * 20);
        results.push({ engine: 'madge', score, detail: `${madgeResult.circularCount} circular, ${madgeResult.orphanCount} orphans` });
    }
    catch {
        results.push({ engine: 'madge', score: 50, detail: 'error' });
    }
    // Severity aggregation across all lint engines
    const severity = aggregateSeverity(allFindings);
    const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    return {
        engines: results.length,
        results,
        avgScore,
        detectedLinters: detected,
        severity,
    };
}
// IDENTITY_SEAL: PART-8 | role=unified-lint | inputs=rootPath | outputs=results
