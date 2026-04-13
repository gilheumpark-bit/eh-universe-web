export type ErrorSource = 'typescript' | 'eslint' | 'runtime' | 'build' | 'unknown';
export type ErrorSeverity = 'error' | 'warning' | 'info';
export interface ParsedError {
    source: ErrorSource;
    severity: ErrorSeverity;
    file: string;
    line: number;
    column: number;
    code: string;
    message: string;
    raw: string;
}
/** Auto-detect error source and parse */
export declare function parseErrors(output: string): ParsedError[];
/** Parse with explicit source hint */
export declare function parseErrorsWithSource(output: string, source: ErrorSource): ParsedError[];
/** Group errors by file */
export declare function groupErrorsByFile(errors: ParsedError[]): Map<string, ParsedError[]>;
/** Get error/warning counts */
export declare function errorSummary(errors: ParsedError[]): {
    errors: number;
    warnings: number;
    info: number;
};
