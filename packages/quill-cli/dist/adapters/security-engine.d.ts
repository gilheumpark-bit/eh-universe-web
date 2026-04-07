export declare function runNpmAudit(rootPath: string): Promise<{
    vulnerabilities: any;
    total: any;
    critical: any;
    high: any;
}>;
export declare function runLockfileLint(rootPath: string): Promise<{
    passed: boolean;
    issues: any;
    detail: any;
}>;
export declare function runRetireJS(rootPath: string): Promise<{
    vulnerableCount: number;
    findings: {
        component: any;
        version: any;
        severity: any;
    }[];
}>;
export declare function runSnyk(rootPath: string): Promise<{
    ok: any;
    vulnerabilities: any;
    critical: any;
}>;
export declare function runFullSecurityAnalysis(rootPath: string): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
}>;
export declare function runNpmAuditDetailed(rootPath: string): Promise<{
    advisories: Array<{
        name: string;
        severity: string;
        title: string;
        url: string;
        range: string;
        fixAvailable: boolean;
    }>;
    fixCommand: string;
    autoFixable: number;
    total: number;
}>;
export declare function scanForVulnPatterns(code: string, fileName?: string): Array<{
    line: number;
    ruleId: string;
    name: string;
    severity: string;
    message: string;
    cwe: string;
    fix: string;
}>;
export declare function scanForSecrets(code: string, fileName?: string): Array<{
    line: number;
    ruleId: string;
    name: string;
    severity: string;
    preview: string;
}>;
export declare function scanProjectForSecrets(rootPath: string): Promise<{
    findings: Array<{
        file: string;
        line: number;
        ruleId: string;
        name: string;
        severity: string;
        preview: string;
    }>;
    filesScanned: number;
    totalSecrets: number;
    criticalCount: number;
    score: number;
}>;
export declare function runEnhancedSecurityAnalysis(rootPath: string): Promise<{
    engines: number;
    results: {
        engine: string;
        score: number;
        detail: string;
    }[];
    avgScore: number;
}>;
