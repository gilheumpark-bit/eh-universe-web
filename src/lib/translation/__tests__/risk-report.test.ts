import { buildTranslationRiskReport } from '../risk-report';

describe('buildTranslationRiskReport', () => {
  it('번역문이 없으면 높은 위험과 역번역 요약 대기를 표시한다', () => {
    const report = buildTranslationRiskReport({
      source: '문이 열렸다.',
      translation: '',
      targetLang: 'en',
    });

    expect(report.level).toBe('high');
    expect(report.cards.find((card) => card.id === 'source-integrity')?.status).toBe('missing');
    expect(report.backTranslation.status).toBe('missing');
    expect(report.backTranslation.summaryKo).toContain('아직 생성되지 않았습니다');
  });

  it('원문 용어가 있는데 대상 용어가 없으면 용어 누락으로 잡는다', () => {
    const report = buildTranslationRiskReport({
      source: '청룡검이 울었다. 청룡검은 가문의 상징이었다.',
      translation: 'The sword rang. It was the symbol of the family.',
      targetLang: 'en',
      glossary: [{ source: '청룡검', target: 'Blue Dragon Sword', locked: true }],
      faithfulApproved: true,
      marketApproved: true,
      backTranslationSummaryKo: '검이 울리고 가문의 상징이라는 의미는 유지됩니다.',
    });

    expect(report.glossaryMisses).toHaveLength(1);
    expect(report.glossaryMisses[0]).toMatchObject({
      source: '청룡검',
      expected: 'Blue Dragon Sword',
      locked: true,
    });
    expect(report.cards.find((card) => card.id === 'glossary')?.summaryKo).toContain('누락 의심');
  });

  it('영어 문체 린트가 걸리면 문체 자연도 카드를 검토 상태로 둔다', () => {
    const text = [
      'Cheolsu opened the door.',
      'Cheolsu looked around the room.',
      'Then Cheolsu sat down.',
      'Cheolsu picked up the cup.',
      'After a while Cheolsu sighed.',
      'Cheolsu closed his eyes.',
      'Outside, rain kept falling.',
    ].join(' ');
    const report = buildTranslationRiskReport({
      source: '철수는 문을 열었다. 철수는 방을 둘러보았다.',
      translation: text,
      targetLang: 'en',
      faithfulApproved: true,
      marketApproved: true,
      backTranslationSummaryKo: '철수가 문을 열고 방을 둘러보는 흐름입니다.',
    });

    const card = report.cards.find((item) => item.id === 'translationese');
    expect(card?.status).toBe('review');
    expect(card?.count).toBeGreaterThan(0);
  });

  it('역번역 요약이 주어지면 준비 상태로 표시한다', () => {
    const report = buildTranslationRiskReport({
      source: '그는 검을 들었다.',
      translation: 'He raised the sword.',
      targetLang: 'en',
      faithfulApproved: true,
      marketApproved: true,
      backTranslationSummaryKo: '그가 검을 들어 올렸다는 의미입니다.',
    });

    const card = report.cards.find((item) => item.id === 'back-translation');
    expect(report.backTranslation.status).toBe('ready');
    expect(card?.status).toBe('ready');
    expect(card?.detailKo).toContain('검을 들어 올렸다는 의미');
  });
});
