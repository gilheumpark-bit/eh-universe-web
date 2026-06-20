import {
  approveNoaComposePlan,
  buildNoaComposeGitHubPaths,
  buildNoaComposeScopeKey,
  createNoaComposePlan,
  createNoaComposeReceipt,
  summarizeNoaComposePlan,
  validateNoaComposeReceipt,
  type NoaComposeChange,
} from '@/lib/loreguard/noa-compose';

const baseChange: NoaComposeChange = {
  changeId: 'world-core-1',
  surface: 'world',
  actionType: 'CREATE',
  title: '핵심 전제 보강',
  targetRef: 'world.corePremise',
  summary: '세계관 핵심 전제를 프로젝트 캔버스에 반영한다.',
  referencesRequired: ['world:core-premise'],
  referencesUsed: ['world:core-premise'],
  riskLevel: 'low',
};

describe('noa-compose', () => {
  it('프로젝트 범위가 없으면 보류 상태로 고정한다', () => {
    const plan = createNoaComposePlan({
      projectId: '',
      composeId: 'compose-1',
      title: '프로젝트 없음',
      prompt: '세계관을 정리해줘',
      changes: [baseChange],
      now: 1_000,
    });

    expect(plan.state).toBe('HOLD');
    expect(plan.decision).toBe('HOLD');
    expect(plan.reasonCodes).toContain('PROJECT_SCOPE_REQUIRED');
    expect(plan.scopeKey).toBe(buildNoaComposeScopeKey('', 'compose-1'));
    expect(validateNoaComposeReceipt(plan)).toBe(true);
  });

  it('필수 참조가 빠지면 작가 승인 전 단계에서 보류한다', () => {
    const plan = createNoaComposePlan({
      projectId: 'novel-a',
      composeId: 'compose-2',
      title: '씬시트 묶음',
      prompt: '씬시트와 연출을 같이 맞춰줘',
      changes: [
        {
          ...baseChange,
          surface: 'scene',
          referencesRequired: ['world:core-premise', 'scene:current'],
          referencesUsed: ['world:core-premise'],
        },
      ],
      now: 2_000,
    });

    expect(plan.state).toBe('HOLD');
    expect(plan.missingReferences).toEqual(['scene:current']);
    expect(plan.reasonCodes).toContain('MISSING_REFERENCE');

    const approved = approveNoaComposePlan(plan, { now: 2_100 });
    expect(approved.state).toBe('HOLD');
    expect(approved.approvedBy).toBeUndefined();
  });

  it('critical 위험 변경은 차단하고 적용 가능 상태로 만들지 않는다', () => {
    const plan = createNoaComposePlan({
      projectId: 'novel-a',
      composeId: 'compose-3',
      title: '위험 후보',
      prompt: '출고 전에 위험한 참조를 반영해줘',
      changes: [{ ...baseChange, riskLevel: 'critical' }],
      now: 3_000,
    });

    expect(plan.state).toBe('BLOCKED');
    expect(plan.decision).toBe('BLOCK');
    expect(plan.reasonCodes).toEqual(expect.arrayContaining(['HIGH_RISK_CHANGE', 'IP_RISK']));
    expect(summarizeNoaComposePlan(plan)).toMatchObject({
      label: '차단됨',
      canApply: false,
      blocked: true,
    });
  });

  it('high 위험과 출고/확인서 계열은 차단 대신 항상 물어보기로 보류한다', () => {
    const plan = createNoaComposePlan({
      projectId: 'novel-a',
      composeId: 'compose-3b',
      title: '확인서 출고 후보',
      prompt: '출고 패키지를 묶어줘',
      changes: [{
        ...baseChange,
        surface: 'export',
        actionType: 'SEAL',
        title: '확인서와 IP Pack 반영',
        targetRef: 'export.certificate',
        riskLevel: 'high',
      }],
      now: 3_100,
    });

    expect(plan.state).toBe('HOLD');
    expect(plan.decision).toBe('HOLD');
    expect(plan.approvalPolicy).toBe('always-ask');
    expect(plan.approvalPolicyLabel).toBe('항상 물어보기');
    expect(summarizeNoaComposePlan(plan)).toMatchObject({
      label: '확인 필요',
      canApply: false,
      blocked: false,
    });
  });

  it('참조가 충족된 계획은 작가 승인 대기 상태가 되고 승인 후 영수증이 유효해진다', () => {
    const plan = createNoaComposePlan({
      projectId: 'novel-a',
      composeId: 'compose-4',
      title: '세계관 보강',
      prompt: '핵심 전제를 정리해서 캔버스 후보로 묶어줘',
      changes: [baseChange],
      now: 4_000,
    });

    expect(plan.state).toBe('PROPOSED');
    expect(plan.decision).toBe('ALLOW_MINIMAL');
    expect(plan.approvalPolicy).toBe('conditional-approval');
    expect(summarizeNoaComposePlan(plan)).toMatchObject({
      label: '작가 승인 대기',
      needsAuthorApproval: true,
      canApply: false,
    });

    const approved = approveNoaComposePlan(plan, { approvedBy: 'human-author', now: 4_100 });
    expect(approved.state).toBe('APPROVED');
    expect(approved.decision).toBe('ALLOW');
    expect(approved.approvedBy).toBe('human-author');
    expect(validateNoaComposeReceipt(approved)).toBe(true);

    const receipt = createNoaComposeReceipt(approved, {
      inputHash: 'sha256:input',
      outputHash: 'sha256:output',
      timestamp: 4_200,
    });
    expect(receipt.projectId).toBe('novel-a');
    expect(receipt.actionType).toBe('COMPOSE');
    expect(receipt.approvedBy).toBe('human-author');
    expect(receipt.reasonCodes).toEqual(expect.arrayContaining(['HUMAN_APPROVED', 'REFERENCE_COMPLETE']));
  });

  it('낮은 위험 변경은 사용자가 원할 때 바로 적용 정책으로 표시할 수 있다', () => {
    const plan = createNoaComposePlan({
      projectId: 'novel-a',
      composeId: 'compose-4b',
      title: '오타 후보',
      prompt: '낮은 위험 문구 정리',
      approvalPolicyPreference: 'auto-apply',
      changes: [{ ...baseChange, actionType: 'REWRITE', title: '오타 후보 정리' }],
      now: 4_500,
    });

    expect(plan.approvalPolicy).toBe('auto-apply');
    expect(plan.canAutoApply).toBe(true);
    expect(summarizeNoaComposePlan(plan)).toMatchObject({
      label: '바로 적용 가능',
      needsAuthorApproval: false,
      canApply: true,
    });
  });

  it('노아가 승인자로 들어오면 승인 상태로 승격하지 않는다', () => {
    const plan = createNoaComposePlan({
      projectId: 'novel-a',
      composeId: 'compose-5',
      title: '노아 승인 시도',
      prompt: '그냥 적용해줘',
      changes: [baseChange],
      now: 5_000,
    });

    const invalid = approveNoaComposePlan(plan, {
      selectedBy: 'ai-proposer',
      approvedBy: 'ai-proposer',
      now: 5_100,
    });

    expect(invalid.state).toBe('HOLD');
    expect(invalid.decision).toBe('HOLD');
    expect(invalid.approvedBy).toBeUndefined();
    expect(invalid.reasonCodes).toContain('AI_DECISION_ATTEMPT');
    expect(validateNoaComposeReceipt(invalid)).toBe(true);
  });

  it('GitHub 저장 경로는 항상 프로젝트 폴더 아래로 만든다', () => {
    const paths = buildNoaComposeGitHubPaths('프로젝트 A', '컴포즈 1');

    expect(paths.composeJson).toBe('projects/프로젝트-A/compose/컴포즈-1.json');
    expect(paths.composeReceiptLog).toBe('projects/프로젝트-A/receipts/compose.jsonl');
    expect(paths.composeWorkNote).toBe('projects/프로젝트-A/work-notes/noa-compose.md');
  });
});
