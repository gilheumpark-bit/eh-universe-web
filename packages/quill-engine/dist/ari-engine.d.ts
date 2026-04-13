export interface ARIState {
    provider: string;
    score: number;
    errorCount: number;
    successCount: number;
    lastErrorAt: number;
    circuitState: 'closed' | 'open' | 'half-open';
    circuitOpenedAt: number;
    halfOpenSuccessStreak: number;
    emaHistory: number[];
}
export interface ARIReport {
    providers: Array<{
        provider: string;
        score: number;
        circuitState: string;
        errorCount: number;
        successCount: number;
        available: boolean;
    }>;
    bestProvider: string | null;
    timestamp: number;
}
export declare class ARIManager {
    private states;
    private getState;
    /**
     * Update ARI after an AI call completes (success or failure).
     * Handles score recalculation, EMA, and circuit breaker transitions.
     */
    updateAfterCall(provider: string, success: boolean, latencyMs: number): void;
    /**
     * Select the healthiest available provider from candidates.
     * Returns the candidate with the highest ARI score that has a closed/half-open circuit.
     * If all candidates are unavailable, returns the first candidate as last resort.
     */
    getBestProvider(candidates: string[]): string;
    /**
     * Check if a provider is available for requests.
     * Open circuit = unavailable (unless cooldown elapsed, which promotes to half-open).
     */
    isAvailable(provider: string): boolean;
    /**
     * Get a full diagnostic report of all tracked providers.
     */
    getReport(): ARIReport;
    /**
     * Reset a provider's ARI state to defaults. Useful after config changes.
     */
    reset(provider: string): void;
    /**
     * Get the current ARI score for a provider (0-100).
     */
    getScore(provider: string): number;
    /**
     * Get the circuit state for a provider.
     */
    getCircuitState(provider: string): 'closed' | 'open' | 'half-open';
    private calcLatencyPenalty;
    private applyEMA;
    /**
     * Tick circuit breaker: promote open -> half-open after cooldown expires.
     */
    private tickCircuitBreaker;
}
/** Module-level singleton — shared across the web app */
export declare const ariManager: ARIManager;
/**
 * Dynamic router: selects the healthiest provider for a given task.
 * Uses ARI scores to pick the best candidate from the supplied list.
 *
 * @param task - Task identifier (for future per-task weighting)
 * @param providers - List of candidate provider IDs
 * @returns The provider ID with the highest availability and health
 */
export declare function routeToHealthiest(task: string, providers: string[]): string;
