export interface PatentPattern {
    id: string;
    name: string;
    description: string;
    keywords: string[];
    alternative: string;
    severity: 'block' | 'warn';
    expired?: boolean;
}
export declare const PATENT_PATTERNS: PatentPattern[];
export interface PatentCheckResult {
    safe: boolean;
    warnings: PatentPattern[];
    blocks: PatentPattern[];
    directive: string;
}
export declare function checkPatentPatterns(prompt: string): PatentCheckResult;
