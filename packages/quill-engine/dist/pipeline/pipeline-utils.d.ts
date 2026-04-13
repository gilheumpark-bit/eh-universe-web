import type { Finding, TeamResult } from './pipeline-teams';
export interface PipelineCustomConfig {
    enabledTeams: string[];
    teamWeights: Record<string, number>;
    passThreshold: number;
    warnThreshold: number;
    blockingTeams: string[];
}
export declare function getDefaultPipelineConfig(): PipelineCustomConfig;
export declare function loadPipelineConfig(): PipelineCustomConfig;
export declare function savePipelineConfig(config: PipelineCustomConfig): void;
export declare function calculateWeightedScore(stages: Array<{
    team: string;
    score: number;
}>, config: PipelineCustomConfig): number;
export declare function getStatusFromScore(score: number, config: PipelineCustomConfig): 'pass' | 'warn' | 'fail';
export declare function hasBlockingFailure(stages: Array<{
    team: string;
    status: string;
}>, config: PipelineCustomConfig): boolean;
export interface FixSuggestion {
    id: string;
    finding: Finding;
    description: string;
    file: string;
    line: number;
    originalCode: string;
    fixedCode: string;
    confidence: number;
    safeToAutoApply: boolean;
}
export declare function generateFix(finding: Finding & {
    file?: string;
}, fileContent?: string): FixSuggestion | null;
export declare function generateFixes(findings: Array<Finding & {
    file?: string;
}>, fileContents: Map<string, string>): FixSuggestion[];
export interface PipelineReport {
    id: string;
    timestamp: number;
    stages: TeamResult[];
    overallScore: number;
    overallStatus: string;
    markdown: string;
    summary: string;
}
export declare function generateReport(stages: TeamResult[], timestamp: number): PipelineReport;
export declare function getReportHistory(): PipelineReport[];
export declare function saveReport(report: PipelineReport): void;
export declare function getCached<T>(key: string): T | null;
export declare function setCached<T>(key: string, data: T, ttlMs?: number): void;
export declare function clearPipelineCache(): void;
export interface ChecklistItem {
    id: string;
    category: string;
    description: string;
    weight: number;
}
export interface ReviewChecklist {
    role: string;
    items: ChecklistItem[];
    passThreshold: number;
}
export declare function getReviewChecklist(role?: string): ReviewChecklist;
export interface RunComparison {
    overallDelta: number;
    stageDiffs: Array<{
        stage: string;
        scoreBefore: number;
        scoreAfter: number;
        delta: number;
    }>;
    newFindings: number;
    resolvedFindings: number;
    summary: string;
}
export declare function compareRuns(runA: {
    overallScore: number;
    stages: TeamResult[];
}, runB: {
    overallScore: number;
    stages: TeamResult[];
}): RunComparison;
export interface BeaconEvent {
    type: 'pipeline_run' | 'fix_applied' | 'review_complete';
    timestamp: number;
    data: Record<string, unknown>;
}
export declare function recordBeacon(event: BeaconEvent): void;
export declare function getBeaconHistory(): BeaconEvent[];
export declare function computeEntropy(code: string): number;
