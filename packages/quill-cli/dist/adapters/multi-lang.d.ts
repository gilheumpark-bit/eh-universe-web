export interface LanguageDef {
    id: string;
    name: string;
    extensions: string[];
    treeSitterPackage: string;
    linter?: string;
    formatter?: string;
    astAnalyzer: 'tree-sitter' | 'typescript' | 'acorn' | 'babel';
}
export declare const LANGUAGE_REGISTRY: LanguageDef[];
export declare function detectLanguage(fileName: string): LanguageDef | null;
export declare function detectProjectLanguages(files: string[]): LanguageDef[];
export declare function getSupportedExtensions(): string[];
export interface TreeSitterNode {
    type: string;
    text: string;
    startLine: number;
    endLine: number;
    children: TreeSitterNode[];
}
export interface UniversalASTResult {
    language: string;
    functions: Array<{
        name: string;
        line: number;
        length: number;
        params: number;
    }>;
    imports: Array<{
        module: string;
        line: number;
    }>;
    classes: Array<{
        name: string;
        line: number;
        methods: number;
    }>;
    loops: Array<{
        type: string;
        line: number;
        depth: number;
    }>;
    findings: Array<{
        line: number;
        message: string;
        severity: string;
    }>;
}
export declare function parseWithTreeSitter(code: string, language: LanguageDef): Promise<UniversalASTResult>;
export declare function runExternalLinter(filePath: string, language: LanguageDef): Promise<Array<{
    line: number;
    message: string;
    severity: string;
}>>;
export declare function analyzeAnyLanguage(code: string, fileName: string): Promise<UniversalASTResult & {
    detected: LanguageDef | null;
}>;
export declare function getLanguageStats(): {
    total: number;
    tiers: Record<string, number>;
};
export interface LanguageRule {
    id: string;
    language: string;
    pattern: RegExp;
    message: string;
    severity: 'error' | 'warning' | 'info';
    category: string;
}
export declare function getLanguageRules(langId: string): LanguageRule[];
export declare function applyLanguageRules(code: string, langId: string): Array<{
    line: number;
    message: string;
    severity: string;
    ruleId: string;
    category: string;
}>;
export interface PolyglotReport {
    isPolyglot: boolean;
    primaryLanguage: {
        lang: LanguageDef;
        fileCount: number;
        percentage: number;
    } | null;
    languages: Array<{
        lang: LanguageDef;
        fileCount: number;
        percentage: number;
        lineCount: number;
    }>;
    crossLanguageDeps: Array<{
        from: string;
        to: string;
        type: string;
    }>;
    recommendations: string[];
    complexityScore: number;
}
export declare function detectPolyglotProject(rootPath: string): PolyglotReport;
export interface MixedFileReport {
    file: string;
    primaryLanguage: string;
    embeddedLanguages: Array<{
        language: string;
        lineStart: number;
        lineEnd: number;
        snippet: string;
    }>;
    risk: 'low' | 'medium' | 'high';
}
export declare function analyzeMixedLanguageFiles(rootPath: string): MixedFileReport[];
