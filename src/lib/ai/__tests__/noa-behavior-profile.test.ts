import {
  DEFAULT_NOA_BEHAVIOR_PREFERENCES,
  buildNoaBehaviorDirective,
  buildNoaBehaviorProfile,
  getNoaConversationLabel,
  readNoaBehaviorPreferences,
} from '../noa-behavior-profile';

describe('noa-behavior-profile', () => {
  afterEach(() => {
    window.localStorage.removeItem('noa-lg-chatdock-prefs');
  });

  it('기본 대화 밀도는 보통이며 무응답 침묵을 금지한다', () => {
    const directive = buildNoaBehaviorDirective({
      language: 'KO',
      ...DEFAULT_NOA_BEHAVIOR_PREFERENCES,
    });

    expect(DEFAULT_NOA_BEHAVIOR_PREFERENCES.conversationLevel).toBe('balanced');
    expect(DEFAULT_NOA_BEHAVIOR_PREFERENCES.responseStyle).toBe('pd');
    expect(directive).toContain('대화 밀도');
    expect(directive).toContain('화면에서 사라지듯 침묵하지 않는다');
    expect(directive).toContain('짧은 확인 질문이나 다음 선택지 1개');
    expect(directive).toContain('정책문처럼 길게 드러내지 않는다');
  });

  it('절제 모드도 답변 또는 보류 사유를 남기도록 지시한다', () => {
    const directive = buildNoaBehaviorDirective({
      language: 'KO',
      responseStyle: 'calm',
      proposalMode: 'requested',
      conversationLevel: 'quiet',
    });

    expect(directive).toContain('대화 밀도는 낮게');
    expect(directive).toContain('무응답처럼 보이지 않게');
    expect(directive).toContain('작가가 지시한 범위만 답한다');
  });

  it('든든하게 모드는 다음 선택지와 빠진 재료를 더 자주 정리한다', () => {
    const profile = buildNoaBehaviorProfile({
      language: 'KO',
      responseStyle: 'pd',
      proposalMode: 'active',
      conversationLevel: 'supportive',
      tabKey: 'writing',
      projectId: 'project-a',
      hasProjectBasis: true,
    });

    expect(profile.posture).toBe('review');
    expect(profile.publicLabel).toContain('든든하게');
    expect(profile.directive).toContain('다음 선택지 2~3개');
    expect(profile.visibleHint).toContain('선택지');
  });

  it('권리와 출고 경계는 항상 작가 승인 필요 상태로 표현할 수 있다', () => {
    const profile = buildNoaBehaviorProfile({
      language: 'KO',
      responseStyle: 'formal',
      proposalMode: 'approval',
      conversationLevel: 'balanced',
      approvalPolicy: 'always-ask',
      tabKey: 'export',
      projectId: 'project-a',
      riskHints: ['rights'],
    });

    expect(profile.posture).toBe('hold');
    expect(profile.needsAuthorApproval).toBe(true);
    expect(profile.directive).toContain('항상 작가 승인 후 진행한다');
    expect(profile.blockedClaims).toContain('노아가 최종 승인');
  });

  it('잘못된 저장값은 안전한 기본값으로 복구한다', () => {
    window.localStorage.setItem(
      'noa-lg-chatdock-prefs',
      JSON.stringify({ responseStyle: 'ghost', proposalMode: 'silent', conversationLevel: 'mute' }),
    );

    expect(readNoaBehaviorPreferences()).toEqual(DEFAULT_NOA_BEHAVIOR_PREFERENCES);
  });

  it('4개국어 대화 밀도 라벨을 제공한다', () => {
    expect(getNoaConversationLabel('KO', 'balanced')).toBe('보통');
    expect(getNoaConversationLabel('EN', 'balanced')).toBe('Balanced');
    expect(getNoaConversationLabel('JP', 'balanced')).toBe('標準');
    expect(getNoaConversationLabel('CN', 'balanced')).toBe('适中');
  });
});
