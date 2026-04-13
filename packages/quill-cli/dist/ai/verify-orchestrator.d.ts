import type { TeamLeadVerdict } from './team-lead';
import type { JudgeResult } from './cross-judge';
export interface OrchestratedResult {
    teams: Array<{
        name: string;
        score: number;
        findings: Array<{
            line: number;
            message: string;
            severity: string;
        }>;
    }>;
    overallScore: number;
    overallStatus: string;
    aiVerified: boolean;
    teamLeadVerdict?: TeamLeadVerdict;
    judgeResult?: JudgeResult;
    falsePositivesRemoved: number;
}
export declare function orchestrateVerify(code: string, staticResult: {
    teams: Array<{
        name: string;
        score: number;
        findings: Array<string | {
            line?: number;
            message: string;
            severity?: string;
        }>;
    }>;
    overallScore?: number;
    overallStatus?: string;
}, filePath: string): Promise<OrchestratedResult>;
