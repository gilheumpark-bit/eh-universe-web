import type { ProjectRightsLedgerEntry } from '@/lib/studio-types';
import type { MediaIpPackRightsLedgerRow } from '@/lib/creative/media-ip-pack-markdown';
import type { CoreCopyrightPackage } from './core-copyright-package';

export type RightsProposalAxisId =
  | 'rights-scope'
  | 'term'
  | 'territory-language'
  | 'revenue'
  | 'adaptation-control'
  | 'reversion'
  | 'credit';

export type RightsProposalAxisStatus = 'clear' | 'watch' | 'missing';
export type RightsIndustryRiskSeverity = 'watch' | 'high';

export interface RightsProposalAxisReview {
  id: RightsProposalAxisId;
  labelKo: string;
  status: RightsProposalAxisStatus;
  foundKo: string;
  noteKo: string;
  questionKo: string;
}

export interface RightsIndustryRiskPattern {
  id: string;
  labelKo: string;
  severity: RightsIndustryRiskSeverity;
  detectedKo: string;
  patternKo: string;
  counterMoveKo: string;
  questionKo: string;
}

export interface RightsProposalAdvisorInput {
  proposalText: string;
  corePackage: CoreCopyrightPackage;
  rightsLedger?: readonly (ProjectRightsLedgerEntry | MediaIpPackRightsLedgerRow)[];
  generatedAtKo?: string;
}

export interface RightsProposalAdvisorResult {
  kind: 'loreguard.rights-proposal-advisor.v1';
  workTitle: string;
  generatedAtKo: string;
  hasProposal: boolean;
  statusKo: string;
  summaryKo: string;
  axisReviews: RightsProposalAxisReview[];
  rightsMapKo: {
    passingKo: string[];
    retainedKo: string[];
    ambiguousKo: string[];
  };
  opportunityNotesKo: string[];
  watchNotesKo: string[];
  industryRiskPatterns: RightsIndustryRiskPattern[];
  meetingQuestionsKo: string[];
  replyDraftKo: string;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function collectMatches(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

const AXES: Array<{
  id: RightsProposalAxisId;
  labelKo: string;
  keywords: string[];
  watchKeywords: string[];
  missingQuestionKo: string;
  watchNoteKo: string;
}> = [
  {
    id: 'rights-scope',
    labelKo: '권리 범위',
    keywords: ['출판권', '전자책', '웹툰화', '영상화', '영화화', '드라마화', '게임', '굿즈', '오디오북', '해외권', '2차 저작물'],
    watchKeywords: ['일체', '전부', '모든 권리', '포괄', '독점'],
    missingQuestionKo: '이번 제안에 포함되는 권리 범위가 출판권, 웹툰화, 영상화, 해외권, 굿즈/게임/오디오북 중 어디까지인지 확인이 필요합니다.',
    watchNoteKo: '권리 범위가 넓거나 포괄 표현이 있어 넘기는 권리와 남는 권리를 분리해야 합니다.',
  },
  {
    id: 'term',
    labelKo: '기간',
    keywords: ['계약 기간', '기간', '년', '개월', '자동 연장', '갱신', '우선협상'],
    watchKeywords: ['영구', '무기한', '자동 연장', '독점 우선'],
    missingQuestionKo: '계약 기간, 자동 연장 여부, 우선협상권의 유효 기간을 확인해야 합니다.',
    watchNoteKo: '기간이 길거나 자동 연장 표현이 있어 회수 일정을 따로 잡아야 합니다.',
  },
  {
    id: 'territory-language',
    labelKo: '지역/언어',
    keywords: ['국내', '한국', '일본', '중국', '미국', '북미', '영어권', '전 세계', '글로벌', '언어권', '번역'],
    watchKeywords: ['전 세계', '글로벌', '모든 국가', '전 언어'],
    missingQuestionKo: '지역과 언어권이 국내 한정인지, 해외/전 세계까지 포함되는지 확인해야 합니다.',
    watchNoteKo: '지역·언어 범위가 넓어 해외권을 별도로 남길 수 있는지 검토해야 합니다.',
  },
  {
    id: 'revenue',
    labelKo: '수익 조건',
    keywords: ['선인세', 'MG', '미니멈', 'RS', '수익 배분', '로열티', '정산', '공제', '%'],
    watchKeywords: ['공제', '비용 차감', '순수익', '정산 후'],
    missingQuestionKo: '선인세/MG, 수익 배분율, 정산 주기, 공제 항목을 확인해야 합니다.',
    watchNoteKo: '공제 또는 순수익 기준 표현이 있어 실제 지급 기준을 숫자로 확인해야 합니다.',
  },
  {
    id: 'adaptation-control',
    labelKo: '각색/원작 통제',
    keywords: ['각색', '수정', '캐릭터 변경', '결말 변경', '원작자 승인', '감수', '시나리오'],
    watchKeywords: ['자유롭게 수정', '승인 없이', '전면 변경', '2차 창작'],
    missingQuestionKo: '캐릭터, 결말, 세계관 변경 시 원작자 검토 또는 승인 절차가 있는지 확인해야 합니다.',
    watchNoteKo: '각색 권한이 넓어 원작 기준본과 충돌하는 변경을 막을 장치가 필요합니다.',
  },
  {
    id: 'reversion',
    labelKo: '종료/회수',
    keywords: ['해지', '종료', '권리 반환', '미사용', '회수', '만료', '위반'],
    watchKeywords: ['반환 없음', '회수 불가', '해지 제한'],
    missingQuestionKo: '미사용 시 권리 반환, 종료 조건, 위반 시 처리 기준을 확인해야 합니다.',
    watchNoteKo: '권리 회수 조건이 약하거나 제한되어 장기 묶임 가능성을 봐야 합니다.',
  },
  {
    id: 'credit',
    labelKo: '원작자 표기',
    keywords: ['원작자', '크레딧', '표기', '작가명', '필명', '저작자'],
    watchKeywords: ['생략', '별도 협의', '표기 없음'],
    missingQuestionKo: '원작자명, 필명, 2차 저작물 크레딧 표기 방식을 확인해야 합니다.',
    watchNoteKo: '표기 조건이 약해 원작자 크레딧과 필명 표시를 문장으로 고정해야 합니다.',
  },
];

const INDUSTRY_RISK_PATTERNS: Array<{
  id: string;
  labelKo: string;
  severity: RightsIndustryRiskSeverity;
  keywords: string[];
  patternKo: string;
  counterMoveKo: string;
  questionKo: string;
}> = [
  {
    id: 'blanket-secondary-rights',
    labelKo: '2차 권리 통째 묶임',
    severity: 'high',
    keywords: ['일체', '전부', '모든 권리', '포괄', '2차 저작물', '독점'],
    patternKo: '잘 팔린 뒤 웹툰·영상·게임·굿즈 권리가 한 문장에 같이 묶여 빠져나가는 후기형 패턴입니다.',
    counterMoveKo: '매체별로 넘기는 권리와 남기는 권리를 분리하고, 아직 개발하지 않는 매체는 별도 협의로 남깁니다.',
    questionKo: '이번 제안에서 출판, 웹툰화, 영상화, 게임, 굿즈, 오디오북 권리를 각각 분리해 표기할 수 있나요?',
  },
  {
    id: 'net-revenue-black-box',
    labelKo: '순수익 정산 블랙박스',
    severity: 'high',
    keywords: ['순수익', '공제', '비용 차감', '정산 후', '마케팅비', '제작비'],
    patternKo: '매출은 났는데 비용 공제 뒤 작가 몫이 작아지는 후기형 패턴입니다.',
    counterMoveKo: '총매출/순수익 기준, 공제 항목, 정산 주기, 자료 열람권을 숫자와 문장으로 고정합니다.',
    questionKo: '정산 기준이 총매출인지 순수익인지, 공제 가능한 항목과 증빙 열람 범위를 문서로 받을 수 있나요?',
  },
  {
    id: 'long-lock-reversion',
    labelKo: '장기 묶임·회수 난항',
    severity: 'high',
    keywords: ['영구', '무기한', '자동 연장', '우선협상', '7년', '10년', '회수 불가', '반환 없음', '해지 제한'],
    patternKo: '작품이 커진 뒤에도 권리 회수나 재협상이 어려워지는 후기형 패턴입니다.',
    counterMoveKo: '기간, 자동 연장 중지권, 미사용 시 회수 조건, 성과 기준 미달 시 종료권을 따로 둡니다.',
    questionKo: '일정 기간 안에 제작·출시가 없으면 해당 권리를 작가에게 반환하는 조항을 넣을 수 있나요?',
  },
  {
    id: 'adaptation-without-approval',
    labelKo: '원작 훼손 각색',
    severity: 'watch',
    keywords: ['자유롭게 수정', '승인 없이', '전면 변경', '캐릭터 변경', '결말 변경', '각색 권한'],
    patternKo: '원작 기준본 없이 캐릭터·결말·세계관이 크게 바뀌는 후기형 패턴입니다.',
    counterMoveKo: '핵심 세계관, 주인공 성격, 결말, 제목/필명 표기는 원작자 검토 절차를 둡니다.',
    questionKo: '캐릭터, 결말, 세계관을 바꿀 때 원작자 검토 또는 승인 단계를 둘 수 있나요?',
  },
  {
    id: 'credit-erasure',
    labelKo: '원작자 표기 흐림',
    severity: 'watch',
    keywords: ['표기 없음', '생략', '별도 협의', '크레딧', '필명', '원작자'],
    patternKo: '2차 전개에서 원작자명·필명이 작게 처리되거나 빠지는 후기형 패턴입니다.',
    counterMoveKo: '표기 위치, 크기, 언어권별 필명 병기, 홍보물 크레딧 기준을 문장으로 고정합니다.',
    questionKo: '서비스 화면, 엔딩 크레딧, 홍보물, 해외판에 원작자 표기를 어떻게 넣는지 문장으로 받을 수 있나요?',
  },
  {
    id: 'global-rights-bundle',
    labelKo: '전세계·전언어 묶음',
    severity: 'watch',
    keywords: ['전 세계', '글로벌', '모든 국가', '전 언어', '해외권', '번역권'],
    patternKo: '아직 진출하지 않은 지역·언어권까지 한 번에 묶여 이후 제안 선택지가 줄어드는 후기형 패턴입니다.',
    counterMoveKo: '지역, 언어, 플랫폼을 쪼개고 미개척 권역은 작가 보유 또는 별도 옵션으로 남깁니다.',
    questionKo: '국가, 언어권, 플랫폼별로 권리 범위를 나누고 미사용 권역은 제외할 수 있나요?',
  },
  {
    id: 'contributor-rights-ambiguity',
    labelKo: '기여자·자료 제공자 경계 불명확',
    severity: 'watch',
    keywords: ['공동기획', '자료 제공', '원안', '각색 참여', '공동 저작', '협업'],
    patternKo: '작품이 뜬 뒤 원안, 자료, 공동기획 기여 범위를 두고 말이 갈리는 후기형 패턴입니다.',
    counterMoveKo: '누가 무엇을 제공했고 어떤 권리를 갖는지 권리 원장과 회의록에 분리해 둡니다.',
    questionKo: '자료 제공자, 공동기획자, 각색 참여자의 권리와 크레딧 범위를 별도 표로 정리할 수 있나요?',
  },
];

function buildAxisReview(text: string, axis: typeof AXES[number]): RightsProposalAxisReview {
  const matches = collectMatches(text, axis.keywords);
  const watchMatches = collectMatches(text, axis.watchKeywords);
  if (!text) {
    return {
      id: axis.id,
      labelKo: axis.labelKo,
      status: 'missing',
      foundKo: '제안 문구 입력 대기',
      noteKo: '제안서, 이메일, 미팅 메모를 붙여넣으면 이 축을 분해합니다.',
      questionKo: axis.missingQuestionKo,
    };
  }
  if (matches.length === 0) {
    return {
      id: axis.id,
      labelKo: axis.labelKo,
      status: 'missing',
      foundKo: '명시 표현 없음',
      noteKo: '핵심 조건이 문구에 보이지 않습니다.',
      questionKo: axis.missingQuestionKo,
    };
  }
  const status: RightsProposalAxisStatus = watchMatches.length > 0 ? 'watch' : 'clear';
  return {
    id: axis.id,
    labelKo: axis.labelKo,
    status,
    foundKo: matches.slice(0, 6).join(' · '),
    noteKo: status === 'watch'
      ? `${axis.watchNoteKo} 감지 표현: ${watchMatches.join(' · ')}`
      : '조건 표현이 보입니다. 숫자, 기간, 지역, 승인 절차를 문장으로 고정하면 좋습니다.',
    questionKo: axis.missingQuestionKo,
  };
}

function collectIndustryRiskPatterns(text: string): RightsIndustryRiskPattern[] {
  const fallback = INDUSTRY_RISK_PATTERNS.slice(0, 3).map((pattern) => ({
    id: pattern.id,
    labelKo: pattern.labelKo,
    severity: pattern.severity,
    detectedKo: '제안 문구 입력 대기',
    patternKo: pattern.patternKo,
    counterMoveKo: pattern.counterMoveKo,
    questionKo: pattern.questionKo,
  }));
  if (!text) return fallback;

  const matched = INDUSTRY_RISK_PATTERNS
    .map((pattern) => {
      const matches = collectMatches(text, pattern.keywords);
      if (matches.length === 0) return null;
      return {
        id: pattern.id,
        labelKo: pattern.labelKo,
        severity: pattern.severity,
        detectedKo: matches.slice(0, 5).join(' · '),
        patternKo: pattern.patternKo,
        counterMoveKo: pattern.counterMoveKo,
        questionKo: pattern.questionKo,
      };
    })
    .filter((pattern): pattern is RightsIndustryRiskPattern => pattern !== null);

  return matched.length > 0 ? matched : [{
    id: 'no-strong-industry-risk-signal',
    labelKo: '강한 업계 리스크 표현 없음',
    severity: 'watch',
    detectedKo: '강한 트리거 없음',
    patternKo: '현재 문구만 보면 대표적인 장기 묶임·정산 블랙박스·포괄 양도 표현은 강하게 보이지 않습니다.',
    counterMoveKo: '그래도 최종 계약 전에는 권리 범위, 기간, 정산, 회수, 크레딧을 별도 문장으로 고정합니다.',
    questionKo: '핵심 조건 7축을 계약서 조항 번호와 함께 대조할 수 있나요?',
  }];
}

function collectRightsMap(input: {
  text: string;
  corePackage: CoreCopyrightPackage;
  rightsLedger?: readonly (ProjectRightsLedgerEntry | MediaIpPackRightsLedgerRow)[];
}): RightsProposalAdvisorResult['rightsMapKo'] {
  const scopeAxis = AXES[0];
  const passing = collectMatches(input.text, scopeAxis.keywords);
  const ledgerNames = (input.rightsLedger ?? [])
    .map((entry) => normalizeText('categoryKo' in entry ? entry.categoryKo : ''))
    .filter(Boolean);
  const packageAssets = input.corePackage.canonMatrix.map((row) => row.assetKo).slice(0, 8);
  const retained = [...ledgerNames, ...packageAssets].filter((label) =>
    label && !passing.some((right) => label.includes(right) || right.includes(label)),
  );
  const ambiguous = AXES
    .filter((axis) => !includesAny(input.text, axis.keywords))
    .map((axis) => axis.labelKo);

  return {
    passingKo: passing.length > 0 ? passing : ['넘기는 권리 범위 입력 대기'],
    retainedKo: retained.length > 0 ? retained.slice(0, 8) : ['남길 권리 기준 입력 대기'],
    ambiguousKo: ambiguous.length > 0 ? ambiguous : ['핵심 축은 모두 문구에 등장'],
  };
}

function buildReplyDraft(input: {
  hasProposal: boolean;
  watchAxes: readonly RightsProposalAxisReview[];
  missingAxes: readonly RightsProposalAxisReview[];
  industryRiskPatterns: readonly RightsIndustryRiskPattern[];
}): string {
  if (!input.hasProposal) {
    return '제안서나 미팅 메모를 붙여넣으면 권리 범위, 기간, 지역/언어, 수익 조건, 각색 권한, 회수 조건, 원작자 표기를 기준으로 회신 초안을 만듭니다.';
  }
  const questions = [...input.watchAxes, ...input.missingAxes]
    .slice(0, 4)
    .map((axis) => axis.questionKo);
  const riskLine = input.industryRiskPatterns
    .filter((pattern) => pattern.id !== 'no-strong-industry-risk-signal')
    .slice(0, 2)
    .map((pattern) => pattern.labelKo)
    .join(' · ');
  return [
    '제안 감사드립니다.',
    '검토를 위해 아래 조건을 조금 더 명확히 확인하고 싶습니다.',
    ...questions.map((question) => `- ${question}`),
    ...(riskLine ? [`- 업계 리스크 패턴상 ${riskLine} 부분은 조항 단위로 분리해 확인하고 싶습니다.`] : []),
    '특히 원작 기준본의 세계관, 캐릭터, 메인 시나리오 범위와 충돌하지 않도록 넘기는 권리와 남는 권리를 항목별로 나누어 확인 부탁드립니다.',
  ].join('\n');
}

export function buildRightsProposalAdvisor(
  input: RightsProposalAdvisorInput,
): RightsProposalAdvisorResult {
  const text = normalizeText(input.proposalText);
  const hasProposal = text.length > 0;
  const axisReviews = AXES.map((axis) => buildAxisReview(text, axis));
  const watchAxes = axisReviews.filter((axis) => axis.status === 'watch');
  const missingAxes = axisReviews.filter((axis) => axis.status === 'missing');
  const clearAxes = axisReviews.filter((axis) => axis.status === 'clear');
  const rightsMapKo = collectRightsMap({ text, corePackage: input.corePackage, rightsLedger: input.rightsLedger });
  const industryRiskPatterns = collectIndustryRiskPatterns(text);
  const meetingQuestionsKo = [
    ...industryRiskPatterns
      .filter((pattern) => pattern.id !== 'no-strong-industry-risk-signal')
      .map((pattern) => pattern.questionKo),
    ...watchAxes,
    ...missingAxes,
  ].map((item) => typeof item === 'string' ? item : item.questionKo).slice(0, 7);

  return {
    kind: 'loreguard.rights-proposal-advisor.v1',
    workTitle: input.corePackage.workTitle,
    generatedAtKo: input.generatedAtKo ?? new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    hasProposal,
    statusKo: !hasProposal
      ? '제안 입력 대기'
      : watchAxes.length > 0
        ? '조건 주의'
        : missingAxes.length > 0
          ? '확인 질문 필요'
          : '핵심 조건 확인 가능',
    summaryKo: !hasProposal
      ? '제안서, 이메일, 미팅 메모를 붙여넣으면 권리 조건을 분해합니다.'
      : `확인 ${clearAxes.length}개 · 주의 ${watchAxes.length}개 · 질문 ${missingAxes.length}개`,
    axisReviews,
    rightsMapKo,
    opportunityNotesKo: [
      '코어 저작권 패키지의 세계관·캐릭터·메인 시나리오 기준본을 협상 기준으로 사용',
      '제안 범위가 좁고 기간/지역이 분리되어 있으면 단계별 권리 운용 가능',
      '크레딧과 원작자 검토 절차를 문장으로 고정하면 2차 전개 때 기준점이 생김',
    ],
    watchNotesKo: watchAxes.length > 0
      ? watchAxes.map((axis) => `${axis.labelKo}: ${axis.noteKo}`)
      : ['포괄 양도, 무기한, 전 세계, 공제 기준, 승인 없는 각색 표현은 현재 문구에서 강하게 보이지 않습니다.'],
    industryRiskPatterns,
    meetingQuestionsKo,
    replyDraftKo: buildReplyDraft({ hasProposal, watchAxes, missingAxes, industryRiskPatterns }),
  };
}

export function serializeRightsProposalAdvisorMarkdown(result: RightsProposalAdvisorResult): string {
  return [
    `# 권리 제안 어드바이저 - ${result.workTitle}`,
    '',
    `- 생성 기준: ${result.generatedAtKo}`,
    `- 상태: ${result.statusKo}`,
    `- 요약: ${result.summaryKo}`,
    '',
    '## 권리 지도',
    `- 넘어가는 권리: ${result.rightsMapKo.passingKo.join(' · ')}`,
    `- 남길 권리 기준: ${result.rightsMapKo.retainedKo.join(' · ')}`,
    `- 애매한 축: ${result.rightsMapKo.ambiguousKo.join(' · ')}`,
    '',
    '## 조건 축 분석',
    ...result.axisReviews.flatMap((axis) => [
      '',
      `### ${axis.labelKo}`,
      `- 상태: ${axis.status === 'clear' ? '확인' : axis.status === 'watch' ? '주의' : '질문 필요'}`,
      `- 감지: ${axis.foundKo}`,
      `- 노트: ${axis.noteKo}`,
      `- 질문: ${axis.questionKo}`,
    ]),
    '',
    '## 업계 리스크 패턴',
    ...result.industryRiskPatterns.flatMap((pattern) => [
      '',
      `### ${pattern.labelKo}`,
      `- 등급: ${pattern.severity === 'high' ? '높음' : '주의'}`,
      `- 감지: ${pattern.detectedKo}`,
      `- 패턴: ${pattern.patternKo}`,
      `- 대응: ${pattern.counterMoveKo}`,
      `- 질문: ${pattern.questionKo}`,
    ]),
    '',
    '## 회신 초안',
    '',
    result.replyDraftKo,
  ].join('\n');
}
