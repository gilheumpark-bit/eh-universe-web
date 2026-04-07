export interface DeepFinding {
    file: string;
    line: number;
    message: string;
    severity: 'P0' | 'P1' | 'P2';
    category: string;
    fix?: string;
}
export interface DeepVerifyResult {
    findings: DeepFinding[];
    score: number;
    checks: number;
    duration: number;
}
export declare function runDeepVerify(code: string, fileName: string): DeepVerifyResult;
export declare function runDeepVerifyProject(rootPath: string): {
    files: number;
    totalFindings: number;
    score: number;
    findings: DeepFinding[];
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
};
