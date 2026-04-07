export declare function analyzeWithTypeScript(code: string, fileName?: string): Promise<{
    findings: {
        line: number;
        message: string;
        severity: string;
    }[];
    nodeCount: any;
    fnCount: number;
    maxDepth: number;
    maxFnLines: number;
}>;
export declare function analyzeWithTsMorph(code: string, fileName?: string): Promise<{
    findings: {
        line: number;
        message: string;
        severity: string;
    }[];
    functions: any;
    classes: any;
}>;
export declare function analyzeWithAcorn(code: string): Promise<{
    findings: {
        line: number;
        message: string;
        severity: string;
    }[];
}>;
export declare function analyzeWithBabel(code: string): Promise<{
    findings: {
        line: number;
        message: string;
        severity: string;
    }[];
}>;
export declare function runFullASTAnalysis(code: string, fileName?: string): Promise<{
    engines: number;
    findings: {
        engine: string;
        line: number;
        message: string;
        severity: string;
    }[];
    results: {
        engine: string;
        findings: Array<{
            line: number;
            message: string;
            severity: string;
        }>;
    }[];
}>;
export interface ASTMetrics {
    avgFunctionLength: number;
    maxFunctionLength: number;
    maxNestingDepth: number;
    totalFunctions: number;
    longFunctions: Array<{
        name: string;
        line: number;
        length: number;
    }>;
    deeplyNested: Array<{
        line: number;
        depth: number;
        context: string;
    }>;
    couplingScore: number;
    cohesionScore: number;
    imports: {
        internal: number;
        external: number;
        total: number;
    };
    exports: {
        named: number;
        default: number;
        total: number;
    };
    moduleDetails: {
        incomingRefs: string[];
        outgoingRefs: string[];
        unusedExports: string[];
    };
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}
export declare function computeASTMetrics(code: string, fileName?: string): Promise<ASTMetrics>;
export declare function analyzeModuleCoupling(rootPath: string): Promise<{
    modules: Array<{
        file: string;
        imports: number;
        importedBy: number;
        couplingScore: number;
    }>;
    mostCoupled: string[];
    leastCoupled: string[];
    avgCoupling: number;
}>;
