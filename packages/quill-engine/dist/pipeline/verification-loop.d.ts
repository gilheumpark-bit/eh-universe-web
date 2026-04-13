import type { FileNode } from '../types';
import { type SafeFixCategory } from '../autofix-policy';
export type { SafeFixCategory } from '../autofix-policy';
export interface VerificationConfig {
    maxIterations: number;
    passThreshold: number;
    enableStress: boolean;
    enableChaos: boolean;
    enableIP: boolean;
    safeFixCategories: SafeFixCategory[];
}
export interface VerificationIteration {
    round: number;
    pipelineScore: number;
    pipelineStatus: 'pass' | 'warn' | 'fail';
    bugCount: number;
    criticalBugCount: number;
    fixesApplied: number;
    fixesSkipped: number;
    stressScore?: number;
    stressGrade?: string;
    chaosScore?: number;
    chaosGrade?: string;
    ipScore?: number;
    ipGrade?: string;
    designLintScore?: number;
    designLintPassed?: boolean;
    designLintSummary?: string;
    combinedScore: number;
    status: 'pass' | 'warn' | 'fail';
}
export type StopReason = 'passed' | 'max-iterations' | 'no-progress' | 'no-fixes' | 'hard-gate-fail';
export interface VerificationResult {
    iterations: VerificationIteration[];
    finalScore: number;
    finalStatus: 'pass' | 'warn' | 'fail';
    stopReason: StopReason;
    totalFixesApplied: number;
    hardGateFailures: string[];
    finalCode: string;
    originalCode: string;
    scoreDelta: number;
}
export declare function runVerificationLoop(code: string, language: string, fileName: string, files: FileNode[], config?: Partial<VerificationConfig>, onProgress?: (iteration: VerificationIteration) => void): Promise<VerificationResult>;
