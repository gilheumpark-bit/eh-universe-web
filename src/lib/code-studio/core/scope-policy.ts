// ============================================================
// Code Studio — Scope-Based Rule Precedence
// ============================================================
// 모듈 → 워크스페이스 → 글로벌 3계층 정책 관리.
// 상위 스코프 규칙이 하위를 오버라이드 (global > workspace > module).

// ============================================================
// PART 1 — Types
// ============================================================

export type PolicyScope = 'module' | 'workspace' | 'global';
export type PolicyAction = 'enforce' | 'suppress' | 'warn';

export interface ScopedRule {
  ruleId: string;
  scope: PolicyScope;
  action: PolicyAction;
  /** 이 규칙을 오버라이드하는 상위 스코프 규칙 ID */
  overriddenBy?: string;
}

interface StoredPolicy {
  global: Record<string, PolicyAction>;
  workspace: Record<string, PolicyAction>;
  modules: Record<string, Record<string, PolicyAction>>;
}

const STORAGE_KEY = 'eh-scope-policy-v1';

// 스코프 우선순위: 높을수록 우선
const _SCOPE_PRIORITY: Record<PolicyScope, number> = {
  module: 0,
  workspace: 1,
  global: 2,
};

// IDENTITY_SEAL: PART-1 | role=Types+Constants | inputs=none | outputs=ScopedRule,PolicyScope,PolicyAction

// ============================================================
// PART 2 — PolicyManager Singleton
// ============================================================

export class PolicyManager {
  private static instance: PolicyManager | null = null;

  private globalRules: Map<string, ScopedRule> = new Map();
  private workspaceRules: Map<string, ScopedRule> = new Map();
  /** filePath → (ruleId → ScopedRule) */
  private moduleRules: Map<string, Map<string, ScopedRule>> = new Map();

  /** 해석된 effective 규칙 캐시: filePath → ScopedRule[] */
  private effectiveCache: Map<string, ScopedRule[]> = new Map();

  private constructor() {
    this.load();
  }

  static getInstance(): PolicyManager {
    if (!PolicyManager.instance) {
      PolicyManager.instance = new PolicyManager();
    }
    return PolicyManager.instance;
  }

  /** 테스트용: 싱글턴 리셋 */
  static resetInstance(): void {
    PolicyManager.instance = null;
  }

  // ── Rule Setters ──

  setGlobalRule(ruleId: string, action: PolicyAction): void {
    this.globalRules.set(ruleId, { ruleId, scope: 'global', action });
    this.onGlobalUpdate();
  }

  setWorkspaceRule(ruleId: string, action: PolicyAction): void {
    this.workspaceRules.set(ruleId, { ruleId, scope: 'workspace', action });
    this.invalidateAllCaches();
  }

  setModuleRule(filePath: string, ruleId: string, action: PolicyAction): void {
    if (!this.moduleRules.has(filePath)) {
      this.moduleRules.set(filePath, new Map());
    }
    this.moduleRules.get(filePath)!.set(ruleId, { ruleId, scope: 'module', action });
    this.effectiveCache.delete(filePath);
  }

  // ── Resolution (highest scope wins) ──

  resolve(ruleId: string, filePath: string): ScopedRule {
    const globalRule = this.globalRules.get(ruleId);
    if (globalRule) {
      return globalRule;
    }

    const wsRule = this.workspaceRules.get(ruleId);
    const modRules = this.moduleRules.get(filePath);
    const modRule = modRules?.get(ruleId);

    if (wsRule && modRule) {
      // workspace > module
      return {
        ...wsRule,
        overriddenBy: undefined,
      };
    }

    if (wsRule) return wsRule;

    if (modRule) return modRule;

    // 규칙이 등록되지 않은 경우 기본 enforce
    return { ruleId, scope: 'module', action: 'enforce' };
  }

  // ── Effective Rules (all applicable rules for a file path) ──

  getEffective(filePath: string): ScopedRule[] {
    const cached = this.effectiveCache.get(filePath);
    if (cached) return cached;

    const merged = new Map<string, ScopedRule>();

    // 1) module rules (lowest priority)
    const modRules = this.moduleRules.get(filePath);
    if (modRules) {
      for (const [id, rule] of modRules) {
        merged.set(id, { ...rule });
      }
    }

    // 2) workspace rules override module
    for (const [id, rule] of this.workspaceRules) {
      const existing = merged.get(id);
      if (existing) {
        merged.set(id, { ...rule, overriddenBy: undefined });
      } else {
        merged.set(id, { ...rule });
      }
    }

    // 3) global rules override all
    for (const [id, rule] of this.globalRules) {
      const existing = merged.get(id);
      if (existing) {
        merged.set(id, { ...rule, overriddenBy: undefined });
      } else {
        merged.set(id, { ...rule });
      }
    }

    // 하위 스코프 규칙에 overriddenBy 표기
    if (modRules) {
      for (const [id, modRule] of modRules) {
        const effective = merged.get(id);
        if (effective && effective.scope !== 'module') {
          // module rule이 상위에 의해 오버라이드됨 — 참조 기록
          modRule.overriddenBy = `${effective.scope}:${id}`;
        }
      }
    }

    const result = Array.from(merged.values());
    this.effectiveCache.set(filePath, result);
    return result;
  }

  // ── Cache Invalidation ──

  onGlobalUpdate(): void {
    this.invalidateAllCaches();
  }

  private invalidateAllCaches(): void {
    this.effectiveCache.clear();
  }

  // ── Persistence (localStorage) ──

  save(): void {
    if (typeof globalThis.localStorage === 'undefined') return;

    const data: StoredPolicy = {
      global: Object.fromEntries(
        Array.from(this.globalRules.entries()).map(([id, r]) => [id, r.action]),
      ),
      workspace: Object.fromEntries(
        Array.from(this.workspaceRules.entries()).map(([id, r]) => [id, r.action]),
      ),
      modules: Object.fromEntries(
        Array.from(this.moduleRules.entries()).map(([path, rules]) => [
          path,
          Object.fromEntries(Array.from(rules.entries()).map(([id, r]) => [id, r.action])),
        ]),
      ),
    };

    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage full or unavailable — silent fail
    }
  }

  load(): void {
    if (typeof globalThis.localStorage === 'undefined') return;

    try {
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data: StoredPolicy = JSON.parse(raw);

      this.globalRules.clear();
      this.workspaceRules.clear();
      this.moduleRules.clear();

      if (data.global) {
        for (const [id, action] of Object.entries(data.global)) {
          this.globalRules.set(id, { ruleId: id, scope: 'global', action: action as PolicyAction });
        }
      }

      if (data.workspace) {
        for (const [id, action] of Object.entries(data.workspace)) {
          this.workspaceRules.set(id, { ruleId: id, scope: 'workspace', action: action as PolicyAction });
        }
      }

      if (data.modules) {
        for (const [path, rules] of Object.entries(data.modules)) {
          const map = new Map<string, ScopedRule>();
          for (const [id, action] of Object.entries(rules)) {
            map.set(id, { ruleId: id, scope: 'module', action: action as PolicyAction });
          }
          this.moduleRules.set(path, map);
        }
      }

      this.invalidateAllCaches();
    } catch {
      // corrupted data — ignore
    }
  }
}

// IDENTITY_SEAL: PART-2 | role=PolicyManager singleton | inputs=rules,filePath | outputs=ScopedRule[]

// ============================================================
// PART 3 — Pipeline Integration Helpers
// ============================================================

/**
 * PipelineStage의 findings 배열에 scope policy를 적용.
 * suppress → 제거, warn → severity 낮춤, enforce → 유지.
 */
export function applyScopePolicy(
  findings: string[],
  filePath: string,
  policy?: PolicyManager,
): string[] {
  const mgr = policy ?? PolicyManager.getInstance();
  if (findings.length === 0) return findings;

  return findings.filter((finding) => {
    // finding 문자열에서 rule 패턴 추출 시도
    const ruleMatch = finding.match(/\[([A-Z_]+(?:\.[A-Z_]+)*)\]/);
    if (!ruleMatch) return true; // rule 태그 없으면 통과

    const ruleId = ruleMatch[1];
    const resolved = mgr.resolve(ruleId, filePath);

    return resolved.action !== 'suppress';
  });
}

/**
 * pipeline-teams의 Finding[] 배열에 scope policy를 적용.
 * suppress → 제거, warn → severity downgrade, enforce → 유지.
 */
export function applyScopePolicyToFindings<
  T extends { rule?: string; severity?: string },
>(
  findings: T[],
  filePath: string,
  policy?: PolicyManager,
): T[] {
  const mgr = policy ?? PolicyManager.getInstance();
  if (findings.length === 0) return findings;

  return findings.filter((f) => {
    if (!f.rule) return true;

    const resolved = mgr.resolve(f.rule, filePath);

    if (resolved.action === 'suppress') return false;

    if (resolved.action === 'warn' && f.severity === 'critical') {
      (f as { severity?: string }).severity = 'major';
    }

    return true;
  });
}

// IDENTITY_SEAL: PART-3 | role=Pipeline helpers | inputs=findings,filePath | outputs=filtered findings
