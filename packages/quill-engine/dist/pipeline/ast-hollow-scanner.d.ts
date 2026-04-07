export interface HollowCodeFinding {
    type: 'empty-function' | 'unused-param' | 'dummy-return' | 'noop-catch' | 'dead-export' | 'stub-implementation';
    file: string;
    line: number;
    name: string;
    message: string;
    severity: 'error' | 'warning';
}
/** 코드에서 빈깡통 패턴 감지 */
export declare function scanForHollowCode(code: string, fileName?: string): HollowCodeFinding[];
/** 여러 파일을 스캔하고 결과 합산 */
export declare function scanProjectForHollowCode(files: Array<{
    path: string;
    content: string;
}>): {
    findings: HollowCodeFinding[];
    score: number;
    grade: string;
};
