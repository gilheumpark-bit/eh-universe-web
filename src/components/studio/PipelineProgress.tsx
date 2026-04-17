"use client";

// ============================================================
// Auto-Pipeline Progress Panel
// ============================================================

import React from 'react';
import { CheckCircle, XCircle, SkipForward, Loader, Clock, Globe, Users, Film, PenLine } from 'lucide-react';
import type { PipelineStageResult, StageStatus, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface PipelineProgressProps {
  stages: PipelineStageResult[];
  finalStatus: 'completed' | 'failed' | 'partial' | 'running';
  language: AppLanguage;
}

const STATUS_ICONS: Record<StageStatus, React.ElementType> = {
  pending: Clock,
  running: Loader,
  passed: CheckCircle,
  failed: XCircle,
  skipped: SkipForward,
};

const STATUS_COLORS: Record<StageStatus, string> = {
  pending: 'text-text-tertiary',
  running: 'text-blue-400 animate-spin',
  passed: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-text-tertiary',
};

const STAGE_ICONS: Record<string, React.ElementType> = {
  world_check: Globe,
  character_sync: Users,
  direction_setup: Film,
  generation: PenLine,
};

const STAGE_LABELS: Record<string, { ko: string; en: string }> = {
  world_check: { ko: '세계관 검증', en: 'World Check' },
  character_sync: { ko: '캐릭터 동기화', en: 'Character Sync' },
  direction_setup: { ko: '연출 설정', en: 'Direction Setup' },
  generation: { ko: '집필 생성', en: 'Generation' },
};

const STAGE_EST_SEC: Record<string, number> = {
  world_check: 3,
  character_sync: 5,
  direction_setup: 4,
  generation: 20,
};

export default function PipelineProgress({ stages, finalStatus, language }: PipelineProgressProps) {
  const statusLabel = finalStatus === 'completed'
    ? L4(language, { ko: '검사 완료', en: 'Check Complete', ja: '検査完了', zh: '检查完成' })
    : finalStatus === 'partial'
    ? L4(language, { ko: '일부 완료', en: 'Partial Complete', ja: '一部完了', zh: '部分完成' })
    : finalStatus === 'running'
    ? L4(language, { ko: '검사 중...', en: 'Checking...', ja: 'Checking...', zh: 'Checking...' })
    : L4(language, { ko: '개선이 필요합니다', en: 'Needs Improvement', ja: '改善が必要です', zh: '需要改进' });

  const statusColor = finalStatus === 'completed' ? 'text-green-400' : finalStatus === 'partial' ? 'text-amber-400' : finalStatus === 'running' ? 'text-blue-400' : 'text-red-400';

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] font-bold tracking-[0.15em] text-text-tertiary uppercase">
          {L4(language, { ko: '자동 품질 검사', en: 'Auto Quality Check', ja: '自動品質検査', zh: '自动质量检查' })}
        </span>
        <span className={`font-mono text-[10px] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Stage-by-stage progress */}
      <div className="space-y-2">
        {stages.map((stage, i) => {
          const StatusIcon = STATUS_ICONS[stage.status];
          const StageIcon = STAGE_ICONS[stage.stage] ?? Clock;
          const color = STATUS_COLORS[stage.status];
          const label = STAGE_LABELS[stage.stage];
          const estSec = STAGE_EST_SEC[stage.stage] ?? 5;
          const isRunning = stage.status === 'running';
          const isPassed = stage.status === 'passed';
          return (
            <div
              key={stage.stage}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all ${
                isRunning ? 'bg-blue-500/5 ring-1 ring-blue-500/20' : isPassed ? 'bg-green-500/5' : ''
              }`}
              aria-label={`${label ? L4(language, label) : stage.stage}: ${L4(language, { ko: '상태', en: 'status', ja: '状態', zh: '状态' })} ${stage.status}, ${L4(language, { ko: '점수', en: 'score', ja: 'score', zh: 'score' })} ${stage.score ?? '-'}`}
            >
              {/* Stage icon */}
              <StageIcon className={`w-4 h-4 shrink-0 ${isPassed ? 'text-green-400' : isRunning ? 'text-blue-400' : 'text-text-tertiary/50'}`} />

              {/* Connector line */}
              {i < stages.length - 1 && (
                <div className="absolute left-[26px] top-full w-px h-2 bg-white/6" />
              )}

              {/* Label + est time */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] font-bold ${isRunning ? 'text-blue-400' : isPassed ? 'text-green-400' : 'text-text-tertiary'}`}>
                    {label ? L4(language, label) : stage.stage}
                  </span>
                  {isRunning && (
                    <span className="font-mono text-[8px] text-blue-400/60">
                      ~{estSec}{L4(language, { ko: '초', en: 's', ja: 's', zh: 's' })}
                    </span>
                  )}
                </div>
                {stage.score != null && stage.status !== 'skipped' && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex-1 h-0.5 bg-bg-tertiary rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${stage.score >= 80 ? 'bg-green-500' : stage.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${stage.score}%` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-text-tertiary">{stage.score}</span>
                  </div>
                )}
              </div>

              {/* Status icon */}
              <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${color} ${isRunning ? 'animate-spin' : ''}`} />
            </div>
          );
        })}
      </div>

      {/* 경고 요약 */}
      {stages.some(s => s.warnings.length > 0) && (
        <div className="mt-2 pt-2 border-t border-white/5">
          {stages.filter(s => s.warnings.length > 0).map(s => {
            const stageLabel = STAGE_LABELS[s.stage] ? L4(language, STAGE_LABELS[s.stage]) : s.stage;
            return (
              <div key={s.stage} className="font-mono text-[9px] text-amber-400/70 leading-snug">
                {stageLabel}: {s.warnings.slice(0, 2).map((w, wi) => (
                  <span key={wi}>{wi > 0 ? ', ' : ''}{w}</span>
                ))}
                {s.warnings.length > 2 && (
                  <span className="text-text-tertiary ml-1">(+{s.warnings.length - 2} more)</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
