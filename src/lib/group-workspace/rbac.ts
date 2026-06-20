import type { LoreguardPlanId } from '@/lib/billing/loreguard-plans';
import { buildBillingEntitlementSnapshot } from '@/lib/billing/loreguard-plans';

// ============================================================
// PART 1 — Group Workspace Types
// ============================================================

export type GroupRole = 'owner' | 'admin' | 'pd' | 'editor' | 'writer' | 'viewer' | 'accounting';
export type GroupPermission =
  | 'workspace.manage'
  | 'member.invite'
  | 'member.remove'
  | 'billing.manage'
  | 'project.assign'
  | 'record.shared.read'
  | 'record.shared.write'
  | 'record.private.own.read'
  | 'record.private.own.write'
  | 'risk.summary.read'
  | 'submission.package.read'
  | 'submission.package.issue';

export type GroupRecordScope =
  | 'private-note'
  | 'shared-process-record'
  | 'submission-package'
  | 'billing-summary'
  | 'member-risk-summary';

export interface GroupMember {
  uid: string;
  displayName: string;
  role: GroupRole;
  active: boolean;
}

export interface GroupWorkspace {
  id: string;
  name: string;
  planId: LoreguardPlanId;
  ownerUid: string;
  members: GroupMember[];
  createdAtMs: number;
}

export interface RecordAccessInput {
  role: GroupRole;
  scope: GroupRecordScope;
  isAuthor: boolean;
}

export interface RecordAccessDecision {
  allowed: boolean;
  reasonKo: string;
  visibleFields: string[];
}

export interface ProjectScopedRecordAccessInput extends RecordAccessInput {
  projectId?: string | null;
  assignedProjectIds?: readonly string[];
}

export interface ProjectScopedRecordAccessDecision extends RecordAccessDecision {
  projectId: string | null;
  projectScoped: boolean;
  projectScopeNoteKo: string;
}

export interface GroupReleaseLedgerScopeInput {
  workspaceId: string;
  role: GroupRole;
  projectId?: string | null;
  packageProfileId: string;
  certificateId?: string | null;
  assignedProjectIds?: readonly string[];
}

export interface GroupReleaseLedgerScope {
  workspaceId: string;
  projectId: string | null;
  packageProfileId: string;
  issueAllowed: boolean;
  idempotencyScopeKey: string;
  reasonKo: string;
  visibleFields: string[];
}

export interface GroupWorkspaceReadiness {
  status: 'ready' | 'upgrade-required' | 'owner-required' | 'seat-limit';
  reasonKo: string;
}

// ============================================================
// PART 2 — Role Matrix
// ============================================================

const ROLE_PERMISSIONS: Record<GroupRole, ReadonlySet<GroupPermission>> = {
  owner: new Set([
    'workspace.manage',
    'member.invite',
    'member.remove',
    'billing.manage',
    'project.assign',
    'record.shared.read',
    'record.shared.write',
    'record.private.own.read',
    'record.private.own.write',
    'risk.summary.read',
    'submission.package.read',
    'submission.package.issue',
  ]),
  admin: new Set([
    'member.invite',
    'member.remove',
    'project.assign',
    'record.shared.read',
    'record.shared.write',
    'record.private.own.read',
    'record.private.own.write',
    'risk.summary.read',
    'submission.package.read',
    'submission.package.issue',
  ]),
  pd: new Set([
    'project.assign',
    'record.shared.read',
    'record.shared.write',
    'record.private.own.read',
    'record.private.own.write',
    'risk.summary.read',
    'submission.package.read',
  ]),
  editor: new Set([
    'record.shared.read',
    'record.shared.write',
    'record.private.own.read',
    'record.private.own.write',
    'submission.package.read',
  ]),
  writer: new Set([
    'record.shared.read',
    'record.shared.write',
    'record.private.own.read',
    'record.private.own.write',
    'submission.package.read',
  ]),
  viewer: new Set(['record.shared.read', 'submission.package.read']),
  accounting: new Set(['billing.manage']),
};

const SHARED_RECORD_FIELDS = ['recordId', 'projectId', 'eventType', 'summary', 'at', 'actorRole'];
const SUBMISSION_FIELDS = ['packageId', 'projectId', 'profile', 'issuedAt', 'rightsSummary', 'riskSummary'];
const RISK_SUMMARY_FIELDS = ['memberUid', 'projectId', 'hciBand', 'riskBand', 'lastUpdatedAt'];
const BILLING_FIELDS = ['workspaceId', 'planId', 'seatCount', 'invoiceStatus', 'nextRenewalAt'];
const PRIVATE_NOTE_FIELDS = ['noteId', 'projectId', 'authorUid', 'body', 'at'];

// ============================================================
// PART 3 — Permission Helpers
// ============================================================

export function listGroupPermissions(role: GroupRole): GroupPermission[] {
  return Array.from(ROLE_PERMISSIONS[role]);
}

export function hasGroupPermission(role: GroupRole, permission: GroupPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

function compactScopeSegment(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? '').trim().toLowerCase();
  const compacted = normalized
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return compacted || fallback;
}

function roleCanReadAllGroupProjects(role: GroupRole): boolean {
  return role === 'owner' || role === 'admin';
}

function isProjectAssigned(projectId: string, assignedProjectIds: readonly string[] | undefined): boolean {
  if (!Array.isArray(assignedProjectIds)) return false;
  return assignedProjectIds.some((assignedProjectId) =>
    compactScopeSegment(assignedProjectId, '') === projectId,
  );
}

export function canCreateGroupWorkspace(planId: LoreguardPlanId): boolean {
  return buildBillingEntitlementSnapshot(planId).publisherSlaIncluded;
}

export function buildGroupWorkspaceTemplate(input: {
  id: string;
  name: string;
  ownerUid: string;
  ownerName: string;
  createdAtMs: number;
  planId?: LoreguardPlanId;
}): GroupWorkspace {
  return {
    id: input.id,
    name: input.name.trim(),
    planId: input.planId ?? 'publisher',
    ownerUid: input.ownerUid,
    createdAtMs: input.createdAtMs,
    members: [{
      uid: input.ownerUid,
      displayName: input.ownerName.trim() || 'Owner',
      role: 'owner',
      active: true,
    }],
  };
}

export function evaluateGroupWorkspaceReadiness(workspace: GroupWorkspace): GroupWorkspaceReadiness {
  if (!canCreateGroupWorkspace(workspace.planId)) {
    return { status: 'upgrade-required', reasonKo: '그룹 워크스페이스는 Publisher 계약 경로에서 사용합니다.' };
  }
  const owner = workspace.members.find((member) => member.uid === workspace.ownerUid && member.role === 'owner' && member.active);
  if (!owner) {
    return { status: 'owner-required', reasonKo: '활성 owner 멤버가 필요합니다.' };
  }
  const activeCount = workspace.members.filter((member) => member.active).length;
  if (activeCount > 50 && workspace.planId !== 'publisher') {
    return { status: 'seat-limit', reasonKo: '현재 플랜의 그룹 좌석 한도를 초과했습니다.' };
  }
  return { status: 'ready', reasonKo: '그룹 권한 경계가 준비되었습니다.' };
}

// ============================================================
// PART 4 — Record Access Boundary
// ============================================================

export function decideRecordAccess(input: RecordAccessInput): RecordAccessDecision {
  if (input.scope === 'private-note') {
    if (input.isAuthor && hasGroupPermission(input.role, 'record.private.own.read')) {
      return {
        allowed: true,
        reasonKo: '개인 작업노트는 작성자 본인만 열람합니다.',
        visibleFields: PRIVATE_NOTE_FIELDS,
      };
    }
    return {
      allowed: false,
      reasonKo: '개인 작업노트는 그룹 관리자에게도 공유되지 않습니다.',
      visibleFields: [],
    };
  }

  if (input.scope === 'shared-process-record') {
    return {
      allowed: hasGroupPermission(input.role, 'record.shared.read'),
      reasonKo: hasGroupPermission(input.role, 'record.shared.read')
        ? '공유 과정기록은 역할 권한 범위에서 열람합니다.'
        : '공유 과정기록 열람 권한이 없습니다.',
      visibleFields: hasGroupPermission(input.role, 'record.shared.read') ? SHARED_RECORD_FIELDS : [],
    };
  }

  if (input.scope === 'submission-package') {
    return {
      allowed: hasGroupPermission(input.role, 'submission.package.read'),
      reasonKo: hasGroupPermission(input.role, 'submission.package.read')
        ? '출고 패키지는 제출 권한 범위에서 열람합니다.'
        : '출고 패키지 열람 권한이 없습니다.',
      visibleFields: hasGroupPermission(input.role, 'submission.package.read') ? SUBMISSION_FIELDS : [],
    };
  }

  if (input.scope === 'member-risk-summary') {
    return {
      allowed: hasGroupPermission(input.role, 'risk.summary.read'),
      reasonKo: hasGroupPermission(input.role, 'risk.summary.read')
        ? '멤버 위험 요약은 집계 필드만 열람합니다.'
        : '멤버 위험 요약 열람 권한이 없습니다.',
      visibleFields: hasGroupPermission(input.role, 'risk.summary.read') ? RISK_SUMMARY_FIELDS : [],
    };
  }

  return {
    allowed: hasGroupPermission(input.role, 'billing.manage'),
    reasonKo: hasGroupPermission(input.role, 'billing.manage')
      ? '결제 요약은 결제 담당 역할만 열람합니다.'
      : '결제 요약 열람 권한이 없습니다.',
    visibleFields: hasGroupPermission(input.role, 'billing.manage') ? BILLING_FIELDS : [],
  };
}

export function canIssueSubmissionPackage(role: GroupRole): boolean {
  return hasGroupPermission(role, 'submission.package.issue');
}

export function decideProjectScopedRecordAccess(
  input: ProjectScopedRecordAccessInput,
): ProjectScopedRecordAccessDecision {
  const projectId = input.projectId?.trim() ? compactScopeSegment(input.projectId, 'project-draft') : null;
  const baseDecision = decideRecordAccess(input);

  if (!projectId) {
    return {
      allowed: false,
      reasonKo: '프로젝트가 선택되지 않아 그룹 자료를 열람하지 않습니다.',
      visibleFields: [],
      projectId: null,
      projectScoped: false,
      projectScopeNoteKo: '프로젝트 선택 후 작품별 권한 경계를 적용합니다.',
    };
  }

  if (!baseDecision.allowed) {
    return {
      ...baseDecision,
      projectId,
      projectScoped: true,
      projectScopeNoteKo: `프로젝트 ${projectId} 기준으로 접근이 차단되었습니다.`,
    };
  }

  const billingOnly = input.scope === 'billing-summary';
  const assigned = isProjectAssigned(projectId, input.assignedProjectIds);
  const canAccessProject = billingOnly || roleCanReadAllGroupProjects(input.role) || assigned;

  if (!canAccessProject) {
    return {
      allowed: false,
      reasonKo: '이 프로젝트에 배정된 멤버만 해당 자료를 열람합니다.',
      visibleFields: [],
      projectId,
      projectScoped: true,
      projectScopeNoteKo: `프로젝트 ${projectId} 기준으로 그룹 접근권한을 분리합니다.`,
    };
  }

  return {
    ...baseDecision,
    projectId,
    projectScoped: true,
    projectScopeNoteKo: `프로젝트 ${projectId} 기준으로 그룹 접근권한을 분리합니다.`,
  };
}

export function buildGroupReleaseLedgerScope(input: GroupReleaseLedgerScopeInput): GroupReleaseLedgerScope {
  const workspaceId = compactScopeSegment(input.workspaceId, 'workspace-draft');
  const packageProfileId = compactScopeSegment(input.packageProfileId, 'package');
  const projectAccess = decideProjectScopedRecordAccess({
    role: input.role,
    scope: 'submission-package',
    isAuthor: false,
    projectId: input.projectId,
    assignedProjectIds: input.assignedProjectIds,
  });
  const certificateId = compactScopeSegment(input.certificateId, 'no-certificate');
  const projectId = projectAccess.projectId;
  const issueAllowed = projectAccess.allowed && canIssueSubmissionPackage(input.role);

  return {
    workspaceId,
    projectId,
    packageProfileId,
    issueAllowed,
    idempotencyScopeKey: [
      'group-release',
      workspaceId,
      projectId ?? 'project-draft',
      packageProfileId,
      certificateId,
    ].join(':'),
    reasonKo: issueAllowed
      ? '그룹 출고 원장을 프로젝트 단위로 분리해 기록할 수 있습니다.'
      : projectAccess.reasonKo,
    visibleFields: issueAllowed ? projectAccess.visibleFields : [],
  };
}
