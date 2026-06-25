import {
  buildCopyrightRegistrationPrep,
  serializeCopyrightRegistrationPrepMarkdown,
} from '../copyright-registration-prep';
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
      },
    ],
    platform: PlatformType.WEB,
    publishPlatform: PublishPlatform.MUNPIA,
    projectTargetLanguage: 'KO',
    targetMarket: 'KR',
    releasePurpose: 'serial',
    rightsStatus: 'needs_review',
    rightsNote: '세계관과 캐릭터 권리 범위를 분리한다',
    corePremise: '승천 의식은 구원이 아니라 기록 독점 장치다',
    currentConflict: '왕국은 정사를 유지하려 하고 길드는 기록을 은폐한다',
    sceneDirection: {
      plotStructure: '정사에서 승천으로 이어지는 2권 구조',
      hooks: [{ position: '1권 말미', hookType: '반전', desc: '정사의 기록자가 길드 내부자였음이 드러난다' }],
      foreshadows: [{ planted: '검은 인장', payoff: '승천 의식의 열쇠', episode: 12, resolved: false }],
      productionDirection: { proseRhythm: '짧은 문장과 기록문이 교차한다' },
      writerNotes: '권별 내용설명 분리',
    },
    manuscripts: [
      {
        episode: 1,
        title: '정사의 문',
        content: '유나는 정사의 문 앞에서 길드 기록관과 대치한다.',
        charCount: 24,
        lastUpdate: 1781407000000,
      },
      {
        episode: 2,
        title: '승천의 방',
        content: '승천 의식의 방에서 왕국의 거짓 계보가 드러난다.',
        charCount: 28,
        lastUpdate: 1781408000000,
      },
    ],
  };
}

describe('copyright-registration-prep', () => {
  it('등록 내용설명 A/B/C 3안과 최종 혼합안을 만든다', () => {
    const pack = buildCopyrightRegistrationPrep({
      config: makeConfig(),
      authorDisplayName: 'HGGPT',
      authorLegalName: '박길흠',
      generatedAtKo: '2026-06-16',
    });

    expect(pack.variants.map((variant) => variant.labelKo)).toEqual([
      'A안 서사 중심',
      'B안 캐릭터 중심',
      'C안 추상적 주제 중심',
      '최종 제출용 혼합안',
    ]);
    expect(pack.variants[0].draftText).toContain('주요 사건');
    expect(pack.variants[1].draftText).toContain('관계, 욕망, 결핍, 변화선');
    expect(pack.variants[2].draftText).toContain('주제의식과 세계관 규칙');
    expect(pack.titleKoreanAliasKo).toContain('국문 해석 또는 발음 입력 필요');
    expect(pack.authorAliasStatementKo).toBe('본 저작물에 표시한 (HGGPT)는 저작자 (박길흠)의 필명임을 확인합니다.');
    expect(pack.checks.find((check) => check.id === 'content-description')?.status).toBe('ready');
  });

  it('Markdown 직렬화에 보완 방지 검사와 3안 문안을 포함한다', () => {
    const pack = buildCopyrightRegistrationPrep({
      config: makeConfig(),
      generatedAtKo: '2026-06-16',
    });
    const markdown = serializeCopyrightRegistrationPrepMarkdown(pack);

    expect(markdown).toContain('# 저작권 등록 준비 패키지 - Project NOA');
    expect(markdown).toContain('## 등록 내용설명 3안');
    expect(markdown).toContain('### A안 서사 중심');
    expect(markdown).toContain('### B안 캐릭터 중심');
    expect(markdown).toContain('### C안 추상적 주제 중심');
    expect(markdown).toContain('### 최종 제출용 혼합안');
    expect(markdown).toContain('## 등록 전 보완 방지 검사');
    expect(markdown).toContain('복제물 파일 범위');
  });
});
