export interface VitestResult {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    failures: Array<{
        name: string;
        error: string;
        file: string;
    }>;
}
export declare function runVitest(rootPath: string): Promise<VitestResult>;
export interface PBTResult {
    properties: Array<{
        name: string;
        passed: boolean;
        numRuns: number;
        counterexample?: string;
        error?: string;
    }>;
    totalPassed: number;
    totalFailed: number;
}
export interface PropertySpec {
    name: string;
    arbitraries: string[];
    predicate: (args: unknown[]) => boolean | void;
    numRuns?: number;
}
export declare function runPropertyTests(specs: PropertySpec[]): Promise<PBTResult>;
/** fast-check 사양 실행 — runPropertyTests 별칭 (index export 호환) */
export declare function runFastCheck(specs: PropertySpec[]): Promise<PBTResult>;
export declare function autoFuzzFunction(fnCode: string, fnName: string, paramTypes?: string[], numRuns?: number): Promise<PBTResult>;
export interface MutationResult {
    mutationScore: number;
    killed: number;
    survived: number;
    noCoverage: number;
    timeout: number;
    details: Array<{
        mutant: string;
        status: string;
        file: string;
    }>;
}
export declare function runStryker(rootPath: string): Promise<MutationResult>;
export interface MochaResult {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    duration: number;
    failures: Array<{
        name: string;
        error: string;
        file: string;
    }>;
}
export declare function runMocha(rootPath: string): Promise<MochaResult>;
export type TestRunner = 'vitest' | 'jest' | 'mocha' | 'unknown';
export declare function detectTestRunner(rootPath: string): {
    runner: TestRunner;
    configFile: string | null;
};
export interface CoverageThresholds {
    lines?: number;
    branches?: number;
    functions?: number;
    statements?: number;
}
export interface CoverageEnforcementResult {
    passed: boolean;
    actual: {
        lines: number;
        branches: number;
        functions: number;
        statements: number;
    };
    thresholds: CoverageThresholds;
    failures: Array<{
        metric: string;
        actual: number;
        threshold: number;
        gap: number;
    }>;
}
export declare function enforceCoverageThresholds(rootPath: string, thresholds?: CoverageThresholds): Promise<CoverageEnforcementResult>;
export interface FlakyTestResult {
    flakyTests: Array<{
        name: string;
        file: string;
        passCount: number;
        failCount: number;
        flakyRate: number;
    }>;
    totalRuns: number;
    totalFlaky: number;
}
export declare function detectFlakyTests(rootPath: string, runs?: number): Promise<FlakyTestResult>;
export declare function runFullTestAnalysis(rootPath: string, opts?: {
    coverageThresholds?: CoverageThresholds;
    detectFlaky?: boolean;
    flakyRuns?: number;
}): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
    detectedRunner: {
        runner: TestRunner;
        configFile: string | null;
    };
}>;
