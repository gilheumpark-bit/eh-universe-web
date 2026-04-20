// ============================================================
// PART 1 — Imports & Types (Series Direction DNA)
// ============================================================
//
// 시리즈 전체 분석 — 작가 개인 패턴 / 자주 쓰는 장치 / 텐션 시그니처.
// 로컬 분석만 — 외부 전송 절대 금지(M3 원칙 #5).
//
// 입력: episode 번호 → SceneDirectionData 매핑
// 출력: SeriesDirectionDNA + markdown 리포트(4언어)
//
// [C] 빈 입력 가드, 분모 0 방어
// [G] 단일 패스 집계, 정렬은 결과만
// [K] 순수 함수 — 부수효과 없음

import type { SceneDirectionData, AppLanguage } from './studio-types';
import { L4 } from './i18n';

export interface FrequencyEntry<T = string> {
  value: T;
  count: number;
}

export interface SeriesDirectionDNA {
  totalEpisodes: number;
  episodesAnalyzed: number;

  // 자주 쓰는 장치
  topGogumas: FrequencyEntry[];           // type별 (goguma/cider)
  topHooks: FrequencyEntry[];             // hookType별
  topCliffs: FrequencyEntry[];            // cliffType별
  topDopamineDevices: FrequencyEntry[];   // device별

  // 문체 지표
  avgTensionCurve: number[];              // 화별 평균 텐션 (position 단위 평균)
  emotionDistribution: Record<string, number>;

  // 작가 개인 특성
  personalPatterns: {
    cliffhangerUsage: number;        // 매 화 클리프 비율 (0~1)
    foreshadowDepth: number;         // 복선 회수 거리 평균 (회) — 0이면 미회수만
    pacingSignature: number[];       // section/percent 평균 분포
    avgGogumaPerEpisode: number;     // 화당 평균 고구마/사이다 개수
    avgHooksPerEpisode: number;
  };
}

// ============================================================
// PART 2 — Helpers (frequency map → sorted entries)
// ============================================================

function freq<T>(items: T[], keyFn: (item: T) => string | undefined): FrequencyEntry[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function safeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ============================================================
// PART 3 — Main analyzer
// ============================================================

export function analyzeSeriesDNA(
  episodes: Record<number, SceneDirectionData>
): SeriesDirectionDNA {
  const epNumbers = Object.keys(episodes).map(Number).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);
  const sheets = epNumbers.map(n => episodes[n]).filter(Boolean) as SceneDirectionData[];

  const totalEpisodes = epNumbers.length > 0 ? Math.max(...epNumbers) : 0;
  const episodesAnalyzed = sheets.length;

  // 빈 입력 가드
  if (episodesAnalyzed === 0) {
    return {
      totalEpisodes: 0,
      episodesAnalyzed: 0,
      topGogumas: [],
      topHooks: [],
      topCliffs: [],
      topDopamineDevices: [],
      avgTensionCurve: [],
      emotionDistribution: {},
      personalPatterns: {
        cliffhangerUsage: 0,
        foreshadowDepth: 0,
        pacingSignature: [],
        avgGogumaPerEpisode: 0,
        avgHooksPerEpisode: 0,
      },
    };
  }

  // 평탄화
  const allGogumas = sheets.flatMap(s => s.goguma ?? []);
  const allHooks = sheets.flatMap(s => s.hooks ?? []);
  const allDopamines = sheets.flatMap(s => s.dopamineDevices ?? []);
  const allEmotions = sheets.flatMap(s => s.emotionTargets ?? []);
  const allForeshadows = sheets.flatMap(s => s.foreshadows ?? []);
  const cliffhangers = sheets.map(s => s.cliffhanger).filter(Boolean) as Array<{ cliffType: string }>;

  // 빈도 집계
  const topGogumas = freq(allGogumas, g => g.type).slice(0, 5);
  const topHooks = freq(allHooks, h => h.hookType).slice(0, 5);
  const topCliffs = freq(cliffhangers, c => c.cliffType).slice(0, 5);
  const topDopamineDevices = freq(allDopamines, d => d.device).slice(0, 5);

  // 텐션 곡선 — 화별 모든 점을 단순 평균
  const tensionLevels = sheets.flatMap(s => (s.tensionCurve ?? []).map(p => p.level));
  const avgTensionCurve = tensionLevels.length > 0 ? [safeAvg(tensionLevels)] : [];

  // 감정 분포
  const emotionDistribution: Record<string, number> = {};
  for (const e of allEmotions) {
    if (!e.emotion) continue;
    emotionDistribution[e.emotion] = (emotionDistribution[e.emotion] ?? 0) + 1;
  }

  // 개인 패턴
  const cliffhangerUsage = cliffhangers.length / episodesAnalyzed;

  // 복선 회수 거리: 회수된 복선만 대상으로 회수까지의 거리 평균.
  // foreshadow.episode = 심은 화. resolved=true면 어디서 회수되었는지 모르니
  // "회수율 자체"를 metric으로 사용.
  const resolvedCount = allForeshadows.filter(f => f.resolved).length;
  const foreshadowDepth = allForeshadows.length === 0
    ? 0
    : resolvedCount / allForeshadows.length;

  const allPacings = sheets.flatMap(s => s.pacings ?? []);
  // pacing percent 평균 — 작가가 어느 섹션에 분량을 많이 배분하는지
  const pacingSignature = allPacings.length === 0
    ? []
    : [safeAvg(allPacings.map(p => p.percent))];

  return {
    totalEpisodes,
    episodesAnalyzed,
    topGogumas,
    topHooks,
    topCliffs,
    topDopamineDevices,
    avgTensionCurve,
    emotionDistribution,
    personalPatterns: {
      cliffhangerUsage,
      foreshadowDepth,
      pacingSignature,
      avgGogumaPerEpisode: allGogumas.length / episodesAnalyzed,
      avgHooksPerEpisode: allHooks.length / episodesAnalyzed,
    },
  };
}

// ============================================================
// PART 4 — Markdown report (4언어)
// ============================================================

const REPORT_LABELS: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  title: { ko: '시리즈 DNA 분석', en: 'Series DNA Analysis', ja: 'シリーズDNA分析', zh: '系列DNA分析' },
  overview: { ko: '개요', en: 'Overview', ja: '概要', zh: '概览' },
  totalEp: { ko: '전체 화수', en: 'Total episodes', ja: '全話数', zh: '总话数' },
  analyzed: { ko: '분석 완료', en: 'Analyzed', ja: '分析完了', zh: '已分析' },
  topDevices: { ko: '자주 쓰는 장치', en: 'Top Devices', ja: 'よく使う装置', zh: '常用装置' },
  gogumas: { ko: '고구마/사이다 분포', en: 'Goguma/Cider distribution', ja: 'ゴグマ/サイダー分布', zh: '紧张/释放分布' },
  hooks: { ko: '훅 유형', en: 'Hook types', ja: 'フック種類', zh: '钩子类型' },
  cliffs: { ko: '클리프 유형', en: 'Cliff types', ja: 'クリフ種類', zh: '悬念类型' },
  dopamines: { ko: '도파민 장치', en: 'Dopamine devices', ja: 'ドーパミン装置', zh: '多巴胺装置' },
  patterns: { ko: '작가 개인 패턴', en: 'Personal Patterns', ja: '作家個人パターン', zh: '个人写作模式' },
  cliffUsage: { ko: '클리프 사용률', en: 'Cliff usage rate', ja: 'クリフ使用率', zh: '悬念使用率' },
  foreshadowResolveRate: { ko: '복선 회수율', en: 'Foreshadow resolve rate', ja: '伏線回収率', zh: '伏笔回收率' },
  avgGoguma: { ko: '화당 평균 고구마/사이다', en: 'Avg goguma/cider per episode', ja: '1話あたり平均ゴグマ/サイダー', zh: '每话平均紧张/释放' },
  avgHook: { ko: '화당 평균 훅', en: 'Avg hooks per episode', ja: '1話あたり平均フック', zh: '每话平均钩子' },
  emotions: { ko: '감정 분포', en: 'Emotion distribution', ja: '感情分布', zh: '情感分布' },
  empty: { ko: '분석 데이터 부족', en: 'Not enough data', ja: 'データ不足', zh: '数据不足' },
};

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

function fmtNum(v: number): string {
  return v.toFixed(2);
}

export function renderDNAReport(dna: SeriesDirectionDNA, lang: AppLanguage): string {
  const t = (key: string) => REPORT_LABELS[key] ? L4(lang, REPORT_LABELS[key]) : key;

  if (dna.episodesAnalyzed === 0) {
    return `# ${t('title')}\n\n_${t('empty')}_`;
  }

  const parts: string[] = [];
  parts.push(`# ${t('title')}`);
  parts.push('');

  // 개요
  parts.push(`## ${t('overview')}`);
  parts.push(`- ${t('totalEp')}: **${dna.totalEpisodes}**`);
  parts.push(`- ${t('analyzed')}: **${dna.episodesAnalyzed}**`);
  parts.push('');

  // 자주 쓰는 장치
  parts.push(`## ${t('topDevices')}`);
  if (dna.topGogumas.length > 0) {
    parts.push(`### ${t('gogumas')}`);
    dna.topGogumas.forEach(g => parts.push(`- ${g.value}: ${g.count}`));
  }
  if (dna.topHooks.length > 0) {
    parts.push(`### ${t('hooks')}`);
    dna.topHooks.forEach(h => parts.push(`- ${h.value}: ${h.count}`));
  }
  if (dna.topCliffs.length > 0) {
    parts.push(`### ${t('cliffs')}`);
    dna.topCliffs.forEach(c => parts.push(`- ${c.value}: ${c.count}`));
  }
  if (dna.topDopamineDevices.length > 0) {
    parts.push(`### ${t('dopamines')}`);
    dna.topDopamineDevices.forEach(d => parts.push(`- ${d.value}: ${d.count}`));
  }
  parts.push('');

  // 작가 패턴
  parts.push(`## ${t('patterns')}`);
  parts.push(`- ${t('cliffUsage')}: **${fmtPct(dna.personalPatterns.cliffhangerUsage)}**`);
  parts.push(`- ${t('foreshadowResolveRate')}: **${fmtPct(dna.personalPatterns.foreshadowDepth)}**`);
  parts.push(`- ${t('avgGoguma')}: **${fmtNum(dna.personalPatterns.avgGogumaPerEpisode)}**`);
  parts.push(`- ${t('avgHook')}: **${fmtNum(dna.personalPatterns.avgHooksPerEpisode)}**`);
  parts.push('');

  // 감정 분포
  const emotionEntries = Object.entries(dna.emotionDistribution).sort((a, b) => b[1] - a[1]);
  if (emotionEntries.length > 0) {
    parts.push(`## ${t('emotions')}`);
    emotionEntries.slice(0, 10).forEach(([emo, count]) => parts.push(`- ${emo}: ${count}`));
  }

  return parts.join('\n');
}

// IDENTITY_SEAL: series-direction-dna | role=series aggregate analyzer | inputs=episodes | outputs=DNA + markdown
