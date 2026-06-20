import { buildTranslationTrackComparison } from '../track-comparison';

describe('buildTranslationTrackComparison', () => {
  it('대상 언어를 모르는 사용자를 위한 한국어 판단 카드를 만든다', () => {
    const report = buildTranslationTrackComparison({
      source: '문이 열렸다.\n\n그는 검을 들었다.',
      translation: 'The door opened.\n\nHe raised the sword.',
      targetLang: 'en',
      faithfulApproved: true,
      marketApproved: false,
    });

    expect(report.cards).toHaveLength(3);
    expect(report.noteKo).toContain('대상 언어를 모르는 사용자');
    expect(report.cards.find((card) => card.id === 'source')?.labelKo).toBe('원문');
    expect(report.cards.find((card) => card.id === 'faithful')?.approved).toBe(true);
    expect(report.cards.find((card) => card.id === 'market')?.approved).toBe(false);
  });

  it('번역문이 없으면 충실판과 시장판을 missing으로 둔다', () => {
    const report = buildTranslationTrackComparison({
      source: '문이 열렸다.',
      translation: '',
      targetLang: 'en',
    });

    expect(report.faithfulReport).toBeNull();
    expect(report.marketReport).toBeNull();
    expect(report.cards.find((card) => card.id === 'faithful')?.status).toBe('missing');
    expect(report.cards.find((card) => card.id === 'market')?.status).toBe('missing');
  });

  it('시장판은 단락 재구성을 충실판보다 완화해서 판단한다', () => {
    const report = buildTranslationTrackComparison({
      source: '문이 열렸다.\n\n그는 검을 들었다.\n\n방 안은 조용했다.',
      translation: 'The door opened. He raised the sword. The room was quiet.',
      targetLang: 'en',
    });

    expect(report.faithfulReport?.status).not.toBeNull();
    expect(report.marketReport?.status).not.toBeNull();
    expect((report.marketReport?.score ?? 0)).toBeGreaterThanOrEqual(report.faithfulReport?.score ?? 0);
  });
});
