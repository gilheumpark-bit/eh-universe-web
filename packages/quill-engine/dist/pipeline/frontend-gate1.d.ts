export interface FrontendGateFinding {
    type: 'missing-state' | 'dead-dom' | 'dead-form' | 'dead-link';
    element: string;
    line: number;
    message: string;
    severity: 'error' | 'warning';
}
/** 5-State 분기 누락 검사 — 데이터 패칭 컴포넌트에서만 */
export declare function scan5States(code: string, fileName?: string): FrontendGateFinding[];
/** JSX에서 인터랙티브 요소 추출 + Dead DOM 감지 */
export declare function scanDeadDOM(code: string, fileName?: string): FrontendGateFinding[];
/** Gate 1 전체 실행 */
export declare function runFrontendGate1(code: string, fileName?: string): {
    findings: FrontendGateFinding[];
    passed: boolean;
    score: number;
};
