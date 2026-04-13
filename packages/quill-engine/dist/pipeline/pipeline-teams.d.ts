export type TeamStatus = 'pending' | 'running' | 'pass' | 'warn' | 'fail';
export type Severity = 'critical' | 'major' | 'minor' | 'info';
export interface Finding {
    severity: Severity;
    message: string;
    line?: number;
    rule?: string;
}
export interface TeamResult {
    stage: string;
    status: TeamStatus;
    score: number;
    findings: Finding[];
    metrics?: Record<string, number>;
}
export declare function runTeam1Simulation(code: string, _language: string, _fileName: string): TeamResult;
export declare function runTeam2Generation(code: string, _language: string, _fileName: string): TeamResult;
export declare function runTeam3Validation(code: string, _language: string, _fileName: string): TeamResult;
export declare function runTeam4SizeDensity(code: string, _language: string, _fileName: string): TeamResult;
export declare function runTeam5AssetTrace(code: string, _language: string, _fileName: string): TeamResult;
export declare function runTeam6Stability(code: string, _language: string, _fileName: string): TeamResult;
export declare function runTeam7ReleaseIP(code: string, _language: string, _fileName: string): TeamResult;
export declare function runTeam8Governance(code: string, _language: string, _fileName: string): TeamResult;
/**
 * TeamResult의 findings에 scope policy를 적용.
 * suppress 규칙의 finding 제거, warn 규칙은 severity 다운그레이드.
 * 파이프라인 최종 결과 반환 전 호출.
 */
export declare function filterTeamResultByScope(result: TeamResult, filePath: string): TeamResult;
