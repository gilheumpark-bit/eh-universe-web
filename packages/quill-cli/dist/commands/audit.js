"use strict";
// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — cs audit command
// ============================================================
// 16영역 프로젝트 건강도 감사. 로컬, $0.
// 원본 lib/code-studio/audit/audit-engine.ts 호출.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAudit = runAudit;
const fs_1 = require("fs");
const path_1 = require("path");
// ============================================================
// PART 1 — Context Builder
// ============================================================
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs']);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json']);
function collectFiles(rootPath) {
    const files = [];
    function walk(dir) {
        const entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name))
                continue;
            const fullPath = (0, path_1.join)(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (CODE_EXTENSIONS.has((0, path_1.extname)(entry.name))) {
                try {
                    files.push({ path: (0, path_1.relative)(rootPath, fullPath), content: (0, fs_1.readFileSync)(fullPath, 'utf-8') });
                }
                catch { /* skip unreadable */ }
            }
        }
    }
    walk(rootPath);
    return files;
}
function loadPackageJson(rootPath) {
    const pkgPath = (0, path_1.join)(rootPath, 'package.json');
    if (!(0, fs_1.existsSync)(pkgPath))
        return null;
    try {
        return JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
    }
    catch {
        return null;
    }
}
async function runAudit(opts) {
    const rootPath = process.cwd();
    const startTime = performance.now();
    console.log('🦔 CS Quill — 16영역 프로젝트 감사\n');
    // Collect files
    const files = collectFiles(rootPath);
    if (files.length === 0) {
        console.log('  ⚠️  감사할 파일이 없습니다.');
        return;
    }
    console.log(`  📁 ${files.length}개 파일 수집됨\n`);
    // Run audit engine (passes rootPath directly — runProjectAudit handles file collection internally)
    const { runProjectAudit, formatAuditReport } = require('../core/pipeline-bridge');
    const report = await runProjectAudit(rootPath, (area, index, total) => {
        const bar = '█'.repeat(Math.round((index / total) * 20)) + '░'.repeat(20 - Math.round((index / total) * 20));
        process.stdout.write(`\r  [${bar}] ${index}/${total} ${area.padEnd(20)}`);
    });
    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    const duration = Math.round(performance.now() - startTime);
    // Output
    if (opts.format === 'json') {
        console.log(JSON.stringify({ ...report, duration }, null, 2));
        return;
    }
    if (opts.format === 'sarif') {
        // Build SARIF results from both areas (low scores) and urgent items
        const sarifResults = [];
        for (const area of report.areas ?? []) {
            if (area.score < 60) {
                sarifResults.push({
                    ruleId: `cs-quill/audit/${area.name}`,
                    level: area.score < 30 ? 'error' : 'warning',
                    message: { text: `[${area.name}] score ${area.score}/100 — ${area.findings?.[0] ?? ''}` },
                });
            }
        }
        for (const msg of report.urgent ?? []) {
            sarifResults.push({
                ruleId: 'cs-quill/audit/urgent',
                level: 'error',
                message: { text: typeof msg === 'string' ? msg : msg.message ?? String(msg) },
            });
        }
        const sarif = {
            $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
            version: '2.1.0',
            runs: [{
                    tool: { driver: { name: 'CS Quill Audit', version: '0.1.0' } },
                    results: sarifResults,
                }],
        };
        console.log(JSON.stringify(sarif, null, 2));
        return;
    }
    // Use the existing formatAuditReport from audit-engine
    console.log(formatAuditReport(report, 'ko'));
    console.log(`\n  소요 시간: ${duration}ms`);
    // Improvement suggestions
    if (report.urgent && report.urgent.length > 0) {
        console.log('\n  💡 가장 시급한 조치:');
        for (let i = 0; i < Math.min(3, report.urgent.length); i++) {
            const item = report.urgent[i];
            const msg = typeof item === 'string' ? item : item.message ?? String(item);
            console.log(`     ${i + 1}. ${msg}`);
        }
    }
    // Session recording
    try {
        const { recordCommand, recordScore } = require('../core/session');
        recordCommand('audit');
        recordScore('audit', report.totalScore);
    }
    catch { /* skip */ }
    // Set exit code if hard gate failed
    if (report.hardGateFail) {
        process.exitCode = 1;
    }
}
// IDENTITY_SEAL: PART-2 | role=audit-runner | inputs=opts | outputs=console
