export type StopReason = 'passed' | 'max-iterations' | 'no-progress' | 'no-fixes' | 'hard-gate-fail' | 'budget-exceeded' | 'team-lead-halt' | 'consecutive-exec-halt' | 'consecutive-error-halt';
export interface LoopGuardConfig {
    maxRounds: number;
    passThreshold: number;
    noProgressDelta: number;
    maxConsecutiveExecutions: number;
    maxConsecutiveErrors: number;
    budgetLimitUsd: number;
}
export interface LoopGuardState {
    round: number;
    previousScore: number;
    consecutiveExecutions: number;
    consecutiveErrors: number;
    totalCostUsd: number;
    halted: boolean;
    stopReason: StopReason | null;
}
export declare function createLoopGuard(config?: Partial<LoopGuardConfig>): {
    state: LoopGuardState;
    check: (score: number, fixCount: number, costUsd: number) => StopReason | null;
    recordExecution: () => boolean;
    recordError: () => boolean;
    reset: () => void;
};
