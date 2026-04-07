import type { AuditContext, AuditReport } from './audit-types';
export interface AuditProgressCallback {
    (area: string, index: number, total: number): void;
}
export declare function runProjectAudit(ctx: AuditContext, onProgress?: AuditProgressCallback): AuditReport;
export declare function formatAuditReport(report: AuditReport, lang?: 'ko' | 'en'): string;
