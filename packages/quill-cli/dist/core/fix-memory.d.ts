export interface FixPattern {
    id: string;
    category: string;
    description: string;
    beforePattern: string;
    afterPattern: string;
    confidence: number;
    appliedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    lastApplied: number;
    projectId?: string;
}
export interface FixMemoryDB {
    version: 1;
    patterns: FixPattern[];
}
export declare function recordFix(pattern: Omit<FixPattern, 'id' | 'appliedCount' | 'acceptedCount' | 'rejectedCount' | 'lastApplied'>): void;
export declare function recordAcceptance(patternId: string, accepted: boolean): void;
export declare function findSimilarFixes(description: string, category?: string): FixPattern[];
export declare function getTopPatterns(limit?: number): FixPattern[];
export declare function getStats(): {
    total: number;
    avgConfidence: number;
    topCategories: Array<{
        category: string;
        count: number;
    }>;
};
