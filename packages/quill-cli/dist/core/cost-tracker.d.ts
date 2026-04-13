export interface CostEntry {
    timestamp: number;
    provider: string;
    model: string;
    task: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
}
export interface DailyCost {
    date: string;
    totalUsd: number;
    entries: number;
    byProvider: Record<string, number>;
    byTask: Record<string, number>;
}
export declare function trackCost(provider: string, model: string, task: string, inputTokens: number, outputTokens: number): CostEntry;
export declare function estimateCost(model: string, inputTokens: number, outputTokens: number): number;
export declare function getTodayCost(): DailyCost;
export declare function getWeeklyCost(): DailyCost[];
export declare function formatCostSummary(): string;
