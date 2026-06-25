// ============================================================
// noa-enforcement-adapter — NOA clearance/receipt app contract
// ============================================================
// Role:    Convert app boundary calls into deterministic allow/deny decisions.
// Banned:  Executing actions, reading files, or using Node-only APIs.
// Input:   App boundary request + optional NOA clearance token/receipt.
// Output:  Enforcement decision and audit-safe trace.
// Depends: action-registry types only.
// ============================================================

import type { ActionArea, ActionCategory } from './action-registry';

// ============================================================
// PART 0 — Contracts
// PART 0 BEGIN
// 역할: NOA 앱 집행 어댑터의 공개 타입과 정책 계약 정의.
// 금지: 정책 평가, 서명 검증, 액션 실행.
// 입력: 앱 경계/토큰/영수증 타입.
// 출력: 타입 정의.
// 의존: action-registry type only.
// ============================================================

export type NoaToolId = 'read_context' | 'write_artifact' | 'run_tool' | 'unsafe_external_action';
export type NoaRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type NoaEnforcementDecisionKind = 'ALLOW' | 'DENY';

export interface NoaClearanceToken {
  tokenId: string;
  decisionId: string;
  route: string;
  granted: boolean;
  scope: string;
  issuedAt: string;
  signature: string;
}

export interface NoaReceiptRef {
  receiptId: string;
  decisionId: string;
  action: string;
}

export interface NoaToolPolicy {
  toolId: NoaToolId;
  riskLevel: NoaRiskLevel;
  allowedRoutes: readonly string[];
  requiresGrant: boolean;
  requiresReceipt: boolean;
  scopePrefix: string;
}

export interface NoaAppBoundary {
  boundaryId: string;
  area: ActionArea;
  category: ActionCategory;
  toolId: NoaToolId;
  action: string;
  riskLevel: NoaRiskLevel;
  description: string;
}

export interface NoaAppBoundaryRequest {
  requestId: string;
  boundary: NoaAppBoundary;
  payload?: Record<string, unknown>;
  token?: NoaClearanceToken | null;
  receipt?: NoaReceiptRef | null;
}

export interface NoaSignatureVerifier {
  verifyToken(token: NoaClearanceToken): boolean;
}

export interface NoaEnforcementTrace {
  traceId: string;
  requestId: string;
  boundaryId: string;
  toolId: NoaToolId;
  action: string;
  decision: NoaEnforcementDecisionKind;
  reason: NoaEnforcementReason;
  tokenVerified: boolean;
  receiptVerified: boolean;
  timestamp: number;
}

export type NoaEnforcementReason =
  | 'allowed-low-risk'
  | 'allowed-token-receipt'
  | 'unknown-tool'
  | 'critical-tool-blocked'
  | 'missing-clearance-token'
  | 'invalid-clearance-token'
  | 'clearance-not-granted'
  | 'route-not-allowed'
  | 'scope-mismatch'
  | 'missing-or-invalid-receipt';

export type NoaEnforcementDecision =
  | { allowed: true; trace: NoaEnforcementTrace }
  | { allowed: false; trace: NoaEnforcementTrace };

const PART_0_SEAL = {
  part: 0,
  role: 'contracts',
  exposes: ['NoaAppBoundaryRequest', 'NoaEnforcementDecision', 'NoaToolPolicy'],
  dependsOn: ['action-registry-types'],
  mutation: false,
  deterministic: true,
} as const;

void PART_0_SEAL;

// PART 0 END
// ============================================================

// ============================================================
// PART 1 — Policy registry
// PART 1 BEGIN
// 역할: 앱 경계에서 쓰는 기본 NOA 도구 정책 제공.
// 금지: 요청 평가, 토큰 검증.
// 입력: 없음.
// 출력: Readonly policy registry.
// 의존: PART 0.
// ============================================================

export const NOA_TOOL_POLICIES: Readonly<Record<NoaToolId, NoaToolPolicy>> = Object.freeze({
  read_context: Object.freeze({
    toolId: 'read_context',
    riskLevel: 'low',
    allowedRoutes: Object.freeze(['END', 'BYPASS_RESEARCH', 'BYPASS_DEV']),
    requiresGrant: false,
    requiresReceipt: false,
    scopePrefix: 'NOA-BR-',
  }),
  write_artifact: Object.freeze({
    toolId: 'write_artifact',
    riskLevel: 'medium',
    allowedRoutes: Object.freeze(['END']),
    requiresGrant: true,
    requiresReceipt: true,
    scopePrefix: 'NOA-BR-',
  }),
  run_tool: Object.freeze({
    toolId: 'run_tool',
    riskLevel: 'high',
    allowedRoutes: Object.freeze(['END']),
    requiresGrant: true,
    requiresReceipt: true,
    scopePrefix: 'NOA-BR-',
  }),
  unsafe_external_action: Object.freeze({
    toolId: 'unsafe_external_action',
    riskLevel: 'critical',
    allowedRoutes: Object.freeze([]),
    requiresGrant: true,
    requiresReceipt: true,
    scopePrefix: 'NOA-BR-',
  }),
});

export function getNoaToolPolicy(toolId: NoaToolId): NoaToolPolicy {
  return NOA_TOOL_POLICIES[toolId];
}

const PART_1_SEAL = {
  part: 1,
  role: 'policy_registry',
  exposes: ['NOA_TOOL_POLICIES', 'getNoaToolPolicy'],
  dependsOn: [0],
  mutation: false,
  deterministic: true,
} as const;

void PART_1_SEAL;

// PART 1 END
// ============================================================

// ============================================================
// PART 2 — Boundary helpers
// PART 2 BEGIN
// 역할: 기존 앱 경계를 NOA 정책 요청으로 변환하는 헬퍼.
// 금지: 집행 결정, 액션 실행.
// 입력: 앱 액션/저장/내보내기 경계 설명.
// 출력: NoaAppBoundary.
// 의존: PART 0, PART 1.
// ============================================================

export function createNoaBoundary(input: {
  boundaryId: string;
  area: ActionArea;
  category: ActionCategory;
  toolId: NoaToolId;
  action: string;
  description: string;
}): NoaAppBoundary {
  const policy = getNoaToolPolicy(input.toolId);
  return {
    boundaryId: input.boundaryId,
    area: input.area,
    category: input.category,
    toolId: input.toolId,
    action: input.action,
    riskLevel: policy.riskLevel,
    description: input.description,
  };
}

export function createNoaTraceId(requestId: string, boundaryId: string, reason: NoaEnforcementReason, now: number): string {
  const safeBoundary = boundaryId.replace(/[^a-z0-9:-]/gi, '_');
  return `noa-${now}-${safeBoundary}-${requestId}-${reason}`;
}

const PART_2_SEAL = {
  part: 2,
  role: 'boundary_helpers',
  exposes: ['createNoaBoundary', 'createNoaTraceId'],
  dependsOn: [0, 1],
  mutation: false,
  deterministic: true,
} as const;

void PART_2_SEAL;

// PART 2 END
// ============================================================

// ============================================================
// PART 3 — Enforcement evaluator
// PART 3 BEGIN
// 역할: NOA 토큰/영수증/정책을 이용해 앱 경계 호출 허용 여부 결정.
// 금지: 실제 액션 실행, 외부 저장소 접근.
// 입력: NoaAppBoundaryRequest, signature verifier, now.
// 출력: NoaEnforcementDecision.
// 의존: PART 0, PART 1, PART 2.
// ============================================================

function buildTrace(
  request: NoaAppBoundaryRequest,
  decision: NoaEnforcementDecisionKind,
  reason: NoaEnforcementReason,
  tokenVerified: boolean,
  receiptVerified: boolean,
  now: number,
): NoaEnforcementTrace {
  return {
    traceId: createNoaTraceId(request.requestId, request.boundary.boundaryId, reason, now),
    requestId: request.requestId,
    boundaryId: request.boundary.boundaryId,
    toolId: request.boundary.toolId,
    action: request.boundary.action,
    decision,
    reason,
    tokenVerified,
    receiptVerified,
    timestamp: now,
  };
}

function allow(
  request: NoaAppBoundaryRequest,
  reason: NoaEnforcementReason,
  tokenVerified: boolean,
  receiptVerified: boolean,
  now: number,
): NoaEnforcementDecision {
  return { allowed: true, trace: buildTrace(request, 'ALLOW', reason, tokenVerified, receiptVerified, now) };
}

function deny(
  request: NoaAppBoundaryRequest,
  reason: NoaEnforcementReason,
  tokenVerified: boolean,
  receiptVerified: boolean,
  now: number,
): NoaEnforcementDecision {
  return { allowed: false, trace: buildTrace(request, 'DENY', reason, tokenVerified, receiptVerified, now) };
}

export function evaluateNoaAppEnforcement(
  request: NoaAppBoundaryRequest,
  verifier: NoaSignatureVerifier,
  now = Date.now(),
): NoaEnforcementDecision {
  const policy = getNoaToolPolicy(request.boundary.toolId);
  if (!policy) return deny(request, 'unknown-tool', false, false, now);
  if (policy.riskLevel === 'critical') return deny(request, 'critical-tool-blocked', false, false, now);
  if (!policy.requiresGrant) return allow(request, 'allowed-low-risk', false, false, now);

  const token = request.token ?? null;
  if (!token) return deny(request, 'missing-clearance-token', false, false, now);

  const tokenVerified = verifier.verifyToken(token);
  if (!tokenVerified) return deny(request, 'invalid-clearance-token', false, false, now);
  if (!token.granted) return deny(request, 'clearance-not-granted', true, false, now);
  if (!policy.allowedRoutes.includes(token.route)) return deny(request, 'route-not-allowed', true, false, now);
  if (!token.scope.startsWith(policy.scopePrefix)) return deny(request, 'scope-mismatch', true, false, now);

  const receipt = request.receipt ?? null;
  const receiptVerified = Boolean(receipt && receipt.decisionId === token.decisionId && receipt.action === token.route);
  if (policy.requiresReceipt && !receiptVerified) return deny(request, 'missing-or-invalid-receipt', true, false, now);

  return allow(request, 'allowed-token-receipt', true, receiptVerified, now);
}

const PART_3_SEAL = {
  part: 3,
  role: 'enforcement_evaluator',
  exposes: ['evaluateNoaAppEnforcement'],
  dependsOn: [0, 1, 2],
  mutation: false,
  deterministic: true,
} as const;

void PART_3_SEAL;

// PART 3 END
// ============================================================

// ============================================================
// PART 4 — Action wrapper
// PART 4 BEGIN
// 역할: 앱 액션 실행 전 NOA 집행 결정을 적용하는 얇은 래퍼.
// 금지: 정책 우회, 실패한 액션 실행.
// 입력: request, verifier, action callback.
// 출력: enforcement decision.
// 의존: PART 3.
// ============================================================

export async function runNoaGuardedAction(
  request: NoaAppBoundaryRequest,
  verifier: NoaSignatureVerifier,
  action: () => void | Promise<void>,
  onTrace?: (trace: NoaEnforcementTrace) => void,
): Promise<NoaEnforcementDecision> {
  const decision = evaluateNoaAppEnforcement(request, verifier);
  onTrace?.(decision.trace);
  if (!decision.allowed) return decision;
  await action();
  return decision;
}

const PART_4_SEAL = {
  part: 4,
  role: 'action_wrapper',
  exposes: ['runNoaGuardedAction'],
  dependsOn: [3],
  mutation: true,
  deterministic: false,
} as const;

void PART_4_SEAL;

// PART 4 END
// ============================================================

// IDENTITY_SEAL: noa-enforcement-adapter | role=NOA app boundary contract | inputs=request+token+receipt | outputs=allow-deny trace
