import {
  buildChapterReactionForecast,
  buildEpisodeReactionForecasts,
} from '../chapter-reaction-forecast';

describe('chapter-reaction-forecast', () => {
  it('기본 16 패널을 실제 반응이 아닌 화수별 반응 예측으로 감싼다', () => {
    const forecast = buildChapterReactionForecast('"기록이 비어 있어." 강민우는 흑검을 들었다. 비밀은 아직 열리지 않았다.');

    expect(forecast.title).toBe('화수별 반응 예측');
    expect(forecast.mode).toBe('basic-16');
    expect(forecast.disclaimer).toContain('실제 독자 통계');
    expect(forecast.personas).toHaveLength(16);
    expect(forecast.summary.nextClickReason).toContain('다음 화');
  });

  it('전문 패널은 작은 사전 검토 묶음으로 제한한다', () => {
    const forecast = buildChapterReactionForecast('긴 문장으로 분위기를 쌓고 인물의 결핍을 보여준다.', 'professional-panel');

    expect(forecast.modeLabel).toBe('사전 독자 검토');
    expect(forecast.personas.length).toBeGreaterThan(0);
    expect(forecast.personas.length).toBeLessThan(16);
  });

  it('대규모 반응 예측도 실측처럼 표시하지 않는다', () => {
    const forecast = buildChapterReactionForecast('본문 샘플', 'large-scale-simulation');

    expect(forecast.modeLabel).toBe('대규모 반응 예측');
    expect(forecast.disclaimer).toBe('가상 검토입니다. 실제 독자 통계나 실제 반응으로 표시하지 않습니다.');
  });

  it('여러 회차를 정렬해 병렬 페르소나 기준 화수별 묶음으로 요약한다', () => {
    const bundle = buildEpisodeReactionForecasts([
      { episode: 3, title: '짧은 회차', content: '짧다.' },
      {
        episode: 1,
        title: '후킹 회차',
        content: '"문이 열렸어." 기록의 비밀은 아직 끝나지 않았다. 진실을 확인해야 했다.',
      },
      {
        episode: 2,
        title: '긴 설명 회차',
        content: '그는 불안했다. 생각했다. 깨달았다. '.repeat(80),
      },
    ]);

    expect(bundle.title).toBe('화수별 반응 예측 묶음');
    expect(bundle.personaCount).toBe(16);
    expect(bundle.episodeCount).toBe(3);
    expect(bundle.episodes.map((episode) => episode.episode)).toEqual([1, 2, 3]);
    expect(bundle.worstEpisode?.episode).toBe(2);
    expect(bundle.maxDropoutCount).toBeGreaterThanOrEqual(bundle.worstEpisode?.dropoutCount ?? 0);
    expect(bundle.summary).toContain('EP.2');
    expect(bundle.disclaimer).toContain('실제 독자 통계');
  });

  it('회차 원고가 없으면 빈 묶음으로 안전하게 대기한다', () => {
    const bundle = buildEpisodeReactionForecasts([]);

    expect(bundle.episodeCount).toBe(0);
    expect(bundle.avgEngagement).toBe(0);
    expect(bundle.maxDropoutCount).toBe(0);
    expect(bundle.worstEpisode).toBeNull();
    expect(bundle.summary).toContain('대기');
  });
});
