import { Genre, PlatformType, PublishPlatform, type StoryConfig } from '@/lib/studio-types';
import {
  buildFilledIpBibleSectionKeys,
  buildProjectExternalMaterialClusters,
  buildProjectMediaIpPackFormCompletions,
  buildProjectMediaIpPackPlan,
  inferMediaIpPackProfileId,
} from '@/lib/creative/media-ip-pack-project';

function makeConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '테스트 작품',
    totalEpisodes: 50,
    synopsis: '문을 여는 사람이 도시의 규칙을 바꾼다.',
    guardrails: { min: 5500, max: 7000 },
    characters: [],
    platform: PlatformType.WEB,
    ...overrides,
  };
}

describe('media-ip-pack-project — 프로젝트 기준 연결', () => {
  it('해외 언어권 프로젝트는 해외·번역 권리팩을 권장한다', () => {
    expect(inferMediaIpPackProfileId(makeConfig({
      projectTargetLanguage: 'EN',
      targetMarket: 'US',
    }))).toBe('globalTranslation');
  });

  it('장르 모드에 따라 영상·게임 권리팩을 권장한다', () => {
    expect(inferMediaIpPackProfileId(makeConfig({ genreMode: 'drama' }))).toBe('screen');
    expect(inferMediaIpPackProfileId(makeConfig({ genreMode: 'game' }))).toBe('gameAnimation');
  });

  it('씬시트·연출·비주얼·원고 신호를 IP 바이블 섹션으로 승격한다', () => {
    const config = makeConfig({
      sceneDirection: {
        plotStructure: '1막에서 의뢰를 받고 2막에서 계약의 대가를 확인한다.',
        writerNotes: '회색 도시, 낮은 조도, 빠른 컷 전환',
      },
      episodeSceneSheets: [
        {
          id: 'sheet-1',
          episode: 1,
          title: '첫 의뢰',
          scenes: [
            {
              sceneId: '1-1',
              sceneName: '등기소',
              characters: '주인공',
              tone: '긴장',
              summary: '문서가 빛난다.',
              keyDialogue: '이 문은 누구의 것입니까?',
              emotionPoint: '의심',
              nextScene: '계약서',
            },
          ],
          lastUpdate: 1,
        },
      ],
      visualPromptCards: [
        {
          id: 'visual-1',
          episode: 1,
          title: '키비주얼',
          shotType: 'cover',
          targetUse: 'cover',
          selectedCharacters: [],
          selectedObjects: [],
          levels: {
            subjectFocus: 2,
            backgroundDensity: 2,
            sceneTension: 2,
            emotionIntensity: 2,
            compositionDrama: 2,
            styleStrength: 2,
            symbolismWeight: 2,
          },
          subjectPrompt: '문 앞에 선 인물',
          backgroundPrompt: '등기소',
          scenePrompt: '비 오는 밤',
          compositionPrompt: '정면',
          lightingPrompt: '차가운 조명',
          stylePrompt: '웹소설 표지',
          negativePrompt: '',
          moodTags: [],
          consistencyTags: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });

    expect(buildFilledIpBibleSectionKeys(config, [{ episode: 1, title: '1화', content: '본문', charCount: 2, lastUpdate: 1 }]))
      .toEqual(expect.arrayContaining(['plotStructure', 'keyScenes', 'visualGuide', 'episodeGuide']));
  });

  it('권리 메모와 IP 피칭 목적은 IP 확장 가능성 섹션을 채움으로 본다', () => {
    const plan = buildProjectMediaIpPackPlan({
      config: makeConfig({
        releasePurpose: 'ip_pitch',
        rightsNote: '작가 단독 창작, 영상화 제안 가능',
      }),
    });

    expect(plan.filledSections).toContain('ipExpansion');
  });

  it('외부 제시 자료 4군집을 프로젝트 입력 기준으로 채움 판정한다', () => {
    const clusters = buildProjectExternalMaterialClusters({
      config: makeConfig({
        corePremise: '문을 여는 권리가 계급을 바꾼다.',
        currentConflict: '권리 없는 자와 문을 독점한 길드의 충돌',
        sceneDirection: {
          plotStructure: '1막 의뢰, 2막 대가, 3막 문 개방',
          writerNotes: '차가운 조명과 문서 클로즈업',
        },
        visualPromptCards: [
          {
            id: 'visual-1',
            episode: 1,
            title: '키비주얼',
            shotType: 'cover',
            targetUse: 'cover',
            selectedCharacters: [],
            selectedObjects: [],
            levels: {
              subjectFocus: 2,
              backgroundDensity: 2,
              sceneTension: 2,
              emotionIntensity: 2,
              compositionDrama: 2,
              styleStrength: 2,
              symbolismWeight: 2,
            },
            subjectPrompt: '문 앞에 선 인물',
            backgroundPrompt: '등기소',
            scenePrompt: '비 오는 밤',
            compositionPrompt: '정면',
            lightingPrompt: '차가운 조명',
            stylePrompt: '웹소설 표지',
            negativePrompt: '',
            moodTags: [],
            consistencyTags: [],
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      }),
      manuscripts: [{ episode: 1, title: '1화', content: '본문', charCount: 2, lastUpdate: 1 }],
    });

    expect(clusters.map((cluster) => cluster.labelKo)).toEqual([
      '진입 자료',
      '스토리 자료',
      '설정 자료',
      '제작·사업 자료',
    ]);
    expect(clusters.some((cluster) => cluster.statusKo === '보강 필요' || cluster.statusKo === '준비')).toBe(true);
  });

  it('매체별 작성 양식을 실제 프로젝트 입력값으로 채움 판정한다', () => {
    const completions = buildProjectMediaIpPackFormCompletions({
      profileId: 'webtoon',
      config: makeConfig({
        publishPlatform: PublishPlatform.MUNPIA,
        targetMarket: 'KR',
        rightsNote: '작가 단독 창작, 웹툰화 제안 가능, 선공개 조건 검토',
        characters: [
          {
            id: 'char-1',
            name: '유나',
            role: '주인공',
            traits: '신중함',
            appearance: '은색 머리와 검은 코트',
            dna: 80,
            symbol: '은색 열쇠',
            relationPattern: '동료를 쉽게 믿지 않는다',
          },
        ],
        charRelations: [{ from: '유나', to: '길드장', type: 'rival' }],
        items: [
          {
            id: 'item-1',
            name: '은색 열쇠',
            category: 'quest',
            rarity: 'rare',
            description: '문을 여는 권리 증표',
            effect: '닫힌 길을 연다',
            obtainedFrom: '등기소',
          },
        ],
        sceneDirection: {
          hooks: [{ position: '초반', hookType: '의문', desc: '문서가 작가의 이름을 부른다.' }],
          sceneTransitions: [{ fromScene: '등기소', toScene: '골목', method: '문서 클로즈업' }],
        },
      }),
      manuscripts: [{ episode: 1, title: '1화', content: '문서가 작가의 이름을 부른다.', charCount: 16, lastUpdate: 1 }],
    });

    const overview = completions.find((group) => group.titleKo === '작품 한눈 요약');
    const scenes = completions.find((group) => group.titleKo === '캐릭터·키씬 전달');
    const boundary = completions.find((group) => group.titleKo === '제작 경계');

    expect(overview?.filledCount).toBe(overview?.totalCount);
    expect(scenes?.fields.map((field) => `${field.labelKo}:${field.filled}`)).toEqual([
      '주요 인물 외형:true',
      '상징색·소품:true',
      '관계 구도:true',
      '키씬 5~10개:true',
      '컷 전환 메모:true',
    ]);
    expect(boundary?.fields.every((field) => field.filled)).toBe(true);
  });

  it('오디오 권리팩 양식을 말투·대사·음향 권리 입력값과 연결한다', () => {
    const completions = buildProjectMediaIpPackFormCompletions({
      profileId: 'audioDrama',
      config: makeConfig({
        publishPlatform: PublishPlatform.MUNPIA,
        targetMarket: 'KR',
        primaryEmotion: '긴장과 안도',
        rightsNote: '오디오북 제작권, 성우 녹음, 홍보 클립 범위는 별도 승인',
        characters: [
          {
            id: 'char-1',
            name: '유나',
            role: '주인공',
            traits: '차분함',
            appearance: '은색 머리와 검은 코트',
            speechStyle: '짧게 끊어 말한다',
            speechExample: '그 문은 아직 열면 안 됩니다.',
            dna: 80,
            relationPattern: '상대를 직함으로 부른다',
          },
        ],
        items: [
          {
            id: 'item-1',
            name: '권리 원장',
            category: 'quest',
            rarity: 'rare',
            description: '고유명사 발음 기준이 필요한 핵심 소품',
            effect: '봉인된 권리를 확인한다',
            obtainedFrom: '등기소',
          },
        ],
        sceneDirection: {
          writerNotes: '내레이션은 짧게, 대사는 낮고 느리게 처리한다.',
        },
      }),
      manuscripts: [{ episode: 1, title: '1화', content: '그 문은 아직 열면 안 됩니다.', charCount: 16, lastUpdate: 1 }],
    });

    expect(completions.map((group) => group.titleKo)).toEqual([
      '음성화 기본 정보',
      '캐릭터 음성 기준',
      '음향·권리 경계',
    ]);
    expect(completions.every((group) => group.filledCount === group.totalCount)).toBe(true);
    expect(completions.flatMap((group) => group.fields.map((field) => field.labelKo))).toEqual(
      expect.arrayContaining(['내레이션 비중', '주요 인물 말투', '발음·표기 기준', '성우 녹음 권리']),
    );
  });
});
