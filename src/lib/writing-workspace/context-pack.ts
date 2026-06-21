import type {
  Character,
  EpisodeManuscript,
  EpisodeSceneSheet,
  Item,
  SceneDirectionData,
  StoryConfig,
} from '@/lib/studio-types';
import { buildAIWritePrompt, buildContextBlock, type ContextItem } from './context-block';
import { buildExternalCraftPromptBlock, type ExternalCraftReference } from './cross-project-bridge';
import type {
  BuildWritingContextPackInput,
  PreviousEpisodeContext,
  WritingContextBlock,
  WritingContextOmission,
  WritingContextPack,
  WritingContextPackMode,
  WritingContextPackScope,
  WritingContextSourceRef,
} from './context-pack.types';

export type {
  BuildWritingContextPackInput,
  PreviousEpisodeContext,
  WritingContextBlock,
  WritingContextOmission,
  WritingContextPack,
  WritingContextPackMode,
  WritingContextPackScope,
  WritingContextSourceRef,
  WritingContextSourceStatus,
} from './context-pack.types';

const DEFAULT_MAX_CHARS = 12_000;
const COMPACT_WORLD_MAX_CHARS = 900;
const FULL_WORLD_MAX_CHARS = 3_500;
const DEFAULT_PROJECT_ID = 'project-default';

const WORLD_FIELDS = [
  ['corePremise', '핵심 전제'],
  ['powerStructure', '권력 구조'],
  ['currentConflict', '현재 갈등'],
  ['worldHistory', '역사'],
  ['socialSystem', '사회 시스템'],
  ['economy', '경제와 생활'],
  ['magicTechSystem', '마법/기술 체계'],
  ['factionRelations', '종족/세력 관계'],
  ['survivalEnvironment', '생존 환경'],
  ['culture', '문화'],
  ['religion', '종교와 신화'],
  ['education', '교육과 지식 전달'],
  ['lawOrder', '법과 질서'],
  ['taboo', '금기와 규범'],
  ['travelComm', '이동/통신'],
  ['truthVsBeliefs', '믿음과 실제 진실'],
  ['dailyLife', '일상'],
] as const;

const CHARACTER_CORE_FIELDS = [
  ['role', '역할'],
  ['desire', '욕망'],
  ['deficiency', '결핍'],
  ['speechStyle', '말투'],
  ['informationState', '정보 상태'],
  ['relationAddress', '호칭 기준'],
] as const;

const ITEM_CORE_FIELDS = [
  ['owner', '소유자'],
  ['currentLocation', '현재 위치'],
  ['status', '상태'],
  ['activationCond', '발동 조건'],
  ['costWeakness', '대가/약점'],
  ['storyFunction', '서사 기능'],
] as const;

const SCENE_FIELDS = [
  ['purpose', '장면 목적'],
  ['conflict', '갈등'],
  ['publicInfo', '공개 정보'],
  ['hiddenInfo', '숨기는 정보'],
  ['emotionCurve', '감정 흐름'],
  ['rewardBeat', '독자 보상'],
  ['hookPoint', '후킹'],
  ['nextScene', '다음 연결'],
] as const;

const PRODUCTION_FIELDS = [
  ['miseEnScene', '미장센'],
  ['camera', '카메라'],
  ['lighting', '조명'],
  ['sound', '사운드'],
  ['action', '액션'],
  ['proseRhythm', '문장 리듬'],
] as const;

const TRIM_ORDER: readonly WritingContextPackScope[] = [
  'previous-episode',
  'external-craft',
  'global',
  'selection',
  'current-episode',
  'safety',
];

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function compactText(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

function safeProjectId(projectId?: string | null): string {
  const trimmed = projectId?.trim();
  return trimmed || DEFAULT_PROJECT_ID;
}

function inferMode(input: BuildWritingContextPackInput): WritingContextPackMode {
  if (input.mode) return input.mode;
  if (hasText(input.selectedText)) return 'selection-rewrite';
  const episode = input.episode ?? input.config.episode ?? 1;
  return episode <= 1 ? 'episode-1-bootstrap' : 'episode-n-draft';
}

function modeLabel(mode: WritingContextPackMode): string {
  if (mode === 'episode-1-bootstrap') return '전체 기준선';
  if (mode === 'episode-n-draft') return '현재 화 기준선';
  if (mode === 'episode-regenerate') return '재생성 기준선';
  return '선택 영역 기준선';
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(index)) | 0;
  }
  return `ctx:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function pushSource(
  sourceRefs: WritingContextSourceRef[],
  source: Omit<WritingContextSourceRef, 'hash'> & { hash?: string },
): string {
  const hash = source.hash ?? simpleHash(`${source.tabId}:${source.fieldKey}:${source.label}:${source.status}`);
  const next = { ...source, hash };
  sourceRefs.push(next);
  return next.id;
}

function pushOmitted(
  omitted: WritingContextOmission[],
  sourceId: string,
  label: string,
  reason: WritingContextOmission['reason'],
  detail: string,
): void {
  omitted.push({ sourceId, label, reason, detail });
}

function addBlock(
  blocks: WritingContextBlock[],
  block: Omit<WritingContextBlock, 'content'> & { content?: string },
): void {
  const content = block.content?.trim();
  if (!content) return;
  blocks.push({ ...block, content });
}

function worldLines(config: StoryConfig, mode: WritingContextPackMode): string[] {
  const lines: string[] = [];
  const maxChars = mode === 'episode-1-bootstrap' ? FULL_WORLD_MAX_CHARS : COMPACT_WORLD_MAX_CHARS;
  for (const [fieldKey, label] of WORLD_FIELDS) {
    const value = (config as unknown as Record<string, unknown>)[fieldKey];
    if (hasText(value)) lines.push(`${label}: ${value}`);
  }
  return compactText(lines.join('\n'), maxChars).split('\n').filter(Boolean);
}

function mainScenarioLines(config: StoryConfig, mode: WritingContextPackMode): string[] {
  const lines: string[] = [];
  if (hasText(config.synopsis)) lines.push(`시놉시스: ${config.synopsis}`);
  if (config.mainScenarioStructure?.endingLock?.locked) {
    const ending = config.mainScenarioStructure.endingLock;
    if (hasText(ending.finalImage)) lines.push(`결말 잠금: ${ending.finalImage}`);
    if (hasText(ending.thematicAnswer)) lines.push(`주제 답: ${ending.thematicAnswer}`);
    if (hasText(ending.mustResolve)) lines.push(`반드시 회수: ${ending.mustResolve}`);
  }
  for (const event of config.mainScenarioStructure?.eventChain ?? []) {
    const locked = event.locked ? '잠금' : '참조';
    const episode = typeof event.linkedEpisode === 'number' ? ` ${event.linkedEpisode}화` : '';
    lines.push(`사건 ${event.order}${episode} [${locked}]: ${event.title}${event.effect ? ` → ${event.effect}` : ''}`);
  }
  const maxChars = mode === 'episode-1-bootstrap' ? 1_500 : 700;
  return compactText(lines.join('\n'), maxChars).split('\n').filter(Boolean);
}

function activeCharacters(config: StoryConfig): Character[] {
  const characters = config.characters ?? [];
  const activeNames = new Set(config.sceneDirection?.activeCharacters ?? []);
  if (activeNames.size === 0) return characters.slice(0, 20);
  return characters
    .filter((character) => activeNames.has(character.id) || activeNames.has(character.name))
    .slice(0, 20);
}

function characterLines(character: Character): string {
  const parts = [`${character.name} (${character.role || '역할 미정'})`];
  for (const [fieldKey, label] of CHARACTER_CORE_FIELDS) {
    const value = (character as unknown as Record<string, unknown>)[fieldKey];
    if (hasText(value)) parts.push(`${label}: ${value}`);
  }
  if (hasText(character.privateTruth)) parts.push(`숨은 사실: ${character.privateTruth}`);
  return parts.join('\n');
}

function activeItems(config: StoryConfig): Item[] {
  const items = config.items ?? [];
  const activeIds = new Set(config.sceneDirection?.activeItems ?? []);
  if (activeIds.size === 0) return items.slice(0, 12);
  return items
    .filter((item) => activeIds.has(item.id) || activeIds.has(item.name))
    .slice(0, 12);
}

function itemLines(item: Item): string {
  const parts = [`${item.name} (${item.category})`];
  if (hasText(item.description)) parts.push(`설명: ${item.description}`);
  if (hasText(item.effect)) parts.push(`효과: ${item.effect}`);
  for (const [fieldKey, label] of ITEM_CORE_FIELDS) {
    const value = (item as unknown as Record<string, unknown>)[fieldKey];
    if (hasText(value)) parts.push(`${label}: ${value}`);
  }
  return parts.join('\n');
}

function currentSheet(config: StoryConfig, episode: number): EpisodeSceneSheet | undefined {
  return (config.episodeSceneSheets ?? []).find((sheet) => sheet.episode === episode);
}

function sceneLines(sheet: EpisodeSceneSheet | undefined): string[] {
  if (!sheet) return [];
  const lines: string[] = [];
  if (hasText(sheet.title)) lines.push(`회차 제목: ${sheet.title}`);
  if (hasText(sheet.arc)) lines.push(`아크: ${sheet.arc}`);
  for (const scene of sheet.scenes ?? []) {
    const parts = [`[${scene.sceneId}] ${scene.sceneName || '이름 없는 장면'}`];
    if (hasText(scene.summary)) parts.push(`요약: ${scene.summary}`);
    for (const [fieldKey, label] of SCENE_FIELDS) {
      const value = (scene as unknown as Record<string, unknown>)[fieldKey];
      if (hasText(value)) parts.push(`${label}: ${value}`);
    }
    if (hasText(scene.keyDialogue)) parts.push(`핵심 대사: ${scene.keyDialogue}`);
    lines.push(parts.join('\n'));
  }
  return lines;
}

function productionDirectionLines(direction?: SceneDirectionData): string[] {
  const lines: string[] = [];
  const production = direction?.productionDirection;
  if (production) {
    for (const [fieldKey, label] of PRODUCTION_FIELDS) {
      const value = (production as unknown as Record<string, unknown>)[fieldKey];
      if (hasText(value)) lines.push(`${label}: ${value}`);
    }
  }
  return lines;
}

function externalCraftReferencesFromConfig(
  input: BuildWritingContextPackInput,
): readonly ExternalCraftReference[] {
  return input.externalCraftReferences ?? input.config.externalCraftReferences ?? [];
}

function workDirectionLines(config: StoryConfig): string[] {
  const direction = config.sceneDirection;
  const lines: string[] = [];
  if (!direction) return lines;
  if (direction.hooks?.length) lines.push(`훅: ${direction.hooks.map((hook) => `${hook.position}/${hook.hookType} ${hook.desc}`).join(' / ')}`);
  if (direction.emotionTargets?.length) {
    lines.push(`감정 목표: ${direction.emotionTargets.map((target) => `${target.emotion} ${target.intensity}`).join(' / ')}`);
  }
  if (direction.cliffhanger?.cliffType || direction.cliffhanger?.desc) {
    lines.push(`클리프행어: ${[direction.cliffhanger.cliffType, direction.cliffhanger.desc].filter(Boolean).join(' — ')}`);
  }
  if (direction.foreshadows?.length) {
    lines.push(`복선: ${direction.foreshadows.map((item) => `${item.planted}→${item.payoff}${item.resolved ? '(회수)' : '(미회수)'}`).join(' / ')}`);
  }
  if (hasText(direction.writerNotes)) lines.push(`작가 메모: ${direction.writerNotes}`);
  return lines;
}

function previousLines(previousEpisodes: PreviousEpisodeContext[], projectId: string, episode: number): {
  lines: string[];
  hardStopReasons: string[];
  omitted: WritingContextOmission[];
  refs: WritingContextSourceRef[];
} {
  const lines: string[] = [];
  const hardStopReasons: string[] = [];
  const omitted: WritingContextOmission[] = [];
  const refs: WritingContextSourceRef[] = [];
  const sorted = [...previousEpisodes]
    .filter((previous) => previous.episode < episode)
    .sort((left, right) => right.episode - left.episode)
    .slice(0, 2);

  for (const previous of sorted) {
    const sourceId = `previous:${previous.episode}`;
    if (previous.projectId !== projectId) {
      hardStopReasons.push(`다른 프로젝트의 ${previous.episode}화 요약이 기준선 후보에 섞였습니다.`);
      refs.push({
        id: sourceId,
        tabId: 'writing',
        fieldKey: `manuscripts.${previous.episode}`,
        label: `${previous.episode}화 요약`,
        sourceType: 'previous-episode',
        status: 'blocked',
        episode: previous.episode,
        updatedAt: previous.updatedAt,
        hash: simpleHash(`${previous.projectId}:${previous.episode}:${previous.summary ?? ''}`),
      });
      omitted.push({
        sourceId,
        label: `${previous.episode}화 요약`,
        reason: 'project-mismatch',
        detail: '프로젝트가 달라 기준선에서 제외했습니다.',
      });
      continue;
    }
    refs.push({
      id: sourceId,
      tabId: 'writing',
      fieldKey: `manuscripts.${previous.episode}`,
      label: `${previous.episode}화 요약`,
      sourceType: 'previous-episode',
      status: 'adopted',
      episode: previous.episode,
      updatedAt: previous.updatedAt,
      hash: simpleHash(`${previous.projectId}:${previous.episode}:${previous.summary ?? ''}`),
    });
    lines.push([
      `${previous.episode}화${previous.title ? ` ${previous.title}` : ''}`,
      previous.summary ? `요약: ${previous.summary}` : '',
      previous.detailedSummary ? `상세: ${previous.detailedSummary}` : '',
      previous.continuityNotes ? `연속성: ${previous.continuityNotes}` : '',
    ].filter(Boolean).join('\n'));
  }

  return { lines, hardStopReasons, omitted, refs };
}

function previousContextFromManuscripts(config: StoryConfig, projectId: string, episode: number): PreviousEpisodeContext[] {
  return (config.manuscripts ?? [])
    .filter((manuscript: EpisodeManuscript) => manuscript.episode < episode)
    .map((manuscript) => ({
      projectId,
      episode: manuscript.episode,
      title: manuscript.title,
      summary: manuscript.summary || compactText(manuscript.content || '', 260),
      detailedSummary: manuscript.detailedSummary,
      updatedAt: manuscript.lastUpdate,
    }));
}

function trimBlocks(
  blocks: WritingContextBlock[],
  maxChars: number,
): { blocks: WritingContextBlock[]; omitted: WritingContextOmission[]; usedChars: number; trimmed: boolean } {
  const nextBlocks = [...blocks].sort((left, right) => right.priority - left.priority);
  const omitted: WritingContextOmission[] = [];
  let usedChars = nextBlocks.reduce((sum, block) => sum + block.content.length, 0);
  if (usedChars <= maxChars) return { blocks: nextBlocks, omitted, usedChars, trimmed: false };

  for (const scope of TRIM_ORDER) {
    for (let index = nextBlocks.length - 1; index >= 0 && usedChars > maxChars; index -= 1) {
      const block = nextBlocks[index];
      if (!block || block.scope !== scope || block.priority >= 90) continue;
      usedChars -= block.content.length;
      nextBlocks.splice(index, 1);
      omitted.push({
        sourceId: block.id,
        label: block.label,
        reason: 'token-budget',
        detail: '기준선 길이 제한 때문에 낮은 우선순위 블록을 줄였습니다.',
      });
    }
  }

  return {
    blocks: nextBlocks,
    omitted,
    usedChars: nextBlocks.reduce((sum, block) => sum + block.content.length, 0),
    trimmed: true,
  };
}

export function buildWritingContextPack(input: BuildWritingContextPackInput): WritingContextPack {
  const config = input.config;
  const projectId = safeProjectId(input.projectId);
  const episode = input.episode ?? config.episode ?? 1;
  const mode = inferMode({ ...input, episode });
  const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
  const sourceRefs: WritingContextSourceRef[] = [];
  const omitted: WritingContextOmission[] = [];
  const hardStopReasons: string[] = [];
  const blocks: WritingContextBlock[] = [];

  for (const [fieldKey, label] of WORLD_FIELDS) {
    const value = (config as unknown as Record<string, unknown>)[fieldKey];
    if (hasText(value)) {
      pushSource(sourceRefs, {
        id: `world:${fieldKey}`,
        tabId: 'world',
        fieldKey,
        label,
        sourceType: 'author-canvas',
        status: 'adopted',
      });
    }
  }

  for (const evidence of Object.values(config.worldFieldEvidence ?? {})) {
    if (evidence.arcsStatus === 'conflict' || evidence.arcsStatus === 'hold') {
      const sourceId = pushSource(sourceRefs, {
        id: `world-evidence:${evidence.fieldKey}`,
        tabId: 'world',
        fieldKey: evidence.fieldKey,
        label: evidence.sourceLabel || evidence.fieldKey,
        sourceType: 'accepted-import',
        status: evidence.arcsStatus === 'conflict' ? 'excluded-conflict' : 'excluded-hold',
        updatedAt: evidence.updatedAt,
      });
      pushOmitted(
        omitted,
        sourceId,
        evidence.sourceLabel || evidence.fieldKey,
        evidence.arcsStatus === 'conflict' ? 'conflict' : 'hold',
        '보류/충돌 상태의 세계관 근거는 생성 기준선에 넣지 않습니다.',
      );
    }
  }

  const world = worldLines(config, mode);
  addBlock(blocks, {
    id: 'world-book',
    label: mode === 'episode-1-bootstrap' ? '세계관 전체 기준선' : '세계관 압축 기준선',
    scope: 'global',
    priority: mode === 'episode-1-bootstrap' ? 85 : 65,
    content: world.join('\n'),
    sourceRefs: sourceRefs.filter((source) => source.tabId === 'world' && source.status === 'adopted').map((source) => source.id),
  });

  const scenario = mainScenarioLines(config, mode);
  if (scenario.length > 0) {
    const scenarioSourceId = pushSource(sourceRefs, {
      id: 'scenario:main',
      tabId: 'scenario',
      fieldKey: 'mainScenarioStructure',
      label: '메인 시나리오',
      sourceType: 'author-canvas',
      status: 'adopted',
      updatedAt: config.mainScenarioStructure?.updatedAt,
    });
    addBlock(blocks, {
      id: 'main-scenario',
      label: '메인 시나리오 기준선',
      scope: 'global',
      priority: 80,
      content: scenario.join('\n'),
      sourceRefs: [scenarioSourceId],
    });
  }

  const characterSources: string[] = [];
  const characterContent = activeCharacters(config).map((character) => {
    const sourceId = pushSource(sourceRefs, {
      id: `character:${character.id || character.name}`,
      tabId: 'character',
      fieldKey: character.id || character.name,
      label: character.name,
      sourceType: 'author-canvas',
      status: 'adopted',
    });
    characterSources.push(sourceId);
    return characterLines(character);
  });
  addBlock(blocks, {
    id: 'character-dna',
    label: '캐릭터 기준선',
    scope: 'current-episode',
    priority: 90,
    content: characterContent.join('\n\n'),
    sourceRefs: characterSources,
  });

  const itemSources: string[] = [];
  const itemContent = activeItems(config).map((item) => {
    const sourceId = pushSource(sourceRefs, {
      id: `item:${item.id || item.name}`,
      tabId: 'item',
      fieldKey: item.id || item.name,
      label: item.name,
      sourceType: 'author-canvas',
      status: 'adopted',
    });
    itemSources.push(sourceId);
    return itemLines(item);
  });
  addBlock(blocks, {
    id: 'item-state',
    label: '아이템 상태 기준선',
    scope: 'current-episode',
    priority: 84,
    content: itemContent.join('\n\n'),
    sourceRefs: itemSources,
  });

  const sheet = currentSheet(config, episode);
  if (sheet) {
    const sceneSourceId = pushSource(sourceRefs, {
      id: `scene:${episode}`,
      tabId: 'scene',
      fieldKey: `episodeSceneSheets.${episode}`,
      label: `${episode}화 씬시트`,
      sourceType: 'author-canvas',
      status: 'adopted',
      episode,
      updatedAt: sheet.lastUpdate,
    });
    addBlock(blocks, {
      id: `scene-sheet:${episode}`,
      label: `${episode}화 씬시트`,
      scope: 'current-episode',
      priority: 100,
      content: sceneLines(sheet).join('\n\n'),
      sourceRefs: [sceneSourceId],
    });
  } else {
    pushOmitted(
      omitted,
      `scene:${episode}`,
      `${episode}화 씬시트`,
      'missing',
      '현재 화 씬시트가 없어 세계관/연출 기준만 사용합니다.',
    );
  }

  const directionSources: string[] = [];
  if (config.sceneDirection) {
    directionSources.push(pushSource(sourceRefs, {
      id: 'direction:work',
      tabId: 'direction',
      fieldKey: 'sceneDirection',
      label: '작품 연출',
      sourceType: 'author-canvas',
      status: 'adopted',
      episode,
    }));
  }
  const directionLines = [
    ...workDirectionLines(config),
    ...productionDirectionLines(config.sceneDirection),
    ...productionDirectionLines(sheet?.directionSnapshot),
  ];
  addBlock(blocks, {
    id: 'act-guide',
    label: '연출 기준선',
    scope: 'current-episode',
    priority: 96,
    content: directionLines.join('\n'),
    sourceRefs: directionSources,
  });

  const externalCraftReferences = externalCraftReferencesFromConfig(input).slice(0, 3);
  for (const reference of externalCraftReferences) {
    const sourceId = pushSource(sourceRefs, {
      id: `external-craft:${reference.id}`,
      tabId: 'reference',
      fieldKey: reference.id,
      label: '외부 기법 브릿지',
      sourceType: 'external-craft-reference',
      status: 'adopted',
      updatedAt: reference.createdAt,
      hash: simpleHash(`${reference.sourceProjectId}:${reference.sourceHash}:${reference.objective}`),
    });
    addBlock(blocks, {
      id: `external-craft:${reference.id}`,
      label: '외부 기법 브릿지',
      scope: 'external-craft',
      priority: 74,
      content: buildExternalCraftPromptBlock(reference),
      sourceRefs: [sourceId],
    });
  }

  const previousEpisodes = input.previousEpisodes ?? previousContextFromManuscripts(config, projectId, episode);
  if (mode !== 'episode-1-bootstrap') {
    const previous = previousLines(previousEpisodes, projectId, episode);
    hardStopReasons.push(...previous.hardStopReasons);
    omitted.push(...previous.omitted);
    sourceRefs.push(...previous.refs);
    addBlock(blocks, {
      id: 'previous-episode',
      label: '이전 화 요약',
      scope: 'previous-episode',
      priority: 72,
      content: previous.lines.join('\n\n'),
      sourceRefs: previous.refs.filter((source) => source.status === 'adopted').map((source) => source.id),
    });
    if (previous.lines.length === 0) {
      pushOmitted(omitted, 'previous-episode', '이전 화 요약', 'missing', '2화 이후 기준선에 이전 화 요약이 없습니다.');
    }
  }

  if (mode === 'selection-rewrite' && hasText(input.selectedText)) {
    const sourceId = pushSource(sourceRefs, {
      id: 'selection:current',
      tabId: 'writing',
      fieldKey: 'selectedText',
      label: '선택 영역',
      sourceType: 'selection',
      status: 'adopted',
      episode,
    });
    addBlock(blocks, {
      id: 'selection',
      label: '선택 영역',
      scope: 'selection',
      priority: 92,
      content: compactText(input.selectedText, 1_200),
      sourceRefs: [sourceId],
    });
  }

  for (const candidate of config.acceptedImportCandidates ?? []) {
    if (!candidate.routedToStage) {
      const sourceId = pushSource(sourceRefs, {
        id: `candidate:${candidate.id}`,
        tabId: candidate.bucket === 'rightsIp' ? 'project' : candidate.bucket === 'mainScenario' ? 'scenario' : 'world',
        fieldKey: candidate.routedTargetKey || candidate.bucket,
        label: candidate.title,
        sourceType: 'accepted-import',
        status: 'excluded-candidate',
        updatedAt: candidate.routedAt || candidate.acceptedAt,
      });
      pushOmitted(omitted, sourceId, candidate.title, 'candidate-only', '라우팅되지 않은 읽은 자료는 생성 기준선에 넣지 않습니다.');
    }
  }

  if (hardStopReasons.length > 0) {
    addBlock(blocks, {
      id: 'project-isolation',
      label: '프로젝트 격리 차단',
      scope: 'safety',
      priority: 110,
      content: hardStopReasons.join('\n'),
      sourceRefs: [],
    });
  }

  const trimmed = trimBlocks(blocks, maxChars);
  const allOmitted = [...omitted, ...trimmed.omitted];
  const contextItems = writingContextPackToContextItems({
    mode,
    modeLabel: modeLabel(mode),
    projectId,
    sessionId: input.sessionId,
    episode,
    baselineVersion: 2,
    sourceRefs,
    blocks: trimmed.blocks,
    omitted: allOmitted,
    hardStopReasons,
    tokenBudget: {
      maxChars,
      usedChars: trimmed.usedChars,
      trimmed: trimmed.trimmed,
    },
    hash: '',
    preview: '',
  });
  const preview = buildContextBlock(contextItems);
  const hash = simpleHash(JSON.stringify({
    mode,
    projectId,
    sessionId: input.sessionId,
    episode,
    sourceRefs,
    blocks: trimmed.blocks,
    omitted: allOmitted,
    hardStopReasons,
  }));

  return {
    mode,
    modeLabel: modeLabel(mode),
    projectId,
    sessionId: input.sessionId,
    episode,
    baselineVersion: 2,
    sourceRefs,
    blocks: trimmed.blocks,
    omitted: allOmitted,
    hardStopReasons,
    tokenBudget: {
      maxChars,
      usedChars: trimmed.usedChars,
      trimmed: trimmed.trimmed,
    },
    hash,
    preview,
  };
}

export function writingContextPackToContextItems(pack: WritingContextPack): ContextItem[] {
  return pack.blocks.map((block) => ({
    tab: block.scope,
    label: block.label,
    fact: `${block.label} · ${block.sourceRefs.length}개 근거`,
    details: block.content,
  }));
}

export function summarizeWritingContextPack(pack: WritingContextPack): {
  label: string;
  canGenerate: boolean;
  needsReview: boolean;
  sourceCount: number;
  omittedCount: number;
} {
  return {
    label: pack.hardStopReasons.length > 0
      ? '차단됨'
      : pack.omitted.some((item) => item.reason === 'missing' || item.reason === 'hold' || item.reason === 'conflict')
        ? '검토 필요'
        : pack.modeLabel,
    canGenerate: pack.hardStopReasons.length === 0,
    needsReview: pack.omitted.length > 0 || pack.tokenBudget.trimmed,
    sourceCount: pack.sourceRefs.filter((source) => source.status === 'adopted').length,
    omittedCount: pack.omitted.length,
  };
}

export function buildAIWritePromptFromContextPack(params: {
  pack: WritingContextPack;
  scene: string;
  manuscript: string;
  genrePrefix?: string;
  useAgentRegistry?: boolean;
}): {
  canGenerate: boolean;
  prompt: string;
  blockedReasons: string[];
} {
  if (params.pack.hardStopReasons.length > 0) {
    return {
      canGenerate: false,
      prompt: '',
      blockedReasons: params.pack.hardStopReasons,
    };
  }
  return {
    canGenerate: true,
    prompt: buildAIWritePrompt({
      contextItems: writingContextPackToContextItems(params.pack),
      scene: params.scene,
      manuscript: params.manuscript,
      genrePrefix: params.genrePrefix,
      useAgentRegistry: params.useAgentRegistry,
    }),
    blockedReasons: [],
  };
}
