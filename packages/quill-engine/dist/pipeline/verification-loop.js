// ============================================================
// Code Studio — Verification Loop Engine
// ============================================================
// Pipeline → Auto-fix → Re-verify, up to 3 rounds.
// Pure async — no React hooks, no DOM, no side effects.
import { runStaticPipeline } from './pipeline';
import { findBugsStatic } from './bugfinder';
import { generateFixes } from './pipeline-utils';
import { runStressReport } from './stress-test';
import { runChaosReport } from './chaos-engineering';
import { scanProject } from '../patent-scanner';
import { runProjectAudit } from '../audit/audit-engine';
import { classifyFixDescription, } from '../autofix-policy';
import { runDesignLint } from './design-lint';
import { GOOD_PATTERN_CATALOG, } from '../good-pattern-catalog';
const DEFAULT_CONFIG = {
    maxIterations: 3,
    passThreshold: 77,
    enableStress: false,
    enableChaos: false,
    enableIP: true,
    safeFixCategories: [
        'unused-import',
        'console-remove',
        'missing-semicolon',
        'formatting',
        'null-guard',
        'type-import',
    ],
};
// IDENTITY_SEAL: PART-1 | role=types-and-config | inputs=none | outputs=types,DEFAULT_CONFIG
// ============================================================
// PART 2 — Safe Fix Classification (delegates to autofix-policy.ts)
// ============================================================
function classifyFix(fix) {
    return classifyFixDescription(fix.description);
}
function isSafeToApply(fix, allowedCategories, confidenceThreshold) {
    if (fix.confidence < confidenceThreshold)
        return false;
    const category = classifyFix(fix);
    if (category === null)
        return false;
    return allowedCategories.includes(category);
}
function calculateCombinedScore(input) {
    const bugPenalty = Math.min(100, input.criticalBugCount * 25 + input.bugCount * 5);
    const bugScore = Math.max(0, 100 - bugPenalty);
    let totalWeight = 0;
    let scoreSum = 0;
    // Pipeline is always on
    totalWeight += 0.5;
    scoreSum += input.pipelineScore * 0.5;
    // Bug score is always on
    totalWeight += 0.2;
    scoreSum += bugScore * 0.2;
    // Stress and Chaos split the remaining 0.3
    if (input.stressEnabled && input.stressScore != null && input.chaosEnabled && input.chaosScore != null) {
        scoreSum += input.stressScore * 0.15;
        scoreSum += input.chaosScore * 0.15;
        totalWeight += 0.3;
    }
    else if (input.stressEnabled && input.stressScore != null) {
        scoreSum += input.stressScore * 0.3;
        totalWeight += 0.3;
    }
    else if (input.chaosEnabled && input.chaosScore != null) {
        scoreSum += input.chaosScore * 0.3;
        totalWeight += 0.3;
    }
    else {
        // If neither is enabled, pipeline gets 0.6 and bug gets 0.4
        return Math.round(input.pipelineScore * 0.6 + bugScore * 0.4);
    }
    return Math.round(scoreSum / totalWeight);
}
function deriveStatus(score, threshold) {
    if (score >= threshold)
        return 'pass';
    if (score >= threshold - 15)
        return 'warn';
    return 'fail';
}
function checkHardGates(input) {
    const failures = [];
    if (input.criticalBugCount > 0) {
        failures.push(`critical bugs: ${input.criticalBugCount}`);
    }
    if (input.stressGrade === 'F') {
        failures.push('stress: F');
    }
    if (input.chaosGrade === 'F') {
        failures.push('chaos: F');
    }
    if (input.ipGrade === 'F') {
        failures.push('ip: F');
    }
    return failures;
}
// IDENTITY_SEAL: PART-3 | role=scoring-and-gates | inputs=ScoreInput,HardGateInput | outputs=combinedScore,status,hardGates
// ============================================================
// PART 4 — Fix Application
// ============================================================
function applyFixes(code, fixes) {
    if (fixes.length === 0)
        return code;
    let result = code;
    // Sort by line descending so replacements don't shift earlier lines
    const sorted = [...fixes].sort((a, b) => b.line - a.line);
    for (const fix of sorted) {
        if (!fix.originalCode || !fix.fixedCode)
            continue;
        // Replace first occurrence of originalCode
        const idx = result.indexOf(fix.originalCode);
        if (idx !== -1) {
            result =
                result.slice(0, idx) +
                    fix.fixedCode +
                    result.slice(idx + fix.originalCode.length);
        }
    }
    return result;
}
// IDENTITY_SEAL: PART-4 | role=fix-application | inputs=code,FixSuggestion[] | outputs=fixedCode
// ============================================================
// PART 5 — Pipeline Findings Converter
// ============================================================
/**
 * Convert PipelineStage findings (string[]) into Finding objects
 * compatible with generateFixes.
 */
function extractFindings(stages) {
    const findings = [];
    for (const stage of stages) {
        for (const raw of stage.findings) {
            const lineMatch = raw.match(/^L(\d+):\s*/);
            const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
            const message = lineMatch ? raw.slice(lineMatch[0].length) : raw;
            let severity = 'minor';
            if (stage.status === 'fail')
                severity = 'critical';
            if (stage.status === 'pass')
                severity = 'info';
            findings.push({ severity, message, line });
        }
    }
    return findings;
}
// IDENTITY_SEAL: PART-5 | role=finding-converter | inputs=PipelineStage[] | outputs=Finding[]
// ============================================================
// PART 5.5 — Good-Pattern False-Positive Filter
// ============================================================
/**
 * Build a set of rule IDs that should be suppressed based on good patterns
 * detected in the code. Mirrors the CLI false-positive-filter logic
 * but runs directly from the catalog's suppresses field.
 */
function buildSuppressedRuleIds(code) {
    const suppressed = new Set();
    for (const pattern of GOOD_PATTERN_CATALOG) {
        if (!pattern.suppresses || pattern.suppresses.length === 0)
            continue;
        if (pattern.signal !== 'suppress-fp' && pattern.signal !== 'boost')
            continue;
        if (pattern.confidence !== 'high')
            continue;
        // Quick heuristic detection per pattern category
        let detected = false;
        if (pattern.id === 'GQ-FN-004' && /^\s*if\s*\([^)]*\)\s*(return|throw)\b/m.test(code))
            detected = true;
        else if (pattern.id === 'GQ-FN-009' && ((code.match(/\bconst\b/g) || []).length > (code.match(/\blet\b/g) || []).length * 3))
            detected = true;
        else if (pattern.id === 'GQ-FN-010' && /\{\s*\.\.\./.test(code))
            detected = true;
        else if (pattern.id === 'GQ-FN-012' && /\.slice\(|\.concat\(|\.map\(|\.filter\(/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-TS-001' && /strict.*true|"strict"\s*:\s*true/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-TS-004' && /:\s*unknown\b/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-TS-015' && /zod|io-ts|yup|superstruct/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-FN-008' && /\.filter\(.*\.map\(|\.map\(.*\.filter\(/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-AI-007' && !/\/\/\s*TODO|FIXME/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-NW-006' && /\.at\s*\(-?\d+\)/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-NW-007' && /structuredClone/.test(code))
            detected = true;
        else if (pattern.id === 'GQ-NW-010' && /noUncheckedIndexedAccess/.test(code))
            detected = true;
        if (detected) {
            for (const ruleId of pattern.suppresses) {
                suppressed.add(ruleId);
            }
        }
    }
    return suppressed;
}
/**
 * Filter findings by removing those suppressed by good patterns in the code.
 */
function filterFalsePositives(findings, code) {
    const suppressed = buildSuppressedRuleIds(code);
    if (suppressed.size === 0)
        return findings;
    return findings.filter((f) => {
        // Extract potential rule ID from the message (e.g., "[CMX-007] ..." or "CMX-007:")
        const ruleMatch = f.message.match(/\b([A-Z]{2,4}-\d{3})\b/);
        if (ruleMatch && suppressed.has(ruleMatch[1])) {
            return false; // suppressed by good pattern
        }
        return true;
    });
}
// IDENTITY_SEAL: PART-5.5 | role=good-pattern-fp-filter | inputs=findings,code | outputs=filteredFindings
// ============================================================
// PART 6 — Main Verification Loop
// ============================================================
export async function runVerificationLoop(code, language, fileName, files, config, onProgress) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const originalCode = code;
    let currentCode = code;
    const iterations = [];
    let totalFixesApplied = 0;
    for (let round = 1; round <= cfg.maxIterations; round++) {
        // --- Step 1: Run pipeline ---
        let pipelineResult;
        try {
            pipelineResult = runStaticPipeline(currentCode, language);
        }
        catch {
            pipelineResult = {
                stages: [],
                overallScore: 0,
                overallStatus: 'fail',
                timestamp: Date.now(),
            };
        }
        // --- Step 1.5: Run audit (code-health + UX) ---
        try {
            const auditCtx = {
                files: [
                    { path: fileName, content: currentCode, language },
                ],
                language,
            };
            const auditResult = runProjectAudit(auditCtx);
            // 감사 결과를 파이프라인 스테이지에 추가
            if (auditResult.totalFindings > 0) {
                const allFindings = auditResult.areas.flatMap(a => a.findings);
                pipelineResult.stages.push({
                    name: 'audit',
                    status: auditResult.totalGrade === 'F' || auditResult.totalGrade === 'D' ? 'fail' : 'warn',
                    score: auditResult.totalScore,
                    message: `Audit: ${auditResult.totalFindings} findings (${auditResult.totalGrade})`,
                    findings: allFindings.slice(0, 10).map(f => f.message),
                });
            }
        }
        catch { /* audit is advisory, don't block pipeline */ }
        // --- Step 1.6: Run design lint (UI code quality) ---
        let designLint;
        try {
            const isUICode = /tsx?$/.test(fileName) && (/</.test(currentCode) || /className/.test(currentCode));
            if (isUICode) {
                designLint = runDesignLint(currentCode);
                if (designLint.issues.length > 0) {
                    pipelineResult.stages.push({
                        name: 'design-lint',
                        status: designLint.passed ? 'warn' : 'fail',
                        score: designLint.score,
                        message: designLint.summary,
                        findings: designLint.issues.slice(0, 8).map(i => `[${i.rule}] ${i.message}`),
                    });
                }
            }
        }
        catch { /* design lint is advisory */ }
        // --- Step 2: Run bug scan ---
        let bugs;
        try {
            bugs = findBugsStatic(currentCode, language);
        }
        catch {
            bugs = [];
        }
        const criticalBugCount = bugs.filter((b) => b.severity === 'critical').length;
        // --- Step 3: Optional stress test (round 1 only to save cost) ---
        let stressReport;
        if (cfg.enableStress && round === 1) {
            try {
                stressReport = await runStressReport(currentCode, fileName);
            }
            catch {
                stressReport = undefined;
            }
        }
        // --- Step 3-b: Optional chaos test (round 1 only to save cost) ---
        let chaosReport;
        if (cfg.enableChaos && round === 1) {
            try {
                chaosReport = await runChaosReport(currentCode, fileName);
            }
            catch {
                chaosReport = undefined;
            }
        }
        // --- Step 4: Optional IP scan (round 1 only) ---
        let ipReport;
        if (cfg.enableIP && round === 1) {
            try {
                ipReport = scanProject(files);
            }
            catch {
                ipReport = undefined;
            }
        }
        // --- Step 5: Calculate combined score ---
        const combinedScore = calculateCombinedScore({
            pipelineScore: pipelineResult.overallScore,
            bugCount: bugs.length,
            criticalBugCount,
            stressScore: stressReport?.overallScore,
            stressEnabled: cfg.enableStress,
            chaosScore: chaosReport?.overallScore,
            chaosEnabled: cfg.enableChaos,
        });
        const status = deriveStatus(combinedScore, cfg.passThreshold);
        // --- Step 6: Hard gate check ---
        const hardGates = checkHardGates({
            criticalBugCount,
            stressGrade: stressReport?.grade,
            chaosGrade: chaosReport?.grade,
            ipGrade: ipReport?.grade,
        });
        // --- Step 7: Generate and filter fixes ---
        const rawFindings = extractFindings(pipelineResult.stages);
        const findings = filterFalsePositives(rawFindings, currentCode);
        const fileContents = new Map([[fileName, currentCode]]);
        let allFixes;
        try {
            allFixes = generateFixes(findings, fileContents);
        }
        catch {
            allFixes = [];
        }
        const safeFixes = allFixes.filter((f) => isSafeToApply(f, cfg.safeFixCategories, 0.85));
        const skippedCount = allFixes.length - safeFixes.length;
        // --- Step 8: Apply safe fixes ---
        const fixedCode = applyFixes(currentCode, safeFixes);
        const appliedCount = currentCode !== fixedCode ? safeFixes.length : 0;
        totalFixesApplied += appliedCount;
        // --- Build iteration record ---
        const iteration = {
            round,
            pipelineScore: pipelineResult.overallScore,
            pipelineStatus: pipelineResult.overallStatus,
            bugCount: bugs.length,
            criticalBugCount,
            fixesApplied: appliedCount,
            fixesSkipped: skippedCount,
            stressScore: stressReport?.overallScore,
            stressGrade: stressReport?.grade,
            chaosScore: chaosReport?.overallScore,
            chaosGrade: chaosReport?.grade,
            ipScore: ipReport?.score,
            ipGrade: ipReport?.grade,
            designLintScore: designLint?.score,
            designLintPassed: designLint?.passed,
            designLintSummary: designLint?.summary,
            combinedScore,
            status,
        };
        iterations.push(iteration);
        onProgress?.(iteration);
        // --- Stop condition: passed ---
        if (combinedScore >= cfg.passThreshold && hardGates.length === 0) {
            return buildResult(iterations, fixedCode, originalCode, 'passed', totalFixesApplied, []);
        }
        // --- Stop condition: hard gate on final round ---
        if (round === cfg.maxIterations && hardGates.length > 0) {
            return buildResult(iterations, fixedCode, originalCode, 'hard-gate-fail', totalFixesApplied, hardGates);
        }
        // --- Stop condition: no fixes available ---
        if (appliedCount === 0 && round > 1) {
            return buildResult(iterations, currentCode, originalCode, 'no-fixes', totalFixesApplied, hardGates);
        }
        // --- Stop condition: no progress (score delta < 2 from previous round) ---
        if (round > 1) {
            const prevScore = iterations[round - 2].combinedScore;
            if (combinedScore - prevScore < 2) {
                return buildResult(iterations, fixedCode, originalCode, 'no-progress', totalFixesApplied, hardGates);
            }
        }
        // Advance to next round with fixed code
        currentCode = fixedCode;
    }
    // Max iterations reached
    return buildResult(iterations, currentCode, originalCode, 'max-iterations', totalFixesApplied, checkHardGates({
        criticalBugCount: iterations[iterations.length - 1]?.criticalBugCount ?? 0,
        stressGrade: iterations[0]?.stressGrade,
        chaosGrade: iterations[0]?.chaosGrade,
        ipGrade: iterations[0]?.ipGrade,
    }));
}
function buildResult(iterations, finalCode, originalCode, stopReason, totalFixesApplied, hardGateFailures) {
    const last = iterations[iterations.length - 1];
    const first = iterations[0];
    return {
        iterations,
        finalScore: last?.combinedScore ?? 0,
        finalStatus: last?.status ?? 'fail',
        stopReason,
        totalFixesApplied,
        hardGateFailures,
        finalCode,
        originalCode,
        scoreDelta: (last?.combinedScore ?? 0) - (first?.combinedScore ?? 0),
    };
}
// IDENTITY_SEAL: PART-6 | role=main-loop | inputs=code,language,fileName,files,config | outputs=VerificationResult
