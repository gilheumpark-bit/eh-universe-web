// ============================================================
// Pipeline Customization Configuration
// 파이프라인 팀별 가중치, 임계값, 차단 팀 설정
// ============================================================

import type { PipelineStage } from './types';

// ── Types ──

export interface PipelineCustomConfig {
  enabledTeams: string[];
  teamWeights: Record<string, number>;
  passThreshold: number;
  warnThreshold: number;
  blockingTeams: string[];
  multiAIReview: boolean;
}

// ── Storage Key ──

const STORAGE_KEY = 'csl-pipeline-config';

// ── All Available Teams ──

export const ALL_TEAMS: PipelineStage[] = [
  'simulation',
  'generation',
  'validation',
  'size-density',
  'asset-trace',
  'stability',
  'release-ip',
  'governance',
  'multi-ai-review',
];

// ── Default Configuration ──

export function getDefaultConfig(): PipelineCustomConfig {
  return {
    enabledTeams: [
      'simulation',
      'generation',
      'validation',
      'size-density',
      'asset-trace',
      'stability',
      'release-ip',
      'governance',
    ],
    teamWeights: {
      simulation: 1.0,
      generation: 1.0,
      validation: 1.5,
      'size-density': 0.8,
      'asset-trace': 1.0,
      stability: 1.2,
      'release-ip': 1.3,
      governance: 1.0,
      'multi-ai-review': 1.5,
    },
    passThreshold: 60,
    warnThreshold: 80,
    blockingTeams: ['validation', 'release-ip'],
    multiAIReview: false,
  };
}

// ── Load / Save ──

export function loadPipelineConfig(): PipelineCustomConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultConfig();

    const parsed = JSON.parse(raw) as Partial<PipelineCustomConfig>;
    const defaults = getDefaultConfig();

    return {
      enabledTeams: Array.isArray(parsed.enabledTeams) ? parsed.enabledTeams : defaults.enabledTeams,
      teamWeights:
        parsed.teamWeights && typeof parsed.teamWeights === 'object'
          ? { ...defaults.teamWeights, ...parsed.teamWeights }
          : defaults.teamWeights,
      passThreshold:
        typeof parsed.passThreshold === 'number' ? parsed.passThreshold : defaults.passThreshold,
      warnThreshold:
        typeof parsed.warnThreshold === 'number' ? parsed.warnThreshold : defaults.warnThreshold,
      blockingTeams: Array.isArray(parsed.blockingTeams)
        ? parsed.blockingTeams
        : defaults.blockingTeams,
      multiAIReview:
        typeof parsed.multiAIReview === 'boolean' ? parsed.multiAIReview : defaults.multiAIReview,
    };
  } catch (err) {
    console.warn('[PipelineConfig] 설정 로드 실패, 기본값 사용:', err);
    return getDefaultConfig();
  }
}

export function savePipelineConfig(config: PipelineCustomConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('[PipelineConfig] 설정 저장 실패 (localStorage 용량 부족 또는 사용 불가):', err);
  }
}

// ── Weighted Score Calculation ──

export function calculateWeightedScore(
  stages: Array<{ team: string; score: number }>,
  config: PipelineCustomConfig,
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const stage of stages) {
    // Skip teams not enabled
    if (!config.enabledTeams.includes(stage.team)) continue;

    const weight = config.teamWeights[stage.team] ?? 1.0;
    weightedSum += stage.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

// ── Status from Score ──

export function getStatusFromScore(
  score: number,
  config: PipelineCustomConfig,
): 'pass' | 'warn' | 'fail' {
  if (score >= config.warnThreshold) return 'pass';
  if (score >= config.passThreshold) return 'warn';
  return 'fail';
}

// ── Check Blocking Teams ──

export function hasBlockingFailure(
  stages: Array<{ team: string; status: string }>,
  config: PipelineCustomConfig,
): boolean {
  return stages.some(
    (s) => config.blockingTeams.includes(s.team) && s.status === 'fail',
  );
}
