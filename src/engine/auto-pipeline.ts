// ============================================================
// PART 1 — Auto-Pipeline Orchestrator
// ============================================================
// 세계관→캐릭터→연출→집필 원클릭 오케스트레이션
// Sovereign 원칙: 각 단계 독립 판정, 단방향 흐름

import type {
  StoryConfig, AutoPipelineConfig, PipelineStage, PipelineStageResult,
  StageStatus, SkillLevel,
} from '@/lib/studio-types';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Default Config
// ============================================================

export function getDefaultPipelineConfig(level: SkillLevel): AutoPipelineConfig {
  return {
    enabled: true,
    stages: {
      world_check: {
        enabled: true,
        passThreshold: 60,
        failAction: 'warn',
      },
      character_sync: {
        enabled: true,
        passThreshold: 70,
        failAction: 'warn',
      },
      direction_setup: {
        enabled: true,
        passThreshold: 50,
        failAction: 'skip',
      },
      generation: {
        enabled: true,
        passThreshold: 70,
        failAction: level === 'beginner' ? 'warn' : 'block',
      },
    },
    qualityGateEnabled: true,
  };
}

// IDENTITY_SEAL: PART-2 | role=default config | inputs=SkillLevel | outputs=AutoPipelineConfig

// ============================================================
// PART 3 — Stage Evaluators
// ============================================================

interface PipelineContext {
  config: StoryConfig;
  currentEpisode: number;
}

function evaluateWorldCheck(ctx: PipelineContext): PipelineStageResult {
  const start = Date.now();
  const warnings: string[] = [];
  let score = 100;

  // 세계관 필수 필드 존재 여부
  const c = ctx.config;
  if (!c.synopsis || c.synopsis.length < 20) { score -= 30; warnings.push('synopsis_too_short'); }
  if (!c.genre) { score -= 20; warnings.push('genre_not_set'); }
  if ((!c.characters || c.characters.length === 0)) { score -= 20; warnings.push('no_characters'); }
  if (!c.setting || c.setting.length < 10) { score -= 10; warnings.push('setting_vague'); }

  return {
    stage: 'world_check',
    status: score >= 60 ? 'passed' : 'failed',
    duration: Date.now() - start,
    score,
    warnings,
  };
}

function evaluateCharacterSync(ctx: PipelineContext): PipelineStageResult {
  const start = Date.now();
  const warnings: string[] = [];
  let score = 100;

  const chars = ctx.config.characters || [];
  if (chars.length === 0) {
    return { stage: 'character_sync', status: 'skipped', duration: 0, score: 0, warnings: ['no_characters'] };
  }

  // 캐릭터 완성도 체크
  for (const ch of chars) {
    if (!ch.traits || ch.traits.length < 10) { score -= 10; warnings.push(`${ch.name}: traits_incomplete`); }
    if (!ch.role) { score -= 5; warnings.push(`${ch.name}: role_missing`); }
  }

  // POV 캐릭터 존재 여부
  if (ctx.config.povCharacter && !chars.some(c => c.name === ctx.config.povCharacter)) {
    score -= 15;
    warnings.push('pov_character_not_in_list');
  }

  return {
    stage: 'character_sync',
    status: score >= 70 ? 'passed' : 'failed',
    duration: Date.now() - start,
    score: Math.max(0, score),
    warnings,
  };
}

function evaluateDirectionSetup(ctx: PipelineContext): PipelineStageResult {
  const start = Date.now();
  const warnings: string[] = [];
  let score = 100;

  const c = ctx.config;

  // 연출 데이터 존재 여부
  if (!c.sceneDirection) {
    score = 30;
    warnings.push('no_scene_direction');
  } else {
    const sd = c.sceneDirection;
    if (!sd.hooks || sd.hooks.length === 0) { score -= 20; warnings.push('no_hooks'); }
    if (!sd.goguma || sd.goguma.length === 0) { score -= 15; warnings.push('no_tension_devices'); }
  }

  // 긴장도 가드레일 설정 여부
  if (!c.guardrails || c.guardrails.min === 0) { score -= 10; warnings.push('guardrails_not_set'); }

  return {
    stage: 'direction_setup',
    status: score >= 50 ? 'passed' : 'failed',
    duration: Date.now() - start,
    score: Math.max(0, score),
    warnings,
  };
}

// IDENTITY_SEAL: PART-3 | role=stage evaluators | inputs=PipelineContext | outputs=PipelineStageResult

// ============================================================
// PART 4 — Pipeline Executor
// ============================================================

export interface PipelineExecution {
  id: string;
  stages: PipelineStageResult[];
  totalDuration: number;
  finalStatus: 'completed' | 'failed' | 'partial';
  blockedAt?: PipelineStage;
}

export function executePipeline(
  ctx: PipelineContext,
  pipelineConfig: AutoPipelineConfig,
): PipelineExecution {
  const id = `pipe-${Date.now()}`;
  const stages: PipelineStageResult[] = [];
  const start = Date.now();
  let blockedAt: PipelineStage | undefined;

  const stageOrder: PipelineStage[] = ['world_check', 'character_sync', 'direction_setup'];

  for (const stageName of stageOrder) {
    const stageConfig = pipelineConfig.stages[stageName];
    if (!stageConfig.enabled) {
      stages.push({ stage: stageName, status: 'skipped', duration: 0, warnings: [] });
      continue;
    }

    let result: PipelineStageResult;
    switch (stageName) {
      case 'world_check': result = evaluateWorldCheck(ctx); break;
      case 'character_sync': result = evaluateCharacterSync(ctx); break;
      case 'direction_setup': result = evaluateDirectionSetup(ctx); break;
      default: result = { stage: stageName, status: 'skipped', duration: 0, warnings: [] };
    }

    // 실패 시 failAction에 따라 처리
    if (result.status === 'failed') {
      if (stageConfig.failAction === 'block') {
        result.status = 'failed';
        stages.push(result);
        blockedAt = stageName;
        break;
      } else if (stageConfig.failAction === 'skip') {
        result.status = 'skipped';
      }
      // 'warn' → 실패지만 계속 진행, status는 'failed' 유지하되 차단 안 함
      if (stageConfig.failAction === 'warn') {
        logger.warn('auto-pipeline', `Stage "${stageName}" failed with warnings: ${result.warnings?.join(', ')}`, { score: result.score });
      }
    }

    stages.push(result);
  }

  // generation 단계는 여기서 직접 실행하지 않음 — useStudioAI에서 처리
  // 여기서는 generation을 'pending'으로 추가만
  if (!blockedAt) {
    stages.push({ stage: 'generation', status: 'pending', duration: 0, warnings: [] });
  }

  const allPassed = stages.every(s => s.status === 'passed' || s.status === 'skipped' || s.status === 'pending');

  return {
    id,
    stages,
    totalDuration: Date.now() - start,
    finalStatus: blockedAt ? 'failed' : allPassed ? 'completed' : 'partial',
    blockedAt,
  };
}

// IDENTITY_SEAL: PART-4 | role=pipeline executor | inputs=context,config | outputs=PipelineExecution

// ============================================================
// PART 5 — Pipeline Summary Builder (for UI)
// ============================================================

export function buildPipelineSummary(
  execution: PipelineExecution,
  isKO: boolean,
): { icon: string; label: string; details: string[] } {
  const stageLabels: Record<PipelineStage, string> = isKO
    ? { world_check: '세계관 검증', character_sync: '캐릭터 동기화', direction_setup: '연출 설정', generation: '집필 생성' }
    : { world_check: 'World Check', character_sync: 'Character Sync', direction_setup: 'Direction Setup', generation: 'Generation' };

  const statusIcons: Record<StageStatus, string> = {
    pending: '⏳', running: '🔄', passed: '✅', failed: '❌', skipped: '⏭️',
  };

  const details = execution.stages.map(s =>
    `${statusIcons[s.status]} ${stageLabels[s.stage]}${s.score != null ? ` (${s.score})` : ''}${s.warnings.length > 0 ? ` — ${s.warnings[0]}` : ''}`
  );

  const icon = execution.finalStatus === 'completed' ? '🟢' : execution.finalStatus === 'partial' ? '🟡' : '🔴';
  const label = isKO
    ? (execution.finalStatus === 'completed' ? '파이프라인 통과' : execution.finalStatus === 'partial' ? '부분 통과' : '차단됨')
    : (execution.finalStatus === 'completed' ? 'Pipeline Passed' : execution.finalStatus === 'partial' ? 'Partial' : 'Blocked');

  return { icon, label, details };
}

// IDENTITY_SEAL: PART-5 | role=summary builder | inputs=execution | outputs=UI summary

// ============================================================
// PART 6 — Pipeline Results Text Summarizer
// ============================================================

/**
 * Generate a human-readable text summary from PipelineStageResult[].
 * Format:
 *   [Pipeline Summary]
 *   ✅ world_check: 90/100
 *   ⚠️ character_sync: 65/100 — traits_incomplete, role_missing
 *   ❌ generation: 45/100 — quality_below_threshold
 *   Overall: 3/4 passed
 */
export function summarizePipelineResults(results: PipelineStageResult[]): string {
  if (results.length === 0) return '[Pipeline Summary]\nNo stages executed.';

  const lines: string[] = ['[Pipeline Summary]'];
  let passedCount = 0;
  let totalCount = 0;

  for (const r of results) {
    // Skip stages that were never actually evaluated
    if (r.status === 'pending') {
      lines.push(`⏳ ${r.stage}: pending`);
      continue;
    }
    if (r.status === 'skipped') {
      lines.push(`⏭️ ${r.stage}: skipped`);
      continue;
    }

    totalCount++;
    const scoreStr = r.score != null ? `${r.score}/100` : 'N/A';
    const warningStr = r.warnings.length > 0 ? ` \u2014 ${r.warnings.join(', ')}` : '';

    if (r.status === 'passed') {
      passedCount++;
      lines.push(`\u2705 ${r.stage}: ${scoreStr}`);
    } else {
      // failed — check if it had a passable score (warn territory) or hard fail
      const icon = (r.score != null && r.score >= 50) ? '\u26a0\ufe0f' : '\u274c';
      lines.push(`${icon} ${r.stage}: ${scoreStr}${warningStr}`);
    }
  }

  lines.push(`Overall: ${passedCount}/${totalCount} passed`);
  return lines.join('\n');
}

// IDENTITY_SEAL: PART-6 | role=text summarizer | inputs=PipelineStageResult[] | outputs=string
