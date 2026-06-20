"use client";

// ============================================================
// PART 1 — Imports + Props (M1.4 Tier Dashboard)
// ============================================================
//
// 3-Tier 백업 상태 시각화 + on/off 토글 + 수동 재시도.
// Settings BackupsSection 안에 임베드.
//
// 표시 정책:
//   - 색상 + 아이콘 + 텍스트 모두 병기 (색맹 접근성)
//   - 각 Tier 마지막 성공 시각 + 실패 카운트 + 최근 에러 (드릴다운)
//   - Tier off 시 즉시 disabled state 반영
//
// 4언어 (KO/EN/JA/ZH).

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff, ShieldQuestion,
  ChevronDown, RefreshCw, HardDrive, Cloud, FileArchive,
} from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';
import {
  getDefaultBackupOrchestrator,
  TIER_STATUS_EVENT,
  type BackupTier,
  type BackupTierStatus,
  type BackupTierState,
} from '@/lib/save-engine/backup-tiers';

interface BackupTiersViewProps {
  language: AppLanguage;
  /** Tier on/off 토글 콜백 (선택) — 없으면 read-only */
  onToggleTier?: (tier: BackupTier, enabled: boolean) => void;
  /** 수동 재시도 콜백 (선택) */
  onRetryTier?: (tier: BackupTier) => Promise<void>;
}

// ============================================================
// PART 2 — Translations
// ============================================================

const TXT = {
  title:    { ko: '백업 계층',           en: 'Backup tiers',     ja: 'バックアップ階層',  zh: '备份层级' },
  primary:  { ko: 'Primary (저장소)',    en: 'Primary (Local)',  ja: 'Primary (ローカル)', zh: 'Primary (本地)' },
  secondary:{ ko: 'Secondary (클라우드)', en: 'Secondary (Cloud)', ja: 'Secondary (クラウド)', zh: 'Secondary (云端)' },
  tertiary: { ko: 'Tertiary (파일)',     en: 'Tertiary (File)',  ja: 'Tertiary (ファイル)', zh: 'Tertiary (文件)' },
  retry:    { ko: '재시도',              en: 'Retry',            ja: '再試行',             zh: '重试' },
  enable:   { ko: '활성',                en: 'Enable',           ja: '有効化',             zh: '启用' },
  disable:  { ko: '비활성',              en: 'Disable',          ja: '無効化',             zh: '禁用' },
  lastOk:   { ko: '마지막 성공',         en: 'Last success',     ja: '最後の成功',         zh: '上次成功' },
  never:    { ko: '없음',                en: 'never',            ja: 'なし',               zh: '无' },
  failures: { ko: '실패 횟수',           en: 'Failures',         ja: '失敗回数',           zh: '失败次数' },
  recent:   { ko: '최근 오류',           en: 'Recent errors',    ja: '最近のエラー',       zh: '最近错误' },
  details:  { ko: '상세',                en: 'Details',          ja: '詳細',               zh: '详情' },
  state: {
    disabled: { ko: '꺼짐',     en: 'Disabled', ja: 'オフ',     zh: '关闭' },
    healthy:  { ko: '정상',     en: 'Healthy',  ja: '正常',     zh: '正常' },
    degraded: { ko: '저하',     en: 'Degraded', ja: '低下',     zh: '降级' },
    failing:  { ko: '실패 중',  en: 'Failing',  ja: '失敗中',   zh: '故障中' },
    paused:   { ko: '일시중지', en: 'Paused',   ja: '一時停止', zh: '已暂停' },
  },
} as const;

// ============================================================
// PART 3 — State / icon helpers
// ============================================================

function stateIcon(state: BackupTierState): React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> {
  switch (state) {
    case 'healthy':  return ShieldCheck;
    case 'degraded': return ShieldQuestion;
    case 'failing':  return ShieldAlert;
    case 'paused':   return Shield;
    case 'disabled': default: return ShieldOff;
  }
}

function stateColor(state: BackupTierState): string {
  switch (state) {
    case 'healthy':  return 'text-green-500';
    case 'degraded': return 'text-yellow-500';
    case 'failing':  return 'text-red-500';
    case 'paused':   return 'text-orange-500';
    case 'disabled': default: return 'text-text-tertiary';
  }
}

function tierIcon(tier: BackupTier): React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> {
  switch (tier) {
    case 'primary':   return HardDrive;
    case 'secondary': return Cloud;
    case 'tertiary':  return FileArchive;
  }
}

function tierLabel(tier: BackupTier, language: AppLanguage): string {
  return tier === 'primary' ? L4(language, TXT.primary)
    : tier === 'secondary' ? L4(language, TXT.secondary)
    : L4(language, TXT.tertiary);
}

function formatTime(ts: number | null, language: AppLanguage): string {
  if (!ts) return L4(language, TXT.never);
  try {
    return new Date(ts).toLocaleString(
      language === 'EN' ? 'en-US' : language === 'JP' ? 'ja-JP' : language === 'CN' ? 'zh-CN' : 'ko-KR',
      { dateStyle: 'short', timeStyle: 'medium' },
    );
  } catch {
    return new Date(ts).toISOString();
  }
}

// ============================================================
// PART 4 — Main component
// ============================================================

const BackupTiersView: React.FC<BackupTiersViewProps> = ({
  language,
  onToggleTier,
  onRetryTier,
}) => {
  const [statuses, setStatuses] = useState<BackupTierStatus[]>(() => {
    if (typeof window === 'undefined') return [];
    return getDefaultBackupOrchestrator().getAllStatuses();
  });

  // 글로벌 이벤트 + orchestrator 구독
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const orch = getDefaultBackupOrchestrator();
    const off = orch.onChange(() => {
      setStatuses(orch.getAllStatuses());
    });
    const evtHandler = () => { setStatuses(orch.getAllStatuses()); };
    window.addEventListener(TIER_STATUS_EVENT, evtHandler);
    return () => {
      off();
      window.removeEventListener(TIER_STATUS_EVENT, evtHandler);
    };
  }, []);

  return (
    <div
      className="ds-card-lg p-4 space-y-3"
      role="region"
      aria-label={L4(language, TXT.title)}
      data-testid="backup-tiers-view"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <Shield className="w-4 h-4 text-accent-blue" aria-hidden />
        {L4(language, TXT.title)}
      </h3>

      <div className="space-y-2">
        {statuses.map((status) => (
          <TierRow
            key={status.tier}
            status={status}
            language={language}
            onToggle={onToggleTier}
            onRetry={onRetryTier}
          />
        ))}
      </div>
    </div>
  );
};

export default BackupTiersView;

// ============================================================
// PART 5 — TierRow subcomponent
// ============================================================

interface TierRowProps {
  status: BackupTierStatus;
  language: AppLanguage;
  onToggle?: (tier: BackupTier, enabled: boolean) => void;
  onRetry?: (tier: BackupTier) => Promise<void>;
}

const TierRow: React.FC<TierRowProps> = ({ status, language, onToggle, onRetry }) => {
  const [retrying, setRetrying] = useState(false);
  const StateIcon = stateIcon(status.state);
  const TierIcon = tierIcon(status.tier);
  const stateText = L4(language, TXT.state[status.state]);
  const enabled = status.state !== 'disabled';

  const handleToggle = useCallback(() => {
    if (!onToggle) return;
    onToggle(status.tier, !enabled);
  }, [onToggle, status.tier, enabled]);

  const handleRetry = useCallback(async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry(status.tier);
    } finally {
      setRetrying(false);
    }
  }, [onRetry, status.tier, retrying]);

  return (
    <details
      className="rounded-md border border-border bg-bg-primary/30 overflow-hidden"
      data-testid={`tier-row-${status.tier}`}
    >
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-3 py-2 hover:bg-bg-secondary/30 focus-visible:ring-2 focus-visible:ring-accent-blue">
        <TierIcon className="w-4 h-4 text-text-secondary" aria-hidden />
        <span className="text-sm font-semibold text-text-primary flex-1">
          {tierLabel(status.tier, language)}
        </span>

        {/* 색상 + 아이콘 + 텍스트 3중 표시 — 접근성 */}
        <span className={`flex items-center gap-1.5 text-xs ${stateColor(status.state)}`}>
          <StateIcon className="w-4 h-4" aria-hidden />
          <span aria-label={`${tierLabel(status.tier, language)}: ${stateText}`}>{stateText}</span>
        </span>

        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="px-3 py-3 space-y-2 text-xs border-t border-border bg-bg-primary/20">
        <div className="flex justify-between text-text-secondary">
          <span>{L4(language, TXT.lastOk)}</span>
          <span className="font-mono text-text-primary">{formatTime(status.lastSuccessAt, language)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>{L4(language, TXT.failures)}</span>
          <span className="font-mono text-text-primary">{status.failureCount}</span>
        </div>

        {status.recentErrors.length > 0 && (
          <div className="space-y-1">
            <div className="text-text-secondary">{L4(language, TXT.recent)}</div>
            <ul className="space-y-1 max-h-32 overflow-auto pr-1">
              {status.recentErrors.slice(-5).reverse().map((e, i) => (
                <li key={`${e.ts}-${i}`} className="font-mono text-text-tertiary text-[11px] truncate">
                  {formatTime(e.ts, language)} — {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(onToggle || onRetry) && (
          <div className="flex gap-2 pt-2">
            {onToggle && (
              <button
                type="button"
                onClick={handleToggle}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-bg-secondary/40 focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[32px]"
                data-testid={`toggle-tier-${status.tier}`}
                aria-pressed={enabled}
              >
                {enabled ? L4(language, TXT.disable) : L4(language, TXT.enable)}
              </button>
            )}
            {onRetry && enabled && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-bg-secondary/40 focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[32px] flex items-center gap-1"
                data-testid={`retry-tier-${status.tier}`}
              >
                <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} aria-hidden />
                {L4(language, TXT.retry)}
              </button>
            )}
          </div>
        )}
      </div>
    </details>
  );
};
