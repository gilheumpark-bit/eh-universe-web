export interface DeprecationRule {
    framework: string;
    minVersion: string;
    pattern: RegExp;
    message: string;
    replacement: string;
    severity: 'error' | 'warning';
}
export interface DeprecationFinding {
    file: string;
    line: number;
    rule: DeprecationRule;
}
export declare function checkDeprecations(code: string, fileName: string, rootPath: string): DeprecationFinding[];
export declare function formatDeprecationReport(findings: DeprecationFinding[]): string;
