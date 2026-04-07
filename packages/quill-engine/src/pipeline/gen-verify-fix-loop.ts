// ============================================================
// Code Studio — Generate + Verify + Fix Loop
// ============================================================
// Complete closed-loop: AI generates code from a task description,
// runs verification pipeline, analyzes findings, auto-fixes via AI,
// re-verifies — up to N rounds until score target is met.
// Pure async — no React hooks, no DOM.

import { runStaticPipeline } from '@eh/quill-engine/pipeline/pipeline';
import type { PipelineResult, PipelineStage } from '@eh/quill-engine/pipeline/pipeline';
import { streamChat } from '@/lib/ai-providers';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types & Configuration
// ============================================================

export interface RoundTokenUsage {
  promptEstimate: number;
  completionEstimate: number;
  totalEstimate: number;
}

export interface GenVerifyFixIteration {
  round: number;
  code: string;
  score: number;
  findings: number;
  fixes: number;
  tokenUsage?: RoundTokenUsage;
  durationMs?: number;
}

export interface CostEstimate {
  totalTokens: number;
  /** Approximate cost in USD (rough estimate based on ~$3/1M input, ~$15/1M output) */
  estimatedCostUsd: number;
}

export interface GenVerifyFixResult {
  finalCode: string;
  finalScore: number;
  iterations: GenVerifyFixIteration[];
  costEstimate: CostEstimate;
  verificationReport: {
    stages: Array<{ name: string; score: number; status: string; findings: string[] }>;
    overallScore: number;
    overallStatus: string;
    stopReason: GenVerifyFixStopReason;
    totalRounds: number;
  };
}

export type GenVerifyFixStopReason =
  | 'target-reached'
  | 'max-rounds'
  | 'no-improvement'
  | 'convergence'
  | 'generation-failed';

export interface GenVerifyFixOptions {
  maxRounds?: number;
  targetScore?: number;
  model?: string;
  language?: string;
  onProgress?: (iteration: GenVerifyFixIteration) => void;
  signal?: AbortSignal;
}

const DEFAULT_MAX_ROUNDS = 3;
const ADAPTIVE_MAX_ROUNDS = 5;
const DEFAULT_TARGET_SCORE = 80;
const DEFAULT_LANGUAGE = 'typescript';

/** Minimum score improvement per round to justify continuing */
const MIN_IMPROVEMENT_PER_ROUND = 5;

/** If last N rounds have less than this improvement, stop early */
const CONVERGENCE_THRESHOLD = 2;
const CONVERGENCE_WINDOW = 2;

// IDENTITY_SEAL: PART-1 | role=types-and-config | inputs=none | outputs=types,defaults

// ============================================================
// PART 2 — AI Communication Helpers
// ============================================================

/**
 * Call the AI model and collect the full response as a string.
 * Returns the response text and estimated token usage.
 */
async function callAI(
  systemInstruction: string,
  userMessage: string,
  signal?: AbortSignal,
  temperature = 0.3,
): Promise<{ text: string; tokenUsage: RoundTokenUsage }> {
  let result = '';
  try {
    result = await streamChat({
      systemInstruction,
      messages: [{ role: 'user', content: userMessage }],
      temperature,
      onChunk: () => {},
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    logger.warn('gen-verify-fix', 'callAI failed:', err);
    return {
      text: '',
      tokenUsage: { promptEstimate: 0, completionEstimate: 0, totalEstimate: 0 },
    };
  }

  const promptLen = systemInstruction.length + userMessage.length;
  const tokenUsage: RoundTokenUsage = {
    promptEstimate: Math.ceil(promptLen / 4),
    completionEstimate: Math.ceil(result.length / 4),
    totalEstimate: Math.ceil((promptLen + result.length) / 4),
  };

  return { text: result.trim(), tokenUsage };
}

/**
 * Extract the first fenced code block from AI output.
 * Falls back to the entire response if no fence is found.
 */
function extractCodeBlock(text: string): string {
  const fenced = text.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

// IDENTITY_SEAL: PART-2 | role=ai-helpers | inputs=prompt | outputs=string,tokenUsage

// ============================================================
// PART 3 — Finding Extraction & Fix Prompt Builder
// ============================================================

interface ActionableFinding {
  source: string;
  message: string;
  severity: 'hard-fail' | 'review';
  line?: number;
}

/**
 * Extract actionable findings from pipeline stage objects directly.
 * Parses stage data structures instead of relying on regex on message strings.
 */
function extractActionableFindings(stages: PipelineStage[]): ActionableFinding[] {
  const findings: ActionableFinding[] = [];

  for (const stage of stages) {
    if (stage.status === 'pass') continue;

    const severity: ActionableFinding['severity'] =
      stage.status === 'fail' ? 'hard-fail' : 'review';

    for (const raw of stage.findings) {
      // Parse structured finding format: "L{line}: message" or plain message
      let line: number | undefined;
      let message: string;

      const lineMatch = raw.match(/^L(\d+):\s*/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
        message = raw.slice(lineMatch[0].length);
      } else {
        // Try alternative format: "(line N)" or "[line N]"
        const altMatch = raw.match(/[\[(]line\s+(\d+)[\])]/i);
        if (altMatch) {
          line = parseInt(altMatch[1], 10);
          message = raw.replace(altMatch[0], '').trim();
        } else {
          message = raw;
        }
      }

      findings.push({
        source: stage.name,
        message,
        severity,
        line,
      });
    }
  }

  return findings;
}

/**
 * Build a fix prompt that tells the AI exactly which issues to fix.
 * Prioritises hard-fail findings, includes up to 15 findings total.
 */
function buildFixPrompt(
  code: string,
  findings: ActionableFinding[],
  language: string,
): string {
  // Prioritise hard-fail, then review; cap at 15
  const sorted = [
    ...findings.filter((f) => f.severity === 'hard-fail'),
    ...findings.filter((f) => f.severity === 'review'),
  ].slice(0, 15);

  const findingList = sorted
    .map((f, i) => {
      const loc = f.line ? ` (line ${f.line})` : '';
      return `${i + 1}. [${f.severity}] [${f.source}]${loc}: ${f.message}`;
    })
    .join('\n');

  return [
    `The following ${language} code has ${sorted.length} quality issues found by static analysis.`,
    `Fix ALL issues listed below. Return the COMPLETE corrected code in a single fenced code block.`,
    `Do NOT add explanations outside the code block.`,
    ``,
    `=== ISSUES ===`,
    findingList,
    ``,
    `=== ORIGINAL CODE ===`,
    '```' + language,
    code,
    '```',
  ].join('\n');
}

// IDENTITY_SEAL: PART-3 | role=finding-extraction-and-fix-prompt | inputs=PipelineStage[],code | outputs=findings,prompt

// ============================================================
// PART 4 — Generation Step (with retry)
// ============================================================

const GENERATE_SYSTEM = `You are an expert software engineer. Given a task description, generate production-quality code.
Rules:
- Output ONLY a single fenced code block (e.g. \`\`\`typescript ... \`\`\`).
- Include all necessary imports.
- Use strict types where applicable.
- Handle edge cases and errors.
- Keep functions small and focused.
- No placeholder / TODO comments — implement fully.`;

async function generateCode(
  task: string,
  language: string,
  signal?: AbortSignal,
): Promise<{ code: string; tokenUsage: RoundTokenUsage }> {
  const userMsg = `Language: ${language}\nTask: ${task}`;

  // First attempt at temperature 0.4
  const { text: raw, tokenUsage } = await callAI(GENERATE_SYSTEM, userMsg, signal, 0.4);
  if (raw) {
    return { code: extractCodeBlock(raw), tokenUsage };
  }

  // Retry once with lower temperature (0.2) for more deterministic output
  logger.warn('gen-verify-fix', 'Generation attempt 1 failed, retrying with lower temperature');
  const { text: retryRaw, tokenUsage: retryTokens } = await callAI(
    GENERATE_SYSTEM, userMsg, signal, 0.2,
  );

  const combined: RoundTokenUsage = {
    promptEstimate: tokenUsage.promptEstimate + retryTokens.promptEstimate,
    completionEstimate: tokenUsage.completionEstimate + retryTokens.completionEstimate,
    totalEstimate: tokenUsage.totalEstimate + retryTokens.totalEstimate,
  };

  if (retryRaw) {
    return { code: extractCodeBlock(retryRaw), tokenUsage: combined };
  }

  return { code: '', tokenUsage: combined };
}

// IDENTITY_SEAL: PART-4 | role=code-generation | inputs=task,language | outputs=code,tokenUsage

// ============================================================
// PART 5 — Fix Step (never loses code)
// ============================================================

const FIX_SYSTEM = `You are a code quality engineer. Fix the issues listed in the user's message.
Rules:
- Return the COMPLETE corrected code in a single fenced code block.
- Do NOT remove functionality that is correct.
- Fix only what is broken or flagged.
- Preserve the original structure and naming where possible.
- No explanations outside the code block.`;

async function fixCode(
  code: string,
  findings: ActionableFinding[],
  language: string,
  signal?: AbortSignal,
): Promise<{ fixedCode: string; tokenUsage: RoundTokenUsage }> {
  const emptyTokens: RoundTokenUsage = { promptEstimate: 0, completionEstimate: 0, totalEstimate: 0 };

  if (findings.length === 0) {
    return { fixedCode: code, tokenUsage: emptyTokens };
  }

  const prompt = buildFixPrompt(code, findings, language);
  const { text: raw, tokenUsage } = await callAI(FIX_SYSTEM, prompt, signal, 0.2);

  // If AI returns nothing, keep previous working version
  if (!raw) {
    logger.warn('gen-verify-fix', 'Fix returned empty — keeping previous working version');
    return { fixedCode: code, tokenUsage };
  }

  const fixed = extractCodeBlock(raw);

  // Sanity check: fixed code should be at least 50% of original length
  if (fixed.length < code.length * 0.5) {
    logger.warn('gen-verify-fix', 'Fix output suspiciously short, keeping previous working version');
    return { fixedCode: code, tokenUsage };
  }

  return { fixedCode: fixed, tokenUsage };
}

// IDENTITY_SEAL: PART-5 | role=code-fix | inputs=code,findings,language | outputs=fixedCode,tokenUsage

// ============================================================
// PART 6 — Verification Step
// ============================================================

function verifyCode(
  code: string,
  language: string,
): { score: number; stages: PipelineStage[]; result: PipelineResult } {
  let pipelineResult: PipelineResult;
  try {
    pipelineResult = runStaticPipeline(code, language);
  } catch {
    pipelineResult = {
      stages: [],
      overallScore: 0,
      overallStatus: 'fail',
      timestamp: Date.now(),
    };
  }
  return {
    score: pipelineResult.overallScore,
    stages: pipelineResult.stages,
    result: pipelineResult,
  };
}

// IDENTITY_SEAL: PART-6 | role=verification | inputs=code,language | outputs=score,stages

// ============================================================
// PART 7 — Adaptive Loop Logic
// ============================================================

/**
 * Determine if the loop should continue based on adaptive criteria:
 * - If score is improving by >MIN_IMPROVEMENT_PER_ROUND, allow up to ADAPTIVE_MAX_ROUNDS
 * - If convergence detected (last CONVERGENCE_WINDOW rounds < CONVERGENCE_THRESHOLD), stop
 * - Never exceed ADAPTIVE_MAX_ROUNDS
 */
function shouldContinueLoop(
  iterations: GenVerifyFixIteration[],
  currentScore: number,
  targetScore: number,
  configMaxRounds: number,
): { shouldContinue: boolean; reason?: GenVerifyFixStopReason } {
  const round = iterations.length;

  // Target reached
  if (currentScore >= targetScore) {
    return { shouldContinue: false, reason: 'target-reached' };
  }

  // Hard cap
  if (round >= ADAPTIVE_MAX_ROUNDS) {
    return { shouldContinue: false, reason: 'max-rounds' };
  }

  // Check convergence: if the last N rounds had minimal improvement
  if (iterations.length >= CONVERGENCE_WINDOW) {
    const recent = iterations.slice(-CONVERGENCE_WINDOW);
    const scores = recent.map(it => it.score);
    const maxDelta = Math.max(...scores) - Math.min(...scores);
    if (maxDelta < CONVERGENCE_THRESHOLD) {
      return { shouldContinue: false, reason: 'convergence' };
    }
  }

  // Past the configured limit, only continue if improving significantly
  if (round >= configMaxRounds && iterations.length >= 2) {
    const prevScore = iterations[iterations.length - 2].score;
    const improvement = currentScore - prevScore;
    if (improvement < MIN_IMPROVEMENT_PER_ROUND) {
      return { shouldContinue: false, reason: 'no-improvement' };
    }
    // Improving well — allow adaptive extension
    return { shouldContinue: true };
  }

  // Within configured rounds — always continue
  return { shouldContinue: true };
}

/**
 * Calculate cost estimate from accumulated token usage.
 * Rough pricing: ~$3/1M input tokens, ~$15/1M output tokens (mid-tier model).
 */
function calculateCostEstimate(iterations: GenVerifyFixIteration[]): CostEstimate {
  let totalPrompt = 0;
  let totalCompletion = 0;

  for (const it of iterations) {
    if (it.tokenUsage) {
      totalPrompt += it.tokenUsage.promptEstimate;
      totalCompletion += it.tokenUsage.completionEstimate;
    }
  }

  const totalTokens = totalPrompt + totalCompletion;
  const inputCost = (totalPrompt / 1_000_000) * 3;
  const outputCost = (totalCompletion / 1_000_000) * 15;

  return {
    totalTokens,
    estimatedCostUsd: Math.round((inputCost + outputCost) * 10000) / 10000,
  };
}

// IDENTITY_SEAL: PART-7 | role=adaptive-loop-logic | inputs=iterations,score | outputs=shouldContinue,costEstimate

// ============================================================
// PART 8 — Main Loop
// ============================================================

/**
 * Run the full generate -> verify -> fix loop.
 *
 * 1. Generate code from the task description via AI (with 1 retry).
 * 2. Run static analysis pipeline on the generated code.
 * 3. Extract actionable findings from pipeline stage objects.
 * 4. For each round with findings, build a fix prompt and call AI.
 * 5. Re-verify the patched code.
 * 6. Adaptive stopping: continue if improving >5pts/round, max 5 rounds.
 * 7. On fix failure: keep previous working version (never lose code).
 * 8. Return final code + verification report + iteration history + cost.
 */
export async function runGenVerifyFixLoop(
  task: string,
  options?: GenVerifyFixOptions,
): Promise<GenVerifyFixResult> {
  const configMaxRounds = options?.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const targetScore = options?.targetScore ?? DEFAULT_TARGET_SCORE;
  const language = options?.language ?? DEFAULT_LANGUAGE;
  const signal = options?.signal;
  const onProgress = options?.onProgress;

  const iterations: GenVerifyFixIteration[] = [];

  // --- Step 1: Generate initial code (with retry) ---
  const roundStart = Date.now();
  const { code: initialCode, tokenUsage: genTokens } = await generateCode(task, language, signal);
  if (!initialCode) {
    return buildFinalResult(
      '',
      0,
      [],
      { stages: [], overallScore: 0, overallStatus: 'fail', timestamp: Date.now() },
      'generation-failed',
    );
  }

  let currentCode = initialCode;
  /** Track the best code seen so far — never lose a working version */
  let bestCode = initialCode;
  let bestScore = -1;
  let accumulatedTokens: RoundTokenUsage = { ...genTokens };

  for (let round = 1; round <= ADAPTIVE_MAX_ROUNDS; round++) {
    const iterStart = Date.now();

    // --- Step 2: Verify ---
    const { score, stages, result: pipelineResult } = verifyCode(currentCode, language);

    // --- Step 3: Extract findings from pipeline stage objects ---
    const findings = extractActionableFindings(stages);

    // Track best version
    if (score > bestScore) {
      bestScore = score;
      bestCode = currentCode;
    }

    const iteration: GenVerifyFixIteration = {
      round,
      code: currentCode,
      score,
      findings: findings.length,
      fixes: 0,
      tokenUsage: { ...accumulatedTokens },
      durationMs: Date.now() - iterStart,
    };

    // Reset accumulated tokens for next round
    accumulatedTokens = { promptEstimate: 0, completionEstimate: 0, totalEstimate: 0 };

    // --- Check: target reached ---
    if (score >= targetScore) {
      iterations.push(iteration);
      onProgress?.(iteration);
      return buildFinalResult(currentCode, score, iterations, pipelineResult, 'target-reached');
    }

    // --- Check: adaptive stopping ---
    iterations.push(iteration);
    onProgress?.(iteration);

    const { shouldContinue, reason } = shouldContinueLoop(
      iterations, score, targetScore, configMaxRounds,
    );

    if (!shouldContinue) {
      return buildFinalResult(bestCode, bestScore, iterations, pipelineResult, reason!);
    }

    // --- Step 4: Auto-fix (keep previous version on failure) ---
    if (findings.length > 0) {
      const { fixedCode, tokenUsage: fixTokens } = await fixCode(
        currentCode, findings, language, signal,
      );

      accumulatedTokens = fixTokens;

      const fixApplied = fixedCode !== currentCode;
      iteration.fixes = fixApplied ? findings.length : 0;

      // fixCode already handles "never lose code" — returns original on failure
      currentCode = fixedCode;
    }
  }

  // --- Final verification after last fix ---
  const finalVerification = verifyCode(currentCode, language);
  const finalScore = finalVerification.score;

  // Always use the best code seen across all iterations
  if (finalScore > bestScore) {
    bestCode = currentCode;
    bestScore = finalScore;
  }

  const stopReason: GenVerifyFixStopReason =
    bestScore >= targetScore ? 'target-reached' : 'max-rounds';

  return buildFinalResult(
    bestCode,
    bestScore,
    iterations,
    finalVerification.result,
    stopReason,
  );
}

// IDENTITY_SEAL: PART-8 | role=main-loop | inputs=task,options | outputs=GenVerifyFixResult

// ============================================================
// PART 9 — Result Builder
// ============================================================

function buildFinalResult(
  finalCode: string,
  finalScore: number,
  iterations: GenVerifyFixIteration[],
  pipelineResult: PipelineResult,
  stopReason: GenVerifyFixStopReason,
): GenVerifyFixResult {
  return {
    finalCode,
    finalScore,
    iterations,
    costEstimate: calculateCostEstimate(iterations),
    verificationReport: {
      stages: pipelineResult.stages.map((s) => ({
        name: s.name,
        score: s.score,
        status: s.status,
        findings: s.findings,
      })),
      overallScore: pipelineResult.overallScore,
      overallStatus: pipelineResult.overallStatus,
      stopReason,
      totalRounds: iterations.length,
    },
  };
}

// IDENTITY_SEAL: PART-9 | role=result-builder | inputs=code,score,iterations,pipelineResult,stopReason | outputs=GenVerifyFixResult
