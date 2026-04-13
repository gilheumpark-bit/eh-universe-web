export declare function runAxeAccessibility(htmlContent: string): Promise<{
    findings: {
        line: number;
        message: string;
        severity: string;
        impact: string;
    }[];
    score: number;
    engine: string;
}>;
export declare function checkBundleSize(rootPath: string): Promise<{
    findings: {
        name: string;
        size: string;
        severity: string;
    }[];
    score: number;
    engine: string;
    totalDeps?: undefined;
    heavyCount?: undefined;
} | {
    findings: {
        alternative: string;
        name: string;
        size: string;
        severity: string;
    }[];
    totalDeps: number;
    heavyCount: number;
    score: number;
    engine: string;
}>;
export declare function runLighthouse(url: string): Promise<{
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    engine: string;
}>;
export declare function analyzeTreeShaking(rootPath: string): Promise<{
    findings: {
        file: string;
        issue: string;
        severity: string;
    }[];
    score: number;
    engine: string;
}>;
export declare function runFullWebQualityAnalysis(rootPath: string, lighthouseUrl?: string): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
}>;
