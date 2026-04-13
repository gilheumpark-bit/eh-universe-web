export interface DesignTokenFinding {
    type: 'inline-style' | 'hardcoded-px' | 'hardcoded-color' | 'raw-css' | 'magic-number';
    line: number;
    value: string;
    message: string;
    severity: 'error' | 'warning';
}
/** 디자인 토큰 린트 */
export declare function scanDesignTokens(code: string, fileName?: string): DesignTokenFinding[];
/** Gate 2 전체 실행 */
export declare function runFrontendGate2(code: string, fileName?: string): {
    findings: DesignTokenFinding[];
    passed: boolean;
    score: number;
};
