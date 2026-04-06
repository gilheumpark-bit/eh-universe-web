// ============================================================
// Code Studio — Generate + Verify + Fix Loop
// ============================================================
// Complete closed-loop: AI generates code from a task description,
// runs verification pipeline, analyzes findings, auto-fixes via AI,
// re-verifies — up to N rounds until score target is met.
// Pure async — no React hooks, no DOM.

import { runStaticPipeline } from '@/lib/code-studio/pipeline/pipeline';
import type { PipelineResult, PipelineStage } from '@/lib/code-studio/pipeline/pipeline';
import { streamChat } from '@/lib/ai-providers';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types & Configuration
// ============================================================

export interface GenVerifyFixIteration {
  round: number;
  code: string;
  score: number;
  findings: number;
  fixes: number;
}

export interface GenVerifyFixResult {
  finalCode: string;
  finalScore: number;
  iterations: GenVerifyFixIteration[];
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
const DEFAULT_TARGET_SCORE = 80;
const DEFAULT_LANGUAGE = 'typescript';

// IDENTITY_SEAL: PART-1 | role=types-and-config | inputs=none | outputs=types,defaults

// ============================================================
// PART 2 — AI Communication Helpers
// ============================================================

/**
 * Call the AI model and collect the full response as a string.
 * Uses streamChat from ai-providers — provider/model chosen by
 * the user's active configuration.
 */
async function callAI(
  systemInstruction: string,
  userMessage: string,
  signal?: AbortSignal,
  temperature = 0.3,
): Promise<string> {
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
    return '';
  }
  return result.trim();
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

// IDENTITY_SEAL: PART-2 | role=ai-helpers | inputs=prompt | outputs=string

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
 * Extract actionable findings from pipeline stages.
 * Separates hard-fail (from failed stages) vs. review (from warn stages).
 */
function extractActionableFindings(stages: PipelineStage[]): ActionableFinding[] {
  const findings: ActionableFinding[] = [];

  for (const stage of stages) {
    if (stage.status === 'pass') continue;

    const severity: ActionableFinding['severity'] =
      stage.status === 'fail' ? 'hard-fail' : 'review';

    for (const raw of stage.findings) {
      const lineMatch = raw.match(/^L(\d+):\s*/);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
      const message = lineMatch ? raw.slice(lineMatch[0].length) : raw;

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
// PART 4 — Generation Step
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
): Promise<string> {
  const userMsg = `Language: ${language}\nTask: ${task}`;
  const raw = await callAI(GENERATE_SYSTEM, userMsg, signal, 0.4);
  if (!raw) return '';
  return extractCodeBlock(raw);
}

// IDENTITY_SEAL: PART-4 | role=code-generation | inputs=task,language | outputs=code

// ============================================================
// PART 5 — Fix Step
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
): Promise<string> {
  if (findings.length === 0) return code;
  const prompt = buildFixPrompt(code, findings, language);
  const raw = await callAI(FIX_SYSTEM, prompt, signal, 0.2);
  if (!raw) return code;
  const fixed = extractCodeBlock(raw);
  // Sanity check: fixed code should be at least 50% of original length
  if (fixed.length < code.length * 0.5) {
    logger.warn('gen-verify-fix', 'Fix output suspiciously short, keeping original');
    return code;
  }
  return fixed;
}

// IDENTITY_SEAL: PART-5 | role=code-fix | inputs=code,findings,language | outputs=fixedCode

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
// PART 7 — Main Loop
// ============================================================

/**
 * Run the full generate -> verify -> fix loop.
 *
 * 1. Generate code from the task description via AI.
 * 2. Run static analysis pipeline on the generated code.
 * 3. Extract actionable findings (hard-fail + review).
 * 4. For each round with findings, build a fix prompt and call AI.
 * 5. Re-verify the patched code.
 * 6. Repeat up to maxRounds or until targetScore is reached.
 * 7. Return final code + verification report + iteration history.
 */
export async function runGenVerifyFixLoop(
  task: string,
  options?: GenVerifyFixOptions,
): Promise<GenVerifyFixResult> {
  const maxRounds = options?.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const targetScore = options?.targetScore ?? DEFAULT_TARGET_SCORE;
  const language = options?.language ?? DEFAULT_LANGUAGE;
  const signal = options?.signal;
  const onProgress = options?.onProgress;

  const iterations: GenVerifyFixIteration[] = [];

  // --- Step 1: Generate initial code ---
  const initialCode = await generateCode(task, language, signal);
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
  let lastScore = -1;

  for (let round = 1; round <= maxRounds; round++) {
    // --- Step 2: Verify ---
    const { score, stages, result: pipelineResult } = verifyCode(currentCode, language);

    // --- Step 3: Extract findings ---
    const findings = extractActionableFindings(stages);

    const iteration: GenVerifyFixIteration = {
      round,
      code: currentCode,
      score,
      findings: findings.length,
      fixes: 0,
    };

    // --- Check: target reached ---
    if (score >= targetScore) {
      iterations.push(iteration);
      onProgress?.(iteration);
      return buildFinalResult(currentCode, score, iterations, pipelineResult, 'target-reached');
    }

    // --- Check: no improvement (from round 2 onward) ---
    if (round > 1 && score <= lastScore) {
      iterations.push(iteration);
      onProgress?.(iteration);
      // Use the better version: current or previous
      const bestIteration = iterations.reduce((best, it) =>
        it.score > best.score ? it : best, iterations[0]);
      return buildFinalResult(
        bestIteration.code,
        bestIteration.score,
        iterations,
        pipelineResult,
        'no-improvement',
      );
    }

    // --- Step 4: Auto-fix ---
    if (findings.length > 0 && round < maxRounds) {
      const fixed = await fixCode(currentCode, findings, language, signal);
      const fixApplied = fixed !== currentCode;
      iteration.fixes = fixApplied ? findings.length : 0;
      iterations.push(iteration);
      onProgress?.(iteration);
      lastScore = score;
      currentCode = fixed;
    } else {
      // No findings or last round — just record
      iterations.push(iteration);
      onProgress?.(iteration);
      lastScore = score;
    }
  }

  // --- Final verification after last fix ---
  const finalVerification = verifyCode(currentCode, language);
  const finalScore = finalVerification.score;

  // Pick the best code across all iterations + final
  let bestCode = currentCode;
  let bestScore = finalScore;
  for (const it of iterations) {
    if (it.score > bestScore) {
      bestCode = it.code;
      bestScore = it.score;
    }
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

// ============================================================
// PART 8 — Result Builder
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

// IDENTITY_SEAL: PART-7+8 | role=main-loop-and-builder | inputs=task,options | outputs=GenVerifyFixResult
