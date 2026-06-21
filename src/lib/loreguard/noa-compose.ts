import type { WabiDecision, WabiReasonCode } from '@/lib/wabi/gate';
import { createWabiReceipt, validateWabiReceipt, type WabiReceipt } from '@/lib/wabi/receipt';
import type { WabiRoleId } from '@/lib/wabi/roles';
import { buildProjectStorageLayout, buildProjectStoragePath } from '@/lib/loreguard/project-storage-layout';

export type NoaComposeSurface =
  | 'project'
  | 'world'
  | 'character'
  | 'scenario'
  | 'scene'
  | 'direction'
  | 'writing'
  | 'revision'
  | 'translation'
  | 'export';

export type NoaComposeActionType =
  | 'CREATE'
  | 'REWRITE'
  | 'VALIDATE'
  | 'EXPORT'
  | 'PUBLISH'
  | 'SEAL';

export type NoaComposeState =
  | 'DRAFT'
  | 'PROPOSED'
  | 'SELECTED'
  | 'APPROVED'
  | 'EXECUTED'
  | 'VALIDATED'
  | 'RELEASED'
  | 'HOLD'
  | 'BLOCKED'
  | 'SEALED';

export type NoaComposeRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type NoaComposeApprovalPolicy = 'auto-apply' | 'conditional-approval' | 'always-ask';

export interface NoaComposeReference {
  id: string;
  label: string;
  kind?: 'world' | 'character' | 'scene' | 'manuscript' | 'translation' | 'rights' | 'external';
}

export interface NoaComposeChange {
  changeId: string;
  surface: NoaComposeSurface;
  actionType: NoaComposeActionType;
  title: string;
  targetRef: string;
  summary: string;
  referencesRequired?: string[];
  referencesUsed?: string[];
  riskLevel?: NoaComposeRiskLevel;
  proposedBy?: WabiRoleId;
}

export interface NoaComposePlanInput {
  projectId?: string | null;
  composeId?: string;
  title: string;
  prompt: string;
  changes: NoaComposeChange[];
  approvalPolicyPreference?: NoaComposeApprovalPolicy;
  referencesRequired?: string[];
  referencesUsed?: string[];
  contextManifest?: NoaComposeReference[];
  previousRecordHash?: string;
  now?: number;
}

export interface NoaComposePlan {
  composeId: string;
  projectId: string;
  scopeKey: string;
  title: string;
  prompt: string;
  changes: NoaComposeChange[];
  contextManifest: NoaComposeReference[];
  referencesRequired: string[];
  referencesUsed: string[];
  missingReferences: string[];
  state: NoaComposeState;
  decision: WabiDecision;
  reasonCodes: WabiReasonCode[];
  approvalPolicy: NoaComposeApprovalPolicy;
  approvalPolicyLabel: string;
  canAutoApply: boolean;
  requiredApprovals: WabiRoleId[];
  proposedBy: WabiRoleId;
  selectedBy?: WabiRoleId;
  approvedBy?: WabiRoleId;
  previousRecordHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoaComposeApprovalInput {
  selectedBy?: WabiRoleId;
  approvedBy?: WabiRoleId;
  now?: number;
}

export interface NoaComposeReceiptOptions {
  receiptId?: string;
  inputHash?: string;
  outputHash?: string;
  chainTipHash?: string;
  timestamp?: number;
}

export interface NoaComposeGitHubPaths {
  composeJson: string;
  composeReceiptLog: string;
  composeWorkNote: string;
}

const NO_PROJECT_SCOPE = 'no-project';
const DEFAULT_APPROVER: WabiRoleId = 'human-author';
const NOA_PROPOSER: WabiRoleId = 'ai-proposer';

function compactText(input: string | undefined, fallback: string, max = 240): string {
  const value = input?.replace(/\s+/g, ' ').trim();
  return (value || fallback).slice(0, max);
}

function normalizeProjectId(projectId?: string | null): string {
  const safe = projectId?.trim();
  return safe || '';
}

function normalizePathSegment(input: string | undefined, fallback: string): string {
  const value = input?.trim() || fallback;
  const cleaned = value
    .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (cleaned || fallback).slice(0, 120);
}

function createComposeId(now = Date.now()): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `noa-compose-${now.toString(36)}-${randomPart}`;
}

function uniqueList(items: Array<string | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const value = item?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function collectReferences(
  planInput: Pick<NoaComposePlanInput, 'changes' | 'referencesRequired' | 'referencesUsed'>,
): {
  referencesRequired: string[];
  referencesUsed: string[];
  missingReferences: string[];
} {
  const referencesRequired = uniqueList([
    ...(planInput.referencesRequired ?? []),
    ...planInput.changes.flatMap((change) => change.referencesRequired ?? []),
  ]);
  const referencesUsed = uniqueList([
    ...(planInput.referencesUsed ?? []),
    ...planInput.changes.flatMap((change) => change.referencesUsed ?? []),
  ]);
  const usedSet = new Set(referencesUsed);
  const missingReferences = referencesRequired.filter((referenceId) => !usedSet.has(referenceId));
  return { referencesRequired, referencesUsed, missingReferences };
}

function hasCriticalRisk(changes: NoaComposeChange[]): boolean {
  return changes.some((change) => change.riskLevel === 'critical');
}

function mustAskAuthor(changes: NoaComposeChange[]): boolean {
  return changes.some((change) => {
    if (change.riskLevel === 'high' || change.riskLevel === 'critical') return true;
    if (change.actionType === 'EXPORT' || change.actionType === 'PUBLISH' || change.actionType === 'SEAL') return true;
    if (change.surface === 'export') return true;
    if (/권리|IP|확인서|출고|삭제|외부|프로젝트\s*이동/i.test(`${change.title} ${change.summary} ${change.targetRef}`)) return true;
    return false;
  });
}

function policyLabel(policy: NoaComposeApprovalPolicy): string {
  if (policy === 'auto-apply') return '바로 적용';
  if (policy === 'always-ask') return '항상 물어보기';
  return '조건부 적용';
}

function planGate(input: {
  projectId: string;
  changes: NoaComposeChange[];
  missingReferences: string[];
  approvalPolicyPreference?: NoaComposeApprovalPolicy;
}): Pick<NoaComposePlan, 'state' | 'decision' | 'reasonCodes' | 'approvalPolicy' | 'approvalPolicyLabel' | 'canAutoApply' | 'requiredApprovals'> {
  const reasonCodes: WabiReasonCode[] = [];

  if (!input.projectId) {
    reasonCodes.push('PROJECT_SCOPE_REQUIRED');
    return {
      state: 'HOLD',
      decision: 'HOLD',
      reasonCodes,
      approvalPolicy: 'always-ask',
      approvalPolicyLabel: policyLabel('always-ask'),
      canAutoApply: false,
      requiredApprovals: [DEFAULT_APPROVER],
    };
  }

  if (input.changes.length === 0) {
    reasonCodes.push('MISSING_REFERENCE');
    return {
      state: 'HOLD',
      decision: 'HOLD',
      reasonCodes,
      approvalPolicy: 'always-ask',
      approvalPolicyLabel: policyLabel('always-ask'),
      canAutoApply: false,
      requiredApprovals: [DEFAULT_APPROVER],
    };
  }

  if (hasCriticalRisk(input.changes)) {
    reasonCodes.push('HIGH_RISK_CHANGE', 'IP_RISK');
    return {
      state: 'BLOCKED',
      decision: 'BLOCK',
      reasonCodes,
      approvalPolicy: 'always-ask',
      approvalPolicyLabel: policyLabel('always-ask'),
      canAutoApply: false,
      requiredApprovals: [DEFAULT_APPROVER],
    };
  }

  if (mustAskAuthor(input.changes)) {
    reasonCodes.push('HIGH_RISK_CHANGE');
    return {
      state: 'HOLD',
      decision: 'HOLD',
      reasonCodes,
      approvalPolicy: 'always-ask',
      approvalPolicyLabel: policyLabel('always-ask'),
      canAutoApply: false,
      requiredApprovals: [DEFAULT_APPROVER],
    };
  }

  if (input.missingReferences.length > 0) {
    reasonCodes.push('MISSING_REFERENCE');
    return {
      state: 'HOLD',
      decision: 'HOLD',
      reasonCodes,
      approvalPolicy: 'conditional-approval',
      approvalPolicyLabel: policyLabel('conditional-approval'),
      canAutoApply: false,
      requiredApprovals: [DEFAULT_APPROVER],
    };
  }

  reasonCodes.push('REFERENCE_COMPLETE');
  const approvalPolicy = input.approvalPolicyPreference === 'auto-apply'
    ? 'auto-apply'
    : input.approvalPolicyPreference === 'always-ask'
      ? 'always-ask'
      : 'conditional-approval';
  return {
    state: 'PROPOSED',
    decision: 'ALLOW_MINIMAL',
    reasonCodes,
    approvalPolicy,
    approvalPolicyLabel: policyLabel(approvalPolicy),
    canAutoApply: approvalPolicy === 'auto-apply',
    requiredApprovals: [DEFAULT_APPROVER],
  };
}

export function buildNoaComposeScopeKey(projectId?: string | null, composeId = 'active'): string {
  const projectScope = normalizeProjectId(projectId) || NO_PROJECT_SCOPE;
  return `project:${encodeURIComponent(projectScope)}:noa-compose:${encodeURIComponent(composeId)}`;
}

export function createNoaComposePlan(input: NoaComposePlanInput): NoaComposePlan {
  const now = input.now ?? Date.now();
  const projectId = normalizeProjectId(input.projectId);
  const composeId = normalizePathSegment(input.composeId ?? createComposeId(now), 'noa-compose');
  const references = collectReferences(input);
  const gate = planGate({
    projectId,
    changes: input.changes,
    missingReferences: references.missingReferences,
    approvalPolicyPreference: input.approvalPolicyPreference,
  });

  return {
    composeId,
    projectId,
    scopeKey: buildNoaComposeScopeKey(projectId, composeId),
    title: compactText(input.title, '노아 제안 묶음'),
    prompt: compactText(input.prompt, '노아 컴포즈 요청', 2000),
    changes: input.changes.map((change) => ({
      ...change,
      title: compactText(change.title, '제목 없는 변경'),
      summary: compactText(change.summary, '요약 없음', 1000),
      proposedBy: change.proposedBy ?? NOA_PROPOSER,
    })),
    contextManifest: input.contextManifest ?? [],
    referencesRequired: references.referencesRequired,
    referencesUsed: references.referencesUsed,
    missingReferences: references.missingReferences,
    state: gate.state,
    decision: gate.decision,
    reasonCodes: gate.reasonCodes,
    approvalPolicy: gate.approvalPolicy,
    approvalPolicyLabel: gate.approvalPolicyLabel,
    canAutoApply: gate.canAutoApply,
    requiredApprovals: gate.requiredApprovals,
    proposedBy: NOA_PROPOSER,
    previousRecordHash: input.previousRecordHash,
    createdAt: now,
    updatedAt: now,
  };
}

export function approveNoaComposePlan(
  plan: NoaComposePlan,
  approval: NoaComposeApprovalInput = {},
): NoaComposePlan {
  const now = approval.now ?? Date.now();
  const selectedBy = approval.selectedBy ?? DEFAULT_APPROVER;
  const approvedBy = approval.approvedBy ?? DEFAULT_APPROVER;

  if (approvedBy === NOA_PROPOSER || selectedBy === NOA_PROPOSER) {
    return {
      ...plan,
      state: 'HOLD',
      decision: 'HOLD',
      selectedBy,
      approvedBy: undefined,
      reasonCodes: uniqueList([...plan.reasonCodes, 'AI_DECISION_ATTEMPT']) as WabiReasonCode[],
      canAutoApply: false,
      requiredApprovals: [DEFAULT_APPROVER],
      updatedAt: now,
    };
  }

  if (approvedBy !== 'human-author' && approvedBy !== 'admin-owner') {
    return {
      ...plan,
      state: 'HOLD',
      decision: 'HOLD',
      selectedBy,
      approvedBy: undefined,
      reasonCodes: uniqueList([...plan.reasonCodes, 'NO_HUMAN_APPROVAL']) as WabiReasonCode[],
      canAutoApply: false,
      requiredApprovals: [DEFAULT_APPROVER],
      updatedAt: now,
    };
  }

  if (!plan.projectId || plan.missingReferences.length > 0 || plan.decision === 'BLOCK') {
    return {
      ...plan,
      state: plan.decision === 'BLOCK' ? 'BLOCKED' : 'HOLD',
      selectedBy,
      approvedBy: undefined,
      canAutoApply: false,
      updatedAt: now,
    };
  }

  return {
    ...plan,
    state: 'APPROVED',
    decision: 'ALLOW',
    selectedBy,
    approvedBy,
    reasonCodes: uniqueList([...plan.reasonCodes, 'HUMAN_APPROVED', 'REFERENCE_COMPLETE']) as WabiReasonCode[],
    canAutoApply: true,
    requiredApprovals: [],
    updatedAt: now,
  };
}

export function createNoaComposeReceipt(
  plan: NoaComposePlan,
  options: NoaComposeReceiptOptions = {},
): WabiReceipt {
  return createWabiReceipt({
    receiptId: options.receiptId ?? `noa-compose:${plan.composeId}`,
    projectId: plan.projectId,
    taskId: plan.composeId,
    domain: 'creative',
    actionType: 'COMPOSE',
    proposedBy: plan.proposedBy,
    selectedBy: plan.selectedBy,
    approvedBy: plan.approvedBy,
    decision: plan.decision,
    reasonCodes: plan.reasonCodes,
    referencesRequired: plan.referencesRequired,
    referencesUsed: plan.referencesUsed,
    missingReferences: plan.missingReferences,
    inputHash: options.inputHash,
    outputHash: options.outputHash,
    chainTipHash: options.chainTipHash ?? plan.previousRecordHash,
    timestamp: options.timestamp ?? plan.updatedAt,
  });
}

export function validateNoaComposeReceipt(plan: NoaComposePlan): boolean {
  return validateWabiReceipt(createNoaComposeReceipt(plan));
}

export function buildNoaComposeGitHubPaths(
  projectId?: string | null,
  composeId = 'active',
): NoaComposeGitHubPaths {
  const layout = buildProjectStorageLayout(projectId || NO_PROJECT_SCOPE);
  return {
    composeJson: buildProjectStoragePath({
      projectId,
      kind: 'composePlan',
      composeId,
    }),
    composeReceiptLog: layout.files.receiptComposeLog,
    composeWorkNote: layout.files.noaComposeNote,
  };
}

export function summarizeNoaComposePlan(plan: NoaComposePlan): {
  label: string;
  approvalPolicyLabel: string;
  needsAuthorApproval: boolean;
  canApply: boolean;
  blocked: boolean;
} {
  if (plan.state === 'BLOCKED' || plan.decision === 'BLOCK') {
    return {
      label: '차단됨',
      approvalPolicyLabel: plan.approvalPolicyLabel,
      needsAuthorApproval: true,
      canApply: false,
      blocked: true,
    };
  }
  if (plan.state === 'HOLD' || plan.decision === 'HOLD') {
    return {
      label: '확인 필요',
      approvalPolicyLabel: plan.approvalPolicyLabel,
      needsAuthorApproval: true,
      canApply: false,
      blocked: false,
    };
  }
  if (plan.state === 'APPROVED' && plan.decision === 'ALLOW') {
    return {
      label: '작가 승인 완료',
      approvalPolicyLabel: plan.approvalPolicyLabel,
      needsAuthorApproval: false,
      canApply: true,
      blocked: false,
    };
  }
  if (plan.canAutoApply && plan.approvalPolicy === 'auto-apply') {
    return {
      label: '바로 적용 가능',
      approvalPolicyLabel: plan.approvalPolicyLabel,
      needsAuthorApproval: false,
      canApply: true,
      blocked: false,
    };
  }
  return {
    label: '작가 승인 대기',
    approvalPolicyLabel: plan.approvalPolicyLabel,
    needsAuthorApproval: true,
    canApply: false,
    blocked: false,
  };
}
