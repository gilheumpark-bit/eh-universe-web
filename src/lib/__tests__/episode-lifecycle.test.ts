import { PublishPlatform } from '@/engine/types';
import type { EpisodeManuscript, TranslatedManuscriptEntry } from '@/lib/studio-types';

import {
  applyEpisodeLifecycle,
  applyEpisodeLifecycles,
  deriveEpisodeLifecycle,
  deriveStoryShipmentStatus,
  getEpisodeLengthBand,
  hasEpisodeTranslationSignoff,
} from '../episode-lifecycle';

function manuscript(overrides: Partial<EpisodeManuscript> = {}): EpisodeManuscript {
  return {
    episode: 1,
    title: '1화',
    content: '',
    charCount: 0,
    lastUpdate: 0,
    ...overrides,
  };
}

function translation(overrides: Partial<TranslatedManuscriptEntry> = {}): TranslatedManuscriptEntry {
  return {
    episode: 1,
    sourceLang: 'KO',
    targetLang: 'EN',
    mode: 'fidelity',
    translatedTitle: 'Episode 1',
    translatedContent: 'Translated',
    charCount: 10,
    avgScore: 0.9,
    band: 20,
    lastUpdate: 0,
    ...overrides,
  };
}

describe('episode-lifecycle', () => {
  it('플랫폼별 회차 길이 프리셋을 사용하고 NONE은 기본값으로 폴백한다', () => {
    expect(getEpisodeLengthBand(PublishPlatform.KAKAOPAGE)).toEqual({ min: 3000, max: 5000 });
    expect(getEpisodeLengthBand(PublishPlatform.NONE)).toEqual({ min: 3000, max: 7000 });
  });

  it('빈 원고는 DRAFT로 판정한다', () => {
    const decision = deriveEpisodeLifecycle({ manuscript: manuscript() });
    expect(decision.state).toBe('DRAFT');
    expect(decision.reason).toBe('empty-manuscript');
  });

  it('플랫폼 최소 글자수 미만은 IN_PROGRESS로 판정한다', () => {
    const decision = deriveEpisodeLifecycle({
      manuscript: manuscript({ content: 'x'.repeat(2999), charCount: 2999 }),
      publishPlatform: PublishPlatform.KAKAOPAGE,
    });
    expect(decision.state).toBe('IN_PROGRESS');
    expect(decision.reason).toBe('below-platform-minimum');
  });

  it('플랫폼 최소 글자수 이상은 COMPLETED로 판정한다', () => {
    const decision = deriveEpisodeLifecycle({
      manuscript: manuscript({ content: 'x'.repeat(3000), charCount: 3000 }),
      publishPlatform: PublishPlatform.KAKAOPAGE,
    });
    expect(decision.state).toBe('COMPLETED');
    expect(decision.reason).toBe('meets-platform-minimum');
  });

  it('translatedManuscripts nested signoff를 SIGNED_OFF로 판정한다', () => {
    const translatedManuscripts = [
      translation({ targetLang: 'JP', faithfulApproved: true, approvedAt: 123 }),
    ];
    expect(hasEpisodeTranslationSignoff(translatedManuscripts, 1, 'JP')).toBe(true);
    expect(hasEpisodeTranslationSignoff(translatedManuscripts, 1, 'EN')).toBe(false);

    const decision = deriveEpisodeLifecycle({
      manuscript: manuscript({ content: '원고', charCount: 2 }),
      translatedManuscripts,
      targetLang: 'JP',
    });
    expect(decision.state).toBe('SIGNED_OFF');
    expect(decision.reason).toBe('translation-signoff');
  });

  it('approvedAt만 남은 엔트리는 signoff로 보지 않는다', () => {
    const translatedManuscripts = [
      translation({ faithfulApproved: undefined, marketApproved: undefined, approvedAt: 123 }),
    ];

    expect(hasEpisodeTranslationSignoff(translatedManuscripts, 1, 'EN')).toBe(false);
    expect(deriveEpisodeLifecycle({
      manuscript: manuscript({ content: 'x'.repeat(3000), charCount: 3000 }),
      translatedManuscripts,
      targetLang: 'EN',
    }).state).toBe('COMPLETED');
  });

  it('SHIPPED는 signoff와 글자수보다 우선한다', () => {
    const decision = deriveEpisodeLifecycle({
      manuscript: manuscript({ lifecycleState: 'SHIPPED' }),
      translatedManuscripts: [translation({ marketApproved: true })],
    });
    expect(decision.state).toBe('SHIPPED');
  });

  it('applyEpisodeLifecycle는 상태 변경 시에만 updatedAt을 갱신한다', () => {
    const first = applyEpisodeLifecycle({
      manuscript: manuscript({ charCount: 3000, content: 'x'.repeat(3000) }),
      publishPlatform: PublishPlatform.KAKAOPAGE,
      now: 100,
    });
    expect(first.lifecycleState).toBe('COMPLETED');
    expect(first.lifecycleUpdatedAt).toBe(100);

    const second = applyEpisodeLifecycle({
      manuscript: first,
      publishPlatform: PublishPlatform.KAKAOPAGE,
      now: 200,
    });
    expect(second.lifecycleState).toBe('COMPLETED');
    expect(second.lifecycleUpdatedAt).toBe(100);
  });

  it('스토리의 모든 회차가 완료권이면 shipmentStatus ready를 산출한다', () => {
    const story = applyEpisodeLifecycles({
      publishPlatform: PublishPlatform.KAKAOPAGE,
      manuscripts: [
        manuscript({ episode: 1, charCount: 3000, content: 'x'.repeat(3000) }),
        manuscript({ episode: 2, charCount: 3200, content: 'x'.repeat(3200) }),
      ],
    }, { now: 100 });

    expect(deriveStoryShipmentStatus(story)).toBe('ready');
    expect(story.shipmentStatus).toBe('ready');
  });

  it('스토리 ready 판정은 stale lifecycleState보다 현재 글자수를 우선한다', () => {
    expect(deriveStoryShipmentStatus({
      publishPlatform: PublishPlatform.KAKAOPAGE,
      manuscripts: [
        manuscript({
          episode: 1,
          content: '짧음',
          charCount: 2,
          lifecycleState: 'COMPLETED',
        }),
      ],
    })).toBe('draft');
  });
});
