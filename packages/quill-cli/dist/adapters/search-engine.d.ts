export interface SearchResult {
    file: string;
    line: number;
    column: number;
    content: string;
    matchLength: number;
    contextBefore?: string[];
    contextAfter?: string[];
    relevanceScore?: number;
}
export declare function ripgrepSearch(query: string, rootPath: string, opts?: {
    glob?: string;
    maxResults?: number;
    caseSensitive?: boolean;
    regex?: boolean;
    contextLines?: number;
}): SearchResult[];
export interface FuzzyResult {
    file: string;
    score: number;
}
export declare function fuzzyFileSearch(query: string, rootPath: string, maxResults?: number): FuzzyResult[];
export interface SymbolResult {
    name: string;
    type: 'function' | 'class' | 'variable' | 'type' | 'interface';
    file: string;
    line: number;
}
export declare function symbolSearch(query: string, rootPath: string, maxResults?: number): SymbolResult[];
export interface SearchResultWithContext extends SearchResult {
    contextDisplay: string;
}
export declare function getResultWithContext(result: SearchResult, rootPath: string, contextLines?: number): SearchResultWithContext;
export declare function runFullSearch(query: string, rootPath: string, opts?: {
    mode?: 'code' | 'file' | 'symbol' | 'all';
    maxResults?: number;
    contextLines?: number;
}): {
    code?: SearchResult[];
    files?: FuzzyResult[];
    symbols?: SymbolResult[];
    totalResults: number;
    bestMatch?: SearchResultWithContext;
};
