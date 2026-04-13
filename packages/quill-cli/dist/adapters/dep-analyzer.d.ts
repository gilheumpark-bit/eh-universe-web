export declare function runDepcheck(rootPath: string): Promise<{
    unused: any;
    unusedDev: any;
    missing: string[];
    score: number;
    engine: string;
}>;
export declare function runKnip(rootPath: string): Promise<{
    unusedFiles: any;
    unusedExports: any;
    unusedTypes: any;
    total: any;
    details: {
        files: any;
        exports: any;
        types: any;
    };
    score: number;
    engine: string;
}>;
export declare function runDependencyCruiser(rootPath: string): Promise<{
    totalModules: any;
    violations: any;
    circular: any;
    orphans: any;
    details: any;
    score: number;
    engine: string;
}>;
export declare function runPublint(rootPath: string): Promise<{
    errors: any;
    warnings: any;
    messages: any;
    score: number;
    engine: string;
}>;
export declare function runAttw(rootPath: string): Promise<{
    problemCount: any;
    problems: any;
    score: number;
    engine: string;
}>;
export declare function runOxlint(rootPath: string): Promise<{
    findings: {
        file: string;
        line: number;
        message: string;
        severity: string;
    }[];
    total: number;
    errors: number;
    score: number;
    engine: string;
}>;
export declare function detectCodemodOpportunities(rootPath: string): Promise<{
    opportunities: {
        from: string;
        to: string;
        description: string;
        command: string;
    }[];
    engine: string;
}>;
export declare function detectCircularDeps(rootPath: string): Promise<{
    totalModules: number;
    cycles: string[][];
    cycleCount: number;
    score: number;
    engine: string;
}>;
export declare function detectVersionMismatches(rootPath: string): Promise<{
    mismatches: {
        pkg: string;
        declared: string;
        locked: string;
        severity: string;
    }[];
    warnings: string[];
    score: number;
    engine: string;
}>;
export declare function detectUnusedDepsLocal(rootPath: string): Promise<{
    unused: {
        name: string;
        type: "prod" | "dev";
    }[];
    phantomDeps: string[];
    score: number;
    engine: string;
}>;
export declare function runFullDepAnalysis(rootPath: string): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
}>;
