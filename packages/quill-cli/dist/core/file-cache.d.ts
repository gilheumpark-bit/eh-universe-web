export interface CachedFile {
    path: string;
    relativePath: string;
    content: string;
    language: string;
}
export declare function getCachedFiles(rootPath: string, ttl?: number): CachedFile[] | null;
export declare function setCachedFiles(rootPath: string, files: CachedFile[]): void;
export declare function invalidateCache(rootPath?: string): void;
export declare function getCacheStats(): {
    entries: number;
    totalSizeMB: number;
    keys: string[];
};
export declare function watchAndInvalidate(rootPath: string): void;
export declare function unwatchPath(rootPath: string): void;
export declare function unwatchAll(): void;
export declare function getOrScanFiles(rootPath: string, scanner: (root: string) => Promise<CachedFile[]>, opts?: {
    ttl?: number;
    autoWatch?: boolean;
}): Promise<CachedFile[]>;
