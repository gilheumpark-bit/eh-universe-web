import type { AuditContext, AuditAreaResult } from './audit-types';
export declare function auditOperations(ctx: AuditContext): AuditAreaResult;
export declare function auditComplexity(ctx: AuditContext): AuditAreaResult;
export declare function auditArchitecture(ctx: AuditContext): AuditAreaResult;
export declare function auditDependencies(ctx: AuditContext): AuditAreaResult;
