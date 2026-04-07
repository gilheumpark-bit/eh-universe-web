import type { GoodSignal, IsoQuality } from '../good-pattern-catalog';
export interface DetectedGoodPattern {
    id: string;
    title: string;
    quality: IsoQuality;
    signal: GoodSignal;
    count: number;
    lines: number[];
    suppresses?: string[];
}
export interface GoodPatternReport {
    patterns: DetectedGoodPattern[];
    totalDetected: number;
    boostCount: number;
    suppressCount: number;
    scoreBonus: number;
    suppressedRules: string[];
}
/**
 * 코드에서 양품 패턴을 탐지한다.
 * 가벼운 regex 기반 — AST 불필요, 즉시 실행 가능.
 */
export declare function detectGoodPatterns(code: string): GoodPatternReport;
/**
 * 파이프라인 finding을 양품 패턴으로 필터링한다.
 * suppress-fp 또는 boost 시그널을 가진 양품 패턴이 탐지되면
 * 해당 불량 ruleId와 매칭되는 finding의 severity를 다운그레이드한다.
 *
 * @returns 필터링된 findings (원본 배열 비변경)
 */
export declare function suppressFindings<T extends {
    message: string;
    rule?: string;
}>(findings: T[], report: GoodPatternReport): T[];
/**
 * severity를 다운그레이드 (error→warning, warning→info)
 * 완전 제거가 아닌 경감 처리용.
 */
export declare function downgradeFindings<T extends {
    severity: string;
    rule?: string;
}>(findings: T[], report: GoodPatternReport): T[];
