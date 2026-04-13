export interface FilteredFinding {
    ruleId: string;
    line: number;
    message: string;
    severity: string;
    confidence: string;
    evidence?: Array<{
        engine: string;
        detail: string;
    }>;
}
export interface FilterResult {
    kept: FilteredFinding[];
    dismissed: Array<FilteredFinding & {
        dismissReason: string;
        stage: number;
    }>;
    stats: {
        total: number;
        stage1: number;
        stage2: number;
        stage3: number;
        stage4: number;
        kept: number;
    };
}
export declare function runFalsePositiveFilter(findings: FilteredFinding[], filePath: string, code: string): FilterResult;
export declare function printFilterSummary(result: FilterResult): string;
