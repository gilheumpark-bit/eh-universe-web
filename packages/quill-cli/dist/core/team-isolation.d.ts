export interface TeamVerdict {
    name: string;
    verdict: 'pass' | 'review' | 'fail' | 'bail-out';
    hardFail: number;
    review: number;
    note: number;
    total: number;
    isolated: boolean;
}
export interface IsolatedResult {
    teamVerdicts: TeamVerdict[];
    overallVerdict: 'pass' | 'review' | 'fail';
    activeTeams: number;
    isolatedTeams: number;
}
export declare function computeTeamVerdict(teamName: string, findings: Array<{
    severity: string;
    message: string;
}>): TeamVerdict;
/**
 * 팀별 verdict를 합성하되, bail-out 팀은 최종 판정에서 제외.
 * "한 팀의 폭발이 전체를 무너뜨리지 않는다."
 */
export declare function aggregateIsolated(teamVerdicts: TeamVerdict[]): IsolatedResult;
