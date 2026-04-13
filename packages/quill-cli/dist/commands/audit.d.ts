interface AuditOptions {
    format: string;
    trend?: boolean;
}
export declare function runAudit(opts: AuditOptions): Promise<void>;
export {};
