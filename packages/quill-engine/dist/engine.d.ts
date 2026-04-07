export interface Evidence {
    engine: 'typescript-ast' | 'typescript-checker' | 'esquery' | 'regex';
    detail: string;
}
export interface EngineFinding {
    ruleId: string;
    line: number;
    message: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    confidence: 'high' | 'medium' | 'low';
    evidence: Evidence[];
    explanation?: string;
}
export interface ScopeNode {
    id: string;
    kind: 'file' | 'function' | 'block' | 'class' | 'catch';
    parentId?: string;
    declared: Set<string>;
    startLine: number;
    endLine: number;
}
export interface EngineResult {
    findings: EngineFinding[];
    scopes: ScopeNode[];
    cyclomaticComplexity: number;
    nodeCount: number;
    enginesUsed: string[];
}
export declare function analyzeWithProgram(filePaths: string[], targetFile: string, code?: string): EngineResult;
export declare function analyzeWithEsquery(code: string): EngineFinding[];
export declare function runQuillEngine(code: string, fileName?: string): EngineResult;
