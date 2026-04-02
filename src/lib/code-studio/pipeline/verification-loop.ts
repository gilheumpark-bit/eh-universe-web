// ============================================================
// Code Studio — Verification Loop Engine
// ============================================================
// Pipeline → Auto-fix → Re-verify, up to 3 rounds.
// Pure async — no React hooks, no DOM, no side effects.

import { runStaticPipeline } from '@/lib/code-studio/pipeline/pipeline';
import type { PipelineResult, PipelineStage } from '@/lib/code-studio/pipeline/pipeline';
import { findBugsStatic } from '@/lib/code-studio/pipeline/bugfinder';
import type { BugReport } from '@/lib/code-studio/pipeline/bugfinder';
import { generateFixes } from '@/lib/code-studio/pipeline/pipeline-utils';
import type { FixSuggestion } from '@/lib/code-studio/pipeline/pipeline-utils';
import type { Finding } from '@/lib/code-studio/pipeline/pipeline-teams';
import { runStressReport } from '@/lib/code-studio/pipeline/stress-test';
import type { StressReport } from '@/lib/code-studio/pipeline/stress-test';
import { runChaosReport } from '@/lib/code-studio/pipeline/chaos-engineering';
import type { ChaosReport } from '@/lib/code-studio/pipeline/chaos-engineering';
import { scanProject } from '@/lib/code-studio/features/patent-scanner';
import type { IPReport } from '@/lib/code-studio/features/patent-scanner';
import type { FileNode } from '@/lib/code-studio/core/types';
import {
  type SafeFixCategory,
  classifyFixDescription,
} from '@/lib/code-studio/core/autofix-policy';

// Re-export for existing consumers (`SafeFixCategory` was defined here).
export type { SafeFixCategory } from '@/lib/code-studio/core/autofix-policy';

// ============================================================
// PART 1 — Types & Configuration
// ============================================================

export interface VerificationConfig {
  maxIterations: number;
  passThreshold: number;
  enableStress: boolean;
  enableChaos: boolean;
  enableIP: boolean;
  safeFixCategories: SafeFixCategory[];
}

export interface VerificationIteration {
  round: number;
  pipelineScore: number;
  pipelineStatus: 'pass' | 'warn' | 'fail';
  bugCount: number;
  criticalBugCount: number;
  fixesApplied: number;
  fixesSkipped: number;
  stressScore?: number;
  stressGrade?: string;
  chaosScore?: number;
  chaosGrade?: string;
  ipScore?: number;
  ipGrade?: string;
  combinedScore: number;
  status: 'pass' | 'warn' | 'fail';
}

export type StopReason =
  | 'passed'
  | 'max-iterations'
  | 'no-progress'
  | 'no-fixes'
  | 'hard-gate-fail';

export interface VerificationResult {
  iterations: VerificationIteration[];
  finalScore: number;
  finalStatus: 'pass' | 'warn' | 'fail';
  stopReason: StopReason;
  totalFixesApplied: number;
  hardGateFailures: string[];
  finalCode: string;
  originalCode: string;
  scoreDelta: number;
}

const DEFAULT_CONFIG: VerificationConfig = {
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

function classifyFix(fix: FixSuggestion): SafeFixCategory | null {
  return classifyFixDescription(fix.description);
}

function isSafeToApply(
  fix: FixSuggestion,
  allowedCategories: SafeFixCategory[],
  confidenceThreshold: number,
): boolean {
  if (fix.confidence < confidenceThreshold) return false;

  const category = classifyFix(fix);
  if (category === null) return false;

  return allowedCategories.includes(category);
}

// IDENTITY_SEAL: PART-2 | role=safe-fix-classification | inputs=FixSuggestion | outputs=isSafeToApply

// ============================================================
// PART 3 — Score Calculation & Hard Gate Checks
// ============================================================

interface ScoreInput {
  pipelineScore: number;
  bugCount: number;
  criticalBugCount: number;
  stressScore?: number;
  stressEnabled: boolean;
  chaosScore?: number;
  chaosEnabled: boolean;
}

function calculateCombinedScore(input: ScoreInput): number {
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
  } else if (input.stressEnabled && input.stressScore != null) {
      scoreSum += input.stressScore * 0.3;
      totalWeight += 0.3;
  } else if (input.chaosEnabled && input.chaosScore != null) {
      scoreSum += input.chaosScore * 0.3;
      totalWeight += 0.3;
  } else {
      // If neither is enabled, pipeline gets 0.6 and bug gets 0.4
      return Math.round(input.pipelineScore * 0.6 + bugScore * 0.4);
  }

  return Math.round(scoreSum / totalWeight);
}

function deriveStatus(
  score: number,
  threshold: number,
): 'pass' | 'warn' | 'fail' {
  if (score >= threshold) return 'pass';
  if (score >= threshold - 15) return 'warn';
  return 'fail';
}

interface HardGateInput {
  criticalBugCount: number;
  stressGrade?: string;
  chaosGrade?: string;
  ipGrade?: string;
}

function checkHardGates(input: HardGateInput): string[] {
  const failures: string[] = [];

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

function applyFixes(code: string, fixes: FixSuggestion[]): string {
  if (fixes.length === 0) return code;

  let result = code;

  // Sort by line descending so replacements don't shift earlier lines
  const sorted = [...fixes].sort((a, b) => b.line - a.line);

  for (const fix of sorted) {
    if (!fix.originalCode || !fix.fixedCode) continue;

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
function extractFindings(stages: PipelineStage[]): (Finding & { file?: string })[] {
  const findings: (Finding & { file?: string })[] = [];

  for (const stage of stages) {
    for (const raw of stage.findings) {
      const lineMatch = raw.match(/^L(\d+):\s*/);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
      const message = lineMatch ? raw.slice(lineMatch[0].length) : raw;

      let severity: Finding['severity'] = 'minor';
      if (stage.status === 'fail') severity = 'critical';
      if (stage.status === 'pass') severity = 'info';

      findings.push({ severity, message, line });
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-5 | role=finding-converter | inputs=PipelineStage[] | outputs=Finding[]

// ============================================================
// PART 6 — Main Verification Loop
// ============================================================

export async function runVerificationLoop(
  code: string,
  language: string,
  fileName: string,
  files: FileNode[],
  config?: Partial<VerificationConfig>,
  onProgress?: (iteration: VerificationIteration) => void,
): Promise<VerificationResult> {
  const cfg: VerificationConfig = { ...DEFAULT_CONFIG, ...config };
  const originalCode = code;
  let currentCode = code;
  const iterations: VerificationIteration[] = [];
  let totalFixesApplied = 0;

  for (let round = 1; round <= cfg.maxIterations; round++) {
    // --- Step 1: Run pipeline ---
    let pipelineResult: PipelineResult;
    try {
      pipelineResult = runStaticPipeline(currentCode, language);
    } catch {
      pipelineResult = {
        stages: [],
        overallScore: 0,
        overallStatus: 'fail',
        timestamp: Date.now(),
      };
    }

    // --- Step 2: Run bug scan ---
    let bugs: BugReport[];
    try {
      bugs = findBugsStatic(currentCode, language);
    } catch {
      bugs = [];
    }

    const criticalBugCount = bugs.filter(
      (b) => b.severity === 'critical',
    ).length;

    // --- Step 3: Optional stress test (round 1 only to save cost) ---
    let stressReport: StressReport | undefined;
    if (cfg.enableStress && round === 1) {
      try {
        stressReport = await runStressReport(currentCode, fileName);
      } catch {
        stressReport = undefined;
      }
    }

    // --- Step 3-b: Optional chaos test (round 1 only to save cost) ---
    let chaosReport: ChaosReport | undefined;
    if (cfg.enableChaos && round === 1) {
      try {
        chaosReport = await runChaosReport(currentCode, fileName);
      } catch {
        chaosReport = undefined;
      }
    }

    // --- Step 4: Optional IP scan (round 1 only) ---
    let ipReport: IPReport | undefined;
    if (cfg.enableIP && round === 1) {
      try {
        ipReport = scanProject(files);
      } catch {
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
    const findings = extractFindings(pipelineResult.stages);
    const fileContents = new Map<string, string>([[fileName, currentCode]]);
    let allFixes: FixSuggestion[];
    try {
      allFixes = generateFixes(findings, fileContents);
    } catch {
      allFixes = [];
    }

    const safeFixes = allFixes.filter((f) =>
      isSafeToApply(f, cfg.safeFixCategories, 0.85),
    );
    const skippedCount = allFixes.length - safeFixes.length;

    // --- Step 8: Apply safe fixes ---
    const fixedCode = applyFixes(currentCode, safeFixes);
    const appliedCount = currentCode !== fixedCode ? safeFixes.length : 0;
    totalFixesApplied += appliedCount;

    // --- Build iteration record ---
    const iteration: VerificationIteration = {
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
  return buildResult(
    iterations,
    currentCode,
    originalCode,
    'max-iterations',
    totalFixesApplied,
    checkHardGates({
      criticalBugCount: iterations[iterations.length - 1]?.criticalBugCount ?? 0,
      stressGrade: iterations[0]?.stressGrade,
      chaosGrade: iterations[0]?.chaosGrade,
      ipGrade: iterations[0]?.ipGrade,
    }),
  );
}

function buildResult(
  iterations: VerificationIteration[],
  finalCode: string,
  originalCode: string,
  stopReason: StopReason,
  totalFixesApplied: number,
  hardGateFailures: string[],
): VerificationResult {
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
