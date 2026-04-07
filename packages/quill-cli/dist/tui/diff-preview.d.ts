interface DiffLine {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: number;
}
export declare function computeDiff(original: string, modified: string): DiffLine[];
export declare function formatDiff(diff: DiffLine[], contextLines?: number): string;
export declare function printDiffSummary(diff: DiffLine[]): string;
export {};
