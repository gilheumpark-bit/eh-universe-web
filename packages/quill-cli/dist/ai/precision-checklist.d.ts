export interface CheckItem {
    id: string;
    category: string;
    severity: 'P0' | 'P1' | 'P2';
    question: string;
    lookFor: string;
    example?: string;
}
export declare const PRECISION_CHECKLIST: CheckItem[];
export declare function getChecklistBySeverity(severity: 'P0' | 'P1' | 'P2'): CheckItem[];
export declare function getChecklistByCategory(category: string): CheckItem[];
export declare function getChecklistStats(): {
    total: number;
    p0: number;
    p1: number;
    p2: number;
    categories: string[];
};
export declare function buildPrecisionReviewPrompt(code: string, fileName: string, mode?: 'quick' | 'full'): string;
export interface PrecisionFinding {
    id: string;
    line: number;
    message: string;
    severity: 'P0' | 'P1' | 'P2';
    fix?: string;
}
export declare function parsePrecisionResult(raw: string): PrecisionFinding[];
export declare function runPrecisionReview(code: string, fileName: string, mode?: 'quick' | 'full'): Promise<PrecisionFinding[]>;
