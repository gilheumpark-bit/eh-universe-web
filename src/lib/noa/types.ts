// ============================================================
// NOA Security Framework v1.0 — Type Definitions
// Ported from NOA Python Ecosystem (v27~v7080)
//
// ADR-0004 (Grade namespace isolation):
//   NOA risk grades use 'Noa*' prefix to avoid collision with:
//     - CodeGrade (S|A|B|C|D|F) — src/lib/code-studio/grade/
//     - Grade ('평작'|'성공'|...) — src/lib/creative/integrated-grade.ts
//   Never alias 'NoaGradeLevel as GradeLevel' in importers — keep prefix explicit.
// ============================================================

// ============================================================
// Common
// ============================================================

export type NoaLayer =
  | "sanitizer"
  | "fast-track"
  | "trinity"
  | "judgment"
  | "tactical"
  | "audit"
  | "availability";

// ============================================================
// Layer 1: Sanitizer (v31~v33)
// ============================================================

export interface SanitizeChange {
  readonly type: "zero-width" | "jamo" | "omni" | "nfkc";
  readonly position: number;
  readonly original: string;
  readonly replacement: string;
}

export interface SanitizeResult {
  readonly original: string;
  readonly sanitized: string;
  readonly changes: readonly SanitizeChange[];
  readonly nfkcApplied: boolean;
}

// ============================================================
// Layer 2: Fast Track (v42)
// ============================================================

export type FastTrackVerdict = "PASS" | "BLOCK" | "ESCALATE";

export interface FastTrackResult {
  readonly verdict: FastTrackVerdict;
  readonly reason: string;
  readonly matchedKeyword?: string;
  readonly durationMs: number;
}

// ============================================================
// Layer 3: Trinity Consensus (v42.6)
// ============================================================

export type TrinityVote = "PASS" | "HOLD" | "VETO";

export type EgoName = "shield" | "sword" | "scale";

export interface EgoResult {
  readonly name: EgoName;
  readonly vote: TrinityVote;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface TrinityResult {
  readonly finalVote: TrinityVote;
  readonly weightedScore: number;
  readonly egos: readonly [EgoResult, EgoResult, EgoResult];
  readonly consensusDetail: string;
}

export interface TrinityWeights {
  readonly shield: number;
  readonly sword: number;
  readonly scale: number;
}

// ============================================================
// Layer 4: Judgment (v35)
// ============================================================

export type NoaGradeLevel =
  | "Platinum" | "Gold" | "LightGold"
  | "Silver" | "Lime" | "Orange"
  | "Red" | "DeepRed" | "Black";

export type NoaGradeStep = 1 | 2 | 3;

export interface NoaGradeEntry {
  readonly level: NoaGradeLevel;
  readonly step: NoaGradeStep;
  readonly label: string;
  readonly riskFloor: number;
  readonly riskCeiling: number;
}

export type DomainType =
  | "general"
  | "medical"
  | "finance"
  | "legal"
  | "education"
  | "code"
  | "creative";

export interface DomainWeight {
  readonly domain: DomainType;
  readonly multiplier: number;
}

export type SourceTier = 1 | 2 | 3;

export interface SourceTrustEntry {
  readonly tier: SourceTier;
  readonly label: string;
  readonly riskMultiplier: number;
}

export interface JudgmentResult {
  readonly grade: NoaGradeEntry;
  readonly adjustedRisk: number;
  readonly domain: DomainType;
  readonly sourceTier: SourceTier;
  readonly explanation: string;
}

// ============================================================
// Layer 5: Tactical Paths (v50)
// ============================================================

export type TacticalPath = "ALLOW" | "LIMITED" | "DELAY" | "HONEYPOT" | "BLOCK";

export interface TacticalConfig {
  readonly path: TacticalPath;
  readonly tokenBudget: number;
  readonly responseDelay: number;
  readonly description: string;
}

export interface TacticalResult {
  readonly selectedPath: TacticalPath;
  readonly config: TacticalConfig;
  readonly reason: string;
  readonly tokenBudget?: number;
}

// ============================================================
// Layer 6: Audit Chain (v42.6/v43)
// ============================================================

export interface AuditEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly layer: NoaLayer;
  readonly input: string;
  readonly output: string;
  readonly verdict: string;
  readonly prevHash: string;
  readonly hash: string;
  readonly hmacSignature: string;
}

export interface AuditChainState {
  readonly entries: readonly AuditEntry[];
  readonly latestHash: string;
  readonly chainLength: number;
}

export interface AuditVerification {
  readonly valid: boolean;
  readonly brokenAt?: number;
  readonly reason?: string;
}

export interface AuditManager {
  append(
    entry: Omit<AuditEntry, "id" | "hash" | "prevHash" | "hmacSignature">
  ): Promise<AuditEntry>;
  verify(): Promise<AuditVerification>;
  getChain(): AuditChainState;
}

// ============================================================
// Layer 7: Availability (v40/v401)
// ============================================================

export interface RiskBudgetState {
  readonly dailyBudget: number;
  readonly consumed: number;
  readonly remaining: number;
  readonly resetAt: number;
}

export interface HallucinationCheck {
  readonly ratio: number;
  readonly suspicious: boolean;
  readonly reason?: string;
}

export interface AvailabilityResult {
  readonly allowed: boolean;
  readonly budgetRemaining: number;
  readonly hallucinationFlag: boolean;
  readonly action: "proceed" | "neutralize" | "burn";
}

export interface RiskBudgetManager {
  check(riskCost: number): AvailabilityResult;
  /** v401 Advisory Council 통합 검사 (할루시네이션 + 예산) */
  advisoryCheck?(
    riskCost: number,
    promptLength: number,
    responseLength: number,
    responseText?: string
  ): AvailabilityResult;
  /** Apply burn-rate sanitization to a response based on tactical path. */
  sanitize?(text: string, path: string): string;
  /** Strip dangerous patterns from text via burn rules. */
  burn?(text: string): string;
  consume(cost: number): void;
  reset(): void;
  getState(): RiskBudgetState;
}

// ============================================================
// Orchestrator
// ============================================================

export interface NoaInput {
  readonly text: string;
  readonly domain?: DomainType;
  readonly sourceTier?: SourceTier;
  readonly sessionId?: string;
  /**
   * [특허 청구 1·8·효과 29 — 멀티턴 누적 맥락 반영] 직전 사용자 발화 이력
   * (과거 → 최신 순, 배열 끝 = 최신). additive 옵션 — 미전달 시 기존 단일 입력
   * 판정과 완전 동일 (회귀 0). 최근 HISTORY_WINDOW(5)개만 감쇠 가중으로 반영하며
   * max(single, contextual) 보장 — 맥락이 위험도를 깎는 방향은 구조적으로 불가.
   */
  readonly conversationHistory?: readonly string[];
}

export interface NoaResult {
  readonly allowed: boolean;
  readonly sanitizedText: string;
  readonly fastTrack: FastTrackResult | null;
  readonly trinity: TrinityResult | null;
  readonly judgment: JudgmentResult | null;
  readonly tactical: TacticalResult;
  readonly auditEntry: AuditEntry;
  readonly availability: AvailabilityResult;
  readonly totalDurationMs: number;
  readonly layerDurations: {
    readonly sanitize: number;
    readonly fastTrack: number;
    readonly trinity: number;
    readonly judgment: number;
    readonly availability: number;
    readonly tactical: number;
    readonly audit: number;
  };
}

export interface NoaConfig {
  readonly trinityWeights: TrinityWeights;
  readonly dailyRiskBudget: number;
  readonly domainWeights: readonly DomainWeight[];
  readonly sourceTiers: readonly SourceTrustEntry[];
  readonly tacticalConfigs: Record<TacticalPath, TacticalConfig>;
  readonly hmacSecret: string;
}
