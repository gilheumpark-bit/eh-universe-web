import {
  buildGroupReleaseLedgerScope,
  buildGroupWorkspaceTemplate,
  canCreateGroupWorkspace,
  canIssueSubmissionPackage,
  decideProjectScopedRecordAccess,
  decideRecordAccess,
  evaluateGroupWorkspaceReadiness,
  hasGroupPermission,
} from '../rbac';

describe('group-workspace rbac', () => {
  it('limits group workspace creation to the publisher route', () => {
    expect(canCreateGroupWorkspace('publisher')).toBe(true);
    expect(canCreateGroupWorkspace('pro')).toBe(false);
    expect(canCreateGroupWorkspace('starter')).toBe(false);
  });

  it('builds a publisher workspace with an active owner', () => {
    const workspace = buildGroupWorkspaceTemplate({
      id: 'group-1',
      name: '  Moon House  ',
      ownerUid: 'owner-1',
      ownerName: '  Park PD  ',
      createdAtMs: 1_812_828_000_000,
    });

    expect(workspace.name).toBe('Moon House');
    expect(workspace.planId).toBe('publisher');
    expect(workspace.members).toEqual([{
      uid: 'owner-1',
      displayName: 'Park PD',
      role: 'owner',
      active: true,
    }]);
    expect(evaluateGroupWorkspaceReadiness(workspace).status).toBe('ready');
  });

  it('reports upgrade and owner readiness blockers', () => {
    const proWorkspace = buildGroupWorkspaceTemplate({
      id: 'group-2',
      name: 'Pro Team',
      ownerUid: 'owner-2',
      ownerName: 'Owner',
      createdAtMs: 1,
      planId: 'pro',
    });

    expect(evaluateGroupWorkspaceReadiness(proWorkspace)).toMatchObject({
      status: 'upgrade-required',
    });

    const ownerMissingWorkspace = {
      ...buildGroupWorkspaceTemplate({
        id: 'group-3',
        name: 'Publisher Team',
        ownerUid: 'owner-3',
        ownerName: 'Owner',
        createdAtMs: 1,
      }),
      members: [{
        uid: 'owner-3',
        displayName: 'Owner',
        role: 'admin' as const,
        active: true,
      }],
    };

    expect(evaluateGroupWorkspaceReadiness(ownerMissingWorkspace)).toMatchObject({
      status: 'owner-required',
    });
  });

  it('keeps private notes visible only to the note author', () => {
    const ownerDecision = decideRecordAccess({
      role: 'owner',
      scope: 'private-note',
      isAuthor: false,
    });
    const authorDecision = decideRecordAccess({
      role: 'writer',
      scope: 'private-note',
      isAuthor: true,
    });

    expect(ownerDecision.allowed).toBe(false);
    expect(ownerDecision.visibleFields).toEqual([]);
    expect(authorDecision.allowed).toBe(true);
    expect(authorDecision.visibleFields).toContain('body');
  });

  it('shares only aggregate risk fields with PD roles', () => {
    const pdDecision = decideRecordAccess({
      role: 'pd',
      scope: 'member-risk-summary',
      isAuthor: false,
    });

    expect(pdDecision.allowed).toBe(true);
    expect(pdDecision.visibleFields).toEqual([
      'memberUid',
      'projectId',
      'hciBand',
      'riskBand',
      'lastUpdatedAt',
    ]);
    expect(pdDecision.visibleFields).not.toContain('body');
  });

  it('separates billing, shared records, and package issuance by role', () => {
    expect(decideRecordAccess({
      role: 'accounting',
      scope: 'billing-summary',
      isAuthor: false,
    }).allowed).toBe(true);
    expect(decideRecordAccess({
      role: 'accounting',
      scope: 'shared-process-record',
      isAuthor: false,
    }).allowed).toBe(false);

    expect(hasGroupPermission('viewer', 'record.shared.write')).toBe(false);
    expect(decideRecordAccess({
      role: 'viewer',
      scope: 'submission-package',
      isAuthor: false,
    }).allowed).toBe(true);

    expect(canIssueSubmissionPackage('owner')).toBe(true);
    expect(canIssueSubmissionPackage('admin')).toBe(true);
    expect(canIssueSubmissionPackage('pd')).toBe(false);
    expect(canIssueSubmissionPackage('writer')).toBe(false);
  });

  it('keeps group records scoped to assigned projects', () => {
    const assigned = decideProjectScopedRecordAccess({
      role: 'pd',
      scope: 'submission-package',
      isAuthor: false,
      projectId: 'project-alpha',
      assignedProjectIds: ['project-alpha'],
    });
    const otherProject = decideProjectScopedRecordAccess({
      role: 'pd',
      scope: 'submission-package',
      isAuthor: false,
      projectId: 'project-beta',
      assignedProjectIds: ['project-alpha'],
    });
    const ownerProject = decideProjectScopedRecordAccess({
      role: 'owner',
      scope: 'submission-package',
      isAuthor: false,
      projectId: 'project-beta',
      assignedProjectIds: [],
    });

    expect(assigned.allowed).toBe(true);
    expect(assigned.projectScopeNoteKo).toBe('프로젝트 project-alpha 기준으로 그룹 접근권한을 분리합니다.');
    expect(otherProject.allowed).toBe(false);
    expect(otherProject.visibleFields).toEqual([]);
    expect(otherProject.reasonKo).toBe('이 프로젝트에 배정된 멤버만 해당 자료를 열람합니다.');
    expect(ownerProject.allowed).toBe(true);
    expect(ownerProject.visibleFields).toContain('packageId');
  });

  it('blocks group package records until a project is selected', () => {
    const decision = decideProjectScopedRecordAccess({
      role: 'owner',
      scope: 'submission-package',
      isAuthor: false,
      projectId: '',
      assignedProjectIds: ['project-alpha'],
    });

    expect(decision.allowed).toBe(false);
    expect(decision.projectScoped).toBe(false);
    expect(decision.reasonKo).toBe('프로젝트가 선택되지 않아 그룹 자료를 열람하지 않습니다.');
  });

  it('builds project-separated group release ledger scope keys', () => {
    const first = buildGroupReleaseLedgerScope({
      workspaceId: 'publisher-house',
      role: 'admin',
      projectId: 'project-alpha',
      packageProfileId: 'ip-sale',
      certificateId: 'cert-1',
    });
    const second = buildGroupReleaseLedgerScope({
      workspaceId: 'publisher-house',
      role: 'admin',
      projectId: 'project-beta',
      packageProfileId: 'ip-sale',
      certificateId: 'cert-1',
    });
    const writer = buildGroupReleaseLedgerScope({
      workspaceId: 'publisher-house',
      role: 'writer',
      projectId: 'project-alpha',
      packageProfileId: 'ip-sale',
      certificateId: 'cert-1',
      assignedProjectIds: ['project-alpha'],
    });

    expect(first.issueAllowed).toBe(true);
    expect(first.idempotencyScopeKey).toBe('group-release:publisher-house:project-alpha:ip-sale:cert-1');
    expect(second.idempotencyScopeKey).toBe('group-release:publisher-house:project-beta:ip-sale:cert-1');
    expect(first.idempotencyScopeKey).not.toBe(second.idempotencyScopeKey);
    expect(writer.issueAllowed).toBe(false);
    expect(writer.visibleFields).toEqual([]);
  });
});
