export declare function runESLint(filePath: string): Promise<{
    findings: any;
    errorCount: any;
}>;
export declare function checkPrettier(code: string, filePath?: string): Promise<{
    isFormatted: boolean;
    diff: {
        original: number;
        formatted: any;
    };
}>;
export declare function runJSCPD(rootPath: string): Promise<{
    duplicateCount: any;
    findings: any;
}>;
export declare function runMadge(rootPath: string): Promise<{
    circularCount: any;
    circular: any;
    orphanCount: any;
    orphans: any;
    totalModules: number;
}>;
export declare function runBiome(rootPath: string, filePath?: string): Promise<{
    available: boolean;
    findings: any;
    errorCount: any;
    warningCount: any;
}>;
export declare function runAutoFix(rootPath: string, filePath: string, engines?: string[]): Promise<{
    fixes: {
        engine: string;
        applied: boolean;
        detail: string;
    }[];
    totalApplied: number;
}>;
export interface SeverityReport {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
    byRule: Array<{
        rule: string;
        count: number;
        severity: string;
    }>;
    byFile: Array<{
        file: string;
        errors: number;
        warnings: number;
    }>;
    worstFiles: string[];
}
export declare function aggregateSeverity(findings: Array<{
    file?: string;
    severity: string;
    rule?: string;
    message?: string;
}>): SeverityReport;
export declare function runFullLintAnalysis(rootPath: string, sampleFile?: string): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
    detectedLinters: {
        eslint: boolean;
        biome: boolean;
        prettier: boolean;
    };
    severity: SeverityReport;
}>;
