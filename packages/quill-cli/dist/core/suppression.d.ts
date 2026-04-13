export interface Suppression {
    type: 'next-line' | 'file';
    ruleId: string;
    line: number;
}
/**
 * 코드에서 csquill-disable 주석을 파싱.
 */
export declare function parseSuppressions(code: string): Suppression[];
/**
 * .csquillignore 파일에서 glob 패턴 읽기.
 */
export declare function loadIgnorePatterns(root: string): string[];
/**
 * 파일 경로가 ignore 패턴에 매칭되는지 확인.
 * 간단한 glob: *.min.js, dist/**, src/vendor/*
 */
export declare function isIgnored(filePath: string, patterns: string[]): boolean;
/**
 * findings에서 suppressed 항목 제거.
 */
export declare function applySuppression(findings: Array<{
    ruleId?: string;
    line: number;
    message: string;
    [key: string]: unknown;
}>, suppressions: Suppression[]): {
    kept: typeof findings;
    suppressed: number;
};
