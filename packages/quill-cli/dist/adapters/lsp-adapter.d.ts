export interface LSPDiagnostic {
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code?: string | number;
}
export interface LSPTypeInfo {
    symbol: string;
    type: string;
    nullable: boolean;
    file: string;
    line: number;
}
export interface LSPReference {
    file: string;
    line: number;
    column: number;
}
export declare function getDiagnostics(rootPath: string): LSPDiagnostic[];
export declare function getTypeInfo(filePath: string, line: number, column: number): Promise<LSPTypeInfo | null>;
export declare function findReferences(rootPath: string, symbolName: string): LSPReference[];
export declare function buildCallGraph(rootPath: string): Map<string, string[]>;
export declare function findCircularDeps(graph: Map<string, string[]>): string[][];
export declare function runFullLSPAnalysis(rootPath: string): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
    diagnostics: LSPDiagnostic[];
    circles: string[][];
}>;
