export declare function storeGet(key: string): string | null;
export declare function storeSet(key: string, value: string): void;
export declare function storeDelete(key: string): void;
export declare function storeKeys(): string[];
export interface CLIFileNode {
    name: string;
    type: 'file' | 'directory';
    content?: string;
    children?: CLIFileNode[];
}
export declare function readFileTree(rootPath: string, maxDepth?: number): CLIFileNode;
export declare function cacheGet(hash: string): string | null;
export declare function cacheSet(hash: string, response: string): void;
/**
 * Write file atomically: write to temp, verify, then rename.
 * Prevents data corruption if the process crashes mid-write.
 */
export declare function atomicWriteSync(filePath: string, content: string, encoding?: BufferEncoding): void;
/**
 * Create a backup of a file before modifying it.
 * Returns the backup path, or null if backup failed.
 */
export declare function createBackup(filePath: string): string | null;
/**
 * Restore the most recent backup of a file.
 * Returns true if restore succeeded.
 */
export declare function restoreBackup(filePath: string): boolean;
/**
 * List available backups for a file.
 */
export declare function listBackups(filePath: string): Array<{
    path: string;
    timestamp: number;
    size: number;
}>;
/**
 * Read file safely, returning null on any error.
 */
export declare function safeReadFile(filePath: string, encoding?: BufferEncoding): string | null;
/**
 * Write file safely with optional backup. Returns success status.
 */
export declare function safeWriteFile(filePath: string, content: string, opts?: {
    backup?: boolean;
    atomic?: boolean;
    encoding?: BufferEncoding;
}): {
    success: boolean;
    backupPath?: string;
    error?: string;
};
/**
 * Delete file safely, returning success status.
 */
export declare function safeDeleteFile(filePath: string): boolean;
