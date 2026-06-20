import type { StoryConfig } from '@/lib/studio-types';
import { scoreAllAxes } from '@/lib/compliance/orchestrator';
import type { AxisContext, Pov } from '@/lib/compliance/types';

export type WritingContextCheckId =
  | 'world'
  | 'character'
  | 'item'
  | 'main-scenario'
  | 'scene'
  | 'scene-design'
  | 'direction'
  | 'production-direction'
  | 'seven-axis'
  | 'next-episode'
  | 'forbidden-disclosure';

export type WritingContextCheckState = 'ready' | 'needs-review' | 'needs-context';

export interface WritingContextCheck {
  id: WritingContextCheckId;
  label: string;
  state: WritingContextCheckState;
  detail: string;
  evidenceCount: number;
  hint: string;
}

export interface WritingContextComplianceReport {
  score: number;
  readyCount: number;
  reviewCount: number;
  missingCount: number;
  checks: WritingContextCheck[];
  limitation: string;
}

const WORLD_FIELDS = [
  'corePremise',
  'powerStructure',
  'currentConflict',
  'worldHistory',
  'socialSystem',
  'economy',
  'magicTechSystem',
  'factionRelations',
  'survivalEnvironment',
  'culture',
  'religion',
  'education',
  'lawOrder',
  'taboo',
  'travelComm',
  'truthVsBeliefs',
  'dailyLife',
] as const satisfies readonly (keyof StoryConfig)[];

const PRODUCTION_DIRECTION_FIELDS = [
  'miseEnScene',
  'camera',
  'lighting',
  'sound',
  'action',
  'proseRhythm',
] as const;

const SCENE_DESIGN_FIELDS = [
  'purpose',
  'conflict',
  'publicInfo',
  'hiddenInfo',
  'emotionCurve',
  'rewardBeat',
  'hookPoint',
  'nextScene',
] as const;

const DRAFT_META_PATTERN = /(?:A\s*I|에이아이)\s*(생성|채팅)/i;

const STATE_WEIGHT: Record<WritingContextCheckState, number> = {
  ready: 1,
  'needs-review': 0.55,
  'needs-context': 0.2,
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeForLooseMatch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
}

function includesLoose(source: string, target: string): boolean {
  const needle = normalizeForLooseMatch(target);
  if (!needle) return false;
  return normalizeForLooseMatch(source).includes(needle);
}

function meaningfulTokens(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => {
      const normalized = normalizeForLooseMatch(token);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 8);
}

function countDraftMatches(draft: string, values: string[]): number {
  if (!draft.trim()) return 0;
  const tokens = values.flatMap((value) => meaningfulTokens(value));
  const uniqueTokens = [...new Set(tokens.map((token) => normalizeForLooseMatch(token)))];
  return uniqueTokens.reduce((count, token) => count + (includesLoose(draft, token) ? 1 : 0), 0);
}

function acceptedCount(config: StoryConfig, bucket: NonNullable<StoryConfig['acceptedImportCandidates']>[number]['bucket']): number {
  return (config.acceptedImportCandidates ?? []).filter((candidate) => candidate.bucket === bucket).length;
}

function nonEmptyWorldFieldCount(config: StoryConfig): number {
  return WORLD_FIELDS.reduce((count, key) => count + (hasText(config[key]) ? 1 : 0), 0);
}

function worldEvidenceSummary(config: StoryConfig): { total: number; conflict: number; hold: number; draft: number; pass: number } {
  const records = Object.values(config.worldFieldEvidence ?? {});
  return records.reduce(
    (summary, record) => {
      const arcsStatus = record.arcsStatus;
      return {
        total: summary.total + 1,
        conflict: summary.conflict + (arcsStatus === 'conflict' ? 1 : 0),
        hold: summary.hold + (arcsStatus === 'hold' ? 1 : 0),
        draft: summary.draft + (arcsStatus === 'draft' || arcsStatus === 'not_checked' ? 1 : 0),
        pass: summary.pass + (arcsStatus === 'pass' ? 1 : 0),
      };
    },
    { total: 0, conflict: 0, hold: 0, draft: 0, pass: 0 },
  );
}

function directionEvidenceCount(config: StoryConfig): number {
  const direction = config.sceneDirection;
  if (!direction) return 0;
  let count = 0;
  if (direction.goguma?.length) count += 1;
  if (direction.hooks?.length) count += 1;
  if (direction.emotionTargets?.length) count += 1;
  if (direction.dialogueTones?.length) count += 1;
  if (direction.dopamineDevices?.length) count += 1;
  if (direction.cliffhanger?.cliffType || direction.cliffhanger?.desc) count += 1;
  if (hasText(direction.plotStructure)) count += 1;
  if (direction.foreshadows?.length) count += 1;
  if (direction.pacings?.length) count += 1;
  if (direction.tensionCurve?.length) count += 1;
  if (direction.canonRules?.length) count += 1;
  if (direction.sceneTransitions?.length) count += 1;
  if (hasText(direction.writerNotes)) count += 1;
  if (direction.activeCharacters?.length) count += 1;
  if (direction.activeItems?.length) count += 1;
  return count;
}

function currentSceneSheet(config: StoryConfig) {
  return (config.episodeSceneSheets ?? []).find((sheet) => sheet.episode === config.episode);
}

function mapScenePov(config: StoryConfig): Pov {
  const raw = `${config.povCharacter ?? ''}`.toLocaleLowerCase();
  if (/1인칭|first/.test(raw)) return 'first';
  if (/3인칭|third/.test(raw)) return 'third';
  if (/전지|omniscient/.test(raw)) return 'omniscient';
  return 'unknown';
}

function buildAxisContext(config: StoryConfig, draft: string): AxisContext {
  const currentSheet = currentSceneSheet(config);
  const sceneTexts = (currentSheet?.scenes ?? []).flatMap((scene) => [
    scene.summary,
    scene.purpose,
    scene.conflict,
    scene.publicInfo,
    scene.hiddenInfo,
    scene.rewardBeat,
    scene.hookPoint,
    scene.keyDialogue,
    scene.emotionPoint,
  ]).filter((value): value is string => hasText(value));

  const atmosphereKeywords = [
    ...(currentSheet?.scenes ?? []).map((scene) => scene.tone),
    ...(config.sceneDirection?.hooks ?? []),
    ...(config.sceneDirection?.emotionTargets ?? []),
  ].filter((value): value is string => hasText(value));

  const characterContexts = (config.characters ?? []).map((character) => ({
    name: character.name,
    aliases: [character.id, character.role].filter((value): value is string => hasText(value)),
    personality: character.personality || character.traits,
    speechStyle: character.speechStyle,
    speechExample: character.speechExample,
    forbiddenWords: [],
  }));

  return {
    draft,
    characters: characterContexts,
    sceneSheet: {
      tone: atmosphereKeywords[0],
      pov: mapScenePov(config),
      events: sceneTexts.slice(0, 12),
      atmosphereKeywords: atmosphereKeywords.slice(0, 12),
    },
    genre: {
      genreId: String(config.genre ?? ''),
      requiredMotifs: config.subGenres,
    },
  };
}

function buildSevenAxisCheck(config: StoryConfig, draft: string): WritingContextCheck {
  if (!draft.trim()) {
    return {
      id: 'seven-axis',
      label: '7축 보조 점검',
      state: 'needs-context',
      detail: '본문이 비어 있어 7축 보조 점검을 실행하지 않았습니다.',
      evidenceCount: 0,
      hint: '초안이 생기면 세계관, 캐릭터, 연출, 장르, 씬시트, 연속성, IP 축을 함께 봅니다.',
    };
  }

  try {
    const report = scoreAllAxes(buildAxisContext(config, draft), {
      totalPassThreshold: 80,
      strictCritical: true,
    });
    const failingAxes = report.axes.filter((axis) => !axis.passed);
    const hasCritical = report.criticalCount > 0;
    const advisoryReady = report.totalScore >= 80 && !hasCritical;
    return {
      id: 'seven-axis',
      label: '7축 보조 점검',
      state: advisoryReady ? 'ready' : 'needs-review',
      detail: advisoryReady
        ? `7축 보조 점검 ${report.totalScore}점입니다.`
        : `7축 보조 점검 ${report.totalScore}점, 검토 축 ${failingAxes.map((axis) => axis.axis).join(', ') || '없음'}.`,
      evidenceCount: report.axes.length,
      hint: failingAxes[0]?.recommendations[0]
        ?? '축별 결과는 자동 판정이 아니라 원고 점검 힌트로만 사용합니다.',
    };
  } catch (err) {
    return {
      id: 'seven-axis',
      label: '7축 보조 점검',
      state: 'needs-review',
      detail: `7축 보조 점검 실행 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`,
      evidenceCount: 0,
      hint: '기존 설정 준수 카드 결과를 기준으로 먼저 점검하고, 7축 입력 매핑을 확인합니다.',
    };
  }
}

function buildWorldCheck(config: StoryConfig): WritingContextCheck {
  const directCount = nonEmptyWorldFieldCount(config);
  const imported = acceptedCount(config, 'world');
  const evidenceSummary = worldEvidenceSummary(config);
  const evidenceCount = directCount + imported + evidenceSummary.total;
  if (evidenceSummary.conflict > 0) {
    return {
      id: 'world',
      label: '세계관 규칙',
      state: 'needs-review',
      detail: `ARCS 충돌 후보 ${evidenceSummary.conflict}개가 남아 있습니다.`,
      evidenceCount,
      hint: '충돌 상태의 세계관 근거는 본문 기준선으로 쓰기 전에 보류하거나 수정합니다.',
    };
  }
  if (directCount >= 3) {
    return {
      id: 'world',
      label: '세계관 규칙',
      state: evidenceSummary.hold > 0 || evidenceSummary.draft > 0 ? 'needs-review' : 'ready',
      detail: evidenceSummary.total > 0
        ? `직접 입력 세계관 ${directCount}개, ARCS 통과 ${evidenceSummary.pass}개가 집필 기준선에 있습니다.`
        : `직접 입력 세계관 ${directCount}개가 집필 기준선에 있습니다.`,
      evidenceCount,
      hint: evidenceSummary.hold > 0 || evidenceSummary.draft > 0
        ? '보류/초안 상태의 세계관 근거는 본문 반영 전 채택 여부를 확인합니다.'
        : '본문 작성 전 현실 전제, 권력 구조, 현재 갈등을 함께 확인합니다.',
    };
  }
  if (evidenceCount > 0) {
    return {
      id: 'world',
      label: '세계관 규칙',
      state: 'needs-review',
      detail: `세계관 근거 ${evidenceCount}개가 있으나 직접 입력 기준선은 ${directCount}개입니다.`,
      evidenceCount,
      hint: '불러온 후보 또는 단편 메모를 세계관 필드에 채택해 기준선을 두껍게 만듭니다.',
    };
  }
  return {
    id: 'world',
    label: '세계관 규칙',
    state: 'needs-context',
    detail: '세계관 기준선이 비어 있습니다.',
    evidenceCount,
    hint: '핵심 전제, 권력 구조, 현재 갈등 중 최소 1개부터 채웁니다.',
  };
}

function buildCharacterCheck(config: StoryConfig, draft: string): WritingContextCheck {
  const characters = config.characters ?? [];
  const imported = acceptedCount(config, 'characters');
  const activeNames = config.sceneDirection?.activeCharacters ?? [];
  const activeCharacters = activeNames
    .map((name) => characters.find((character) => character.name === name || character.id === name) ?? null)
    .filter((character): character is NonNullable<typeof character> => character != null);
  const evidenceCount = activeNames.length || characters.length || imported;

  if (activeNames.length > 0) {
    const displayNames = activeCharacters.map((character) => character.name);
    const namesForMatch = displayNames.length > 0 ? displayNames : activeNames;
    const missingInDraft = draft.trim()
      ? namesForMatch.filter((name) => !includesLoose(draft, name))
      : [];
    if (missingInDraft.length > 0) {
      return {
        id: 'character',
        label: '캐릭터 연계',
        state: 'needs-review',
        detail: `이번 화 활성 인물 중 본문에서 바로 확인되지 않는 이름: ${missingInDraft.join(', ')}`,
        evidenceCount,
        hint: '등장하지 않는 인물이라면 활성 목록에서 빼고, 등장한다면 첫 장면에서 이름 또는 명확한 호칭을 남깁니다.',
      };
    }
    return {
      id: 'character',
      label: '캐릭터 연계',
      state: 'ready',
      detail: `이번 화 활성 인물 ${activeNames.length}명이 지정되어 있습니다.`,
      evidenceCount,
      hint: '말투, 정보 상태, 관계 변화는 본문 작성 후 세부 점검합니다.',
    };
  }

  if (characters.length > 0 || imported > 0) {
    return {
      id: 'character',
      label: '캐릭터 연계',
      state: 'needs-review',
      detail: `캐릭터 근거 ${characters.length + imported}개가 있으나 이번 화 활성 인물 지정이 없습니다.`,
      evidenceCount,
      hint: '집필 전 이번 화 등장 인물을 선택하면 노아가 불필요한 캐릭터를 덜 끌고 옵니다.',
    };
  }

  return {
    id: 'character',
    label: '캐릭터 연계',
    state: 'needs-context',
    detail: '캐릭터 기준선이 비어 있습니다.',
    evidenceCount,
    hint: '주인공, 대립자, 조력자 중 현재 회차에 쓰는 인물부터 등록합니다.',
  };
}

function buildItemCheck(config: StoryConfig, draft: string): WritingContextCheck {
  const items = config.items ?? [];
  const imported = acceptedCount(config, 'items');
  const activeIds = config.sceneDirection?.activeItems ?? [];
  const activeItems = activeIds
    .map((id) => items.find((item) => item.id === id || item.name === id) ?? null)
    .filter((item): item is NonNullable<typeof item> => item != null);
  const evidenceCount = activeIds.length || items.length || imported;

  if (activeIds.length > 0) {
    const namesForMatch = activeItems.length > 0 ? activeItems.map((item) => item.name) : activeIds;
    const missingInDraft = draft.trim()
      ? namesForMatch.filter((name) => !includesLoose(draft, name))
      : [];
    if (missingInDraft.length > 0) {
      return {
        id: 'item',
        label: '아이템 상태',
        state: 'needs-review',
        detail: `활성 아이템 중 본문에서 바로 확인되지 않는 항목: ${missingInDraft.join(', ')}`,
        evidenceCount,
        hint: '소유자, 현재 위치, 사용 조건이 장면 안에서 어긋나지 않는지 확인합니다.',
      };
    }
    return {
      id: 'item',
      label: '아이템 상태',
      state: 'ready',
      detail: `이번 화 활성 아이템 ${activeIds.length}개가 지정되어 있습니다.`,
      evidenceCount,
      hint: '능력, 비용, 소유권 변화는 퇴고 단계에서 다시 대조합니다.',
    };
  }

  if (items.length > 0 || imported > 0) {
    return {
      id: 'item',
      label: '아이템 상태',
      state: 'needs-review',
      detail: `아이템 근거 ${items.length + imported}개가 있으나 이번 화 활성 아이템 지정이 없습니다.`,
      evidenceCount,
      hint: '이번 화에 쓰는 아이템만 활성화하면 소유·상태 오류를 줄일 수 있습니다.',
    };
  }

  return {
    id: 'item',
    label: '아이템 상태',
    state: 'needs-context',
    detail: '아이템 기준선이 비어 있습니다.',
    evidenceCount,
    hint: '없어도 되는 작품이면 비워둬도 되지만, 핵심 물건은 카드로 남기는 편이 안전합니다.',
  };
}

function buildMainScenarioCheck(config: StoryConfig): WritingContextCheck {
  const imported = acceptedCount(config, 'mainScenario');
  const hasDirectScenario = hasText(config.synopsis) || hasText(config.corePremise);
  if (hasDirectScenario || imported > 0) {
    return {
      id: 'main-scenario',
      label: '메인 시나리오',
      state: hasDirectScenario ? 'ready' : 'needs-review',
      detail: hasDirectScenario
        ? '시놉시스 또는 핵심 전제가 집필 기준선에 있습니다.'
        : `불러온 메인 시나리오 후보 ${imported}개가 있으나 직접 기준선 채택 여부 확인이 필요합니다.`,
      evidenceCount: Number(hasText(config.synopsis)) + Number(hasText(config.corePremise)) + imported,
      hint: '이번 화 목적이 메인 시나리오의 어느 비트를 밀고 있는지 확인합니다.',
    };
  }
  return {
    id: 'main-scenario',
    label: '메인 시나리오',
    state: 'needs-context',
    detail: '메인 시나리오 기준선이 비어 있습니다.',
    evidenceCount: 0,
    hint: '전체 목표, 이번 화 목표, 결말 방향 중 하나부터 정합니다.',
  };
}

function buildSceneCheck(config: StoryConfig): WritingContextCheck {
  const sheet = currentSceneSheet(config);
  const imported = acceptedCount(config, 'scenes');
  if (sheet) {
    const sceneCount = sheet.scenes?.length ?? 0;
    return {
      id: 'scene',
      label: '씬 목적',
      state: sceneCount > 0 || hasText(sheet.title) || hasText(sheet.arc) ? 'ready' : 'needs-review',
      detail: sceneCount > 0
        ? `현재 회차 씬 ${sceneCount}개가 연결되어 있습니다.`
        : '현재 회차 씬시트는 있으나 장면 행이 비어 있습니다.',
      evidenceCount: sceneCount + Number(hasText(sheet.title)) + Number(hasText(sheet.arc)),
      hint: '장면별 목적, 감정 포인트, 다음 장면 연결을 본문과 대조합니다.',
    };
  }
  const totalSheets = config.episodeSceneSheets?.length ?? 0;
  if (totalSheets > 0 || imported > 0) {
    return {
      id: 'scene',
      label: '씬 목적',
      state: 'needs-review',
      detail: `씬 근거는 ${totalSheets + imported}개 있으나 현재 회차(${config.episode})와 바로 맞물린 시트가 없습니다.`,
      evidenceCount: totalSheets + imported,
      hint: '프로젝트 회차 번호와 씬시트 회차 번호가 같은지 확인합니다.',
    };
  }
  return {
    id: 'scene',
    label: '씬 목적',
    state: 'needs-context',
    detail: '현재 회차 씬시트가 비어 있습니다.',
    evidenceCount: 0,
    hint: '최소한 시작 장면, 전환 장면, 마감 장면을 먼저 잡습니다.',
  };
}

function sceneDesignValues(config: StoryConfig): string[] {
  const sheet = currentSceneSheet(config);
  return (sheet?.scenes ?? []).flatMap((scene) => [
    scene.sceneName,
    scene.characters,
    scene.summary,
    scene.keyDialogue,
    scene.emotionPoint,
    ...SCENE_DESIGN_FIELDS.map((field) => scene[field] ?? ''),
  ]).filter(hasText);
}

function buildSceneDesignCheck(config: StoryConfig, draft: string): WritingContextCheck {
  const sheet = currentSceneSheet(config);
  const scenes = sheet?.scenes ?? [];
  const filledDesignCount = scenes.reduce(
    (count, scene) => count + SCENE_DESIGN_FIELDS.reduce((fieldCount, field) => fieldCount + (hasText(scene[field]) ? 1 : 0), 0),
    0,
  );
  const evidenceCount = filledDesignCount + scenes.length;

  if (scenes.length === 0) {
    return {
      id: 'scene-design',
      label: '씬 8영역',
      state: 'needs-context',
      detail: '현재 회차에 대조할 씬 8영역이 없습니다.',
      evidenceCount,
      hint: '목적, 갈등, 공개/숨김 정보, 감정곡선, 보상감, 후킹, 다음 연결을 씬별로 채웁니다.',
    };
  }

  if (filledDesignCount === 0) {
    return {
      id: 'scene-design',
      label: '씬 8영역',
      state: 'needs-review',
      detail: `씬 ${scenes.length}개가 있으나 8영역 세부값이 비어 있습니다.`,
      evidenceCount,
      hint: '단순 장면 목록이 아니라 장면 목적과 정보 공개 순서를 채택해야 본문 대조가 쉬워집니다.',
    };
  }

  const matchedCount = countDraftMatches(draft, sceneDesignValues(config));
  if (draft.trim() && matchedCount === 0) {
    return {
      id: 'scene-design',
      label: '씬 8영역',
      state: 'needs-review',
      detail: `씬 8영역 ${filledDesignCount}개가 있으나 본문에서 직접 확인되는 단서가 적습니다.`,
      evidenceCount,
      hint: '초안이 다른 방향으로 흐른 것인지, 씬시트를 갱신해야 하는지 작가가 결정합니다.',
    };
  }

  return {
    id: 'scene-design',
    label: '씬 8영역',
    state: filledDesignCount >= scenes.length * 4 ? 'ready' : 'needs-review',
    detail: `씬 ${scenes.length}개에 8영역 세부값 ${filledDesignCount}개가 연결되어 있습니다.`,
    evidenceCount,
    hint: '본문 작성 후 목적, 갈등, 공개 정보, 후킹이 장면 안에서 살아 있는지 확인합니다.',
  };
}

function buildDirectionCheck(config: StoryConfig): WritingContextCheck {
  const directCount = directionEvidenceCount(config);
  const imported = acceptedCount(config, 'direction');
  if (directCount > 0) {
    return {
      id: 'direction',
      label: '연출 의도',
      state: 'ready',
      detail: `연출 기준 ${directCount}개가 집필 기준선에 있습니다.`,
      evidenceCount: directCount + imported,
      hint: '훅, 감정 목표, 클리프행어, 작가 메모를 본문 리듬과 대조합니다.',
    };
  }
  if (imported > 0) {
    return {
      id: 'direction',
      label: '연출 의도',
      state: 'needs-review',
      detail: `불러온 연출 후보 ${imported}개가 있으나 직접 기준선 채택 여부 확인이 필요합니다.`,
      evidenceCount: imported,
      hint: '채택한 연출만 현재 회차 기준선으로 올립니다.',
    };
  }
  return {
    id: 'direction',
    label: '연출 의도',
    state: 'needs-context',
    detail: '연출 의도가 비어 있습니다.',
    evidenceCount: 0,
    hint: '훅, 감정 목표, 클리프행어 중 하나만 있어도 초안 방향이 선명해집니다.',
  };
}

function currentProductionDirection(config: StoryConfig) {
  return config.sceneDirection?.productionDirection ?? currentSceneSheet(config)?.directionSnapshot?.productionDirection;
}

function buildProductionDirectionCheck(config: StoryConfig): WritingContextCheck {
  const productionDirection = currentProductionDirection(config);
  const directCount = productionDirection
    ? PRODUCTION_DIRECTION_FIELDS.reduce((count, field) => count + (hasText(productionDirection[field]) ? 1 : 0), 0)
    : 0;
  const imported = acceptedCount(config, 'direction');
  const evidenceCount = directCount + imported;

  if (directCount >= 3) {
    return {
      id: 'production-direction',
      label: '연출 방식',
      state: 'ready',
      detail: `미장센·카메라·조명·사운드·액션·문장 리듬 중 ${directCount}개가 분리 저장되어 있습니다.`,
      evidenceCount,
      hint: '연출 방식은 씬시트와 별도로 보존하고, 본문에는 필요한 감각만 녹입니다.',
    };
  }
  if (directCount > 0 || imported > 0) {
    return {
      id: 'production-direction',
      label: '연출 방식',
      state: 'needs-review',
      detail: `연출 방식 근거 ${evidenceCount}개가 있으나 세부 항목은 ${directCount}개입니다.`,
      evidenceCount,
      hint: '불러온 연출 후보를 미장센, 카메라, 조명, 사운드, 액션, 문장 리듬으로 나눠 채택합니다.',
    };
  }
  return {
    id: 'production-direction',
      label: '연출 방식',
    state: 'needs-context',
    detail: '연출 방식이 비어 있습니다.',
    evidenceCount,
    hint: '장면을 어떻게 보이게 할지와 문장 리듬을 분리하면 집필 중 방향 흔들림이 줄어듭니다.',
  };
}

function buildNextEpisodeCheck(draft: string): WritingContextCheck {
  const leakPattern = /(다음\s*(화|회|편)|차회|차\s*회|to be continued|next episode)/i;
  const matched = draft.trim() ? leakPattern.test(draft) : false;
  return {
    id: 'next-episode',
    label: '다음 화 침범',
    state: matched ? 'needs-review' : 'ready',
    detail: matched ? '다음 화/차회로 읽히는 표현이 본문에 보입니다.' : '다음 화 침범으로 보이는 직접 표식은 없습니다.',
    evidenceCount: matched ? 1 : 0,
    hint: '의도한 클리프행어라면 유지하고, 메모가 섞인 것이라면 본문에서 분리합니다.',
  };
}

function buildForbiddenDisclosureCheck(draft: string): WritingContextCheck {
  const patterns = [
    /\[(컨텍스트|장면 지시|개선 지시|본문)\]/i,
    /^#{1,6}\s/m,
    /\bTODO\b/i,
    /노아\s*제안|프롬프트|시스템\s*프롬프트/i,
    DRAFT_META_PATTERN,
  ];
  const matched = draft.trim() ? patterns.some((pattern) => pattern.test(draft)) : false;
  return {
    id: 'forbidden-disclosure',
    label: '작업 메타 노출',
    state: matched ? 'needs-review' : 'ready',
    detail: matched ? '본문 안에 작업 지시, 마크다운 헤딩, 생성 메타로 보이는 표식이 있습니다.' : '본문에 직접 노출된 작업 메타 표식은 없습니다.',
    evidenceCount: matched ? 1 : 0,
    hint: '독자에게 보일 원고에는 작업 지시와 내부 표식을 남기지 않습니다.',
  };
}

export function buildWritingContextComplianceReport(
  config: StoryConfig,
  draft: string,
): WritingContextComplianceReport {
  const checks: WritingContextCheck[] = [
    buildWorldCheck(config),
    buildCharacterCheck(config, draft),
    buildItemCheck(config, draft),
    buildMainScenarioCheck(config),
    buildSceneCheck(config),
    buildSceneDesignCheck(config, draft),
    buildDirectionCheck(config),
    buildProductionDirectionCheck(config),
    buildSevenAxisCheck(config, draft),
    buildNextEpisodeCheck(draft),
    buildForbiddenDisclosureCheck(draft),
  ];
  const readyCount = checks.filter((check) => check.state === 'ready').length;
  const reviewCount = checks.filter((check) => check.state === 'needs-review').length;
  const missingCount = checks.filter((check) => check.state === 'needs-context').length;
  const weighted = checks.reduce((sum, check) => sum + STATE_WEIGHT[check.state], 0);
  return {
    score: Math.round((weighted / checks.length) * 100),
    readyCount,
    reviewCount,
    missingCount,
    checks,
    limitation: '자동 판정이 아니라 작업 지표입니다. 최종 채택, 보류, 수정은 작가가 결정합니다.',
  };
}
