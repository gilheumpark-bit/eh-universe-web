import { buildLocalizationDecisionReport } from '../localization-review';

describe('localization-review', () => {
  it('builds Korean decision cards that do not require target-language knowledge', () => {
    const report = buildLocalizationDecisionReport({
      source: '주인공은 왕궁 복도에서 오래 숨겨 온 비밀을 들켰다. 그는 침착한 척했지만 손끝이 떨렸다.',
      result: 'The protagonist was caught.',
      targetLanguage: 'en',
    });

    expect(report.cards.length).toBeGreaterThan(0);
    expect(report.cards[0].userCanJudgeWithoutTargetLanguage).toBe(true);
    expect(report.cards.some((card) => card.recommendation === 'hold')).toBe(true);
  });

  it('warns when faithful and localized tracks are identical', () => {
    const report = buildLocalizationDecisionReport({
      source: '그녀는 스승에게 고개를 숙이고 다시 검을 들었다.',
      result: 'She bowed to her master and raised her sword again.',
      faithfulResult: 'She bowed to her master and raised her sword again.',
      marketResult: 'She bowed to her master and raised her sword again.',
      targetLanguage: 'en',
    });

    expect(report.cards.map((card) => card.id)).toContain('localization-dual-track-same');
  });
});

