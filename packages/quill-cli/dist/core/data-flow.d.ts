export interface FlowNode {
    file: string;
    line: number;
    variable: string;
    type: 'declaration' | 'assignment' | 'access' | 'guard' | 'return';
    nullable: boolean;
    guarded: boolean;
    source?: string;
}
export interface FlowChain {
    variable: string;
    nodes: FlowNode[];
    safe: boolean;
    vulnerability?: string;
}
export interface DataFlowResult {
    chains: FlowChain[];
    findings: Array<{
        file: string;
        line: number;
        message: string;
        severity: 'error' | 'warning';
        chain: string;
    }>;
}
export declare function trackNullFlow(code: string, fileName: string): Promise<DataFlowResult>;
export declare function trackCrossFileFlow(rootPath: string): Promise<DataFlowResult>;
export declare function trackTaintFlow(code: string, fileName: string): Promise<DataFlowResult>;
export declare function runFullDataFlowAnalysis(code: string, fileName: string, rootPath: string): Promise<{
    nullFlow: DataFlowResult;
    crossFile: DataFlowResult;
    taint: DataFlowResult;
    totalFindings: number;
    score: number;
}>;
