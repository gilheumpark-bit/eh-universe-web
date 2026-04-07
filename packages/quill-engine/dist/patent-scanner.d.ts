import type { FileNode } from './types';
export interface LicenseInfo {
    file: string;
    license: string;
    spdxId: string;
    hasHeader: boolean;
    isOSS: boolean;
}
export interface CodePatternMatch {
    file: string;
    line: number;
    pattern: string;
    description: string;
    severity: 'info' | 'warning' | 'critical';
}
export interface IPReport {
    licenses: LicenseInfo[];
    patterns: CodePatternMatch[];
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
    recommendations: string[];
}
export declare function scanProject(files: FileNode[]): IPReport;
