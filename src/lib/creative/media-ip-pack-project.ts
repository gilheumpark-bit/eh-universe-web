import {
  buildIpBible,
  IP_BIBLE_SECTION_KEYS,
  IP_BIBLE_SECTION_META,
  type IpBible,
  type IpBibleCluster,
  type IpBibleSectionKey,
} from '@/lib/creative/ip-bible-builder';
import {
  buildMediaIpPackPlan,
  getMediaIpPackProfile,
  type MediaIpPackFormFieldCompletion,
  type MediaIpPackFormGroupCompletion,
  type MediaIpPackPlan,
  type MediaIpPackProfileId,
} from '@/lib/creative/media-ip-pack-profile';
import type { EpisodeManuscript, StoryConfig } from '@/lib/studio-types';

type SectionSignals = Partial<Record<IpBibleSectionKey, boolean>>;

export interface ProjectExternalMaterialClusterCompletion {
  id: IpBibleCluster;
  labelKo: string;
  purposeKo: string;
  filledCount: number;
  totalCount: number;
  statusKo: '대기' | '보강 필요' | '준비';
}

const EXTERNAL_MATERIAL_CLUSTER_ORDER: readonly IpBibleCluster[] = Object.freeze([
  'entry',
  'story',
  'setting',
  'business',
]);

const EXTERNAL_MATERIAL_CLUSTER_LABEL_KO: Record<IpBibleCluster, string> = {
  entry: '진입 자료',
  story: '스토리 자료',
  setting: '설정 자료',
  business: '제작·사업 자료',
};

const EXTERNAL_MATERIAL_CLUSTER_PURPOSE_KO: Record<IpBibleCluster, string> = {
  entry: '첫 검토자가 작품의 정체와 매력을 빠르게 파악하는 자료입니다.',
  story: '시놉시스, 플롯, 핵심 장면처럼 서사의 뼈대를 설명하는 자료입니다.',
  setting: '세계관, 인물, 용어처럼 매체 확장 때 흔들리면 안 되는 기준 자료입니다.',
  business: '비주얼, 시장 포지션, 에피소드, 확장 가능성을 검토하는 자료입니다.',
};

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasAnyText(...values: unknown[]): boolean {
  return values.some(hasText);
}

function hasRightsSignal(config: StoryConfig): boolean {
  return hasAnyText(config.rightsNote, config.rightsStatus) || hasItems(config.rightsLedger);
}

function hasVisualSignal(config: StoryConfig): boolean {
  return hasItems(config.visualPromptCards) || (config.characters ?? []).some((character) =>
    hasAnyText(character.appearance, character.symbol, character.assetMemo),
  );
}

function hasSceneSignal(config: StoryConfig): boolean {
  return (config.episodeSceneSheets ?? []).some((sheet) => (sheet.scenes ?? []).length > 0);
}

function hasSceneField(config: StoryConfig, field: keyof NonNullable<StoryConfig['sceneDirection']>): boolean {
  const value = config.sceneDirection?.[field];
  if (Array.isArray(value)) return value.length > 0;
  if (hasText(value)) return true;
  return Boolean(value && typeof value === 'object' && Object.values(value).some((item) => hasText(item)));
}

function hasTranslatedSignal(config: StoryConfig): boolean {
  return hasItems(config.translatedManuscripts) || Boolean(config.translationConfig?.targetLang);
}

function hasImportSignal(config: StoryConfig): boolean {
  return hasItems(config.acceptedImportCandidates) || hasItems(config.importFileReports);
}

function fieldCompletion(
  labelKo: string,
  filled: boolean,
  sourceKo: string,
): MediaIpPackFormFieldCompletion {
  return {
    labelKo,
    filled,
    sourceKo: filled ? sourceKo : '입력 대기',
  };
}

function materialClusterStatus(filledCount: number, totalCount: number): ProjectExternalMaterialClusterCompletion['statusKo'] {
  if (totalCount > 0 && filledCount >= totalCount) return '준비';
  if (filledCount > 0) return '보강 필요';
  return '대기';
}

function evaluateProjectFormField(
  labelKo: string,
  config: StoryConfig,
  manuscripts: readonly EpisodeManuscript[],
): MediaIpPackFormFieldCompletion {
  const hasManuscripts = manuscripts.length > 0 || hasItems(config.manuscripts);
  const hasEpisodeOne = manuscripts.some((item) => item.episode === 1 && hasAnyText(item.title, item.content));
  const hasCharacters = hasItems(config.characters);
  const hasCharacterAppearance = (config.characters ?? []).some((character) => hasAnyText(character.appearance, character.symbol));
  const hasRelations = hasItems(config.charRelations) || (config.characters ?? []).some((character) => hasAnyText(character.relationPattern));
  const hasItemsOrSkills = hasItems(config.items) || hasItems(config.skills) || hasItems(config.magicSystems);
  const hasAssetSignal = hasVisualSignal(config) || hasItemsOrSkills;
  const hasWorldRules = hasAnyText(
    config.corePremise,
    config.powerStructure,
    config.magicTechSystem,
    config.lawOrder,
    config.taboo,
  );
  const hasMainScenario = Boolean(
    hasItems(config.mainScenarioStructure?.acts) ||
    hasItems(config.mainScenarioStructure?.eventChain) ||
    hasItems(config.mainScenarioStructure?.sevenSentenceSynopsis),
  );
  const hasEnding = Boolean(config.mainScenarioStructure?.endingLock?.locked || hasAnyText(config.mainScenarioStructure?.endingLock?.finalImage));
  const hasSceneTransition = hasSceneField(config, 'sceneTransitions') ||
    (config.episodeSceneSheets ?? []).some((sheet) => (sheet.scenes ?? []).some((scene) => hasText(scene.nextScene)));
  const hasHooks = hasSceneField(config, 'hooks') ||
    (config.episodeSceneSheets ?? []).some((sheet) => (sheet.scenes ?? []).some((scene) => hasAnyText(scene.hookPoint, scene.rewardBeat)));
  const hasGlossary = hasItemsOrSkills || hasItems(config.translationConfig?.glossary);
  const hasSensitiveCulture = hasAnyText(config.culture, config.religion, config.taboo, config.lawOrder);
  const hasMarket = hasAnyText(config.targetMarket, config.projectTargetLanguage, config.publishPlatform, config.platform, config.genreMode);
  const hasSpeechSignal = (config.characters ?? []).some((character) =>
    hasAnyText(character.speechStyle, character.speechExample),
  );
  const hasPronunciationSignal = hasGlossary || hasAnyText(config.translationConfig?.targetLang);
  const hasAudioRhythmSignal = hasSceneField(config, 'writerNotes') ||
    hasSceneSignal(config) ||
    hasAnyText(config.primaryEmotion, config.narrativeIntensity);

  switch (labelKo) {
    case '로그라인':
    case '시즌 로그라인':
      return fieldCompletion(labelKo, hasAnyText(config.synopsis, config.corePremise), '시놉시스·핵심 전제');
    case '1화 후킹':
      return fieldCompletion(labelKo, hasEpisodeOne || hasHooks, '1화 원고·훅');
    case '목표 독자':
    case '타깃 시청층':
    case '독자층':
      return fieldCompletion(labelKo, hasMarket, '시장·플랫폼 설정');
    case '연재 회차':
    case '시즌 수':
      return fieldCompletion(labelKo, hasPositiveNumber(config.totalEpisodes) || hasItems(config.mainScenarioStructure?.acts), '목표 회차·시즌 구조');
    case '플랫폼 기준':
    case '현지 플랫폼':
      return fieldCompletion(labelKo, hasAnyText(config.publishPlatform, config.platform, config.targetEpisodeLength), '플랫폼·분량 기준');
    case '대상 형식':
      return fieldCompletion(labelKo, hasAnyText(config.releasePurpose, config.publishPlatform, config.platform, config.genreMode), '출고 목적·플랫폼');
    case '회차 길이':
      return fieldCompletion(labelKo, hasPositiveNumber(config.totalEpisodes) || hasAnyText(config.targetEpisodeLength) || hasManuscripts, '목표 회차·분량 기준');
    case '내레이션 비중':
      return fieldCompletion(labelKo, hasAudioRhythmSignal, '연출 메모·씬시트');
    case '주요 청취층':
      return fieldCompletion(labelKo, hasMarket, '시장·플랫폼 설정');
    case '연재·판매 채널':
      return fieldCompletion(labelKo, hasAnyText(config.publishPlatform, config.platform, config.targetMarket), '플랫폼·시장 설정');
    case '주요 인물 외형':
      return fieldCompletion(labelKo, hasCharacterAppearance, '캐릭터 외형·상징');
    case '상징색·소품':
    case '소품':
    case '로고·문양':
    case '반복 노출 장면':
      return fieldCompletion(labelKo, hasAssetSignal, '비주얼·아이템 자산');
    case '관계 구도':
      return fieldCompletion(labelKo, hasRelations, '캐릭터 관계');
    case '키씬 5~10개':
    case '회차별 핵심 사건':
      return fieldCompletion(labelKo, hasSceneSignal(config) || hasHooks, '씬시트·연출');
    case '컷 전환 메모':
      return fieldCompletion(labelKo, hasSceneTransition, '장면 전환');
    case '콘티 귀속':
    case '작화 산출물 귀속':
    case '썸네일 사용 범위':
    case '선공개 조건':
    case '각색권 기간':
    case '지역 범위':
    case '독점 여부':
    case '크레딧 표기':
    case '트리트먼트 귀속':
    case '스핀오프 범위':
    case '음성·음악 권리':
    case '성우 녹음 권리':
    case '음향·음악 사용 범위':
    case '효과음 권리':
    case '홍보 클립 범위':
    case '각색 승인 절차':
    case '상품화 권리':
    case '감수 범위':
    case '설정 변경 승인 절차':
    case '언어권 범위':
    case '전자책 권리':
    case '오디오 권리':
    case '표지·홍보 승인권':
    case '허용 상품군':
    case '금지 상품군':
    case '색상 기준':
    case '문구 조합':
    case '샘플 승인 절차':
    case '카테고리 독점':
    case '판매 지역':
    case '계약 기간':
    case '최소 보장금':
    case '재고 처리 조건':
      return fieldCompletion(labelKo, hasRightsSignal(config), '권리/IP 메모·권리 원장');
    case '스포일러 공개 시점':
    case '결말 포함 여부':
      return fieldCompletion(labelKo, hasEnding || hasAnyText(config.synopsis), '결말 잠금·시놉시스');
    case '주요 갈등':
      return fieldCompletion(labelKo, hasAnyText(config.currentConflict) || hasMainScenario, '현재 갈등·사건 체인');
    case '전환점 표':
      return fieldCompletion(labelKo, hasMainScenario, '메인 시나리오');
    case '클라이맥스':
      return fieldCompletion(labelKo, hasEnding || hasSceneField(config, 'cliffhanger'), '결말 잠금·클리프행어');
    case '주요 세트':
      return fieldCompletion(labelKo, hasAnyText(config.setting) || hasVisualSignal(config), '무대·비주얼 카드');
    case '제작 난도 메모':
      return fieldCompletion(labelKo, hasAnyText(config.sceneDirection?.writerNotes) || Boolean(config.sceneDirection?.productionDirection), '연출 메모');
    case '세계 규칙':
    case '금기':
    case '능력 제한':
    case '진영 관계':
    case '시대·지역 범위':
      return fieldCompletion(labelKo, hasWorldRules, '세계관 기준선');
    case '플레이어블 후보':
      return fieldCompletion(labelKo, hasCharacters, '캐릭터 목록');
    case '주요 아이템':
      return fieldCompletion(labelKo, hasItems(config.items), '아이템 목록');
    case '스킬 체계':
      return fieldCompletion(labelKo, hasItems(config.skills) || hasItems(config.magicSystems), '스킬·시스템');
    case '적대 세력':
      return fieldCompletion(labelKo, hasAnyText(config.factionRelations) || hasRelations, '세력·관계');
    case '성장 단계':
      return fieldCompletion(labelKo, (config.characters ?? []).some((character) => hasText(character.changeArc)), '캐릭터 변화');
    case '대상 국가':
      return fieldCompletion(labelKo, hasAnyText(config.targetMarket), '대상 시장');
    case '대상 언어':
      return fieldCompletion(labelKo, hasAnyText(config.projectTargetLanguage, config.translationConfig?.targetLang), '대상 언어');
    case '현지 제목 후보':
      return fieldCompletion(labelKo, hasTranslatedSignal(config), '번역 원고·현지화 설정');
    case '용어집':
    case '고유명사 표기':
      return fieldCompletion(labelKo, hasGlossary, '용어집·설정 자산');
    case '말투 기준':
    case '주요 인물 말투':
      return fieldCompletion(labelKo, hasSpeechSignal, '캐릭터 말투');
    case '호칭 기준':
      return fieldCompletion(labelKo, hasSpeechSignal || hasRelations, '캐릭터 말투·관계');
    case '감정 흐름':
      return fieldCompletion(labelKo, hasAnyText(config.primaryEmotion) || hasSceneField(config, 'tensionCurve'), '작품 정서·장면 곡선');
    case '대사 밀도':
      return fieldCompletion(labelKo, hasManuscripts || hasSceneSignal(config), '원고·씬시트');
    case '발음·표기 기준':
      return fieldCompletion(labelKo, hasPronunciationSignal, '용어집·표기 기준');
    case '문화권 민감 표현':
      return fieldCompletion(labelKo, hasSensitiveCulture || hasImportSignal(config), '문화·금기·불러오기 기록');
    case '역번역 확인 메모':
      return fieldCompletion(labelKo, hasTranslatedSignal(config), '번역 기록');
    case '캐릭터명':
      return fieldCompletion(labelKo, hasCharacters, '캐릭터 목록');
    case '상징 문구':
      return fieldCompletion(labelKo, (config.characters ?? []).some((character) => hasAnyText(character.symbol, character.assetMemo)), '상징·자산 메모');
    default:
      return fieldCompletion(labelKo, false, '입력 대기');
  }
}

export function inferMediaIpPackProfileId(config: Pick<StoryConfig,
  'genreMode' | 'releasePurpose' | 'projectTargetLanguage' | 'targetMarket'
> | null | undefined): MediaIpPackProfileId {
  if (!config) return 'webtoon';
  if (config.projectTargetLanguage && config.projectTargetLanguage !== 'KO') return 'globalTranslation';
  if (config.targetMarket && config.targetMarket !== 'KR') return 'globalTranslation';
  if (config.genreMode === 'drama') return 'screen';
  if (config.genreMode === 'game') return 'gameAnimation';
  if (config.genreMode === 'webtoon') return 'webtoon';
  if (config.releasePurpose === 'ip_pitch') return 'screen';
  return 'webtoon';
}

export function buildIpBibleForStoryConfig(config: StoryConfig): IpBible {
  return buildIpBible({
    title: config.title,
    genre: String(config.genre ?? ''),
    synopsis: config.synopsis,
    povCharacter: config.povCharacter,
    setting: config.setting,
    primaryEmotion: config.primaryEmotion,
    episode: config.episode,
    totalEpisodes: config.totalEpisodes,
    platform: String(config.platform ?? ''),
    publishPlatform: config.publishPlatform ? String(config.publishPlatform) : undefined,
    subGenres: config.subGenres,
    narrativeIntensity: config.narrativeIntensity,
    corePremise: config.corePremise,
    powerStructure: config.powerStructure,
    currentConflict: config.currentConflict,
    worldHistory: config.worldHistory,
    socialSystem: config.socialSystem,
    economy: config.economy,
    magicTechSystem: config.magicTechSystem,
    factionRelations: config.factionRelations,
    survivalEnvironment: config.survivalEnvironment,
    culture: config.culture,
    religion: config.religion,
    lawOrder: config.lawOrder,
    taboo: config.taboo,
    characters: config.characters,
    charRelations: config.charRelations,
    items: config.items,
    skills: config.skills,
    magicSystems: config.magicSystems,
  });
}

export function buildFilledIpBibleSectionKeys(
  config: StoryConfig,
  manuscripts: readonly EpisodeManuscript[] = [],
): IpBibleSectionKey[] {
  const bible = buildIpBibleForStoryConfig(config);
  const fromBible: SectionSignals = IP_BIBLE_SECTION_KEYS.reduce<SectionSignals>((acc, key) => {
    acc[key] = bible.sections[key]?.filled === true;
    return acc;
  }, {});
  const hasSceneRows = (config.episodeSceneSheets ?? []).some((sheet) => (sheet.scenes ?? []).length > 0);
  const hasVisualPrompt = hasItems(config.visualPromptCards);
  const hasDirection = Boolean(
    config.sceneDirection &&
    (
      hasText(config.sceneDirection.plotStructure) ||
      hasText(config.sceneDirection.writerNotes) ||
      Boolean(config.sceneDirection.productionDirection) ||
      hasItems(config.sceneDirection.hooks) ||
      hasItems(config.sceneDirection.tensionCurve)
    ),
  );
  const hasScenario = Boolean(
    config.mainScenarioStructure &&
    (
      hasItems(config.mainScenarioStructure.acts) ||
      hasItems(config.mainScenarioStructure.eventChain) ||
      hasItems(config.mainScenarioStructure.sevenSentenceSynopsis) ||
      Boolean(config.mainScenarioStructure.endingLock?.locked)
    ),
  );
  const hasIpExpansionSignal = Boolean(
    hasText(config.rightsNote) ||
    config.releasePurpose === 'ip_pitch' ||
    (config.characters ?? []).some((character) => character.assetPotential === 'high' || character.assetPotential === 'premium') ||
    (config.items ?? []).some((item) => item.ipPotential === 'high' || item.ipPotential === 'premium'),
  );

  return IP_BIBLE_SECTION_KEYS.filter((key) => {
    if (fromBible[key]) return true;
    if (key === 'plotStructure') return hasScenario || hasDirection;
    if (key === 'keyScenes') return hasSceneRows || hasDirection;
    if (key === 'visualGuide') return hasVisualPrompt || hasDirection;
    if (key === 'episodeGuide') return manuscripts.length > 0 || hasItems(config.episodeSceneSheets) || config.totalEpisodes > 0;
    if (key === 'glossary') return hasItems(config.items) || hasItems(config.skills) || hasItems(config.magicSystems);
    if (key === 'ipExpansion') return hasIpExpansionSignal;
    return false;
  });
}

export function buildProjectExternalMaterialClusters(input: {
  config: StoryConfig;
  manuscripts?: readonly EpisodeManuscript[];
}): ProjectExternalMaterialClusterCompletion[] {
  const filledSections = new Set(buildFilledIpBibleSectionKeys(input.config, input.manuscripts ?? []));

  return EXTERNAL_MATERIAL_CLUSTER_ORDER.map((cluster) => {
    const sections = IP_BIBLE_SECTION_KEYS.filter((key) => IP_BIBLE_SECTION_META[key].cluster === cluster);
    const filledCount = sections.filter((key) => filledSections.has(key)).length;
    const totalCount = sections.length;

    return {
      id: cluster,
      labelKo: EXTERNAL_MATERIAL_CLUSTER_LABEL_KO[cluster],
      purposeKo: EXTERNAL_MATERIAL_CLUSTER_PURPOSE_KO[cluster],
      filledCount,
      totalCount,
      statusKo: materialClusterStatus(filledCount, totalCount),
    };
  });
}

export function buildProjectMediaIpPackPlan(input: {
  config: StoryConfig;
  manuscripts?: readonly EpisodeManuscript[];
  profileId?: MediaIpPackProfileId | null;
}): MediaIpPackPlan {
  return buildMediaIpPackPlan({
    profileId: input.profileId ?? inferMediaIpPackProfileId(input.config),
    filledSectionKeys: buildFilledIpBibleSectionKeys(input.config, input.manuscripts ?? []),
  });
}

export function buildProjectMediaIpPackFormCompletions(input: {
  config: StoryConfig;
  manuscripts?: readonly EpisodeManuscript[];
  profileId?: MediaIpPackProfileId | null;
}): MediaIpPackFormGroupCompletion[] {
  const profile = getMediaIpPackProfile(input.profileId ?? inferMediaIpPackProfileId(input.config));
  const manuscripts = input.manuscripts ?? [];

  return profile.formGroupsKo.map((group) => {
    const fields = group.fieldsKo.map((labelKo) =>
      evaluateProjectFormField(labelKo, input.config, manuscripts),
    );
    const filledCount = fields.filter((field) => field.filled).length;

    return {
      titleKo: group.titleKo,
      purposeKo: group.purposeKo,
      filledCount,
      totalCount: fields.length,
      fields,
    };
  });
}
