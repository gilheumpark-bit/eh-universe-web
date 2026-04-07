"use client";

// ============================================================
// Auto-Pipeline Progress Panel
// ============================================================

import React from 'react';
import { CheckCircle, XCircle, SkipForward, Loader, Clock } from 'lucide-react';
import type { PipelineStageResult, StageStatus, AppLanguage } from '@/lib/studio-types';

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

const STAGE_LABELS: Record<string, { ko: string; en: string }> = {
  world_check: { ko: '세계관 검증', en: 'World Check' },
  character_sync: { ko: '캐릭터 동기화', en: 'Character Sync' },
  direction_setup: { ko: '연출 설정', en: 'Direction Setup' },
  generation: { ko: '집필 생성', en: 'Generation' },
};

export default function PipelineProgress({ stages, finalStatus, language }: PipelineProgressProps) {
  const isKO = language === 'KO';

  const statusLabel = finalStatus === 'completed'
    ? (isKO ? '파이프라인 완료' : 'Pipeline Complete')
    : finalStatus === 'partial'
    ? (isKO ? '부분 통과' : 'Partial Pass')
    : (isKO ? '차단됨' : 'Blocked');

  const statusColor = finalStatus === 'completed' ? 'text-green-400' : finalStatus === 'partial' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] font-bold tracking-[0.15em] text-text-tertiary uppercase">
          {isKO ? '자동 파이프라인' : 'Auto-Pipeline'}
        </span>
        <span className={`font-mono text-[10px] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {stages.map((stage, i) => {
          const Icon = STATUS_ICONS[stage.status];
          const color = STATUS_COLORS[stage.status];
          const label = STAGE_LABELS[stage.stage];
          return (
            <React.Fragment key={stage.stage}>
              {i > 0 && <div className="w-4 h-px bg-white/10" />}
              <div className="flex items-center gap-1.5 group relative" title={`${label ? (isKO ? label.ko : label.en) : stage.stage}: ${stage.score ?? '-'}/100`}>
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="font-mono text-[9px] text-text-tertiary hidden sm:inline">
                  {label ? (isKO ? label.ko : label.en) : stage.stage}
                </span>
                {stage.score != null && stage.status !== 'skipped' && (
                  <span className="font-mono text-[9px] text-text-tertiary">
                    {stage.score}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* 경고 요약 */}
      {stages.some(s => s.warnings.length > 0) && (
        <div className="mt-2 pt-2 border-t border-white/5">
          {stages.filter(s => s.warnings.length > 0).map(s => (
            <div key={s.stage} className="font-mono text-[9px] text-amber-400/70 leading-snug">
              {STAGE_LABELS[s.stage] ? (isKO ? STAGE_LABELS[s.stage].ko : STAGE_LABELS[s.stage].en) : s.stage}: {s.warnings.slice(0, 2).join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
