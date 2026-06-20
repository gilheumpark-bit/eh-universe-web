import {
  CREATOR_SEGMENT_PROFILES,
  getCreatorSegmentProfile,
  listCreatorSegmentProfiles,
  recommendCreatorSegment,
} from '../creator-segments';

describe('creator segment registry', () => {
  it('keeps every 창작자 그룹 mapped to plan, media profile, and package products', () => {
    const segments = listCreatorSegmentProfiles();

    expect(segments.length).toBeGreaterThanOrEqual(8);
    for (const segment of segments) {
      expect(segment.labelKo).toBeTruthy();
      expect(segment.primaryNeedKo).toBeTruthy();
      expect(segment.mediaProfiles.length).toBeGreaterThan(0);
      expect(segment.certificateProducts.length).toBeGreaterThan(0);
      expect(segment.requiredProjectInputsKo.length).toBeGreaterThan(0);
      expect(segment.riskChecksKo.length).toBeGreaterThan(0);
    }
  });

  it('recommends creator groups from project context without mixing projects', () => {
    expect(recommendCreatorSegment({ totalEpisodes: 80 }).id).toBe('serialWebNovel');
    expect(recommendCreatorSegment({ releasePurpose: 'contest' }).id).toBe('contestAuthor');
    expect(recommendCreatorSegment({ genreMode: 'webtoon' }).id).toBe('webtoonStoryWriter');
    expect(recommendCreatorSegment({ genreMode: 'game' }).id).toBe('gameVisualPlanner');
    expect(recommendCreatorSegment({ genreMode: 'drama' }).id).toBe('screenWriter');
    expect(recommendCreatorSegment({ releasePurpose: 'ip_pitch' }).id).toBe('screenWriter');
    expect(recommendCreatorSegment({ projectTargetLanguage: 'JP' }).id).toBe('globalRightsAuthor');
    expect(recommendCreatorSegment({ targetMarket: 'GLOBAL' }).id).toBe('globalRightsAuthor');
    expect(recommendCreatorSegment({ rightsStatus: 'licensed_source' }).id).toBe('studioPublisher');
  });

  it('uses Studio as the middle paid plan in segment recommendations', () => {
    expect(getCreatorSegmentProfile('selfPublisher').recommendedPlanId).toBe('studio');
    expect(getCreatorSegmentProfile('gameVisualPlanner').recommendedPlanId).toBe('pro');
    expect(getCreatorSegmentProfile('gameVisualPlanner').mediaProfiles).toContain('gameAnimation');
    expect(getCreatorSegmentProfile('selfPublisher').mediaProfiles).toContain('audioDrama');
    expect(CREATOR_SEGMENT_PROFILES.globalRightsAuthor.recommendedPlanId).toBe('studio');
    expect(CREATOR_SEGMENT_PROFILES.globalRightsAuthor.mediaProfiles).toContain('globalTranslation');
    expect(CREATOR_SEGMENT_PROFILES.studioPublisher.mediaProfiles).toContain('audioDrama');
  });
});
