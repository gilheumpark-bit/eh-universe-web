export declare function isGitRepo(rootPath: string): boolean;
export declare function getCurrentBranch(rootPath: string): string;
export declare function getLastCommit(rootPath: string): {
    hash: string;
    message: string;
    author: string;
    date: string;
} | null;
export declare function getStatus(rootPath: string): {
    modified: string[];
    untracked: string[];
    staged: string[];
};
export interface BlameLine {
    hash: string;
    author: string;
    date: string;
    line: number;
    content: string;
}
export declare function blame(rootPath: string, filePath: string): BlameLine[];
export declare function diff(rootPath: string, ref?: string): string;
export declare function diffStat(rootPath: string, ref?: string): Array<{
    file: string;
    added: number;
    removed: number;
}>;
export declare function autoStash(rootPath: string, message?: string): boolean;
export declare function autoStashPop(rootPath: string): boolean;
export declare function autoCommit(rootPath: string, files: string[], message: string): boolean;
export declare function autoBranch(rootPath: string, branchName: string): boolean;
export declare function getRecentHistory(rootPath: string, limit?: number): Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    files: number;
}>;
export declare function getFileHotspots(rootPath: string, limit?: number): Array<{
    file: string;
    commits: number;
}>;
export declare function analyzeBugProneFiles(rootPath: string, limit?: number): Array<{
    file: string;
    bugFixCommits: number;
    totalCommits: number;
    bugRatio: number;
    topAuthors: Array<{
        author: string;
        fixes: number;
    }>;
    riskScore: number;
}>;
export declare function getCodeChurn(rootPath: string, days?: number): {
    totalAdditions: number;
    totalDeletions: number;
    churnRatio: number;
    fileChurn: Array<{
        file: string;
        added: number;
        deleted: number;
        churn: number;
        commits: number;
    }>;
    highChurnFiles: number;
    avgChurnPerCommit: number;
};
export declare function getComplexityTrends(rootPath: string, filePath: string, sampleCount?: number): Array<{
    commitHash: string;
    date: string;
    author: string;
    lineCount: number;
    functionCount: number;
    maxNesting: number;
    complexity: number;
}>;
export declare function runFullGitDeepAnalysis(rootPath: string): {
    bugProneFiles: ReturnType<typeof analyzeBugProneFiles>;
    codeChurn: ReturnType<typeof getCodeChurn>;
    hotspots: ReturnType<typeof getFileHotspots>;
    recentHistory: ReturnType<typeof getRecentHistory>;
    score: number;
};
