export type DiffGuardSeverity = 'critical' | 'major' | 'minor';
export interface DiffGuardFinding {
    rule: 'SCOPE_MARKER_MISMATCH' | 'SCOPE_NESTED_UNSUPPORTED' | 'SCOPE_OUT_OF_BOUNDS' | 'BLOCK_META_TAMPER' | 'BLOCK_ID_DUPLICATE' | 'CONTRACT_PUBLIC_SURFACE_CHANGED' | 'CONTRACT_BLOCK_MISSING' | 'CONTRACT_PARSE_SKIPPED';
    severity: DiffGuardSeverity;
    message: string;
    /** 1-based line number (best-effort) */
    line?: number;
}
export interface DiffGuardPolicy {
    mode: 'soft' | 'hard';
}
export interface DiffGuardInput {
    original: string;
    modified: string;
    fileName: string;
    language?: string;
    policy?: DiffGuardPolicy;
}
export interface DiffGuardResult {
    status: 'pass' | 'fail';
    findings: DiffGuardFinding[];
}
export declare function runDiffGuard(input: DiffGuardInput): DiffGuardResult;
