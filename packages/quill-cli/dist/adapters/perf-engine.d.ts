export declare function runAutocannon(url: string, opts?: {
    connections?: number;
    duration?: number;
}): Promise<{
    rps: number;
    latencyAvg: number;
    latencyP50: number;
    latencyP95: number;
    latencyP99: number;
    errors: number;
    timeouts: number;
    totalRequests: number;
}>;
export declare function runTinybench(benchmarks: Array<{
    name: string;
    fn: () => void | Promise<void>;
}>): Promise<any>;
export declare function runC8(command: string, rootPath: string): Promise<{
    lines: any;
    branches: any;
    functions: any;
    statements: any;
}>;
export declare function measureMemoryGrowth(fn: () => Promise<void>, iterations?: number): Promise<{
    snapshots: {
        iteration: number;
        heapUsedMB: number;
        rss: number;
    }[];
    growth: number;
    leakSuspected: boolean;
    leakConfidence: string;
    growthRateMBPerIter: number;
    maxConsecutiveRise: number;
    firstMB: number;
    lastMB: number;
}>;
export declare function runFullPerfAnalysis(rootPath: string): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
}>;
