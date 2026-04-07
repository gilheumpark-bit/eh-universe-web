export type AuditGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AuditCategory = 'code-health' | 'quality' | 'user-experience' | 'infra-security';
export type AuditAreaId = 'operations' | 'complexity' | 'architecture' | 'dependencies' | 'testing' | 'error-handling' | 'feature-completeness' | 'documentation' | 'design-system' | 'accessibility' | 'ux-quality' | 'i18n' | 'security' | 'performance' | 'api-health' | 'env-config';
export declare const AUDIT_AREA_LABELS: Record<AuditAreaId, {
    en: string;
    ko: string;
}>;
export declare const CATEGORY_LABELS: Record<AuditCategory, {
    en: string;
    ko: string;
}>;
export declare const AREA_TO_CATEGORY: Record<AuditAreaId, AuditCategory>;
export declare const CATEGORY_WEIGHTS: Record<AuditCategory, number>;
export interface AuditFinding {
    id: string;
    area: AuditAreaId;
    severity: AuditSeverity;
    message: string;
    file?: string;
    line?: number;
    rule: string;
    suggestion?: string;
}
export interface AuditAreaResult {
    area: AuditAreaId;
    category: AuditCategory;
    score: number;
    grade: AuditGrade;
    findings: AuditFinding[];
    checks: number;
    passed: number;
    metrics?: Record<string, number | string>;
}
export interface AuditCategoryResult {
    category: AuditCategory;
    score: number;
    grade: AuditGrade;
    areas: AuditAreaResult[];
}
export interface AuditUrgentItem {
    rank: number;
    area: AuditAreaId;
    severity: AuditSeverity;
    message: string;
    file?: string;
}
export interface AuditReport {
    id: string;
    timestamp: number;
    version: string;
    totalScore: number;
    totalGrade: AuditGrade;
    hardGateFail: boolean;
    hardGateReason?: string;
    categories: AuditCategoryResult[];
    areas: AuditAreaResult[];
    urgent: AuditUrgentItem[];
    totalChecks: number;
    totalFindings: number;
    findingsBySeverity: Record<AuditSeverity, number>;
    duration: number;
}
export interface AuditContext {
    files: AuditFile[];
    language: string;
    projectName?: string;
}
export interface AuditFile {
    path: string;
    content: string;
    language: string;
}
