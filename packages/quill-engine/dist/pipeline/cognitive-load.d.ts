export interface FunctionMetrics {
    name: string;
    startLine: number;
    endLine: number;
    lineCount: number;
    nestingDepth: number;
    parameterCount: number;
    cyclomaticComplexity: number;
    nameClarity: number;
    score: number;
    level: 'ok' | 'warning' | 'critical';
}
export interface CognitiveLoadResult {
    functions: FunctionMetrics[];
    overallScore: number;
    level: 'ok' | 'warning' | 'critical';
    summary: string;
}
export declare function analyzeCognitiveLoad(code: string): CognitiveLoadResult;
