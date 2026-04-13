export type AITask = 'plan' | 'generate' | 'verify' | 'judge' | 'explain' | 'vibe' | 'commit-msg' | 'conflict' | 'test-gen' | 'report' | 'refactor' | 'translate';
export declare const TEMPERATURE_MAP: Record<AITask, number>;
export declare function getTemperature(task: AITask): number;
export interface AIStrength {
    provider: string;
    model: string;
    strengths: string[];
    weaknesses: string[];
    bestFor: AITask[];
    costTier: 'free' | 'cheap' | 'moderate' | 'expensive';
    contextWindow: number;
    speed: 'fast' | 'medium' | 'slow';
    codeQuality: number;
    reasoning: number;
    instruction: number;
    creativity: number;
    consistency: number;
}
export declare const AI_PROFILES: AIStrength[];
export interface RouteDecision {
    task: AITask;
    model: string;
    temperature: number;
    reason: string;
}
export declare function routeTask(task: AITask, availableKeys: Array<{
    provider: string;
    model: string;
}>): RouteDecision;
export declare function getSingleKeyStrategy(provider: string, model: string): Record<AITask, {
    temperature: number;
    tip: string;
}>;
export declare function recommendSecondKey(currentProvider: string): {
    provider: string;
    model: string;
    reason: string;
};
export declare function printAIProfileSummary(): string;
