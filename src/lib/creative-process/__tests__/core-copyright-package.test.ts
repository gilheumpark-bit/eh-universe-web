import {
  buildCoreCopyrightPackage,
  serializeCoreCopyrightPackageMarkdown,
} from '../core-copyright-package';
import { Genre } from '@/lib/studio-types';
import type { StoryConfig } from '@/lib/studio-types';
import { PlatformType, PublishPlatform } from '@/engine/types';

function makeConfig(): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '유나',
    setting: '왕국과 길드가 오래된 기록을 두고 충돌하는 세계',
    primaryEmotion: '긴장',
    episode: 1,
    title: 'Project NOA',
    totalEpisodes: 80,
    synopsis: '유나는 길드가 감춘 기록을 찾아 왕국의 승천 의식을 뒤집는다.',
    guardrails: { min: 5500, max: 7000 },
    characters: [
      {
        id: 'char-yuna',
        name: '유나',
        role: '주인공',
        traits: '집요함',
        appearance: '은색 머리',
        dna: 3,
        desire: '길드의 거짓 기록을 밝힌다',
        deficiency: '타인을 쉽게 믿지 못한다',
        conflict: '왕국 질서와 개인의 진실 사이에서 갈등한다',
        speechStyle: '짧고 단정한 문장',
        assetMemo: '캐릭터와 세계관 권리 범위 분리',
      },
    ],
    items: [
      {
        id: 'item-seal',
        name: '검은 인장',
        category: 'quest',
        rarity: 'rare',
        description: '승천 의식의 열쇠',
        effect: '기록의 봉인을 연다',
        obtainedFrom: '길드 기록고',
        owner: '유나',
        storyFunction: '복선 회수 장치',
        worldConnection: '왕국의 정사 체계와 연결',
        rightsMemo: '굿즈·비주얼 전개 가능',
      },
    ],
    platform: PlatformType.WEB,
    publishPlatform: PublishPlatform.MUNPIA,
    projectTargetLanguage: 'KO',
    targetMarket: 'KR',
    releasePurpose: 'serial',
    rightsStatus: 'author_owned',
    rightsNote: '세계관과 캐릭터 권리 범위를 분리한다',
    corePremise: '승천 의식은 구원이 아니라 기록 독점 장치다',
    powerStructure: '왕국과 길드가 기록 해석권을 나눠 가진다',
    currentConflict: '왕국은 정사를 유지하려 하고 길드는 기록을 은폐한다',
    magicTechSystem: '인장은 기록과 기억을 봉인하는 기술이다',
    worldTimeline: [{ id: 'tl-1', year: '1권 말미', event: '정사의 기록자가 길드 내부자였음이 드러난다' }],
    mainScenarioStructure: {
      sevenSentenceSynopsis: [
        { id: 's1', index: 1, label: '1문장', text: '유나는 정사의 문을 연다.' },
      ],
      acts: [{ id: 'act1', title: '정사', summary: '기록의 진실에 접근한다' }],
      eventChain: [
        {
          id: 'event-1',
          order: 1,
          title: '검은 인장 발견',
          cause: '길드의 은폐',
          effect: '승천 의식의 실체 추적',
          locked: true,
        },
      ],
      endingLock: {
        locked: true,
        finalImage: '승천의 방이 기록 보관소로 드러난다',
        thematicAnswer: '진실은 소유물이 아니다',
      },
    },
    sceneDirection: {
      plotStructure: '정사에서 승천으로 이어지는 2권 구조',
      hooks: [{ position: '1권 말미', hookType: '반전', desc: '정사의 기록자가 길드 내부자였음이 드러난다' }],
      foreshadows: [{ planted: '검은 인장', payoff: '승천 의식의 열쇠', episode: 12, resolved: false }],
      productionDirection: { proseRhythm: '짧은 문장과 기록문이 교차한다' },
    },
    manuscripts: [
      {
        episode: 1,
        title: '정사의 문',
        content: '유나는 정사의 문 앞에서 길드 기록관과 대치한다.',
        charCount: 24,
        lastUpdate: 1781407000000,
      },
    ],
  };
}

describe('core-copyright-package', () => {
  it('세계관·캐릭터·메인 시나리오 기준본과 등록 3안을 함께 만든다', () => {
    const pack = buildCoreCopyrightPackage({
      config: makeConfig(),
      authorDisplayName: 'HGGPT',
      authorLegalName: '박길흠',
      generatedAtKo: '2026-06-16',
    });

    expect(pack.kind).toBe('loreguard.core-copyright-package.v1');
    expect(pack.documents.map((documentItem) => documentItem.id)).toEqual([
      'world-registration',
      'character-registration',
      'main-scenario-registration',
      'canon-matrix',
      'originality-declaration',
      'rights-checklist',
    ]);
    expect(pack.registrationPrep.variants).toHaveLength(4);
    expect(pack.canonMatrix.map((row) => row.assetKo)).toContain('유나');
    expect(pack.canonMatrix.map((row) => row.assetKo)).toContain('검은 인장');
    expect(pack.readiness.score).toBeGreaterThanOrEqual(60);
  });

  it('Markdown 직렬화에 핵심 기준본과 권리 체크리스트를 포함한다', () => {
    const pack = buildCoreCopyrightPackage({
      config: makeConfig(),
      generatedAtKo: '2026-06-16',
    });
    const markdown = serializeCoreCopyrightPackageMarkdown(pack);

    expect(markdown).toContain('# 코어 저작권 등록 준비 패키지 - Project NOA');
    expect(markdown).toContain('## 세계관 등록 문서');
    expect(markdown).toContain('## 캐릭터 등록 문서');
    expect(markdown).toContain('## 메인 시나리오 등록 문서');
    expect(markdown).toContain('## Canon Matrix');
    expect(markdown).toContain('## 오리지널리티 선언문');
    expect(markdown).toContain('## 권리 관계 체크리스트');
    expect(markdown).toContain('### A안 서사 중심');
  });
});
