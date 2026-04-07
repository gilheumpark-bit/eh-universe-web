export interface ReferencePattern {
    id: string;
    category: string;
    name: string;
    description: string;
    framework: string;
    language: string;
    tags: string[];
    sources: Array<{
        ai: string;
        code: string;
        score?: number;
    }>;
    mergedPattern: string;
    bestPractices: string[];
    antiPatterns: string[];
    createdAt: number;
    usedCount: number;
}
export interface ReferenceDB {
    version: 1;
    patterns: ReferencePattern[];
}
export declare const CATEGORIES: readonly ["auth", "crud", "api", "ui-component", "state", "file", "payment", "email", "search", "websocket", "testing", "middleware", "database", "cache", "validation"];
export type ReferenceCategory = typeof CATEGORIES[number];
export declare function loadAllPatterns(): ReferencePattern[];
export declare function addPattern(pattern: Omit<ReferencePattern, 'id' | 'createdAt' | 'usedCount'>): ReferencePattern;
export declare function removePattern(category: string, patternId: string): boolean;
export declare function recordUsage(category: string, patternId: string): void;
export declare function searchPatterns(query: string, framework?: string, limit?: number): ReferencePattern[];
export declare function buildReferencePrompt(patterns: ReferencePattern[]): string;
export declare const SEED_PATTERNS: Array<Omit<ReferencePattern, 'id' | 'createdAt' | 'usedCount'>>;
export declare function seedDB(): number;
export declare function getRefStats(): {
    total: number;
    byCategory: Record<string, number>;
    topUsed: ReferencePattern[];
};
export declare function loadExternalReferences(basePath: string): {
    loaded: number;
    skipped: number;
};
