export type Permission = 'fs:read' | 'fs:write' | 'net:outbound' | 'net:inbound' | 'exec:shell' | 'exec:node' | 'env:read';
export interface SecurityPolicy {
    allowedPermissions: Set<Permission>;
    allowedPaths: string[];
    blockedPaths: string[];
    allowedDomains: string[];
    blockedDomains: string[];
    maxMemoryMB: number;
    maxCpuSeconds: number;
    allowEval: boolean;
}
export declare const POLICIES: Record<string, SecurityPolicy>;
export declare function setPolicy(level: 'strict' | 'normal' | 'permissive'): void;
export declare function checkPermission(permission: Permission): boolean;
export declare function checkPathAccess(filePath: string): {
    allowed: boolean;
    reason?: string;
};
export declare function checkDomainAccess(domain: string): {
    allowed: boolean;
    reason?: string;
};
export interface SecretFinding {
    type: string;
    file: string;
    line: number;
    masked: string;
}
export declare function scanForSecrets(content: string, fileName: string): SecretFinding[];
export declare function enforceResourceLimits(pid?: number): void;
export declare function getActivePolicy(): SecurityPolicy;
