export interface StressScenario {
    id: string;
    name: string;
    description: string;
    type: 'load' | 'spike' | 'soak' | 'breakpoint';
    virtualUsers: number;
    durationSec: number;
    rampUpSec: number;
}
export interface StressResult {
    scenario: StressScenario;
    metrics: {
        avgResponseMs: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        maxResponseMs: number;
        errorRate: number;
        throughputRps: number;
        totalRequests: number;
        failedRequests: number;
    };
    breakingPoint?: {
        virtualUsers: number;
        errorRate: number;
        avgResponseMs: number;
    };
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
}
export interface StressReport {
    scenarios: StressResult[];
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
}
export declare function getScenarios(): StressScenario[];
export declare function analyzeStress(code: string, fileName: string, scenario: StressScenario, signal?: AbortSignal): Promise<StressResult>;
export declare function runStressReport(code: string, fileName: string, scenarios?: StressScenario[], signal?: AbortSignal): Promise<StressReport>;
