"use strict";
// ============================================================
// CS Quill 🦔 — Baseline Manager
// ============================================================
// 최초 스캔 결과를 .csquill-baseline.json에 동결.
// 이후 스캔에서 baseline과 일치하는 findings는 숨김.
// "기존 기술부채를 당장 싸우지 않는다"
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSnippetHash = computeSnippetHash;
exports.loadBaseline = loadBaseline;
exports.saveBaseline = saveBaseline;
exports.initBaseline = initBaseline;
exports.filterByBaseline = filterByBaseline;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const BASELINE_FILE = '.csquill-baseline.json';
// ============================================================
// PART 2 — Snippet Hash
// ============================================================
/**
 * finding 주변 ±2줄의 코드를 해시.
 * 라인 번호가 바뀌어도 코드가 같으면 매칭됨.
 */
function computeSnippetHash(code, line) {
    const lines = code.split('\n');
    const start = Math.max(0, line - 3);
    const end = Math.min(lines.length, line + 2);
    const snippet = lines.slice(start, end).join('\n').trim();
    return (0, crypto_1.createHash)('sha256').update(snippet).digest('hex').slice(0, 16);
}
// ============================================================
// PART 3 — Load / Save
// ============================================================
function loadBaseline(root) {
    const p = (0, path_1.join)(root, BASELINE_FILE);
    if (!(0, fs_1.existsSync)(p))
        return null;
    try {
        return JSON.parse((0, fs_1.readFileSync)(p, 'utf-8'));
    }
    catch {
        return null;
    }
}
function saveBaseline(root, data) {
    const p = (0, path_1.join)(root, BASELINE_FILE);
    (0, fs_1.writeFileSync)(p, JSON.stringify(data, null, 2), 'utf-8');
}
// ============================================================
// PART 4 — Init Baseline (전체 스캔 결과를 동결)
// ============================================================
function initBaseline(root, findings, codeMap) {
    const entries = findings.map(f => ({
        ruleId: f.ruleId ?? 'unknown',
        file: f.file,
        line: f.line,
        snippetHash: codeMap.has(f.file) ? computeSnippetHash(codeMap.get(f.file), f.line) : '',
        message: f.message,
        frozenAt: new Date().toISOString(),
    }));
    const data = {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entries,
    };
    saveBaseline(root, data);
    return data;
}
// ============================================================
// PART 5 — Filter (baseline 매칭 findings 제거)
// ============================================================
function filterByBaseline(baseline, findings, codeMap) {
    const baselineSet = new Set(baseline.entries.map(e => `${e.file}:${e.snippetHash}:${e.ruleId}`));
    const kept = [];
    let suppressed = 0;
    for (const f of findings) {
        const hash = codeMap.has(f.file) ? computeSnippetHash(codeMap.get(f.file), f.line) : '';
        const key = `${f.file}:${hash}:${f.ruleId ?? 'unknown'}`;
        if (baselineSet.has(key)) {
            suppressed++;
        }
        else {
            kept.push(f);
        }
    }
    return { kept, suppressed };
}
// IDENTITY_SEAL: PART-5 | role=baseline-filter | inputs=baseline,findings | outputs=kept,suppressed
