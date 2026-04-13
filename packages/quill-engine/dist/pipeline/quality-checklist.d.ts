export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
export type CheckTier = 'basic' | 'precision';
export type CheckDomain = 'safety' | 'performance' | 'reliability' | 'maintainability' | 'security';
export interface CheckItem {
    id: string;
    tier: CheckTier;
    domain: CheckDomain;
    label: {
        ko: string;
        en: string;
    };
    description: {
        ko: string;
        en: string;
    };
    status: CheckStatus;
    detail?: string;
    line?: number;
    metric?: number;
    threshold?: number;
    autoFixable: boolean;
}
export interface ChecklistReport {
    timestamp: number;
    fileName: string;
    totalChecks: number;
    passed: number;
    warned: number;
    failed: number;
    skipped: number;
    score: number;
    tier1: CheckItem[];
    tier2: CheckItem[];
    summary: {
        ko: string;
        en: string;
    };
}
export declare function runTier1(code: string, fileName: string): CheckItem[];
export declare function selectPrecisionTargets(tier1: CheckItem[]): CheckDomain[];
/** 정밀 타격용 AI 프롬프트 생성 — 실패 영역만 집중 분석 요청 */
export declare function buildPrecisionPrompt(code: string, fileName: string, tier1: CheckItem[], targets: CheckDomain[]): string;
export declare function generateChecklistReport(fileName: string, tier1: CheckItem[], tier2?: CheckItem[]): ChecklistReport;
