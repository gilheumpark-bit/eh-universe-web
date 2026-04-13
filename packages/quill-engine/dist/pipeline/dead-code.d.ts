import type { FileNode } from '../types';
export type DeadCodeKind = 'unused-export' | 'unreachable' | 'unused-variable' | 'unused-import' | 'empty-block';
export interface DeadCodeFinding {
    kind: DeadCodeKind;
    filePath: string;
    fileId: string;
    line: number;
    symbol: string;
    message: string;
    severity: 'warning' | 'info';
}
/** Scan file tree for all dead code findings */
export declare function scanDeadCode(nodes: FileNode[], prefix?: string): DeadCodeFinding[];
