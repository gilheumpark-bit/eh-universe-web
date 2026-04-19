"use client";

// ============================================================
// PART 1 — Imports and Shell
// ============================================================

import React, { useEffect, useState } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { createT, L4 } from '@/lib/i18n';
import { Cpu, ChevronDown } from 'lucide-react';
import { getActiveProvider, getActiveModel, PROVIDERS } from '@/lib/ai-providers';
import { getStorageUsageBytes } from '@/lib/project-migration';
import { idbEstimateSize } from '@/lib/browser/idb-store';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface ProvidersSectionProps {
  language: AppLanguage;
}

const ProvidersSection: React.FC<ProvidersSectionProps> = ({ language }) => {
  const t = createT(language);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    idbEstimateSize().then(setStorageEstimate);
  }, []);

  const activeProvider = typeof window !== 'undefined' ? getActiveProvider() : 'gemini';
  const activeModel = typeof window !== 'undefined' ? getActiveModel() : '';
  const providerName = PROVIDERS[activeProvider]?.name ?? activeProvider;

  // ============================================================
  // PART 2 — Storage indicator (compute once per render)
  // ============================================================
  const formatSize = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
  const hasIdbEstimate = Boolean(storageEstimate && storageEstimate.quota > 0);
  const usageBytes = hasIdbEstimate ? storageEstimate!.usage : getStorageUsageBytes();
  const quotaBytes = hasIdbEstimate ? storageEstimate!.quota : 5 * 1024 * 1024;
  const pct = (usageBytes / quotaBytes) * 100;
  const barColor = pct > 80 ? 'bg-accent-red' : pct > 50 ? 'bg-accent-amber' : 'bg-green-500';
  const textColor = pct > 80 ? 'text-accent-red' : pct > 50 ? 'text-accent-amber' : 'text-green-500';
  const usageLabel = hasIdbEstimate
    ? `${formatSize(usageBytes / 1024 / 1024)} / ${formatSize(quotaBytes / 1024 / 1024)}`
    : `${(usageBytes / 1024 / 1024).toFixed(1)} MB / 5 MB`;

  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <Cpu className="w-4 h-4 text-accent-blue shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {L4(language, { ko: '엔진', en: 'Engine', ja: 'エンジン', zh: '引擎' })}
        </span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-secondary/20 border border-border rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-blue" /> {L4(language, { ko: '집필 엔진 상태', en: 'Writing Engine Status', ja: '執筆エンジン状態', zh: '写作引擎状态' })}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.engineVersion')}</span>
              <span className="text-xs font-black text-accent-blue">ANS {ENGINE_VERSION}</span>
            </div>
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.aiModel')}</span>
              <span className="text-xs font-black text-text-primary">{providerName} — {activeModel}</span>
            </div>
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.latency')}</span>
              <span className="text-xs font-black text-green-500">OPTIMAL</span>
            </div>
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{L4(language, { ko: '클라우드 동기화', en: 'Cloud Sync', ja: 'クラウド同期', zh: '云同步' })}</span>
              <span className={`text-xs font-black ${isFeatureEnabled('CLOUD_SYNC') ? 'text-green-500' : 'text-text-tertiary'}`}>
                {isFeatureEnabled('CLOUD_SYNC')
                  ? L4(language, { ko: '활성', en: 'Active', ja: '有効', zh: '启用' })
                  : L4(language, { ko: '비활성', en: 'Disabled', ja: '無効', zh: '停用' })}
              </span>
            </div>
            <div className="bg-bg-secondary p-4 rounded-xl border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">{L4(language, { ko: '로컬 저장 용량', en: 'Local Storage', ja: 'ローカル保存容量', zh: '本地存储容量' })}</span>
                <span className={`text-xs font-black ${textColor}`}>{usageLabel}</span>
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[transform,opacity,background-color,border-color,color] ${barColor}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              {hasIdbEstimate && pct > 80 && (
                <p className="text-[13px] text-accent-red">{L4(language, { ko: '용량이 부족합니다. 오래된 세션을 삭제하거나 백업 후 정리하세요.', en: 'Storage nearly full. Delete old sessions or export a backup.', ja: '容量が不足しています。古いセッションを削除するか、バックアップ後に整理してください。', zh: '容量不足。请删除旧会话或备份后清理。' })}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </details>
  );
};

export default ProvidersSection;
