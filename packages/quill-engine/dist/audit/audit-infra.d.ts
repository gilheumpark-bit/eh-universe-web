import type { AuditContext, AuditAreaResult } from './audit-types';
export declare function auditSecurity(ctx: AuditContext): AuditAreaResult;
export declare function auditPerformance(ctx: AuditContext): AuditAreaResult;
export declare function auditAPIHealth(ctx: AuditContext): AuditAreaResult;
export declare function auditEnvConfig(ctx: AuditContext): AuditAreaResult;
