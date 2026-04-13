export interface Session {
    id: string;
    projectPath: string;
    projectName: string;
    createdAt: number;
    updatedAt: number;
    lastCommand: string;
    openFiles: string[];
    lastVerifyScore?: number;
    lastPlaygroundScore?: number;
    receipts: string[];
    notes?: string;
}
export declare function createSession(projectPath: string): Session;
export declare function loadSession(id: string): Session | null;
export declare function updateSession(id: string, updates: Partial<Session>): void;
export declare function deleteSession(id: string): boolean;
export declare function listSessions(): Session[];
export declare function getCurrentSession(): Session | null;
export declare function ensureSession(): Session;
export declare function recordCommand(command: string): void;
export declare function recordFile(filePath: string): void;
export declare function recordReceipt(receiptId: string): void;
export declare function recordScore(type: 'verify' | 'audit' | 'playground' | 'stress' | 'bench', score: number): void;
export declare function getSessionSummary(id?: string): string;
