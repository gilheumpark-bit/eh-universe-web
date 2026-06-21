import { Genre, type Character, type Item, type StoryConfig } from '@/lib/studio-types';
import {
  buildAIWritePromptFromContextPack,
  buildWritingContextPack,
  summarizeWritingContextPack,
} from '../context-pack';
import { buildExternalCraftBridge } from '../cross-project-bridge';

function baseConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.SYSTEM_HUNTER,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '테스트 작품',
    totalEpisodes: 10,
    guardrails: { min: 5500, max: 7000 },
    characters: [],
    platform: 'webnovel',
    ...overrides,
  } as StoryConfig;
}

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: '강민우',
    role: '주인공',
    traits: '냉정함',
    appearance: '검은 코트',
    dna: 82,
    desire: '첫 균열의 진실을 찾는다',
    deficiency: '타인을 쉽게 믿지 못한다',
    speechStyle: '짧게 끊어 말함',
    informationState: 'partial',
    ...overrides,
  };
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'black-blade',
    name: '흑검',
    category: 'weapon',
    rarity: 'rare',
    description: '균열을 자르는 검',
    effect: '봉인 절단',
    obtainedFrom: '첫 균열',
    owner: '강민우',
    currentLocation: '협회 보관실',
    status: 'active',
    ...overrides,
  };
}

function richConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return baseConfig({
    corePremise: '탑이 도시 한복판에 솟아오른 세계',
    powerStructure: '협회가 각성자와 균열 기록을 관리한다',
    currentConflict: '주인공은 협회 기록 조작을 추적한다',
    worldHistory: '첫 균열 이후 협회가 비밀 기록을 독점했다',
    synopsis: '강민우가 첫 균열의 진실을 추적한다',
    characters: [character()],
    items: [item()],
    sceneDirection: {
      activeCharacters: ['강민우'],
      activeItems: ['black-blade'],
      hooks: [{ position: 'opening', hookType: 'mystery', desc: '비어 있는 기록함' }],
      emotionTargets: [{ emotion: '긴장', intensity: 70 }],
      cliffhanger: { cliffType: '문서 누락', desc: '기록함 안쪽이 비어 있다' },
      writerNotes: '흑검의 소유권을 흔들지 않는다',
      productionDirection: {
        miseEnScene: '잠긴 보관실과 낮은 조도',
        camera: '흑검을 잡은 손에서 기록함으로 이동',
        lighting: '차갑고 낮은 청색광',
        sound: '봉인이 갈라지는 금속성 잔향',
        action: '강민우가 흑검으로 봉인을 가른다',
        proseRhythm: '짧은 문장으로 긴장을 올린다',
      },
    },
    episodeSceneSheets: [
      {
        episode: 1,
        title: '누락된 기록',
        arc: '첫 균열 조사',
        scenes: [
          {
            sceneId: '1-1',
            sceneName: '보관실',
            characters: '강민우',
            tone: '긴장',
            summary: '강민우가 흑검으로 봉인을 연다',
            purpose: '첫 균열의 기록 누락을 발견한다',
            conflict: '협회 보관실의 봉인이 조사를 막는다',
            publicInfo: '협회가 균열 기록을 관리한다',
            hiddenInfo: '첫 균열 기록 일부가 사라졌다',
            emotionCurve: '의심에서 긴장으로 상승',
            rewardBeat: '흑검이 봉인을 자를 수 있음을 확인',
            hookPoint: '기록이 비어 있다는 사실',
            keyDialogue: '기록이 비어 있다.',
            emotionPoint: '의심',
            nextScene: '추적',
          },
        ],
        lastUpdate: 1,
      },
      {
        episode: 2,
        title: '두 번째 기록함',
        scenes: [
          {
            sceneId: '2-1',
            sceneName: '기록국 복도',
            characters: '강민우',
            tone: '압박',
            summary: '강민우가 누락된 문서의 담당자를 찾아간다',
            purpose: '기록 조작의 담당자를 특정한다',
            conflict: '기록국 보안이 접근을 막는다',
            publicInfo: '담당자는 퇴직 처리되어 있다',
            hiddenInfo: '담당자는 살아 있다',
            emotionCurve: '압박에서 확신으로 이동',
            rewardBeat: '퇴직 기록의 위조 흔적을 찾는다',
            hookPoint: '퇴직 날짜가 첫 균열 당일이다',
            keyDialogue: '이 날짜가 맞을 리 없어.',
            emotionPoint: '확신',
            nextScene: '담당자 추적',
          },
        ],
        lastUpdate: 2,
      },
    ],
    manuscripts: [
      {
        episode: 1,
        title: '누락된 기록',
        content: '강민우는 흑검으로 봉인을 갈랐다.',
        charCount: 20,
        lastUpdate: 10,
        summary: '강민우가 협회 보관실에서 첫 균열 기록 누락을 확인했다.',
      },
    ],
    ...overrides,
  });
}

describe('buildWritingContextPack', () => {
  it('1화는 세계관부터 연출까지 전체 기준선으로 묶는다', () => {
    const pack = buildWritingContextPack({
      config: richConfig(),
      projectId: 'novel-a',
      sessionId: 'session-a',
    });

    expect(pack.mode).toBe('episode-1-bootstrap');
    expect(pack.modeLabel).toBe('전체 기준선');
    expect(pack.projectId).toBe('novel-a');
    expect(pack.blocks.map((block) => block.id)).toEqual(expect.arrayContaining([
      'world-book',
      'main-scenario',
      'character-dna',
      'item-state',
      'scene-sheet:1',
      'act-guide',
    ]));
    expect(pack.preview).toContain('세계관 전체 기준선');
    expect(summarizeWritingContextPack(pack)).toMatchObject({
      canGenerate: true,
      sourceCount: expect.any(Number),
    });
  });

  it('2화 이후는 압축 기준선과 현재 화 씬시트, 이전 화 요약을 우선한다', () => {
    const pack = buildWritingContextPack({
      config: richConfig({ episode: 2 }),
      projectId: 'novel-a',
    });

    expect(pack.mode).toBe('episode-n-draft');
    expect(pack.modeLabel).toBe('현재 화 기준선');
    expect(pack.blocks.find((block) => block.id === 'world-book')?.label).toBe('세계관 압축 기준선');
    expect(pack.blocks.find((block) => block.id === 'scene-sheet:2')?.content).toContain('기록국 복도');
    expect(pack.blocks.find((block) => block.id === 'previous-episode')?.content).toContain('첫 균열 기록 누락');
    expect(pack.blocks.find((block) => block.id === 'scene-sheet:1')).toBeUndefined();
  });

  it('보류/충돌 세계관 근거와 라우팅되지 않은 후보는 생성 기준선에서 제외한다', () => {
    const pack = buildWritingContextPack({
      config: richConfig({
        worldFieldEvidence: {
          corePremise: {
            fieldKey: 'corePremise',
            sourceLabel: '외부 세계관 후보',
            conflictCount: 1,
            arcsStatus: 'conflict',
            updatedAt: '2026-06-14T00:00:00.000Z',
          },
        },
        acceptedImportCandidates: [
          {
            id: 'candidate-1',
            sourceFileName: 'memo.md',
            bucket: 'world',
            targetType: 'world',
            title: '미라우팅 세계관 후보',
            text: '아직 라우팅되지 않은 후보',
            excerpt: '후보',
            confidence: 0.8,
            reason: '세계관 후보',
            detectedFormat: 'md',
            sectionIndex: 0,
            charCount: 20,
            importedAt: '2026-06-14T00:00:00.000Z',
            acceptedAt: '2026-06-14T00:00:00.000Z',
          },
        ],
      }),
      projectId: 'novel-a',
    });

    expect(pack.sourceRefs.find((source) => source.id === 'world-evidence:corePremise')?.status).toBe('excluded-conflict');
    expect(pack.sourceRefs.find((source) => source.id === 'candidate:candidate-1')?.status).toBe('excluded-candidate');
    expect(pack.omitted.map((item) => item.reason)).toEqual(expect.arrayContaining(['conflict', 'candidate-only']));
    expect(pack.preview).not.toContain('아직 라우팅되지 않은 후보');
  });

  it('다른 프로젝트의 이전 화 요약이 섞이면 차단한다', () => {
    const pack = buildWritingContextPack({
      config: richConfig({ episode: 2, manuscripts: [] }),
      projectId: 'novel-a',
      previousEpisodes: [
        {
          projectId: 'novel-b',
          episode: 1,
          summary: '다른 작품의 1화 요약',
        },
      ],
    });

    expect(pack.hardStopReasons).toHaveLength(1);
    expect(pack.blocks.find((block) => block.id === 'project-isolation')?.content).toContain('다른 프로젝트');
    expect(summarizeWritingContextPack(pack)).toMatchObject({
      label: '차단됨',
      canGenerate: false,
    });
  });

  it('선택 영역 리라이트는 선택 영역 블록을 별도로 남긴다', () => {
    const pack = buildWritingContextPack({
      config: richConfig(),
      projectId: 'novel-a',
      selectedText: '강민우는 봉인 앞에서 잠시 숨을 멈췄다.',
    });

    expect(pack.mode).toBe('selection-rewrite');
    expect(pack.blocks.find((block) => block.id === 'selection')?.content).toContain('숨을 멈췄다');
  });

  it('외부 기법 참조는 원문 없이 별도 브릿지 블록으로만 넣는다', () => {
    const bridge = buildExternalCraftBridge({
      currentProjectId: 'novel-a',
      sourceProjectId: 'novel-b',
      sourceProjectTitle: '붉은성',
      objective: '붉은성 결말부처럼 긴장 상승 리듬을 참고',
      sourceText: '붉은성의 아린은 닫힌 문 앞에서 멈췄다. 침묵이 길어졌다. 딸깍, 문 너머의 진실이 드러났다.',
    });

    expect(bridge.ok).toBe(true);
    const pack = buildWritingContextPack({
      config: richConfig({
        externalCraftReferences: bridge.reference ? [bridge.reference] : [],
      }),
      projectId: 'novel-a',
    });

    const externalBlock = pack.blocks.find((block) => block.scope === 'external-craft');
    expect(externalBlock?.label).toBe('외부 기법 브릿지');
    expect(externalBlock?.content).toContain('<EXTERNAL_CRAFT_REFERENCE>');
    expect(externalBlock?.content).not.toContain('붉은성');
    expect(externalBlock?.content).not.toContain('아린');
    expect(pack.preview).toContain('외부 기법 브릿지');
  });

  it('기준선 팩으로 생성 프롬프트를 만들되 차단 사유가 있으면 prompt를 비운다', () => {
    const safePack = buildWritingContextPack({
      config: richConfig(),
      projectId: 'novel-a',
    });
    const safePrompt = buildAIWritePromptFromContextPack({
      pack: safePack,
      scene: '보관실 장면을 이어 쓴다',
      manuscript: '',
    });
    expect(safePrompt.canGenerate).toBe(true);
    expect(safePrompt.prompt).toContain('보관실 장면을 이어 쓴다');
    expect(safePrompt.prompt).toContain('세계관 전체 기준선');

    const blockedPack = buildWritingContextPack({
      config: richConfig({ episode: 2, manuscripts: [] }),
      projectId: 'novel-a',
      previousEpisodes: [{ projectId: 'novel-b', episode: 1, summary: '다른 작품 요약' }],
    });
    const blockedPrompt = buildAIWritePromptFromContextPack({
      pack: blockedPack,
      scene: '2화를 쓴다',
      manuscript: '',
    });
    expect(blockedPrompt.canGenerate).toBe(false);
    expect(blockedPrompt.prompt).toBe('');
    expect(blockedPrompt.blockedReasons[0]).toContain('다른 프로젝트');
  });
});
