import { L4 } from '@/lib/i18n';

export type NoaResponseStyle = 'calm' | 'friendly' | 'formal' | 'editor' | 'pd' | 'researcher';
export type NoaProposalMode = 'brief' | 'requested' | 'active' | 'approval';
export type NoaConversationLevel = 'quiet' | 'balanced' | 'supportive';
export type NoaApprovalPolicy = 'auto-apply' | 'conditional-approval' | 'always-ask';
export type NoaPosture = 'answer' | 'ask-first' | 'hold' | 'summarize' | 'review';

export interface NoaBehaviorPreferences {
  responseStyle: NoaResponseStyle;
  proposalMode: NoaProposalMode;
  conversationLevel: NoaConversationLevel;
}

export interface NoaBehaviorProfileInput extends NoaBehaviorPreferences {
  language: string;
  approvalPolicy?: NoaApprovalPolicy;
  projectId?: string | null;
  tabKey?: string;
  hasProjectBasis?: boolean;
  hasReadEvidence?: boolean;
  riskHints?: readonly string[];
}

export interface NoaBehaviorProfile {
  responseStyle: NoaResponseStyle;
  proposalMode: NoaProposalMode;
  conversationLevel: NoaConversationLevel;
  approvalPolicy: NoaApprovalPolicy;
  posture: NoaPosture;
  publicLabel: string;
  directive: string;
  visibleHint: string;
  blockedClaims: string[];
  needsAuthorApproval: boolean;
}

export const NOA_BEHAVIOR_PREF_STORE_KEY = 'noa-lg-chatdock-prefs';

export const NOA_RESPONSE_STYLES: readonly NoaResponseStyle[] = [
  'calm',
  'friendly',
  'formal',
  'editor',
  'pd',
  'researcher',
];

export const NOA_PROPOSAL_MODES: readonly NoaProposalMode[] = [
  'brief',
  'requested',
  'active',
  'approval',
];

export const NOA_CONVERSATION_LEVELS: readonly NoaConversationLevel[] = [
  'quiet',
  'balanced',
  'supportive',
];

export const DEFAULT_NOA_BEHAVIOR_PREFERENCES: NoaBehaviorPreferences = {
  responseStyle: 'calm',
  proposalMode: 'brief',
  conversationLevel: 'balanced',
};

function isNoaResponseStyle(value: unknown): value is NoaResponseStyle {
  return NOA_RESPONSE_STYLES.includes(value as NoaResponseStyle);
}

function isNoaProposalMode(value: unknown): value is NoaProposalMode {
  return NOA_PROPOSAL_MODES.includes(value as NoaProposalMode);
}

function isNoaConversationLevel(value: unknown): value is NoaConversationLevel {
  return NOA_CONVERSATION_LEVELS.includes(value as NoaConversationLevel);
}

export function readNoaBehaviorPreferences(): NoaBehaviorPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOA_BEHAVIOR_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(NOA_BEHAVIOR_PREF_STORE_KEY);
    if (!raw) return DEFAULT_NOA_BEHAVIOR_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_NOA_BEHAVIOR_PREFERENCES;
    const candidate = parsed as Record<string, unknown>;
    return {
      responseStyle: isNoaResponseStyle(candidate.responseStyle)
        ? candidate.responseStyle
        : DEFAULT_NOA_BEHAVIOR_PREFERENCES.responseStyle,
      proposalMode: isNoaProposalMode(candidate.proposalMode)
        ? candidate.proposalMode
        : DEFAULT_NOA_BEHAVIOR_PREFERENCES.proposalMode,
      conversationLevel: isNoaConversationLevel(candidate.conversationLevel)
        ? candidate.conversationLevel
        : DEFAULT_NOA_BEHAVIOR_PREFERENCES.conversationLevel,
    };
  } catch {
    return DEFAULT_NOA_BEHAVIOR_PREFERENCES;
  }
}

export function writeNoaBehaviorPreferences(next: NoaBehaviorPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOA_BEHAVIOR_PREF_STORE_KEY, JSON.stringify(next));
  } catch {
    /* private mode or quota error: keep in-memory state only */
  }
}

export function getNoaStyleLabel(language: string, style: NoaResponseStyle): string {
  const labels: Record<NoaResponseStyle, { ko: string; en: string; ja: string; zh: string }> = {
    calm: { ko: '차분함', en: 'Calm', ja: '落ち着き', zh: '沉稳' },
    friendly: { ko: '친근함', en: 'Friendly', ja: '親しみ', zh: '亲和' },
    formal: { ko: '엄숙함', en: 'Formal', ja: '厳粛', zh: '郑重' },
    editor: { ko: '편집자', en: 'Editor', ja: '編集者', zh: '编辑' },
    pd: { ko: 'PD', en: 'PD', ja: 'PD', zh: '责编' },
    researcher: { ko: '연구원', en: 'Researcher', ja: '研究員', zh: '研究员' },
  };
  return L4(language, labels[style]);
}

export function getNoaProposalLabel(language: string, mode: NoaProposalMode): string {
  const labels: Record<NoaProposalMode, { ko: string; en: string; ja: string; zh: string }> = {
    brief: { ko: '짧은 제안', en: 'Brief suggestion', ja: '短い提案', zh: '简短建议' },
    requested: { ko: '요청한 것만', en: 'Only asked', ja: '依頼範囲のみ', zh: '仅按要求' },
    active: { ko: '적극 검토', en: 'Active review', ja: '積極検討', zh: '主动审阅' },
    approval: { ko: '승인 후 제안', en: 'Suggest after approval', ja: '承認後に提案', zh: '批准后建议' },
  };
  return L4(language, labels[mode]);
}

export function getNoaConversationLabel(language: string, level: NoaConversationLevel): string {
  const labels: Record<NoaConversationLevel, { ko: string; en: string; ja: string; zh: string }> = {
    quiet: { ko: '절제', en: 'Reserved', ja: '控えめ', zh: '克制' },
    balanced: { ko: '보통', en: 'Balanced', ja: '標準', zh: '适中' },
    supportive: { ko: '든든하게', en: 'Supportive', ja: '手厚く', zh: '更主动' },
  };
  return L4(language, labels[level]);
}

export function getNoaVisibleHint(language: string, level: NoaConversationLevel): string {
  const labels: Record<NoaConversationLevel, { ko: string; en: string; ja: string; zh: string }> = {
    quiet: {
      ko: '요청 범위 안에서 답합니다',
      en: 'Answers within your request',
      ja: '依頼範囲で答えます',
      zh: '按请求范围回答',
    },
    balanced: {
      ko: '방향은 작가가 정합니다',
      en: 'The author sets the direction',
      ja: '方向は作者が決めます',
      zh: '方向由作者决定',
    },
    supportive: {
      ko: '필요한 선택지를 더 자주 짚습니다',
      en: 'Offers next choices more often',
      ja: '必要な選択肢を多めに示します',
      zh: '更常提示可选方向',
    },
  };
  return L4(language, labels[level]);
}

export function resolveNoaPosture(input: NoaBehaviorProfileInput): NoaPosture {
  if (input.riskHints && input.riskHints.length > 0) return 'hold';
  if (!input.projectId && ['export', 'writing', 'revision'].includes(input.tabKey ?? '')) return 'hold';
  if (input.proposalMode === 'requested' && input.conversationLevel === 'quiet') return 'answer';
  if (input.conversationLevel === 'supportive') return 'review';
  if (!input.hasProjectBasis && ['world', 'character', 'plot', 'scene', 'direction', 'writing'].includes(input.tabKey ?? '')) {
    return 'ask-first';
  }
  return 'answer';
}

function buildStyleGuide(style: NoaResponseStyle): string {
  const guides: Record<NoaResponseStyle, string> = {
    calm: '차분하고 안정적인 말투. 과장 없이 핵심을 정리한다.',
    friendly: '친근하고 부드러운 말투. 가볍게 격려하되 작가의 결정권을 앞세운다.',
    formal: '신중하고 문서적인 말투. 출고·권리/IP·확인서 작업처럼 단정한 표현을 쓴다.',
    editor: '편집자 관점. 작품성, 문장 흐름, 독자 피로도를 날카롭지만 공격적이지 않게 짚는다.',
    pd: 'PD 관점. 회차 흐름, 후킹, 이탈 위험, 다음 화 클릭 이유를 중심으로 말한다.',
    researcher: '연구원 관점. 근거, 충돌, 전제, 미확인 항목을 구분한다.',
  };
  return guides[style];
}

function buildProposalGuide(mode: NoaProposalMode): string {
  const guides: Record<NoaProposalMode, string> = {
    brief: '사용자 요청에 답한 뒤, 필요한 경우 보완 제안은 1개 이하로 짧게 붙인다.',
    requested: '요청한 범위만 답한다. 역제안은 하지 않는다. 다만 저장 실패, 권리/IP 위험, 설정 충돌, 출고 누락은 짧게 알린다.',
    active: '요청 범위 안에서 문제 후보와 개선안을 함께 제시한다. 그래도 작가 확정 전에는 적용을 전제로 말하지 않는다.',
    approval: '먼저 요청 결과만 제시한다. 추가 제안은 사용자가 원하거나 승인할 때 별도 항목으로 분리한다.',
  };
  return guides[mode];
}

function buildConversationGuide(level: NoaConversationLevel): string {
  const guides: Record<NoaConversationLevel, string> = {
    quiet: '대화 밀도는 낮게 둔다. 그래도 무응답처럼 보이지 않게 답변, 보류 사유, 필요한 확인 질문 중 하나는 반드시 남긴다.',
    balanced: '대화 밀도는 보통으로 둔다. 요청 답변을 먼저 주고, 막힐 가능성이 있으면 짧은 확인 질문이나 다음 선택지 1개를 붙인다.',
    supportive: '대화 밀도는 높게 둔다. 사용자가 막히지 않도록 다음 선택지 2~3개, 빠진 재료, 확인 질문을 더 자주 정리한다.',
  };
  return guides[level];
}

function buildApprovalGuide(policy: NoaApprovalPolicy): string {
  const guides: Record<NoaApprovalPolicy, string> = {
    'auto-apply': '낮은 위험의 오탈자·공백·짧은 표현 정리만 바로 적용 가능한 후보로 본다.',
    'conditional-approval': '기본값. 기준선 위반과 권리/IP 위험이 없을 때만 적용 후보로 제시한다.',
    'always-ask': '삭제, 출고, 확인서, 권리/IP, 외부 전송, 프로젝트 이동, 기준선 갱신은 항상 작가 승인 후 진행한다.',
  };
  return guides[policy];
}

export function buildNoaBehaviorDirective(input: NoaBehaviorProfileInput): string {
  const approvalPolicy = input.approvalPolicy ?? 'conditional-approval';
  const languageRule = L4(input.language, {
    ko: '한국어로 자연스럽게 답한다. 어색한 표현, 과장된 책임 회피 문구, 개발자용 용어를 피한다.',
    en: 'Answer naturally in English. Avoid translationese, over-defensive disclaimers and developer-only terms.',
    ja: '自然な日本語で答える。直訳調、過剰な免責表現、開発者向け用語を避ける。',
    zh: '用自然的中文回答。避免翻译腔、过度免责和开发者术语。',
  });

  return [
    '[노아 행동 프로필]',
    `- 말투: ${buildStyleGuide(input.responseStyle)}`,
    `- 제안 방식: ${buildProposalGuide(input.proposalMode)}`,
    `- 대화 밀도: ${buildConversationGuide(input.conversationLevel)}`,
    `- 승인 경계: ${buildApprovalGuide(approvalPolicy)}`,
    '- 기본 전제: 노아는 작가의 방향을 먼저 확인한다. 단, 대화 밀도가 낮아도 화면에서 사라지듯 침묵하지 않는다.',
    '- 노아는 선택지를 정리하고, 작가는 결정한다. 변경·채택·출고·권리/IP 관련 판단은 작가 승인 전 확정된 것처럼 말하지 않는다.',
    '- 근거가 부족하면 짧게 보류 사유를 말하고 확인 질문을 남긴다. 모르는 내용을 기억처럼 단정하지 않는다.',
    `- 언어: ${languageRule}`,
  ].join('\n');
}

export function buildNoaBehaviorProfile(input: NoaBehaviorProfileInput): NoaBehaviorProfile {
  const approvalPolicy = input.approvalPolicy ?? 'conditional-approval';
  const posture = resolveNoaPosture(input);
  const needsAuthorApproval = approvalPolicy === 'always-ask' || posture === 'hold';
  const publicLabel = [
    getNoaStyleLabel(input.language, input.responseStyle),
    getNoaProposalLabel(input.language, input.proposalMode),
    getNoaConversationLabel(input.language, input.conversationLevel),
  ].join(' · ');

  return {
    responseStyle: input.responseStyle,
    proposalMode: input.proposalMode,
    conversationLevel: input.conversationLevel,
    approvalPolicy,
    posture,
    publicLabel,
    directive: buildNoaBehaviorDirective(input),
    visibleHint: getNoaVisibleHint(input.language, input.conversationLevel),
    blockedClaims: ['노아가 최종 승인', '노아가 대신 결정', '읽지 않은 자료 분석 완료', '다른 프로젝트 기억 자동 사용'],
    needsAuthorApproval,
  };
}
