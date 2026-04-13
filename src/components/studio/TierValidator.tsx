'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Character, Item, StoryConfig, AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

// ============================================================
// 3-tier 검증 규칙
// ============================================================

interface ValidationWarning {
  field: string;
  tier: 1 | 2 | 3;
  label: string;
}

// 캐릭터 검증
export function validateCharacter(char: Character, lang: AppLanguage): ValidationWarning[] {
  const t = createT(lang);
  const w: ValidationWarning[] = [];

  // 1단계 필수
  if (!char.desire)     w.push({ field: 'desire', tier: 1, label: t('tierValidator.desire') });
  if (!char.deficiency) w.push({ field: 'deficiency', tier: 1, label: t('tierValidator.deficiency') });
  if (!char.conflict)   w.push({ field: 'conflict', tier: 1, label: t('tierValidator.conflict') });
  if (!char.changeArc)  w.push({ field: 'changeArc', tier: 1, label: t('tierValidator.changeArc') });
  if (!char.values)     w.push({ field: 'values', tier: 1, label: t('tierValidator.values') });

  // 2단계 권장
  if (!char.strength)       w.push({ field: 'strength', tier: 2, label: t('tierValidator.strength') });
  if (!char.weakness)       w.push({ field: 'weakness', tier: 2, label: t('tierValidator.weakness') });
  if (!char.backstory)      w.push({ field: 'backstory', tier: 2, label: t('tierValidator.backstory') });
  if (!char.failureCost)    w.push({ field: 'failureCost', tier: 2, label: t('tierValidator.failureCost') });

  // 3단계 선택
  if (!char.symbol)              w.push({ field: 'symbol', tier: 3, label: t('tierValidator.symbol') });
  if (!char.secret)              w.push({ field: 'secret', tier: 3, label: t('tierValidator.secret') });
  if (!char.externalPerception)  w.push({ field: 'externalPerception', tier: 3, label: t('tierValidator.perception') });

  return w;
}

// 아이템 검증
export function validateItem(item: Item, lang: AppLanguage): ValidationWarning[] {
  const t = createT(lang);
  const w: ValidationWarning[] = [];

  if (!item.purpose)        w.push({ field: 'purpose', tier: 1, label: t('tierValidator.purpose') });
  if (!item.activationCond) w.push({ field: 'activationCond', tier: 1, label: t('tierValidator.activation') });
  if (!item.costWeakness)   w.push({ field: 'costWeakness', tier: 1, label: t('tierValidator.cost') });
  if (!item.storyFunction)  w.push({ field: 'storyFunction', tier: 1, label: t('tierValidator.storyFunction') });

  if (!item.misuse)          w.push({ field: 'misuse', tier: 2, label: t('tierValidator.misuse') });
  if (!item.worldConnection) w.push({ field: 'worldConnection', tier: 2, label: t('tierValidator.worldLink') });

  return w;
}

// 세계관 검증
export function validateWorld(config: StoryConfig, lang: AppLanguage): ValidationWarning[] {
  const t = createT(lang);
  const w: ValidationWarning[] = [];

  if (!config.corePremise)      w.push({ field: 'corePremise', tier: 1, label: t('tierValidator.corePremise') });
  if (!config.powerStructure)   w.push({ field: 'powerStructure', tier: 1, label: t('tierValidator.powerStructure') });
  if (!config.currentConflict)  w.push({ field: 'currentConflict', tier: 1, label: t('tierValidator.currentConflict') });

  if (!config.worldHistory)        w.push({ field: 'worldHistory', tier: 2, label: t('tierValidator.history') });
  if (!config.magicTechSystem)     w.push({ field: 'magicTechSystem', tier: 2, label: t('tierValidator.magicTech') });
  if (!config.factionRelations)    w.push({ field: 'factionRelations', tier: 2, label: t('tierValidator.factions') });
  if (!config.survivalEnvironment) w.push({ field: 'survivalEnvironment', tier: 2, label: t('tierValidator.environment') });

  if (!config.dailyLife)        w.push({ field: 'dailyLife', tier: 3, label: t('tierValidator.dailyLife') });
  if (!config.travelComm)       w.push({ field: 'travelComm', tier: 3, label: t('tierValidator.travelComms') });
  if (!config.truthVsBeliefs)   w.push({ field: 'truthVsBeliefs', tier: 3, label: t('tierValidator.truthVsBeliefs') });

  return w;
}

// ============================================================
// 완성도 점수 계산
// ============================================================

export function calcCompletionScore(warnings: ValidationWarning[], totalFields: number): number {
  if (totalFields === 0) return 100;
  return Math.round(((totalFields - warnings.length) / totalFields) * 100);
}

// ============================================================
// 경고 배지 컴포넌트
// ============================================================

interface WarningBadgeProps {
  warnings: ValidationWarning[];
  language: AppLanguage;
  compact?: boolean;
}

export const WarningBadge: React.FC<WarningBadgeProps> = ({ warnings, language, compact }) => {
  const t = createT(language);
  if (warnings.length === 0) return null;

  const tier1 = warnings.filter(w => w.tier === 1);
  const tier2 = warnings.filter(w => w.tier === 2);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        tier1.length > 0 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
      }`}>
        <AlertTriangle className="w-2.5 h-2.5" />
        {warnings.length}
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      {tier1.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/10 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">
              {t('tierValidator.skeletonIncomplete')}
            </span>
            <p className="text-[9px] text-red-300/70 mt-0.5">
              {tier1.map(w => w.label).join(', ')}
            </p>
          </div>
        </div>
      )}
      {tier2.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
              {t('tierValidator.mechanicsGaps')}
            </span>
            <p className="text-[9px] text-accent-amber mt-0.5">
              {tier2.map(w => w.label).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 완성도 바 컴포넌트
// ============================================================

interface CompletionBarProps {
  score: number;
  language: AppLanguage;
}

export const CompletionBar: React.FC<CompletionBarProps> = ({ score, language }) => {
  const t = createT(language);
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[9px] font-black ${textColor}`}>
        {score}% {t('tierValidator.done')}
      </span>
    </div>
  );
};
