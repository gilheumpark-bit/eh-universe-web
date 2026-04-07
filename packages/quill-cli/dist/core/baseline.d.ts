export interface BaselineEntry {
    ruleId: string;
    file: string;
    line: number;
    snippetHash: string;
    message: string;
    frozenAt: string;
}
export interface BaselineData {
    version: 1;
    createdAt: string;
    updatedAt: string;
    entries: BaselineEntry[];
}
/**
 * finding 주변 ±2줄의 코드를 해시.
 * 라인 번호가 바뀌어도 코드가 같으면 매칭됨.
 */
export declare function computeSnippetHash(code: string, line: number): string;
export declare function loadBaseline(root: string): BaselineData | null;
export declare function saveBaseline(root: string, data: BaselineData): void;
export declare function initBaseline(root: string, findings: Array<{
    ruleId?: string;
    file: string;
    line: number;
    message: string;
}>, codeMap: Map<string, string>): BaselineData;
export declare function filterByBaseline(baseline: BaselineData, findings: Array<{
    ruleId?: string;
    file: string;
    line: number;
    message: string;
}>, codeMap: Map<string, string>): {
    kept: typeof findings;
    suppressed: number;
};
