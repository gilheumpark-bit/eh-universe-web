import type { Duplex } from 'stream';
export interface DaemonConfig {
    port: number;
    host: string;
    allowedOrigins: string[];
    maxConnections: number;
    analysisTimeout: number;
}
export interface ClientSession {
    id: string;
    socket: Duplex;
    connectedAt: number;
    lastActivity: number;
    metadata: {
        editor?: string;
        projectPath?: string;
        version?: string;
    };
}
export interface WSMessage {
    type: string;
    id?: string;
    payload?: unknown;
}
export interface AnalysisResult {
    requestId: string;
    filePath: string;
    findings: Array<{
        line: number;
        column?: number;
        endLine?: number;
        endColumn?: number;
        message: string;
        severity: 'error' | 'warning' | 'info';
        source: string;
        code?: string;
        fix?: {
            range: {
                startLine: number;
                endLine: number;
            };
            newText: string;
        };
    }>;
    score: number;
    duration: number;
}
export declare function formatFindingsForVSCode(teams: Array<{
    name: string;
    score: number;
    findings: Array<unknown>;
}>, source?: string): AnalysisResult['findings'];
export declare function startDaemon(config?: Partial<DaemonConfig>): {
    stop: () => void;
};
