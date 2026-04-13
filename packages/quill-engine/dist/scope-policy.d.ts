export type PolicyScope = 'module' | 'workspace' | 'global';
export type PolicyAction = 'enforce' | 'suppress' | 'warn';
export interface ScopedRule {
    ruleId: string;
    scope: PolicyScope;
    action: PolicyAction;
    /** 이 규칙을 오버라이드하는 상위 스코프 규칙 ID */
    overriddenBy?: string;
}
export declare class PolicyManager {
    private static instance;
    private globalRules;
    private workspaceRules;
    /** filePath → (ruleId → ScopedRule) */
    private moduleRules;
    /** 해석된 effective 규칙 캐시: filePath → ScopedRule[] */
    private effectiveCache;
    private constructor();
    static getInstance(): PolicyManager;
    /** 테스트용: 싱글턴 리셋 */
    static resetInstance(): void;
    setGlobalRule(ruleId: string, action: PolicyAction): void;
    setWorkspaceRule(ruleId: string, action: PolicyAction): void;
    setModuleRule(filePath: string, ruleId: string, action: PolicyAction): void;
    resolve(ruleId: string, filePath: string): ScopedRule;
    getEffective(filePath: string): ScopedRule[];
    onGlobalUpdate(): void;
    private invalidateAllCaches;
    save(): void;
    load(): void;
}
/**
 * PipelineStage의 findings 배열에 scope policy를 적용.
 * suppress → 제거, warn → severity 낮춤, enforce → 유지.
 */
export declare function applyScopePolicy(findings: string[], filePath: string, policy?: PolicyManager): string[];
/**
 * pipeline-teams의 Finding[] 배열에 scope policy를 적용.
 * suppress → 제거, warn → severity downgrade, enforce → 유지.
 */
export declare function applyScopePolicyToFindings<T extends {
    rule?: string;
    severity?: string;
}>(findings: T[], filePath: string, policy?: PolicyManager): T[];
