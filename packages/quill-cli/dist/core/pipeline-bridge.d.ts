export type FindingLevel = 'hard-fail' | 'review-required' | 'style-note';
export interface Finding {
    ruleId: string;
    line: number;
    level: FindingLevel;
    confidence: 'high' | 'medium' | 'low';
    message: string;
}
/** 팀 레이어 내부 finding — severity로 점수 계산 후 verdict Finding으로 변환 */
export interface TeamRawFinding {
    line: number;
    message: string;
    severity?: 'error' | 'warning' | 'info' | 'critical';
    ruleId?: string;
    confidence?: string;
    [key: string]: unknown;
}
export interface TeamPipelineChunk {
    name: string;
    score: number;
    findings: TeamRawFinding[];
}
export interface PipelineResult {
    verdict: 'pass' | 'review' | 'fail';
    teams: Array<{
        name: string;
        findings: Finding[];
    }>;
    summary: {
        hardFail: number;
        reviewRequired: number;
        styleNote: number;
    };
    score: number;
}
export declare function runStaticPipeline(code: string, language: string): Promise<PipelineResult>;
export declare function scanForHollowCode(code: string, fileName?: string): Promise<{
    name: string;
    score: number;
    findings: TeamRawFinding[];
    fileName: string;
}>;
export declare function scanDeadCode(code: string, _language?: string): Promise<TeamPipelineChunk>;
export declare function runDesignLint(code: string): Promise<TeamPipelineChunk>;
export declare function analyzeCognitiveLoad(code: string): Promise<TeamPipelineChunk>;
export declare function findBugsStatic(code: string, language?: string): Promise<TeamPipelineChunk>;
export declare function runVerificationLoop(code: string, language: string, maxRounds?: number): Promise<{
    finalScore: number;
    rounds: number;
    result: PipelineResult;
}>;
export interface AuditArea {
    name: string;
    score: number;
    findings: string[];
    category: 'structure' | 'quality' | 'security' | 'performance';
}
export interface AuditReport {
    areas: AuditArea[];
    totalScore: number;
    hardGateFail: boolean;
    urgent: string[];
}
export declare function runProjectAudit(rootPath: string, _onProgress?: (area: string, index: number, total: number) => void): Promise<AuditReport>;
export declare function formatAuditReport(report: AuditReport, _lang?: string): string;
export interface StressScenario {
    name: string;
    description: string;
    metrics: {
        users: number;
        duration: number;
        rampUp: number;
    };
}
export declare function getScenarios(): StressScenario[];
export declare function analyzeStress(code: string, _scenario: string): Promise<{
    score: number;
    risks: Array<{
        type: string;
        severity: string;
        detail: string;
    }>;
    recommendations: string[];
}>;
export declare function scanProject(rootPath: string): Promise<{
    findings: Array<{
        file: string;
        pattern: string;
        severity: string;
    }>;
    score: number;
}>;
