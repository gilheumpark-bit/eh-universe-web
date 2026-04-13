export interface ASTFinding {
    engine: string;
    line: number;
    message: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    team: string;
    confidence: number;
}
export interface EnhancedPipelineResult {
    regexScore: number;
    astScore: number;
    combinedScore: number;
    regexFindings: number;
    astFindings: number;
    totalFindings: number;
    findings: ASTFinding[];
    engines: string[];
}
export declare function runEnhancedPipeline(code: string, language: string, fileName: string, regexResult?: {
    score: number;
    teams: Array<{
        name: string;
        score: number;
        findings: Array<{
            line: number;
            message: string;
            severity: string;
        }>;
    }>;
}): Promise<EnhancedPipelineResult>;
export declare function runASTHollowScan(code: string, fileName: string): Promise<ASTFinding[]>;
