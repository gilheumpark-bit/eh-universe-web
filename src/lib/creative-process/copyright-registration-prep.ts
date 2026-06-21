import type { Character, EpisodeManuscript, StoryConfig } from '@/lib/studio-types';

export type CopyrightRegistrationVariantId =
  | 'narrative'
  | 'character'
  | 'abstract-theme'
  | 'merged-final';

export type CopyrightPrepCheckStatus = 'ready' | 'review';

export interface CopyrightRegistrationDescriptionVariant {
  id: CopyrightRegistrationVariantId;
  labelKo: string;
  focusKo: string;
  bestForKo: string;
  theme: string;
  plot: string;
  characters: string;
  majorEvents: string;
  conflicts: string;
  expressiveFeatures: string;
  registrationScope: string;
  draftText: string;
}

export interface CopyrightPrepCheckItem {
  id:
    | 'content-description'
    | 'volume-split'
    | 'replica-file'
    | 'work-category'
    | 'creation-date'
    | 'title-korean-alias'
    | 'pen-name';
  labelKo: string;
  status: CopyrightPrepCheckStatus;
  detailKo: string;
  actionKo: string;
}

export interface CopyrightRegistrationPrepPackage {
  kind: 'loreguard.copyright-registration-prep.v1';
  workTitle: string;
  generatedAtKo: string;
  workTypeRecommendationKo: string;
  titleKoreanAliasKo: string;
  authorAliasStatementKo: string;
  variants: CopyrightRegistrationDescriptionVariant[];
  checks: CopyrightPrepCheckItem[];
  readyCount: number;
  reviewCount: number;
  summaryKo: string;
  sourceBasisKo: string[];
}

export interface CopyrightRegistrationPrepInput {
  config: StoryConfig | null | undefined;
  manuscripts?: readonly EpisodeManuscript[];
  authorDisplayName?: string | null;
  authorLegalName?: string | null;
  generatedAtKo?: string;
}

const EMPTY_VALUE = '작성 대기';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return '';
}

function clip(value: string, max = 180): string {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function displayOrPending(value: string, pending = EMPTY_VALUE): string {
  return normalizeText(value) || pending;
}

function joinLimited(values: readonly string[], fallback = EMPTY_VALUE, limit = 5): string {
  const filtered = values.map(normalizeText).filter(Boolean);
  if (filtered.length === 0) return fallback;
  const head = filtered.slice(0, limit).join(' · ');
  return filtered.length > limit ? `${head} 외 ${filtered.length - limit}건` : head;
}

function hasPending(value: string): boolean {
  return !normalizeText(value) || value.includes(EMPTY_VALUE);
}

function titleRequiresKoreanAlias(title: string): boolean {
  return /[A-Za-z]/.test(title) && !/[가-힣]/.test(title);
}

function characterLine(character: Character): string {
  const name = normalizeText(character.name) || '이름 미정';
  const role = normalizeText(character.role);
  const desire = firstNonEmpty(
    character.desire,
    (character as unknown as { goal?: string }).goal,
    character.currentProblem,
  );
  const flaw = firstNonEmpty(
    character.deficiency,
    (character as unknown as { flaw?: string }).flaw,
    character.weakness,
  );
  const conflict = firstNonEmpty(character.conflict, character.changeArc, character.assetMemo);
  const parts = [
    role ? `${name}(${role})` : name,
    desire ? `욕망: ${desire}` : '',
    flaw ? `결핍: ${flaw}` : '',
    conflict ? `갈등/변화: ${conflict}` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

function manuscriptEventLines(manuscripts: readonly EpisodeManuscript[]): string[] {
  return manuscripts
    .slice()
    .sort((a, b) => a.episode - b.episode)
    .slice(0, 6)
    .map((manuscript) => {
      const title = normalizeText(manuscript.title) || `EP.${manuscript.episode}`;
      const excerpt = clip(manuscript.content, 80);
      return excerpt ? `${title}: ${excerpt}` : title;
    });
}

function buildTheme(config: StoryConfig | null | undefined): string {
  return displayOrPending(firstNonEmpty(
    config?.corePremise,
    config?.currentConflict,
    config?.synopsis,
    config?.setting,
  ));
}

function buildPlot(config: StoryConfig | null | undefined, manuscripts: readonly EpisodeManuscript[]): string {
  return displayOrPending(firstNonEmpty(
    config?.synopsis,
    config?.sceneDirection?.plotStructure,
    manuscripts[0]?.content ? clip(manuscripts[0].content, 180) : '',
  ));
}

function buildCharacters(config: StoryConfig | null | undefined): string {
  return joinLimited((config?.characters ?? []).map(characterLine), '주요 인물 작성 대기', 6);
}

function buildMajorEvents(config: StoryConfig | null | undefined, manuscripts: readonly EpisodeManuscript[]): string {
  const timelineEvents = (config?.worldTimeline ?? []).map((entry) => `${entry.year} ${entry.event}`);
  const hooks = (config?.sceneDirection?.hooks ?? []).map((hook) => hook.desc);
  const foreshadows = (config?.sceneDirection?.foreshadows ?? []).map(
    (item) => `${item.planted} → ${item.payoff}`,
  );
  const manuscriptsEvents = manuscriptEventLines(manuscripts);
  return joinLimited(
    [
      ...timelineEvents,
      ...hooks,
      ...foreshadows,
      config?.sceneDirection?.cliffhanger?.desc ?? '',
      ...manuscriptsEvents,
    ],
    '주요 사건 작성 대기',
    6,
  );
}

function buildConflicts(config: StoryConfig | null | undefined): string {
  const characterConflicts = (config?.characters ?? [])
    .map((character) => firstNonEmpty(character.conflict, character.currentProblem, character.failureCost));
  return joinLimited(
    [
      config?.currentConflict ?? '',
      config?.sceneDirection?.cliffhanger?.desc ?? '',
      ...characterConflicts,
    ],
    '갈등 요소 작성 대기',
    5,
  );
}

function buildExpressiveFeatures(config: StoryConfig | null | undefined): string {
  return joinLimited(
    [
      config?.sceneDirection?.productionDirection?.proseRhythm
        ? `문장 리듬: ${config.sceneDirection.productionDirection.proseRhythm}`
        : '',
      config?.sceneDirection?.plotStructure
        ? `서술구조: ${config.sceneDirection.plotStructure}`
        : '',
      config?.primaryEmotion ? `정서 중심: ${config.primaryEmotion}` : '',
      config?.povCharacter ? `시점 인물: ${config.povCharacter}` : '',
      config?.setting ? `공간/세계관: ${clip(config.setting, 90)}` : '',
      config?.styleProfile ? '문체 프로필 기반 정리 가능' : '',
    ],
    '표현상 특징 작성 대기',
    5,
  );
}

function buildScope(config: StoryConfig | null | undefined, manuscripts: readonly EpisodeManuscript[]): string {
  const manuscriptScope = manuscripts.length > 0
    ? `저장 원고 ${manuscripts.length}개 회차`
    : '저장 원고 작성 대기';
  return [
    manuscriptScope,
    config?.setting ? '세계관 설명' : '',
    (config?.characters ?? []).length > 0 ? '주요 인물 설정' : '',
    config?.sceneDirection ? '작품 연출 기록' : '',
    config?.rightsNote ? '권리/IP 메모' : '',
  ].filter(Boolean).join(' · ');
}

function buildNarrativeDraft(input: {
  title: string;
  theme: string;
  plot: string;
  characters: string;
  majorEvents: string;
  conflicts: string;
  expressiveFeatures: string;
  registrationScope: string;
}): string {
  return [
    `본 저작물 「${input.title}」은 ${input.theme}을 중심으로 전개되는 장편 서사 작품이다.`,
    `줄거리는 ${input.plot}로 구성된다.`,
    `주요 인물은 ${input.characters}이다.`,
    `주요 사건은 ${input.majorEvents}이며, 핵심 갈등은 ${input.conflicts}이다.`,
    `표현상 특징은 ${input.expressiveFeatures}에 있다.`,
    `등록 준비 범위는 ${input.registrationScope}이다.`,
  ].join(' ');
}

function buildCharacterDraft(input: {
  title: string;
  theme: string;
  plot: string;
  characters: string;
  majorEvents: string;
  conflicts: string;
  expressiveFeatures: string;
  registrationScope: string;
}): string {
  return [
    `본 저작물 「${input.title}」은 ${input.characters}를 중심으로 관계, 욕망, 결핍, 변화선을 전개하는 작품이다.`,
    `작품의 주제는 ${input.theme}이며, 줄거리는 ${input.plot}로 이어진다.`,
    `주요 사건은 ${input.majorEvents}이고, 인물 간 갈등과 선택의 압력은 ${input.conflicts}로 나타난다.`,
    `표현상 특징은 ${input.expressiveFeatures}이며, 인물의 말투와 행동 선택을 통해 작품 고유의 정서를 드러낸다.`,
    `등록 준비 범위는 ${input.registrationScope}이다.`,
  ].join(' ');
}

function buildAbstractThemeDraft(input: {
  title: string;
  theme: string;
  plot: string;
  characters: string;
  majorEvents: string;
  conflicts: string;
  expressiveFeatures: string;
  registrationScope: string;
}): string {
  return [
    `본 저작물 「${input.title}」은 ${input.theme}이라는 주제의식과 세계관 규칙을 바탕으로 구성된 작품이다.`,
    `서사는 ${input.plot}로 전개되며, 주요 인물은 ${input.characters}이다.`,
    `주요 사건과 갈등은 각각 ${input.majorEvents}, ${input.conflicts}로 정리된다.`,
    `표현상 특징은 ${input.expressiveFeatures}이며, 상징, 문체, 서술구조를 통해 작품의 독자적 분위기를 형성한다.`,
    `등록 준비 범위는 ${input.registrationScope}이다.`,
  ].join(' ');
}

function buildMergedDraft(input: {
  title: string;
  theme: string;
  plot: string;
  characters: string;
  majorEvents: string;
  conflicts: string;
  expressiveFeatures: string;
  registrationScope: string;
}): string {
  return [
    `본 저작물 「${input.title}」은 ${input.theme}을 주제로 하며, ${input.plot}의 줄거리로 구성된다.`,
    `주요 인물은 ${input.characters}이고, 주요 사건은 ${input.majorEvents}이다.`,
    `핵심 갈등은 ${input.conflicts}이며, 표현상 특징은 ${input.expressiveFeatures}이다.`,
    `등록 준비 범위는 ${input.registrationScope}이다.`,
  ].join(' ');
}

function buildVariants(input: {
  title: string;
  theme: string;
  plot: string;
  characters: string;
  majorEvents: string;
  conflicts: string;
  expressiveFeatures: string;
  registrationScope: string;
}): CopyrightRegistrationDescriptionVariant[] {
  const base = {
    theme: input.theme,
    plot: input.plot,
    characters: input.characters,
    majorEvents: input.majorEvents,
    conflicts: input.conflicts,
    expressiveFeatures: input.expressiveFeatures,
    registrationScope: input.registrationScope,
  };

  return [
    {
      id: 'narrative',
      labelKo: 'A안 서사 중심',
      focusKo: '줄거리 · 주요사건 · 갈등요소',
      bestForKo: '권별 줄거리와 사건 체인이 강한 작품',
      ...base,
      draftText: buildNarrativeDraft(input),
    },
    {
      id: 'character',
      labelKo: 'B안 캐릭터 중심',
      focusKo: '인물 · 관계 · 욕망 · 성장선',
      bestForKo: '캐릭터 자산성과 관계성이 강한 작품',
      ...base,
      draftText: buildCharacterDraft(input),
    },
    {
      id: 'abstract-theme',
      labelKo: 'C안 추상적 주제 중심',
      focusKo: '주제의식 · 세계관 규칙 · 문체',
      bestForKo: '설정집, 세계관 문서, 상징성이 강한 작품',
      ...base,
      draftText: buildAbstractThemeDraft(input),
    },
    {
      id: 'merged-final',
      labelKo: '최종 제출용 혼합안',
      focusKo: '서사 · 캐릭터 · 주제 균형',
      bestForKo: '정정 입력란에 붙여넣을 1차 최종본',
      ...base,
      draftText: buildMergedDraft(input),
    },
  ];
}

function buildChecks(input: {
  titleKoreanAliasKo: string;
  authorAliasStatementKo: string;
  manuscripts: readonly EpisodeManuscript[];
  variants: readonly CopyrightRegistrationDescriptionVariant[];
  workTypeRecommendationKo: string;
}): CopyrightPrepCheckItem[] {
  const merged = input.variants.find((variant) => variant.id === 'merged-final') ?? input.variants[0];
  const requiredReady = merged
    ? [
        merged.theme,
        merged.plot,
        merged.characters,
        merged.majorEvents,
        merged.conflicts,
        merged.expressiveFeatures,
      ].every((value) => !hasPending(value))
    : false;

  return [
    {
      id: 'content-description',
      labelKo: '내용설명 6항목',
      status: requiredReady ? 'ready' : 'review',
      detailKo: requiredReady
        ? '주제, 줄거리, 주요 인물, 주요 사건, 갈등 요소, 표현상 특징이 채워졌습니다.'
        : '6항목 중 일부가 비어 있습니다.',
      actionKo: requiredReady ? 'A/B/C안 중 선택 또는 혼합안 검토' : '시놉시스, 갈등, 인물, 표현상 특징 보강',
    },
    {
      id: 'volume-split',
      labelKo: '권/회차 분리',
      status: input.manuscripts.length > 1 ? 'ready' : 'review',
      detailKo: input.manuscripts.length > 1
        ? `${input.manuscripts.length}개 저장 원고를 회차 단위로 읽었습니다.`
        : '권별 또는 회차별 설명은 원고가 늘면 분리해야 합니다.',
      actionKo: input.manuscripts.length > 1 ? '권별 문안 최종 확인' : '1권/2권 또는 회차별 줄거리 입력',
    },
    {
      id: 'replica-file',
      labelKo: '복제물 파일 범위',
      status: 'review',
      detailKo: '연재목록 캡처, 권리 귀속 설명, 보호범위 주장은 제출용 복제물에서 분리해야 합니다.',
      actionKo: '등록 대상 원고/설정 문서 본문만 남긴 제출용 파일 준비',
    },
    {
      id: 'work-category',
      labelKo: '저작물 종류',
      status: 'ready',
      detailKo: input.workTypeRecommendationKo,
      actionKo: '공식 신청 화면에서 세부 종류 확인',
    },
    {
      id: 'creation-date',
      labelKo: '창작연월일',
      status: 'review',
      detailKo: '신청서 날짜와 파일 표지/본문 작성일이 다르면 보완 요청이 날 수 있습니다.',
      actionKo: '파일 내부 작성일과 신청서 창작연월일 대조',
    },
    {
      id: 'title-korean-alias',
      labelKo: '제호 한글 병기',
      status: input.titleKoreanAliasKo.includes('필요') ? 'review' : 'ready',
      detailKo: input.titleKoreanAliasKo,
      actionKo: input.titleKoreanAliasKo.includes('필요') ? '국문 해석 또는 발음 병기 입력' : '제호 병기 확인',
    },
    {
      id: 'pen-name',
      labelKo: '필명/이명 확인문',
      status: input.authorAliasStatementKo.includes('필요') ? 'review' : 'ready',
      detailKo: input.authorAliasStatementKo,
      actionKo: input.authorAliasStatementKo.includes('필요') ? '실명과 필명 입력 후 확인문 생성' : '확인문 검토',
    },
  ];
}

function recommendWorkType(config: StoryConfig | null | undefined): string {
  if (!config) return '어문저작물 > 기타 검토';
  if (config.genreMode === 'novel' || !config.genreMode) {
    return '원고 본문은 어문저작물 > 소설, 세계관·캐릭터·메인 시나리오 문서는 어문저작물 > 기타 검토';
  }
  if (config.genreMode === 'drama') return '시나리오/트리트먼트 성격이면 어문저작물 > 기타 또는 연극저작물 검토';
  if (config.genreMode === 'game') return '기획서·설정집 성격이면 어문저작물 > 기타 검토';
  return '어문저작물 > 기타 검토';
}

function buildTitleAlias(title: string): string {
  if (!titleRequiresKoreanAlias(title)) return `${title} - 한글 제호 확인`;
  return `${title}(국문 해석 또는 발음 입력 필요)`;
}

function buildAuthorAliasStatement(authorDisplayName: string, authorLegalName: string): string {
  if (!authorDisplayName && !authorLegalName) return '필명/실명 입력 필요';
  if (authorDisplayName && authorLegalName && authorDisplayName !== authorLegalName) {
    return `본 저작물에 표시한 (${authorDisplayName})는 저작자 (${authorLegalName})의 필명임을 확인합니다.`;
  }
  if (authorDisplayName && !authorLegalName) return `${authorDisplayName} - 실명 입력 후 필명 확인문 생성 필요`;
  return `${authorLegalName} - 필명 사용 여부 확인`;
}

export function buildCopyrightRegistrationPrep(
  input: CopyrightRegistrationPrepInput,
): CopyrightRegistrationPrepPackage {
  const config = input.config;
  const manuscripts = input.manuscripts ?? config?.manuscripts ?? [];
  const title = firstNonEmpty(config?.title, input.authorDisplayName, '무제 작품');
  const theme = buildTheme(config);
  const plot = buildPlot(config, manuscripts);
  const characters = buildCharacters(config);
  const majorEvents = buildMajorEvents(config, manuscripts);
  const conflicts = buildConflicts(config);
  const expressiveFeatures = buildExpressiveFeatures(config);
  const registrationScope = displayOrPending(buildScope(config, manuscripts), '등록 대상 범위 작성 대기');
  const workTypeRecommendationKo = recommendWorkType(config);
  const titleKoreanAliasKo = buildTitleAlias(title);
  const authorAliasStatementKo = buildAuthorAliasStatement(
    normalizeText(input.authorDisplayName),
    normalizeText(input.authorLegalName),
  );
  const variants = buildVariants({
    title,
    theme,
    plot,
    characters,
    majorEvents,
    conflicts,
    expressiveFeatures,
    registrationScope,
  });
  const checks = buildChecks({
    titleKoreanAliasKo,
    authorAliasStatementKo,
    manuscripts,
    variants,
    workTypeRecommendationKo,
  });
  const readyCount = checks.filter((check) => check.status === 'ready').length;
  const reviewCount = checks.length - readyCount;

  return {
    kind: 'loreguard.copyright-registration-prep.v1',
    workTitle: title,
    generatedAtKo: input.generatedAtKo ?? new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    workTypeRecommendationKo,
    titleKoreanAliasKo,
    authorAliasStatementKo,
    variants,
    checks,
    readyCount,
    reviewCount,
    summaryKo: `등록 내용설명 3안과 최종 혼합안을 준비했습니다. 점검 ${readyCount}/${checks.length}개 완료, ${reviewCount}개 보강 대상입니다.`,
    sourceBasisKo: [
      '한국저작권위원회 등록 보완 사례: 내용설명은 주제, 줄거리, 인물, 주요사건, 갈등요소, 표현상 특징을 요구',
      '복제물은 등록 대상 저작물 그 자체만 제출하고 연재목록 캡처와 권리 설명은 분리',
      '외국어 제호는 국문 해석 또는 발음 병기 필요',
      '필명/이명은 저작자 실명과의 관계 확인문 필요',
    ],
  };
}

export function serializeCopyrightRegistrationPrepMarkdown(
  pack: CopyrightRegistrationPrepPackage,
): string {
  const lines: string[] = [
    `# 저작권 등록 준비 패키지 - ${pack.workTitle}`,
    '',
    `- 생성 기준: ${pack.generatedAtKo}`,
    `- 저작물 종류 추천: ${pack.workTypeRecommendationKo}`,
    `- 제호 병기: ${pack.titleKoreanAliasKo}`,
    `- 필명 확인문: ${pack.authorAliasStatementKo}`,
    `- 점검: ${pack.readyCount}/${pack.checks.length}개 완료`,
    '',
    '## 등록 내용설명 3안',
  ];

  for (const variant of pack.variants) {
    lines.push(
      '',
      `### ${variant.labelKo}`,
      '',
      `- 중심축: ${variant.focusKo}`,
      `- 적합한 상황: ${variant.bestForKo}`,
      '',
      variant.draftText,
      '',
      '#### 항목별 분해',
      '',
      `- 주제: ${variant.theme}`,
      `- 줄거리: ${variant.plot}`,
      `- 주요 인물: ${variant.characters}`,
      `- 주요 사건: ${variant.majorEvents}`,
      `- 갈등 요소: ${variant.conflicts}`,
      `- 표현상 특징: ${variant.expressiveFeatures}`,
      `- 등록 대상 범위: ${variant.registrationScope}`,
    );
  }

  lines.push('', '## 등록 전 보완 방지 검사');

  for (const check of pack.checks) {
    lines.push(
      '',
      `### ${check.labelKo}`,
      '',
      `- 상태: ${check.status === 'ready' ? '준비' : '보강'}`,
      `- 내용: ${check.detailKo}`,
      `- 다음 작업: ${check.actionKo}`,
    );
  }

  lines.push('', '## 기준', '');
  for (const source of pack.sourceBasisKo) {
    lines.push(`- ${source}`);
  }

  return lines.join('\n');
}
