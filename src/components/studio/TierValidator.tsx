'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Character, Item, StoryConfig, AppLanguage } from '@/lib/studio-types';

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
  const isKO = lang === 'KO';
  const w: ValidationWarning[] = [];

  // 1단계 필수
  if (!char.desire)     w.push({ field: 'desire', tier: 1, label: isKO ? '욕망' : 'Desire' });
  if (!char.deficiency) w.push({ field: 'deficiency', tier: 1, label: isKO ? '결핍' : 'Deficiency' });
  if (!char.conflict)   w.push({ field: 'conflict', tier: 1, label: isKO ? '갈등' : 'Conflict' });
  if (!char.changeArc)  w.push({ field: 'changeArc', tier: 1, label: isKO ? '변화 방향' : 'Change Arc' });
  if (!char.values)     w.push({ field: 'values', tier: 1, label: isKO ? '가치관' : 'Values' });

  // 2단계 권장
  if (!char.strength)       w.push({ field: 'strength', tier: 2, label: isKO ? '강점' : 'Strength' });
  if (!char.weakness)       w.push({ field: 'weakness', tier: 2, label: isKO ? '약점' : 'Weakness' });
  if (!char.backstory)      w.push({ field: 'backstory', tier: 2, label: isKO ? '과거' : 'Backstory' });
  if (!char.failureCost)    w.push({ field: 'failureCost', tier: 2, label: isKO ? '실패 대가' : 'Failure Cost' });

  // 3단계 선택
  if (!char.symbol)              w.push({ field: 'symbol', tier: 3, label: isKO ? '상징' : 'Symbol' });
  if (!char.secret)              w.push({ field: 'secret', tier: 3, label: isKO ? '비밀' : 'Secret' });
  if (!char.externalPerception)  w.push({ field: 'externalPerception', tier: 3, label: isKO ? '외부 인식' : 'Perception' });

  return w;
}

// 아이템 검증
export function validateItem(item: Item, lang: AppLanguage): ValidationWarning[] {
  const isKO = lang === 'KO';
  const w: ValidationWarning[] = [];

  if (!item.purpose)        w.push({ field: 'purpose', tier: 1, label: isKO ? '용도' : 'Purpose' });
  if (!item.activationCond) w.push({ field: 'activationCond', tier: 1, label: isKO ? '발동 조건' : 'Activation' });
  if (!item.costWeakness)   w.push({ field: 'costWeakness', tier: 1, label: isKO ? '대가/약점' : 'Cost' });
  if (!item.storyFunction)  w.push({ field: 'storyFunction', tier: 1, label: isKO ? '스토리 기능' : 'Story Function' });

  if (!item.misuse)          w.push({ field: 'misuse', tier: 2, label: isKO ? '오용/폭주' : 'Misuse' });
  if (!item.worldConnection) w.push({ field: 'worldConnection', tier: 2, label: isKO ? '세계관 연결' : 'World Link' });

  return w;
}

// 세계관 검증
export function validateWorld(config: StoryConfig, lang: AppLanguage): ValidationWarning[] {
  const isKO = lang === 'KO';
  const w: ValidationWarning[] = [];

  if (!config.corePremise)      w.push({ field: 'corePremise', tier: 1, label: isKO ? '핵심 전제' : 'Core Premise' });
  if (!config.powerStructure)   w.push({ field: 'powerStructure', tier: 1, label: isKO ? '권력 구조' : 'Power Structure' });
  if (!config.currentConflict)  w.push({ field: 'currentConflict', tier: 1, label: isKO ? '현재 갈등' : 'Current Conflict' });

  if (!config.worldHistory)        w.push({ field: 'worldHistory', tier: 2, label: isKO ? '역사' : 'History' });
  if (!config.magicTechSystem)     w.push({ field: 'magicTechSystem', tier: 2, label: isKO ? '마법/기술' : 'Magic/Tech' });
  if (!config.factionRelations)    w.push({ field: 'factionRelations', tier: 2, label: isKO ? '세력 관계' : 'Factions' });
  if (!config.survivalEnvironment) w.push({ field: 'survivalEnvironment', tier: 2, label: isKO ? '생존 환경' : 'Environment' });

  if (!config.dailyLife)        w.push({ field: 'dailyLife', tier: 3, label: isKO ? '일상' : 'Daily Life' });
  if (!config.travelComm)       w.push({ field: 'travelComm', tier: 3, label: isKO ? '이동/통신' : 'Travel/Comms' });
  if (!config.truthVsBeliefs)   w.push({ field: 'truthVsBeliefs', tier: 3, label: isKO ? '진실vs믿음' : 'Truth vs Beliefs' });

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
  const isKO = language === 'KO';
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
              {isKO ? '뼈대 미완성' : 'Skeleton Incomplete'}
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
              {isKO ? '작동 부족' : 'Mechanics Gaps'}
            </span>
            <p className="text-[9px] text-amber-300/70 mt-0.5">
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
  const isKO = language === 'KO';
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[9px] font-black ${textColor}`}>
        {score}% {isKO ? '완성' : 'done'}
      </span>
    </div>
  );
};
