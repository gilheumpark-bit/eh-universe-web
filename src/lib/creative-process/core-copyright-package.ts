import type {
  Character,
  EpisodeManuscript,
  MainScenarioAct,
  MainScenarioEvent,
  StoryConfig,
} from '@/lib/studio-types';
import {
  buildCopyrightRegistrationPrep,
  serializeCopyrightRegistrationPrepMarkdown,
  type CopyrightRegistrationPrepPackage,
} from './copyright-registration-prep';

export type CoreCopyrightDocumentId =
  | 'world-registration'
  | 'character-registration'
  | 'main-scenario-registration'
  | 'canon-matrix'
  | 'originality-declaration'
  | 'rights-checklist';

export type CoreCopyrightStatus = 'ready' | 'review' | 'missing';

export interface CoreCopyrightDocument {
  id: CoreCopyrightDocumentId;
  labelKo: string;
  status: CoreCopyrightStatus;
  summaryKo: string;
  sourceFieldsKo: string[];
  checklistKo: string[];
  markdown: string;
}

export interface CoreCopyrightCanonMatrixRow {
  id: string;
  assetTypeKo: string;
  assetKo: string;
  worldLinkKo: string;
  characterLinkKo: string;
  scenarioLinkKo: string;
  rightsNoteKo: string;
}

export interface CoreCopyrightDeclarationField {
  id: string;
  labelKo: string;
  status: CoreCopyrightStatus;
  valueKo: string;
}

export interface CoreCopyrightOriginalityDeclaration {
  status: CoreCopyrightStatus;
  fields: CoreCopyrightDeclarationField[];
  draftTextKo: string;
}

export interface CoreCopyrightChecklistItem {
  id: string;
  labelKo: string;
  status: CoreCopyrightStatus;
  detailKo: string;
  actionKo: string;
}

export interface CoreCopyrightReadiness {
  score: number;
  gradeKo: string;
  readyCount: number;
  totalCount: number;
  missingCriticalCount: number;
  summaryKo: string;
}

export interface CoreCopyrightPackageInput {
  config: StoryConfig | null | undefined;
  manuscripts?: readonly EpisodeManuscript[];
  authorDisplayName?: string | null;
  authorLegalName?: string | null;
  generatedAtKo?: string;
}

export interface CoreCopyrightPackage {
  kind: 'loreguard.core-copyright-package.v1';
  workTitle: string;
  generatedAtKo: string;
  summaryKo: string;
  registrationPrep: CopyrightRegistrationPrepPackage;
  documents: CoreCopyrightDocument[];
  canonMatrix: CoreCopyrightCanonMatrixRow[];
  originalityDeclaration: CoreCopyrightOriginalityDeclaration;
  rightsChecklist: CoreCopyrightChecklistItem[];
  readiness: CoreCopyrightReadiness;
  deliverablesKo: string[];
  nextActionsKo: string[];
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

function displayOrPending(value: unknown): string {
  return normalizeText(value) || EMPTY_VALUE;
}

function statusFromFilled(required: readonly string[], optional: readonly string[] = []): CoreCopyrightStatus {
  const requiredFilled = required.filter((value) => normalizeText(value) && value !== EMPTY_VALUE).length;
  if (requiredFilled === 0) return 'missing';
  if (requiredFilled < required.length) return 'review';
  const optionalFilled = optional.filter((value) => normalizeText(value) && value !== EMPTY_VALUE).length;
  return optional.length > 0 && optionalFilled === 0 ? 'review' : 'ready';
}

function statusKo(status: CoreCopyrightStatus): string {
  if (status === 'ready') return '준비';
  if (status === 'review') return '보강';
  return '미작성';
}

function clip(value: unknown, max = 220): string {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function joinLines(lines: readonly string[]): string {
  return lines.filter((line) => line.trim().length > 0).join('\n');
}

function joinBullets(values: readonly string[], fallback = EMPTY_VALUE, limit = 8): string {
  const filtered = values.map(normalizeText).filter(Boolean);
  if (filtered.length === 0) return fallback;
  const head = filtered.slice(0, limit).join(' · ');
  return filtered.length > limit ? `${head} 외 ${filtered.length - limit}건` : head;
}

function characterAssetLine(character: Character): string {
  const name = displayOrPending(character.name);
  const role = normalizeText(character.role);
  const desire = firstNonEmpty(character.desire, (character as unknown as { goal?: string }).goal, character.currentProblem);
  const deficiency = firstNonEmpty(character.deficiency, (character as unknown as { flaw?: string }).flaw, character.weakness);
  const relation = firstNonEmpty(character.relationPattern, character.conflict, character.changeArc);
  const symbol = firstNonEmpty(character.symbol, character.assetMemo, character.speechExample);
  return [
    `### ${role ? `${name} (${role})` : name}`,
    '',
    `- 외형: ${displayOrPending(character.appearance)}`,
    `- 욕망: ${displayOrPending(desire)}`,
    `- 결핍: ${displayOrPending(deficiency)}`,
    `- 말투/표현: ${displayOrPending(firstNonEmpty(character.speechStyle, character.speechExample, character.personality, character.traits))}`,
    `- 관계/변화선: ${displayOrPending(relation)}`,
    `- 상징 요소: ${displayOrPending(symbol)}`,
    `- 고유성 메모: ${displayOrPending(character.assetMemo)}`,
  ].join('\n');
}

function buildWorldDocument(config: StoryConfig | null | undefined): CoreCopyrightDocument {
  const timeline = (config?.worldTimeline ?? []).map((entry) => `${entry.year}: ${entry.event}`);
  const factions = [
    config?.powerStructure,
    config?.factionRelations,
    config?.socialSystem,
  ].map(normalizeText).filter(Boolean);
  const systems = [
    config?.magicTechSystem,
    ...(config?.magicSystems ?? []).map((system) => `${system.name}: ${system.rules}`),
  ].map(normalizeText).filter(Boolean);
  const placesAndRules = [
    config?.setting,
    config?.survivalEnvironment,
    config?.lawOrder,
    config?.taboo,
    config?.travelComm,
  ].map(normalizeText).filter(Boolean);
  const required = [
    firstNonEmpty(config?.corePremise, config?.setting),
    firstNonEmpty(config?.powerStructure, config?.socialSystem, config?.factionRelations),
    firstNonEmpty(config?.magicTechSystem, config?.worldHistory, timeline[0]),
  ];
  const status = statusFromFilled(required, [config?.culture ?? '', config?.dailyLife ?? '']);
  const markdown = joinLines([
    '# 세계관 등록 기준본',
    '',
    `- 작품명: ${displayOrPending(config?.title)}`,
    `- 핵심 전제: ${displayOrPending(firstNonEmpty(config?.corePremise, config?.setting))}`,
    `- 세계관 설명: ${displayOrPending(config?.setting)}`,
    `- 권력/세력 구조: ${displayOrPending(joinBullets(factions))}`,
    `- 마법/기술/능력 체계: ${displayOrPending(joinBullets(systems))}`,
    `- 장소/규칙: ${displayOrPending(joinBullets(placesAndRules))}`,
    `- 역사/연표: ${displayOrPending(joinBullets([config?.worldHistory ?? '', ...timeline], EMPTY_VALUE, 10))}`,
    `- 문화/생활: ${displayOrPending(joinBullets([config?.culture ?? '', config?.religion ?? '', config?.education ?? '', config?.dailyLife ?? '']))}`,
    `- 세계관 고유성 설명: ${displayOrPending(firstNonEmpty(config?.truthVsBeliefs, config?.currentConflict, config?.rightsNote))}`,
  ]);

  return {
    id: 'world-registration',
    labelKo: '세계관 등록 문서',
    status,
    summaryKo: status === 'ready'
      ? '핵심 전제, 세력/규칙, 연표 또는 작동 체계가 기준본으로 정리되었습니다.'
      : '세계관 전제, 규칙, 연표·세력 중 일부 보강이 필요합니다.',
    sourceFieldsKo: ['세계관', '핵심 전제', '세력 구조', '마법/기술 체계', '연표', '권리/IP 메모'],
    checklistKo: ['작품명/시리즈명', '세계관 핵심 전제', '고유 용어·규칙', '세력/장소/연표', '세계관 고유성 설명'],
    markdown,
  };
}

function buildCharacterDocument(config: StoryConfig | null | undefined): CoreCopyrightDocument {
  const characters = config?.characters ?? [];
  const readyCharacters = characters.filter((character) =>
    normalizeText(character.name)
    && firstNonEmpty(character.desire, (character as unknown as { goal?: string }).goal, character.currentProblem)
    && firstNonEmpty(character.deficiency, (character as unknown as { flaw?: string }).flaw, character.weakness),
  );
  const status: CoreCopyrightStatus = characters.length === 0
    ? 'missing'
    : readyCharacters.length === characters.length
      ? 'ready'
      : 'review';
  const relationLines = (config?.charRelations ?? []).map((relation) =>
    `${relation.from} → ${relation.to}: ${relation.type}${relation.desc ? ` / ${relation.desc}` : ''}`,
  );
  const markdown = joinLines([
    '# 캐릭터 등록 기준본',
    '',
    `- 작품명: ${displayOrPending(config?.title)}`,
    `- 주요 인물 수: ${characters.length}`,
    `- 관계선: ${displayOrPending(joinBullets(relationLines))}`,
    '',
    ...(
      characters.length > 0
        ? characters.map(characterAssetLine)
        : ['### 작성 대기', '', '- 캐릭터 이름, 외형, 욕망, 결핍, 관계, 말투, 상징 요소를 입력하세요.']
    ),
  ]);

  return {
    id: 'character-registration',
    labelKo: '캐릭터 등록 문서',
    status,
    summaryKo: characters.length > 0
      ? `${readyCharacters.length}/${characters.length}명 캐릭터가 욕망·결핍 기준까지 채워졌습니다.`
      : '캐릭터 자산 문서가 아직 비어 있습니다.',
    sourceFieldsKo: ['캐릭터', '관계도', '말투', '상징 아이템', '권리/IP 메모'],
    checklistKo: ['이름', '외형', '욕망', '결핍', '말투', '관계', '성장선', '대표 대사/상징 요소'],
    markdown,
  };
}

function sevenSentenceLines(config: StoryConfig | null | undefined): string[] {
  return (config?.mainScenarioStructure?.sevenSentenceSynopsis ?? [])
    .sort((a, b) => a.index - b.index)
    .map((sentence) => `${sentence.label}: ${sentence.text}`);
}

function actLines(acts: readonly MainScenarioAct[] | undefined): string[] {
  return (acts ?? []).map((act) => {
    const range = act.startEpisode || act.endEpisode ? ` (${act.startEpisode ?? '?'}-${act.endEpisode ?? '?'})` : '';
    return `${act.title}${range}: ${act.summary}`;
  });
}

function eventLines(events: readonly MainScenarioEvent[] | undefined): string[] {
  return [...(events ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((event) => {
      const causeEffect = [event.cause, event.effect].map(normalizeText).filter(Boolean).join(' → ');
      return `${event.title}${causeEffect ? ` / ${causeEffect}` : ''}`;
    });
}

function manuscriptLines(manuscripts: readonly EpisodeManuscript[]): string[] {
  return manuscripts
    .slice()
    .sort((a, b) => a.episode - b.episode)
    .slice(0, 10)
    .map((manuscript) => {
      const title = normalizeText(manuscript.title) || `${manuscript.episode}화`;
      const summary = firstNonEmpty(manuscript.summary, manuscript.detailedSummary, clip(manuscript.content, 120));
      return `EP.${manuscript.episode} ${title}: ${summary}`;
    });
}

function buildMainScenarioDocument(
  config: StoryConfig | null | undefined,
  manuscripts: readonly EpisodeManuscript[],
): CoreCopyrightDocument {
  const scenario = config?.mainScenarioStructure;
  const sevenSentences = sevenSentenceLines(config);
  const acts = actLines(scenario?.acts);
  const events = eventLines(scenario?.eventChain);
  const hooks = (config?.sceneDirection?.hooks ?? []).map((hook) => `${hook.position}: ${hook.desc}`);
  const foreshadows = (config?.sceneDirection?.foreshadows ?? []).map((item) => `${item.planted} → ${item.payoff}`);
  const ending = scenario?.endingLock?.locked
    ? joinBullets([
        scenario.endingLock.finalImage ?? '',
        scenario.endingLock.thematicAnswer ?? '',
        scenario.endingLock.mustResolve ?? '',
      ])
    : '';
  const required = [
    firstNonEmpty(config?.synopsis, sevenSentences[0]),
    firstNonEmpty(events[0], hooks[0], manuscripts[0]?.content),
    firstNonEmpty(ending, config?.sceneDirection?.cliffhanger?.desc, foreshadows[0]),
  ];
  const status = statusFromFilled(required, [acts[0] ?? '', manuscripts[0]?.content ?? '']);
  const markdown = joinLines([
    '# 메인 시나리오 등록 기준본',
    '',
    `- 로그라인/시놉시스: ${displayOrPending(config?.synopsis)}`,
    `- 7문장 시놉시스: ${displayOrPending(joinBullets(sevenSentences, EMPTY_VALUE, 7))}`,
    `- 3막/시즌 구조: ${displayOrPending(joinBullets(acts))}`,
    `- 주요 사건 체인: ${displayOrPending(joinBullets([...events, ...hooks], EMPTY_VALUE, 10))}`,
    `- 키씬/복선: ${displayOrPending(joinBullets([...(config?.sceneDirection?.cliffhanger?.desc ? [config.sceneDirection.cliffhanger.desc] : []), ...foreshadows]))}`,
    `- 결말 잠금: ${displayOrPending(ending)}`,
    `- 대표 회차/장면: ${displayOrPending(joinBullets(manuscriptLines(manuscripts), EMPTY_VALUE, 10))}`,
    `- 메인 시나리오 고유성 설명: ${displayOrPending(firstNonEmpty(config?.currentConflict, config?.corePremise, config?.sceneDirection?.writerNotes))}`,
  ]);

  return {
    id: 'main-scenario-registration',
    labelKo: '메인 시나리오 등록 문서',
    status,
    summaryKo: status === 'ready'
      ? '시놉시스, 사건 체인, 결말/복선 기준이 시나리오 기준본으로 정리되었습니다.'
      : '로그라인, 사건 체인, 결말 또는 대표 장면 보강이 필요합니다.',
    sourceFieldsKo: ['시놉시스', '메인 시나리오', '작품 연출', '저장 원고', '씬시트'],
    checklistKo: ['로그라인', '7문장 시놉시스', '3막/시즌 구조', '주요 사건 체인', '키씬', '결말 잠금', '대표 대사/장면'],
    markdown,
  };
}

function buildCanonMatrix(
  config: StoryConfig | null | undefined,
  manuscripts: readonly EpisodeManuscript[],
): CoreCopyrightCanonMatrixRow[] {
  const rows: CoreCopyrightCanonMatrixRow[] = [];
  for (const character of config?.characters ?? []) {
    rows.push({
      id: `character:${character.id}`,
      assetTypeKo: '캐릭터',
      assetKo: normalizeText(character.name) || character.id,
      worldLinkKo: displayOrPending(firstNonEmpty(
        (character as unknown as { worldConnection?: string }).worldConnection,
        character.backstory,
        config?.setting,
      )),
      characterLinkKo: displayOrPending(firstNonEmpty(character.desire, character.conflict, character.changeArc)),
      scenarioLinkKo: displayOrPending(firstNonEmpty(character.currentProblem, character.failureCost, config?.currentConflict)),
      rightsNoteKo: displayOrPending(character.assetMemo),
    });
  }
  for (const item of config?.items ?? []) {
    rows.push({
      id: `item:${item.id}`,
      assetTypeKo: '아이템',
      assetKo: normalizeText(item.name) || item.id,
      worldLinkKo: displayOrPending(firstNonEmpty(item.worldConnection, item.lore, item.obtainedFrom)),
      characterLinkKo: displayOrPending(firstNonEmpty(item.owner, item.whoTargets)),
      scenarioLinkKo: displayOrPending(firstNonEmpty(item.storyFunction, item.effect, item.misuse)),
      rightsNoteKo: displayOrPending(firstNonEmpty(item.rightsMemo, item.ipPotential)),
    });
  }
  for (const event of config?.mainScenarioStructure?.eventChain ?? []) {
    rows.push({
      id: `event:${event.id}`,
      assetTypeKo: '사건',
      assetKo: normalizeText(event.title) || event.id,
      worldLinkKo: displayOrPending(config?.setting),
      characterLinkKo: displayOrPending(event.cause),
      scenarioLinkKo: displayOrPending(event.effect),
      rightsNoteKo: event.locked ? '주요 전개 잠금' : '권리 메모 작성 대기',
    });
  }
  if (rows.length === 0 && manuscripts.length > 0) {
    rows.push(...manuscripts.slice(0, 5).map((manuscript) => ({
      id: `episode:${manuscript.episode}`,
      assetTypeKo: '회차',
      assetKo: normalizeText(manuscript.title) || `EP.${manuscript.episode}`,
      worldLinkKo: displayOrPending(config?.setting),
      characterLinkKo: displayOrPending(config?.povCharacter),
      scenarioLinkKo: displayOrPending(firstNonEmpty(manuscript.summary, clip(manuscript.content, 90))),
      rightsNoteKo: '회차 원고 기준',
    })));
  }
  return rows;
}

function buildCanonMatrixDocument(rows: readonly CoreCopyrightCanonMatrixRow[]): CoreCopyrightDocument {
  const status: CoreCopyrightStatus = rows.length >= 3 ? 'ready' : rows.length > 0 ? 'review' : 'missing';
  const tableRows = rows.length > 0
    ? rows.map((row) =>
        `| ${row.assetTypeKo} | ${row.assetKo} | ${row.worldLinkKo} | ${row.characterLinkKo} | ${row.scenarioLinkKo} | ${row.rightsNoteKo} |`,
      )
    : ['| 작성 대기 | 작성 대기 | 작성 대기 | 작성 대기 | 작성 대기 | 작성 대기 |'];
  return {
    id: 'canon-matrix',
    labelKo: 'Canon Matrix',
    status,
    summaryKo: rows.length > 0
      ? `${rows.length}개 자산을 세계관·인물·사건·권리 메모로 연결했습니다.`
      : '세계관, 캐릭터, 사건, 아이템 연결표가 아직 비어 있습니다.',
    sourceFieldsKo: ['캐릭터', '아이템', '메인 시나리오', '원고', '권리 원장'],
    checklistKo: ['자산명', '세계관 연결', '인물 연결', '시나리오 연결', '권리 메모'],
    markdown: joinLines([
      '# Canon Matrix',
      '',
      '| 유형 | 자산 | 세계관 연결 | 인물 연결 | 시나리오 연결 | 권리 메모 |',
      '|---|---|---|---|---|---|',
      ...tableRows,
    ]),
  };
}

function buildOriginalityDeclaration(
  config: StoryConfig | null | undefined,
  authorDisplayName: string,
  authorLegalName: string,
): CoreCopyrightOriginalityDeclaration {
  const fields: CoreCopyrightDeclarationField[] = [
    {
      id: 'world-originality',
      labelKo: '세계관 고유성',
      status: firstNonEmpty(config?.corePremise, config?.setting) ? 'ready' : 'missing',
      valueKo: displayOrPending(firstNonEmpty(config?.corePremise, config?.setting)),
    },
    {
      id: 'character-originality',
      labelKo: '캐릭터 고유성',
      status: (config?.characters ?? []).length > 0 ? 'ready' : 'missing',
      valueKo: joinBullets((config?.characters ?? []).map((character) =>
        `${character.name}: ${firstNonEmpty(character.desire, character.deficiency, character.conflict, character.assetMemo)}`,
      )),
    },
    {
      id: 'scenario-originality',
      labelKo: '시나리오 선택',
      status: firstNonEmpty(config?.synopsis, config?.currentConflict, config?.mainScenarioStructure?.eventChain?.[0]?.title)
        ? 'ready'
        : 'missing',
      valueKo: displayOrPending(firstNonEmpty(config?.synopsis, config?.currentConflict, config?.mainScenarioStructure?.eventChain?.[0]?.title)),
    },
    {
      id: 'external-materials',
      labelKo: '외부 자료 사용',
      status: config?.rightsStatus === 'external_materials' || config?.rightsNote ? 'review' : 'ready',
      valueKo: displayOrPending(config?.rightsNote || '외부 자료 사용 여부 최종 확인'),
    },
    {
      id: 'author-signature',
      labelKo: '작가 표시',
      status: authorDisplayName || authorLegalName ? 'ready' : 'review',
      valueKo: displayOrPending([authorDisplayName, authorLegalName].filter(Boolean).join(' / ')),
    },
  ];
  const missingCount = fields.filter((field) => field.status === 'missing').length;
  const reviewCount = fields.filter((field) => field.status === 'review').length;
  const status: CoreCopyrightStatus = missingCount > 0 ? 'missing' : reviewCount > 0 ? 'review' : 'ready';
  const draftTextKo = [
    `본인은 「${displayOrPending(config?.title)}」의 세계관, 캐릭터, 메인 시나리오를 직접 선택·구성한 창작자입니다.`,
    `세계관 고유성은 ${fields[0].valueKo}에 있습니다.`,
    `캐릭터 고유성은 ${fields[1].valueKo}로 정리됩니다.`,
    `메인 시나리오의 핵심 창작 선택은 ${fields[2].valueKo}입니다.`,
    `외부 자료 사용 및 권리 관계는 ${fields[3].valueKo}로 별도 확인합니다.`,
    `작가 표시: ${fields[4].valueKo}`,
  ].join(' ');

  return { status, fields, draftTextKo };
}

function buildOriginalityDocument(declaration: CoreCopyrightOriginalityDeclaration): CoreCopyrightDocument {
  return {
    id: 'originality-declaration',
    labelKo: '오리지널리티 선언문',
    status: declaration.status,
    summaryKo: declaration.status === 'ready'
      ? '작가의 창작 선택과 외부 자료 확인 항목이 선언문 형태로 정리되었습니다.'
      : '세계관·캐릭터·시나리오 고유성 또는 작가 표시 보강이 필요합니다.',
    sourceFieldsKo: ['핵심 전제', '캐릭터', '시놉시스', '권리/IP 메모', '작가 표시'],
    checklistKo: ['세계관 고유성', '캐릭터 고유성', '시나리오 선택', '외부 자료 사용', '작가 표시'],
    markdown: joinLines([
      '# 작가 오리지널리티 선언문',
      '',
      declaration.draftTextKo,
      '',
      '## 항목별 확인',
      ...declaration.fields.map((field) => `- ${field.labelKo}: ${statusKo(field.status)} / ${field.valueKo}`),
    ]),
  };
}

function buildRightsChecklist(
  config: StoryConfig | null | undefined,
  registrationPrep: CopyrightRegistrationPrepPackage,
): CoreCopyrightChecklistItem[] {
  const ledger = config?.rightsLedger ?? [];
  const ledgerReady = ledger.filter((entry) =>
    normalizeText(entry.ownerKo)
    && normalizeText(entry.usageScopeKo)
    && normalizeText(entry.statusKo)
    && !entry.statusKo.includes('미정'),
  ).length;
  const hasImports = (config?.importFileReports ?? []).length > 0;
  const hasExternalStatus = config?.rightsStatus === 'external_materials' || config?.rightsStatus === 'licensed_source';

  return [
    {
      id: 'author-owned-scope',
      labelKo: '원작 권리 기준',
      status: config?.rightsStatus === 'author_owned' ? 'ready' : config?.rightsStatus ? 'review' : 'missing',
      detailKo: config?.rightsStatus === 'author_owned'
        ? '작가 보유 기준으로 시작합니다.'
        : displayOrPending(config?.rightsNote || '권리 상태 선택 필요'),
      actionKo: '공동 창작, 원작 사용권, 외부 자료 여부를 최종 확인',
    },
    {
      id: 'rights-ledger',
      labelKo: '권리 원장',
      status: ledger.length === 0 ? 'review' : ledgerReady === ledger.length ? 'ready' : 'review',
      detailKo: ledger.length > 0 ? `${ledgerReady}/${ledger.length}개 원장 항목 준비` : '기본 권리 원장 자동 구성 후 편집 필요',
      actionKo: '소유 주체, 사용 범위, 기간, 지역, 매체, 근거 파일 입력',
    },
    {
      id: 'external-materials',
      labelKo: '외부 자료',
      status: hasExternalStatus || hasImports ? 'review' : 'ready',
      detailKo: hasExternalStatus || hasImports
        ? '외부 자료, 원작 사용권, 불러오기 파일의 사용 범위 확인 필요'
        : '외부 자료 사용 기록이 없거나 별도 확인 대기입니다.',
      actionKo: '출처, 라이선스, 사용 범위, 제외 자료를 권리/IP 점검표에 분리',
    },
    {
      id: 'media-split',
      labelKo: '매체별 권리 분리',
      status: normalizeText(config?.rightsNote).includes('웹툰') || normalizeText(config?.rightsNote).includes('영상') ? 'ready' : 'review',
      detailKo: displayOrPending(config?.rightsNote || '웹툰화, 영상화, 해외권, 굿즈/게임/오디오북 권리 분리 여부 확인'),
      actionKo: '넘길 권리와 남길 권리를 매체·지역·기간으로 나누기',
    },
    {
      id: 'registration-prep',
      labelKo: '등록 내용설명',
      status: registrationPrep.reviewCount === 0 ? 'ready' : 'review',
      detailKo: `${registrationPrep.readyCount}/${registrationPrep.checks.length}개 보완 방지 항목 준비`,
      actionKo: 'A/B/C안과 최종 혼합안을 공식 입력 전 검토',
    },
    {
      id: 'replica-clean-copy',
      labelKo: '제출용 복제물',
      status: 'review',
      detailKo: '원고/등록 대상 본문과 권리 설명·연재목록 캡처를 분리해야 합니다.',
      actionKo: '제출용 복제물에는 등록 대상 저작물 그 자체만 남기기',
    },
  ];
}

function buildRightsChecklistDocument(checklist: readonly CoreCopyrightChecklistItem[]): CoreCopyrightDocument {
  const ready = checklist.filter((item) => item.status === 'ready').length;
  const status: CoreCopyrightStatus = ready === checklist.length ? 'ready' : ready > 0 ? 'review' : 'missing';
  return {
    id: 'rights-checklist',
    labelKo: '권리 관계 체크리스트',
    status,
    summaryKo: `${ready}/${checklist.length}개 권리 관계 항목이 준비 상태입니다.`,
    sourceFieldsKo: ['권리 상태', '권리 원장', '외부 자료', '출고 목적', '등록 준비'],
    checklistKo: checklist.map((item) => item.labelKo),
    markdown: joinLines([
      '# 권리 관계 체크리스트',
      '',
      ...checklist.map((item) => [
        `## ${item.labelKo}`,
        '',
        `- 상태: ${statusKo(item.status)}`,
        `- 내용: ${item.detailKo}`,
        `- 다음 작업: ${item.actionKo}`,
      ].join('\n')),
    ]),
  };
}

function buildReadiness(input: {
  documents: readonly CoreCopyrightDocument[];
  checklist: readonly CoreCopyrightChecklistItem[];
  registrationPrep: CopyrightRegistrationPrepPackage;
}): CoreCopyrightReadiness {
  const documentPoints = input.documents.reduce((sum, documentItem) => {
    if (documentItem.status === 'ready') return sum + 10;
    if (documentItem.status === 'review') return sum + 5;
    return sum;
  }, 0);
  const checklistPoints = input.checklist.reduce((sum, item) => {
    if (item.status === 'ready') return sum + 5;
    if (item.status === 'review') return sum + 2;
    return sum;
  }, 0);
  const registrationPoints = Math.round((input.registrationPrep.readyCount / input.registrationPrep.checks.length) * 20);
  const maxScore = input.documents.length * 10 + input.checklist.length * 5 + 20;
  const score = Math.round(((documentPoints + checklistPoints + registrationPoints) / maxScore) * 100);
  const readyCount =
    input.documents.filter((item) => item.status === 'ready').length
    + input.checklist.filter((item) => item.status === 'ready').length
    + input.registrationPrep.readyCount;
  const totalCount = input.documents.length + input.checklist.length + input.registrationPrep.checks.length;
  const missingCriticalCount = input.documents.filter((item) => item.status === 'missing').length
    + input.checklist.filter((item) => item.status === 'missing').length;
  const gradeKo = score >= 85 ? '출고 기준본 준비' : score >= 65 ? '핵심 보강 후 사용' : score >= 40 ? '초안 보강 필요' : '기초 입력 필요';

  return {
    score,
    gradeKo,
    readyCount,
    totalCount,
    missingCriticalCount,
    summaryKo: `${score}점 · ${gradeKo} · 준비 ${readyCount}/${totalCount}`,
  };
}

function buildNextActions(input: {
  documents: readonly CoreCopyrightDocument[];
  checklist: readonly CoreCopyrightChecklistItem[];
}): string[] {
  const actions = [
    ...input.documents
      .filter((item) => item.status !== 'ready')
      .map((item) => `${item.labelKo}: ${item.checklistKo.slice(0, 3).join(' · ')} 보강`),
    ...input.checklist
      .filter((item) => item.status !== 'ready')
      .map((item) => `${item.labelKo}: ${item.actionKo}`),
  ];
  return actions.slice(0, 8);
}

export function buildCoreCopyrightPackage(input: CoreCopyrightPackageInput): CoreCopyrightPackage {
  const config = input.config;
  const manuscripts = input.manuscripts ?? config?.manuscripts ?? [];
  const authorDisplayName = normalizeText(input.authorDisplayName);
  const authorLegalName = normalizeText(input.authorLegalName);
  const registrationPrep = buildCopyrightRegistrationPrep({
    config,
    manuscripts,
    authorDisplayName,
    authorLegalName,
    generatedAtKo: input.generatedAtKo,
  });
  const canonMatrix = buildCanonMatrix(config, manuscripts);
  const originalityDeclaration = buildOriginalityDeclaration(config, authorDisplayName, authorLegalName);
  const rightsChecklist = buildRightsChecklist(config, registrationPrep);
  const documents = [
    buildWorldDocument(config),
    buildCharacterDocument(config),
    buildMainScenarioDocument(config, manuscripts),
    buildCanonMatrixDocument(canonMatrix),
    buildOriginalityDocument(originalityDeclaration),
    buildRightsChecklistDocument(rightsChecklist),
  ];
  const readiness = buildReadiness({ documents, checklist: rightsChecklist, registrationPrep });

  return {
    kind: 'loreguard.core-copyright-package.v1',
    workTitle: registrationPrep.workTitle,
    generatedAtKo: registrationPrep.generatedAtKo,
    summaryKo: `세계관·캐릭터·메인 시나리오 기준본과 등록 내용설명 3안을 묶었습니다. ${readiness.summaryKo}`,
    registrationPrep,
    documents,
    canonMatrix,
    originalityDeclaration,
    rightsChecklist,
    readiness,
    deliverablesKo: [
      '세계관 등록 기준본',
      '캐릭터 등록 기준본',
      '메인 시나리오 등록 기준본',
      'Canon Matrix',
      '작가 오리지널리티 선언문',
      '권리 관계 체크리스트',
      '등록 내용설명 A/B/C + 최종 혼합안',
    ],
    nextActionsKo: buildNextActions({ documents, checklist: rightsChecklist }),
  };
}

export function serializeCoreCopyrightPackageMarkdown(pack: CoreCopyrightPackage): string {
  const lines: string[] = [
    `# 코어 저작권 등록 준비 패키지 - ${pack.workTitle}`,
    '',
    `- 생성 기준: ${pack.generatedAtKo}`,
    `- 준비도: ${pack.readiness.summaryKo}`,
    `- 요약: ${pack.summaryKo}`,
    '',
    '## 산출물',
    ...pack.deliverablesKo.map((item) => `- ${item}`),
    '',
    '## 다음 작업',
    ...(pack.nextActionsKo.length > 0 ? pack.nextActionsKo : ['- 현 상태로 검토 가능']).map((item) => item.startsWith('-') ? item : `- ${item}`),
    '',
    '## 문서 상태',
    '| 문서 | 상태 | 요약 |',
    '|---|---|---|',
    ...pack.documents.map((documentItem) => `| ${documentItem.labelKo} | ${statusKo(documentItem.status)} | ${documentItem.summaryKo} |`),
    '',
    ...pack.documents.flatMap((documentItem) => [
      `## ${documentItem.labelKo}`,
      '',
      documentItem.markdown,
      '',
    ]),
    '## 등록 내용설명 3안',
    '',
    serializeCopyrightRegistrationPrepMarkdown(pack.registrationPrep),
  ];

  return lines.join('\n');
}
