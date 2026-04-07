export interface ConflictInfo {
    file: string;
    conflicts: Array<{
        startLine: number;
        ours: string;
        theirs: string;
        endLine: number;
    }>;
}
export declare function detectConflicts(rootPath: string): ConflictInfo[];
export interface ResolveStrategy {
    type: 'ours' | 'theirs' | 'both' | 'ai';
}
export declare function resolveConflictRule(conflict: ConflictInfo['conflicts'][0], strategy: ResolveStrategy['type']): string;
export declare function resolveConflictWithAI(conflict: ConflictInfo['conflicts'][0], context: string): Promise<string>;
export declare function applyConflictResolutions(rootPath: string, file: string, resolutions: Map<number, string>): boolean;
export declare function generateCommitMessage(rootPath: string): string;
export declare function suggestBranchName(description: string): string;
export declare function getStaleLocalBranches(rootPath: string, daysSince?: number): string[];
export declare function getRepoHealth(rootPath: string): {
    totalCommits: number;
    contributors: number;
    staleBranches: number;
    uncommittedChanges: number;
    lastCommitAge: string;
};
export declare function getCommitFrequency(rootPath: string, days?: number): {
    daily: Array<{
        date: string;
        count: number;
    }>;
    weeklyAvg: number;
    busiestDay: string;
    quietestDay: string;
    totalCommits: number;
    activeDays: number;
};
export declare function getHotFiles(rootPath: string, days?: number, limit?: number): Array<{
    file: string;
    commits: number;
    authors: number;
    lastChanged: string;
    churnScore: number;
}>;
export declare function getContributorStats(rootPath: string, days?: number): Array<{
    author: string;
    commits: number;
    additions: number;
    deletions: number;
    filesChanged: number;
    firstCommit: string;
    lastCommit: string;
    activeDays: number;
}>;
export declare function getBranchAgeWarnings(rootPath: string): Array<{
    branch: string;
    ageInDays: number;
    lastCommitDate: string;
    lastAuthor: string;
    aheadBehind: string;
    severity: 'info' | 'warning' | 'error';
}>;
