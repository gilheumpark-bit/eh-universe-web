import {
  PERSONAS_16,
  evalPersonaReaction,
  panelReaction,
  type Persona16,
} from './reader-persona-16';

export type ChapterReactionForecastMode =
  | 'basic-16'
  | 'professional-panel'
  | 'large-scale-simulation';

export interface ChapterPersonaForecast {
  personaId: string;
  label: string;
  viewpoint: string;
  engagement: number;
  dropoutRisk: boolean;
  finding: string;
}

export interface ChapterReactionForecast {
  title: string;
  mode: ChapterReactionForecastMode;
  modeLabel: string;
  disclaimer: string;
  avgEngagement: number;
  dropoutCount: number;
  personas: ChapterPersonaForecast[];
  summary: {
    dropoutRisk: 'low' | 'medium' | 'high';
    immersionPoint: string;
    confusionPoint: string;
    nextClickReason: string;
  };
}

export interface ChapterReactionEpisodeInput {
  episode: number;
  title?: string;
  content: string;
}

export interface ChapterReactionEpisodeForecast {
  episode: number;
  title?: string;
  avgEngagement: number;
  dropoutCount: number;
  dropoutRisk: ChapterReactionForecast['summary']['dropoutRisk'];
  nextClickReason: string;
}

export interface EpisodeReactionForecastBundle {
  title: string;
  mode: ChapterReactionForecastMode;
  modeLabel: string;
  disclaimer: string;
  personaCount: number;
  episodeCount: number;
  avgEngagement: number;
  maxDropoutCount: number;
  episodes: ChapterReactionEpisodeForecast[];
  worstEpisode: ChapterReactionEpisodeForecast | null;
  summary: string;
}

const DISCLAIMER = '가상 검토입니다. 실제 독자 통계나 실제 반응으로 표시하지 않습니다.';

function modeLabel(mode: ChapterReactionForecastMode): string {
  if (mode === 'professional-panel') return '사전 독자 검토';
  if (mode === 'large-scale-simulation') return '대규모 반응 예측';
  return '화수별 반응 예측';
}

function personaFinding(persona: Persona16, engagement: number, dropoutRisk: boolean): string {
  if (dropoutRisk) {
    return `${persona.label} 관점에서 도입 속도, 정보량, 문장 호흡을 다시 볼 필요가 있습니다.`;
  }
  if (engagement >= 75) {
    return `${persona.label} 관점에서 장면 목표와 읽는 흐름이 비교적 잘 이어집니다.`;
  }
  return `${persona.label} 관점에서 몰입은 가능하지만 후킹이나 감정 보상이 더 선명하면 좋습니다.`;
}

function selectPersonas(mode: ChapterReactionForecastMode): readonly Persona16[] {
  if (mode === 'basic-16') return PERSONAS_16;
  if (mode === 'professional-panel') {
    return PERSONAS_16.filter((persona) => persona.id.includes('-deep') || persona.id.includes('thirties')).slice(0, 8);
  }
  return PERSONAS_16;
}

function riskLabel(dropoutCount: number): 'low' | 'medium' | 'high' {
  if (dropoutCount >= 7) return 'high';
  if (dropoutCount >= 3) return 'medium';
  return 'low';
}

function summaryFor(text: string, avgEngagement: number, dropoutCount: number): ChapterReactionForecast['summary'] {
  const shortText = text.replace(/\s+/g, ' ').trim();
  const hasDialogue = /["“”']/.test(shortText);
  const hasHook = /(비밀|문제|기록|문|피|죽|사라|열쇠|진실|왜|끝)/.test(shortText);
  return {
    dropoutRisk: riskLabel(dropoutCount),
    immersionPoint: avgEngagement >= 70
      ? '장면 목표가 비교적 빠르게 읽힙니다.'
      : '장면 목표나 감정 보상이 늦게 잡힐 수 있습니다.',
    confusionPoint: shortText.length < 200
      ? '본문이 짧아 판단 근거가 부족합니다.'
      : dropoutCount > 0
        ? '일부 독자 관점에서는 정보량과 문장 호흡이 부담으로 보일 수 있습니다.'
        : '큰 혼선 후보는 낮게 잡힙니다.',
    nextClickReason: hasHook
      ? '미해결 단서가 다음 화 클릭 이유로 작동할 수 있습니다.'
      : hasDialogue
        ? '인물 대화 흐름이 다음 장면 기대를 만들 수 있습니다.'
        : '마지막 장면에 더 선명한 질문이나 선택지를 남기면 좋습니다.',
  };
}

export function buildChapterReactionForecast(
  text: string,
  mode: ChapterReactionForecastMode = 'basic-16',
): ChapterReactionForecast {
  const panel = panelReaction(text);
  const personas = selectPersonas(mode).map((persona) => {
    const reaction = evalPersonaReaction(text, persona);
    return {
      personaId: persona.id,
      label: persona.label,
      viewpoint: persona.preference,
      engagement: reaction.engagement,
      dropoutRisk: reaction.dropoutRisk,
      finding: personaFinding(persona, reaction.engagement, reaction.dropoutRisk),
    };
  });
  return {
    title: modeLabel(mode),
    mode,
    modeLabel: modeLabel(mode),
    disclaimer: DISCLAIMER,
    avgEngagement: panel.avgEngagement,
    dropoutCount: panel.dropoutCount,
    personas,
    summary: summaryFor(text, panel.avgEngagement, panel.dropoutCount),
  };
}

export function buildEpisodeReactionForecasts(
  episodes: readonly ChapterReactionEpisodeInput[],
  mode: ChapterReactionForecastMode = 'basic-16',
): EpisodeReactionForecastBundle {
  const sortedEpisodes = [...episodes]
    .filter((episode) => Number.isFinite(episode.episode))
    .sort((left, right) => left.episode - right.episode);
  const forecasts = sortedEpisodes.map((episode) => {
    const forecast = buildChapterReactionForecast(episode.content ?? '', mode);
    return {
      episode: episode.episode,
      ...(episode.title?.trim() ? { title: episode.title.trim() } : {}),
      avgEngagement: forecast.avgEngagement,
      dropoutCount: forecast.dropoutCount,
      dropoutRisk: forecast.summary.dropoutRisk,
      nextClickReason: forecast.summary.nextClickReason,
    };
  });
  const worstEpisode = forecasts.reduce<ChapterReactionEpisodeForecast | null>((worst, item) => {
    if (!worst) return item;
    if (item.dropoutCount > worst.dropoutCount) return item;
    if (item.dropoutCount === worst.dropoutCount && item.avgEngagement < worst.avgEngagement) return item;
    return worst;
  }, null);
  const totalEngagement = forecasts.reduce((sum, item) => sum + item.avgEngagement, 0);
  const avgEngagement = forecasts.length > 0 ? Math.round(totalEngagement / forecasts.length) : 0;
  const maxDropoutCount = forecasts.reduce((max, item) => Math.max(max, item.dropoutCount), 0);

  return {
    title: '화수별 반응 예측 묶음',
    mode,
    modeLabel: modeLabel(mode),
    disclaimer: DISCLAIMER,
    personaCount: selectPersonas(mode).length,
    episodeCount: forecasts.length,
    avgEngagement,
    maxDropoutCount,
    episodes: forecasts,
    worstEpisode,
    summary: worstEpisode
      ? `EP.${worstEpisode.episode}에서 이탈 위험 관점 ${worstEpisode.dropoutCount}개를 우선 점검하세요.`
      : '저장된 회차 원고가 없어 화수별 묶음 예측을 대기합니다.',
  };
}
