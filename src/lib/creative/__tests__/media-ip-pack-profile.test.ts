import {
  buildMediaIpPackPlan,
  getMediaIpPackProfile,
  listMediaIpPackProfiles,
  MEDIA_IP_PACK_PROFILES,
  type MediaIpPackProfileId,
} from '@/lib/creative/media-ip-pack-profile';
import {
  buildIpBible,
  IP_BIBLE_SECTION_KEYS,
  PACKAGE_SECTION_MAP,
  type IpBibleSectionKey,
} from '@/lib/creative/ip-bible-builder';

describe('media-ip-pack-profile — 매체별 권리팩 registry', () => {
  it('6개 profile을 고정 순서로 제공한다', () => {
    expect(listMediaIpPackProfiles().map((profile) => profile.id)).toEqual([
      'webtoon',
      'screen',
      'gameAnimation',
      'audioDrama',
      'globalTranslation',
      'goodsBrand',
    ]);
  });

  it('매체별 profile이 기존 A~E 패키지와 연결된다', () => {
    expect(MEDIA_IP_PACK_PROFILES.webtoon.packageType).toBe('C');
    expect(MEDIA_IP_PACK_PROFILES.screen.packageType).toBe('B');
    expect(MEDIA_IP_PACK_PROFILES.gameAnimation.packageType).toBe('D');
    expect(MEDIA_IP_PACK_PROFILES.audioDrama.packageType).toBe('D');
    expect(MEDIA_IP_PACK_PROFILES.globalTranslation.packageType).toBe('E');
    expect(MEDIA_IP_PACK_PROFILES.goodsBrand.packageType).toBe('D');
  });

  it('profile 섹션 키가 모두 13섹션 registry 안에 있다', () => {
    const validKeys = new Set(IP_BIBLE_SECTION_KEYS);
    for (const profile of listMediaIpPackProfiles()) {
      for (const key of [...profile.requiredSections, ...profile.recommendedSections]) {
        expect(validKeys.has(key)).toBe(true);
      }
    }
  });

  it('매체별 판매 양식은 한국어 항목으로 제공한다', () => {
    for (const profile of listMediaIpPackProfiles()) {
      expect(profile.formGroupsKo.length).toBeGreaterThanOrEqual(3);
      for (const group of profile.formGroupsKo) {
        expect(group.titleKo).toBeTruthy();
        expect(group.purposeKo).toBeTruthy();
        expect(group.fieldsKo.length).toBeGreaterThanOrEqual(5);
        expect([group.titleKo, group.purposeKo, ...group.fieldsKo].join(' ')).not.toMatch(
          /\b(logline|target|platform|season|credit|license|scope)\b/i,
        );
      }
    }
  });

  it('기존 패키지에 필수 섹션이 모두 들어가게 설계되어 있다', () => {
    for (const profile of listMediaIpPackProfiles()) {
      const packageKeys = new Set(PACKAGE_SECTION_MAP[profile.packageType]);
      for (const key of profile.requiredSections) {
        expect(packageKeys.has(key)).toBe(true);
      }
      expect(buildMediaIpPackPlan({ profileId: profile.id }).packageAlignmentWarnings).toEqual([]);
    }
  });

  it('웹툰 권리팩은 키씬·인물·비주얼·회차 가이드를 필수로 본다', () => {
    const profile = getMediaIpPackProfile('webtoon');
    expect(profile.requiredSections).toEqual([
      'oneSheet',
      'overview',
      'keyScenes',
      'characters',
      'visualGuide',
      'episodeGuide',
    ]);
    expect(profile.deliverablesKo.join(' ')).toContain('키씬');
  });

  it('오디오 권리팩은 말투·대사·음향 권리 경계를 한국어 양식으로 제공한다', () => {
    const profile = getMediaIpPackProfile('audioDrama');
    expect(profile.requiredSections).toEqual([
      'oneSheet',
      'overview',
      'characters',
      'glossary',
      'visualGuide',
      'ipExpansion',
    ]);
    expect(profile.mediaTargets).toEqual(['audio']);
    expect(profile.formGroupsKo.map((group) => group.titleKo)).toEqual([
      '음성화 기본 정보',
      '캐릭터 음성 기준',
      '음향·권리 경계',
    ]);
    expect(profile.deliverablesKo.join(' ')).toContain('성우');
    expect(profile.rightsChecklistKo.join(' ')).toContain('홍보 클립');
  });
});

describe('buildMediaIpPackPlan — 채움 상태 판정', () => {
  const allWebtoonRequired: IpBibleSectionKey[] = [
    'oneSheet',
    'overview',
    'keyScenes',
    'characters',
    'visualGuide',
    'episodeGuide',
  ];

  it('필수 섹션이 비어 있으면 hold', () => {
    const plan = buildMediaIpPackPlan({
      profileId: 'webtoon',
      filledSectionKeys: ['oneSheet', 'overview'],
    });
    expect(plan.status).toBe('hold');
    expect(plan.missingRequired).toEqual(['keyScenes', 'characters', 'visualGuide', 'episodeGuide']);
    expect(plan.summaryKo).toContain('보강');
  });

  it('필수는 채웠지만 권장 섹션이 남으면 review', () => {
    const plan = buildMediaIpPackPlan({
      profileId: 'webtoon',
      filledSectionKeys: allWebtoonRequired,
    });
    expect(plan.status).toBe('review');
    expect(plan.missingRequired).toEqual([]);
    expect(plan.missingRecommended).toEqual(['synopsis', 'world', 'glossary', 'ipExpansion']);
  });

  it('필수와 권장 섹션을 모두 채우면 ready', () => {
    const plan = buildMediaIpPackPlan({
      profileId: 'webtoon',
      filledSectionKeys: [
        ...allWebtoonRequired,
        'synopsis',
        'world',
        'glossary',
        'ipExpansion',
      ],
    });
    expect(plan.status).toBe('ready');
    expect(plan.completionPercent).toBe(100);
  });

  it('IpBible 입력의 filled 값을 읽어 준비도를 계산한다', () => {
    const bible = buildIpBible({
      title: '터널 끝의 등기소',
      genre: '판타지',
      synopsis: '길을 소유한 사람이 세계의 요금표를 바꾼다.',
      primaryEmotion: '긴장감',
      platform: '문피아',
    });
    const plan = buildMediaIpPackPlan({ profileId: 'globalTranslation', bible });
    expect(plan.filledSections).toEqual(['oneSheet', 'overview', 'synopsis', 'themeTone', 'marketPositioning']);
    expect(plan.status).toBe('hold');
    expect(plan.missingRequired).toEqual(['ipExpansion']);
  });

  it('알 수 없는 profile id는 웹툰 profile로 보수 처리한다', () => {
    const plan = buildMediaIpPackPlan({ profileId: 'unknown-profile' });
    expect(plan.profile.id satisfies MediaIpPackProfileId).toBe('webtoon');
  });
});
