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
        stages: Array<{
            name: string;
            score: number;
            status: string;
            findings: string[];
        }>;
        overallScore: number;
        overallStatus: string;
        stopReason: GenVerifyFixStopReason;
        totalRounds: number;
    };
}
export type GenVerifyFixStopReason = 'target-reached' | 'max-rounds' | 'no-improvement' | 'convergence' | 'generation-failed';
export interface GenVerifyFixOptions {
    maxRounds?: number;
    targetScore?: number;
    model?: string;
    language?: string;
    onProgress?: (iteration: GenVerifyFixIteration) => void;
    signal?: AbortSignal;
}
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
export declare function runGenVerifyFixLoop(task: string, options?: GenVerifyFixOptions): Promise<GenVerifyFixResult>;
