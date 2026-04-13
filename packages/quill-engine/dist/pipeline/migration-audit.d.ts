/**
 * MigrationAudit: 코드 마이그레이션 시 함수 손실 감지
 * translation.ts의 청크 비교 패턴에서 영감:
 * - 원본/번역문 청크 비교 → 원본/마이그레이션 함수 시그니처 비교
 */
export interface FunctionSignature {
    name: string;
    params: string;
    returnType: string;
    lineNumber: number;
    isExported: boolean;
    isAsync: boolean;
}
export interface FunctionMatch {
    original: FunctionSignature;
    migrated: FunctionSignature;
    confidence: number;
    nameMatch: boolean;
    paramMatch: boolean;
}
export interface MigrationAuditResult {
    matched: FunctionMatch[];
    lostFunctions: FunctionSignature[];
    newFunctions: FunctionSignature[];
    matchRate: number;
    summary: string;
}
export declare function extractSignatures(code: string): FunctionSignature[];
export declare function auditMigration(original: string, migrated: string): MigrationAuditResult;
