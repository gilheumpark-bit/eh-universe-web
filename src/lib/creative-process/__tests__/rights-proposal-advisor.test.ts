import { Genre } from '@/lib/studio-types';
import type { StoryConfig } from '@/lib/studio-types';
import { PlatformType, PublishPlatform } from '@/engine/types';
import { buildCoreCopyrightPackage } from '../core-copyright-package';
import {
  buildRightsProposalAdvisor,
  serializeRightsProposalAdvisorMarkdown,
} from '../rights-proposal-advisor';

function makeCorePackage() {
  const config: StoryConfig = {
    genre: Genre.FANTASY,
    povCharacter: '유나',
    setting: '왕국 기록 체계',
    primaryEmotion: '긴장',
    episode: 1,
    title: '권리 제안 테스트',
    totalEpisodes: 80,
    synopsis: '유나는 기록 독점 체계를 뒤집는다.',
    guardrails: { min: 5500, max: 7000 },
    characters: [
      {
        id: 'char-yuna',
        name: '유나',
        role: '주인공',
        traits: '집요함',
        appearance: '은색 머리',
        dna: 3,
        desire: '진실을 밝힌다',
        deficiency: '불신',
        conflict: '왕국 질서와 충돌한다',
      },
    ],
    platform: PlatformType.WEB,
    publishPlatform: PublishPlatform.MUNPIA,
    rightsStatus: 'author_owned',
    rightsNote: '웹툰화와 영상화 권리를 분리한다',
    corePremise: '승천 의식은 기록 독점 장치다',
  };
  return buildCoreCopyrightPackage({ config, generatedAtKo: '2026-06-16' });
}

describe('rights-proposal-advisor', () => {
  it('제안 문구를 7개 조건 축으로 분해하고 주의 항목을 만든다', () => {
    const result = buildRightsProposalAdvisor({
      corePackage: makeCorePackage(),
      proposalText: '웹툰화와 영상화 권리를 전 세계 독점으로 7년 계약합니다. 수익 배분은 순수익 기준이며 캐릭터 변경은 제작사가 자유롭게 수정할 수 있습니다.',
      generatedAtKo: '2026-06-16',
    });

    expect(result.kind).toBe('loreguard.rights-proposal-advisor.v1');
    expect(result.axisReviews).toHaveLength(7);
    expect(result.statusKo).toBe('조건 주의');
    expect(result.rightsMapKo.passingKo).toEqual(expect.arrayContaining(['웹툰화', '영상화']));
    expect(result.watchNotesKo.join('\n')).toContain('권리 범위');
    expect(result.industryRiskPatterns.map((pattern) => pattern.labelKo)).toEqual(
      expect.arrayContaining(['2차 권리 통째 묶임', '순수익 정산 블랙박스', '원작 훼손 각색']),
    );
    expect(result.meetingQuestionsKo.join('\n')).toContain('정산 기준이 총매출인지 순수익인지');
    expect(result.replyDraftKo).toContain('제안 감사드립니다.');
    expect(result.replyDraftKo).toContain('업계 리스크 패턴상');
  });

  it('Markdown 직렬화에 권리 지도와 회신 초안을 포함한다', () => {
    const result = buildRightsProposalAdvisor({
      corePackage: makeCorePackage(),
      proposalText: '',
      generatedAtKo: '2026-06-16',
    });
    const markdown = serializeRightsProposalAdvisorMarkdown(result);

    expect(markdown).toContain('# 권리 제안 어드바이저 - 권리 제안 테스트');
    expect(markdown).toContain('## 권리 지도');
    expect(markdown).toContain('## 조건 축 분석');
    expect(markdown).toContain('## 업계 리스크 패턴');
    expect(markdown).toContain('2차 권리 통째 묶임');
    expect(markdown).toContain('## 회신 초안');
    expect(markdown).toContain('제안서나 미팅 메모를 붙여넣으면');
  });
});
