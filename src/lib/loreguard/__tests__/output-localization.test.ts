import {
  artifactRoleLabel,
  exposureJudgmentLabel,
  manifestDisclosureLabel,
  localizeVisualPromptSkeleton,
  visualMediumLabel,
  visualShotTypeLabel,
  visualSlotCategoryLabel,
} from '../output-localization';

describe('output-localization', () => {
  it('비주얼 슬롯 골격의 사용자 표시 제목을 한국어로 바꾼다', () => {
    const skeleton = [
      '[subject] [action] in [setting], [mood] mood',
      '[cameraAngle] camera angle, [negativePrompt]',
      'Negative: blurry, lowres',
      '{audio: BGM [bgmMood], SFX [sfx]}',
    ].join('\n');

    const localized = localizeVisualPromptSkeleton('KO', skeleton);

    expect(localized).toContain('[주체]');
    expect(localized).toContain('[동작]');
    expect(localized).toContain('[배경]');
    expect(localized).toContain('[카메라 각도]');
    expect(localized).toContain('[제외 요소]');
    expect(localized).toContain('제외 요소:');
    expect(localized).toContain('배경음');
    expect(localized).toContain('효과음');
    expect(localized).not.toContain('[subject]');
    expect(localized).not.toContain('camera angle');
    expect(localized).not.toContain('mood mood');
    expect(localized).not.toContain('blurry, lowres');
    expect(localized).not.toContain('Negative:');
  });

  it('비주얼/자산화 배지 라벨을 한국어로 표시한다', () => {
    expect(visualMediumLabel('KO', 'image')).toBe('이미지');
    expect(visualMediumLabel('KO', 'video')).toBe('영상');
    expect(visualSlotCategoryLabel('KO', 'Lighting')).toBe('조명');
    expect(visualShotTypeLabel('KO', 'character_focus')).toBe('인물 중심');
    expect(exposureJudgmentLabel('KO', 'PASS')).toBe('노출 가능');
    expect(manifestDisclosureLabel('KO', 'public-verify')).toBe('공개 조회');
    expect(artifactRoleLabel('KO', 'submission-clean-mechanical-audit')).toBe('제출 전 문장 점검 결과');
  });
});
