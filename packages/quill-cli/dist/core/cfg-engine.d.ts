export interface CFGNode {
    id: string;
    type: 'entry' | 'exit' | 'statement' | 'branch' | 'loop' | 'try' | 'catch' | 'return' | 'throw' | 'call';
    line: number;
    code: string;
    edges: string[];
    variables: {
        defined: string[];
        used: string[];
        modified: string[];
    };
}
export interface CFGGraph {
    nodes: Map<string, CFGNode>;
    entry: string;
    exits: string[];
    functions: Array<{
        name: string;
        startNode: string;
        endNode: string;
        params: string[];
        returnType?: string;
    }>;
}
export interface ExecutionPath {
    nodes: CFGNode[];
    variables: Map<string, VariableState>;
    risk: 'safe' | 'nullable' | 'tainted' | 'uninitialized';
    description: string;
}
export interface VariableState {
    name: string;
    definedAt: number;
    lastModifiedAt: number;
    nullable: boolean;
    tainted: boolean;
    source?: string;
}
export declare function buildCFG(code: string, fileName: string): Promise<CFGGraph>;
export declare function findRiskPaths(graph: CFGGraph): ExecutionPath[];
export declare function sliceContext(code: string, graph: CFGGraph, riskPaths: ExecutionPath[]): string;
export declare function buildCFGReviewPrompt(fileName: string, riskPaths: ExecutionPath[], slicedContext: string, graph: CFGGraph): string;
export declare function runBrainAnalysis(code: string, fileName: string): Promise<{
    graph: CFGGraph;
    riskPaths: ExecutionPath[];
    slicedContext: string;
    prompt: string;
    stats: {
        nodes: number;
        edges: number;
        functions: number;
        risks: number;
        contextLines: number;
        reductionPercent: number;
    };
}>;
