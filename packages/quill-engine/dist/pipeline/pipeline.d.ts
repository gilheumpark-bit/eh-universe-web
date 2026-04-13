import { type GoodPatternReport } from './good-pattern-detector';
export interface PipelineStage {
    name: string;
    status: 'pass' | 'warn' | 'fail' | 'running' | 'pending';
    score: number;
    message: string;
    findings: string[];
}
export interface PipelineResult {
    stages: PipelineStage[];
    overallScore: number;
    overallStatus: 'pass' | 'warn' | 'fail';
    timestamp: number;
    /** 양품 패턴 탐지 결과 (good-pattern-catalog 기반) */
    goodPatterns?: GoodPatternReport;
}
/** Structured finding for precise line-level reporting */
export interface PipelineFinding {
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    source: 'regex' | 'ast';
}
/**
 * Synchronous pipeline runner (original behavior, no AST).
 * Use this when AST analysis is not needed or in sync contexts.
 */
export declare function runStaticPipeline(code: string, language: string, filePath?: string): PipelineResult;
/**
 * Async pipeline runner with AST analysis merged.
 * Falls back to regex-only if AST is unavailable.
 * @param fileName - e.g. "index.tsx", used for AST scriptKind detection
 */
export declare function runStaticPipelineWithAST(code: string, language: string, fileName?: string): Promise<PipelineResult>;
export interface AIReviewRequest {
    code: string;
    language: string;
    context?: string;
    reviewFocus?: ('security' | 'performance' | 'readability' | 'architecture')[];
}
export interface AIReviewComment {
    line: number;
    severity: 'critical' | 'warning' | 'suggestion';
    category: string;
    message: string;
    suggestedFix?: string;
}
export interface AIReviewResult {
    comments: AIReviewComment[];
    summary: string;
    score: number;
    reviewerId: string;
    timestamp: number;
}
/**
 * Multi-AI 리뷰를 위한 프롬프트 생성.
 * 실제 AI 호출은 호출 측(CodeStudioShell 등)에서 streamChat으로 수행.
 */
export declare function buildReviewPrompt(req: AIReviewRequest): string;
/**
 * AI 리뷰 응답 파싱. JSON 파싱 실패 시 빈 결과 반환.
 */
export declare function parseReviewResponse(raw: string, reviewerId: string): AIReviewResult;
import { type TeamResult as FullTeamResult } from './pipeline-teams';
export type { FullTeamResult };
export interface FullPipelineCallbacks {
    onTeamStart?: (stage: string) => void;
    onTeamComplete?: (result: FullTeamResult) => void;
    signal?: AbortSignal;
}
export interface FullPipelineResult {
    id: string;
    timestamp: number;
    overallStatus: 'pass' | 'warn' | 'fail';
    overallScore: number;
    stages: FullTeamResult[];
    /** 양품 패턴 탐지 결과 (good-pattern-catalog 기반) */
    goodPatterns?: GoodPatternReport;
}
/**
 * Run all 8 new teams: parallel for non-blocking, sequential for blocking.
 * Supports abort via signal and progress callbacks.
 */
export declare function runFullPipeline(code: string, language: string, fileName: string, callbacks?: FullPipelineCallbacks): Promise<FullPipelineResult>;
