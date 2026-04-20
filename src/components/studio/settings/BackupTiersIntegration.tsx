"use client";

// ============================================================
// PART 1 — BackupTiersIntegration (M1.4 dashboard wrapper)
// ============================================================
//
// 3-Tier 백업 상태 + Firestore consent + 주기 설정 UI를 묶은 wrapper.
// BackupsSection 안에 import해서 단일 섹션으로 노출.
//
// 분리 이유: BackupsSection 800줄 임계 회피 + 단일 책임.
//
// [C] consent toggle은 사용자 명시 액션 후 ff_ override만 변경
// [G] tiers hook이 자체 구독 — 부모 리렌더 격리
// [K] 외부 의존: useBackupTiers + BackupTiersView + i18n L4

import React, { useCallback } from 'react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { logger } from '@/lib/logger';
import BackupTiersView from '@/components/studio/settings/BackupTiersView';
import { useBackupTiers } from '@/hooks/useBackupTiers';

// ============================================================
// PART 2 — Translations
// ============================================================

const TXT = {
  consentTitle: { ko: '클라우드 미러 동의', en: 'Cloud Mirror Consent', ja: 'クラウドミラー同意', zh: '云镜像同意' },
  consentDesc:  {
    ko: '활성화 시 5분마다 변경된 부분만 Firestore에 백업됩니다. 무료 플랜 90% 도달 시 자동 일시중지.',
    en: 'When enabled, only changed parts are backed up to Firestore every 5 minutes. Auto-pause at 90% of free quota.',
    ja: '有効時、5分ごとに変更分のみFirestoreにバックアップ。無料枠90%到達で自動停止。',
    zh: '启用时,每5分钟仅备份变更部分到Firestore。达到免费配额90%时自动暂停。',
  },
  consentCheck: { ko: '동의하고 활성화', en: 'I consent and enable', ja: '同意して有効化', zh: '同意并启用' },
  consentOn:    {
    ko: '클라우드 미러 활성화. 새로고침 시 적용',
    en: 'Cloud mirror enabled. Refresh to apply',
    ja: 'クラウドミラー有効化。再読み込みで適用',
    zh: '云镜像已启用。刷新后生效',
  },
  consentOff:   {
    ko: '클라우드 미러 비활성화. 새로고침 시 적용',
    en: 'Cloud mirror disabled. Refresh to apply',
    ja: 'クラウドミラー無効化。再読み込みで適用',
    zh: '云镜像已禁用。刷新后生效',
  },
  intervalTitle: { ko: '백업 주기', en: 'Backup interval', ja: 'バックアップ間隔', zh: '备份间隔' },
  intervalDesc:  {
    ko: '클라우드 미러 (Secondary) 자동 백업 주기.',
    en: 'Auto-backup interval for cloud mirror (Secondary tier).',
    ja: 'クラウドミラー(Secondary)の自動バックアップ間隔。',
    zh: '云镜像(Secondary)的自动备份间隔。',
  },
  intervalLabel: { ko: '백업 주기 선택', en: 'Backup interval', ja: 'バックアップ間隔', zh: '备份间隔' },
  minute:        { ko: '분', en: 'min', ja: '分', zh: '分钟' },
} as const;

// ============================================================
// PART 3 — Component
// ============================================================

export default function BackupTiersIntegration({ language }: { language: AppLanguage }) {
  const tiers = useBackupTiers();
  const consentEnabled = isFeatureEnabled('FEATURE_FIRESTORE_MIRROR');

  const handleConsentToggle = useCallback(() => {
    if (typeof window === 'undefined') return;
    const next = !consentEnabled;
    try {
      localStorage.setItem('ff_FEATURE_FIRESTORE_MIRROR', next ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('noa:alert', {
        detail: {
          tone: 'info',
          message: L4(language, next ? TXT.consentOn : TXT.consentOff),
        },
      }));
    } catch (err) {
      logger.warn('BackupTiersIntegration', 'consent toggle failed', err);
    }
  }, [consentEnabled, language]);

  return (
    <div className="space-y-3">
      <BackupTiersView
        language={language}
        onToggleTier={tiers.setTierEnabled}
        onRetryTier={tiers.retryTier}
      />

      {/* Firestore Consent (명시 opt-in) */}
      <div className="ds-card-lg p-4 space-y-2">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
          {L4(language, TXT.consentTitle)}
        </h3>
        <p className="text-xs text-text-secondary">
          {L4(language, TXT.consentDesc)}
        </p>
        <label className="flex items-center gap-2 cursor-pointer text-sm select-none min-h-[44px]">
          <input
            type="checkbox"
            checked={consentEnabled}
            onChange={handleConsentToggle}
            className="w-4 h-4 accent-accent-blue focus-visible:ring-2 focus-visible:ring-accent-blue"
            data-testid="firestore-consent-checkbox"
          />
          <span className="text-text-primary">
            {L4(language, TXT.consentCheck)}
          </span>
        </label>
      </div>

      {/* 주기 설정 UI */}
      <div className="ds-card-lg p-4 space-y-2">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
          {L4(language, TXT.intervalTitle)}
        </h3>
        <p className="text-xs text-text-secondary">
          {L4(language, TXT.intervalDesc)}
        </p>
        <select
          value={tiers.intervalMin}
          onChange={(e) => tiers.setIntervalMin(Number(e.target.value))}
          className="text-sm px-2 py-1.5 rounded-md border border-border bg-bg-primary focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
          data-testid="backup-interval-select"
          aria-label={L4(language, TXT.intervalLabel)}
        >
          <option value={5}>5 {L4(language, TXT.minute)}</option>
          <option value={15}>15 {L4(language, TXT.minute)}</option>
          <option value={30}>30 {L4(language, TXT.minute)}</option>
          <option value={60}>60 {L4(language, TXT.minute)}</option>
        </select>
      </div>
    </div>
  );
}
