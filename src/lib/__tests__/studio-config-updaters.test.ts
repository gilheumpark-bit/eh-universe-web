import { Genre, PlatformType, type StoryConfig } from '@/lib/studio-types';
import { advanceEpisodeConfig } from '../studio-config-updaters';

function config(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.SF,
    povCharacter: '주인공',
    setting: '도시',
    primaryEmotion: '긴장',
    episode: 1,
    title: '작품',
    totalEpisodes: 3,
    guardrails: { min: 3000, max: 7000 },
    characters: [],
    platform: PlatformType.MOBILE,
    manuscripts: [{ episode: 1, title: '1화', content: '보존', charCount: 2, lastUpdate: 1 }],
    ...overrides,
  };
}

describe('studio-config-updaters', () => {
  it('advanceEpisodeConfig는 episode만 증가시키고 원고/설정 필드를 보존한다', () => {
    const prev = config({ setting: '동시 변경 보존' });
    const next = advanceEpisodeConfig(prev);

    expect(next.episode).toBe(2);
    expect(next.setting).toBe('동시 변경 보존');
    expect(next.manuscripts).toEqual(prev.manuscripts);
  });

  it('totalEpisodes 상한을 넘지 않으면 동일 객체를 반환한다', () => {
    const prev = config({ episode: 3, totalEpisodes: 3 });
    expect(advanceEpisodeConfig(prev)).toBe(prev);
  });

  it('비정상 숫자는 안전한 양의 정수로 정규화한다', () => {
    expect(advanceEpisodeConfig(config({ episode: 0, totalEpisodes: 2 })).episode).toBe(2);
    expect(advanceEpisodeConfig(config({ episode: 1.8, totalEpisodes: 5 })).episode).toBe(2);
  });
});
