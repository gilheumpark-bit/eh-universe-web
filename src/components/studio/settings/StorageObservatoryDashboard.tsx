"use client";

// ============================================================
// PART 1 — Overview (M1.7 Storage Observatory Dashboard)
// ============================================================
//
// Developer-탭 전용 통합 대시보드. M1.1~M1.5.5 에서 구축한 저장 인프라를
// 읽기 전용으로 시각화. Observer pattern — 저장 경로에 절대 간섭하지 않는다.
//
// 7 sections:
//   (1) Mode Summary            — flag + Primary Writer mode
//   (2) Shadow Diff              — 일치율 (ShadowDiffDashboard 재사용)
//   (3) Promotion Readiness      — 4-조건 체크리스트 (ShadowDiffDashboard 내)
//   (4) Primary Path Distribution — journal/legacy/degraded 분포
//   (5) Backup Tier Status       — BackupTiersView 재사용
//   (6) Recovery History         — 최근 복구 감사 (20건)
//   (7) Recent Save Failures     — 타임라인 + 에러 메시지
//
// [원칙 1] Observer — 저장 이벤트에 영향 0.
// [원칙 2] Developer 탭 전용 — 일반 사용자 비노출.
// [원칙 3] 4언어 완성.
// [원칙 4] a11y — role=region + aria-label + 색상+아이콘+텍스트.
// [원칙 5] 10초 폴링 + 커스텀 이벤트 즉시 refresh.
//
// [C] SSR 가드 + 모든 훅 호출 try
// [G] 섹션별 독립 구독 — 한 섹션 실패가 다른 섹션 차단 X
// [K] PART 구조 분리 — 7 섹션 × 각각 자체 컴포넌트

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Activity, Database, TrendingUp, History, AlertTriangle,
  CheckCircle2, XCircle, Clock, RefreshCcw, BarChart3, Shield,
} from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import {
  getJournalEngineMode,
  type JournalEngineMode,
} from '@/lib/feature-flags';
import {
  useBackupTiers,
} from '@/hooks/useBackupTiers';
import { usePrimaryWriterStats } from '@/hooks/usePrimaryWriterStats';
import type { PrimaryMode } from '@/hooks/usePrimaryWriter';
import { getEventLog, type StorageEvent } from '@/lib/save-engine/local-event-log';
import ShadowDiffDashboard from './ShadowDiffDashboard';
import BackupTiersView from './BackupTiersView';
import AuditExportButton from './AuditExportButton';

// ============================================================
// PART 2 — Props + shared helpers
// ============================================================

export interface StorageObservatoryDashboardProps {
  language: AppLanguage;
}

type SectionId =
  | 'mode'
  | 'shadow'
  | 'primary'
  | 'backup'
  | 'recovery'
  | 'failures'
  | 'audit';

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return '—';
  }
}

function fmtDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '—';
  }
}

// ============================================================
// PART 3 — Mode summary (flag + primary mode badge)
// ============================================================

interface ModeSummarySectionProps {
  language: AppLanguage;
  primaryMode: PrimaryMode;
}

function ModeSummarySection({ language, primaryMode }: ModeSummarySectionProps): React.ReactElement {
  const [flag, setFlag] = useState<JournalEngineMode>(() => {
    try { return getJournalEngineMode(); } catch { return 'off'; }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      try { setFlag(getJournalEngineMode()); } catch { /* noop */ }
    };
    window.addEventListener('storage', handler);
    window.addEventListener('noa:feature-flag-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('noa:feature-flag-changed', handler);
    };
  }, []);

  const flagLabel = L4(language, {
    ko: flag === 'on' ? '활성' : flag === 'shadow' ? 'Shadow' : '비활성',
    en: flag === 'on' ? 'Active' : flag === 'shadow' ? 'Shadow' : 'Off',
    ja: flag === 'on' ? '有効' : flag === 'shadow' ? 'Shadow' : '無効',
    zh: flag === 'on' ? '活动' : flag === 'shadow' ? 'Shadow' : '已关闭',
  });
  const modeLabel = L4(language, {
    ko: primaryMode === 'journal' ? 'Journal (Primary)'
      : primaryMode === 'degraded' ? 'Degraded (legacy 복귀)'
      : 'Legacy (Primary)',
    en: primaryMode === 'journal' ? 'Journal (Primary)'
      : primaryMode === 'degraded' ? 'Degraded (legacy fallback)'
      : 'Legacy (Primary)',
    ja: primaryMode === 'journal' ? 'Journal (Primary)'
      : primaryMode === 'degraded' ? 'Degraded (legacy 復帰)'
      : 'Legacy (Primary)',
    zh: primaryMode === 'journal' ? 'Journal (Primary)'
      : primaryMode === 'degraded' ? 'Degraded (回退到 legacy)'
      : 'Legacy (Primary)',
  });

  return (
    <section
      role="region"
      aria-label={L4(language, {
        ko: '현재 저장 모드',
        en: 'Current storage mode',
        ja: '現在の保存モード',
        zh: '当前存储模式',
      })}
      data-testid="observatory-section-mode"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 mb-3">
        <Database className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
        {L4(language, {
          ko: '현재 모드',
          en: 'Current Mode',
          ja: '現在のモード',
          zh: '当前模式',
        })}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="px-3 py-2.5 rounded-lg bg-bg-secondary/40">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">
            {L4(language, { ko: '엔진 플래그', en: 'Engine Flag', ja: 'エンジンフラグ', zh: '引擎标志' })}
          </div>
          <div className="text-sm font-black text-text-primary">{flagLabel}</div>
        </div>
        <div className="px-3 py-2.5 rounded-lg bg-bg-secondary/40">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">
            {L4(language, { ko: 'Primary Writer', en: 'Primary Writer', ja: 'Primary Writer', zh: 'Primary Writer' })}
          </div>
          <div className="text-sm font-black text-text-primary">{modeLabel}</div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PART 4 — Primary Writer path distribution
// ============================================================

interface PrimaryDistributionSectionProps {
  language: AppLanguage;
  onModeChange: (mode: PrimaryMode) => void;
}

function PrimaryDistributionSection({
  language,
  onModeChange,
}: PrimaryDistributionSectionProps): React.ReactElement {
  const stats = usePrimaryWriterStats();

  // 최신 엔트리의 mode 를 상위로 통지 — ModeSummary 와 동기화.
  useEffect(() => {
    const latest = stats.recentWrites[0];
    if (latest) onModeChange(latest.mode);
  }, [stats.recentWrites, onModeChange]);

  const rows: Array<{ key: PrimaryMode; label: string; count: number; pct: number; color: string }> = useMemo(() => [
    {
      key: 'journal',
      label: L4(language, { ko: 'Journal Primary', en: 'Journal Primary', ja: 'Journal Primary', zh: 'Journal Primary' }),
      count: stats.journalPrimary,
      pct: stats.last24hBreakdown.journalPct,
      color: 'text-accent-green',
    },
    {
      key: 'legacy',
      label: L4(language, { ko: 'Legacy Direct', en: 'Legacy Direct', ja: 'Legacy Direct', zh: 'Legacy Direct' }),
      count: stats.legacyDirect,
      pct: stats.last24hBreakdown.legacyPct,
      color: 'text-text-primary',
    },
    {
      key: 'degraded',
      label: L4(language, { ko: 'Degraded Fallback', en: 'Degraded Fallback', ja: 'Degraded Fallback', zh: 'Degraded Fallback' }),
      count: stats.degradedFallback,
      pct: stats.last24hBreakdown.degradedPct,
      color: 'text-accent-red',
    },
  ], [stats, language]);

  const empty = stats.totalWrites === 0;

  return (
    <section
      role="region"
      aria-label={L4(language, {
        ko: 'Primary 경로 분포',
        en: 'Primary path distribution',
        ja: 'Primary 経路分布',
        zh: 'Primary 路径分布',
      })}
      data-testid="observatory-section-primary"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
          {L4(language, {
            ko: 'Primary 경로 분포 (최근 1,000)',
            en: 'Primary Path Distribution (last 1,000)',
            ja: 'Primary 経路分布 (直近 1,000)',
            zh: 'Primary 路径分布 (最近 1,000)',
          })}
        </h3>
        <button
          type="button"
          onClick={() => void stats.refresh()}
          aria-label={L4(language, { ko: '새로고침', en: 'Refresh', ja: '更新', zh: '刷新' })}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/60 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>

      {empty ? (
        <p className="text-[12px] text-text-tertiary px-2 py-3 rounded-lg bg-bg-secondary/30">
          {L4(language, {
            ko: '아직 기록 없음 — 저장이 발생하면 여기에 나타납니다',
            en: 'No data yet — writes will appear here',
            ja: 'まだ記録なし — 保存が発生するとここに表示されます',
            zh: '暂无数据 — 保存后会显示在这里',
          })}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1 rounded-lg overflow-hidden h-3 bg-bg-secondary/60" role="img" aria-label="distribution bar">
            <div className="bg-accent-green h-full" style={{ width: `${stats.last24hBreakdown.journalPct}%` }} />
            <div className="bg-bg-tertiary h-full" style={{ width: `${stats.last24hBreakdown.legacyPct}%` }} />
            <div className="bg-accent-red h-full" style={{ width: `${stats.last24hBreakdown.degradedPct}%` }} />
          </div>
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-secondary/30 text-[11px] tabular-nums">
                <span className={`font-bold ${r.color}`}>{r.label}</span>
                <span className="flex items-center gap-3">
                  <span className={`font-black ${r.color}`}>{r.count}</span>
                  <span className="text-text-tertiary">
                    {L4(language, { ko: '24h', en: '24h', ja: '24h', zh: '24h' })} {r.pct.toFixed(2)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-text-tertiary tabular-nums">
            {L4(language, {
              ko: `마지막 갱신: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : '—'} · 전체 ${stats.totalWrites}건`,
              en: `Last refreshed: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : '—'} · Total ${stats.totalWrites}`,
              ja: `最終更新: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : '—'} · 合計 ${stats.totalWrites}`,
              zh: `最后更新: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : '—'} · 合计 ${stats.totalWrites}`,
            })}
          </p>
        </>
      )}
    </section>
  );
}

// ============================================================
// PART 5 — Recovery history (local-event-log category='recovery')
// ============================================================

interface RecoverySectionProps {
  language: AppLanguage;
  events: StorageEvent[];
}

function RecoverySection({ language, events }: RecoverySectionProps): React.ReactElement {
  return (
    <section
      role="region"
      aria-label={L4(language, {
        ko: '복구 이력',
        en: 'Recovery history',
        ja: '復旧履歴',
        zh: '恢复历史',
      })}
      data-testid="observatory-section-recovery"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4 space-y-2"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
        {L4(language, {
          ko: '복구 이력 (최근 20)',
          en: 'Recovery History (last 20)',
          ja: '復旧履歴 (直近 20)',
          zh: '恢复历史 (最近 20)',
        })}
      </h3>
      {events.length === 0 ? (
        <p className="text-[12px] text-text-tertiary px-2 py-3 rounded-lg bg-bg-secondary/30">
          {L4(language, {
            ko: '복구 기록 없음',
            en: 'No recovery events',
            ja: '復旧記録なし',
            zh: '无恢复记录',
          })}
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {events.map((ev) => {
            const icon = ev.outcome === 'success'
              ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" aria-label="success" />
              : ev.outcome === 'degraded'
                ? <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" aria-label="degraded" />
                : <XCircle className="w-3.5 h-3.5 text-accent-red" aria-label="failure" />;
            const strategy = typeof ev.details?.strategy === 'string' ? ev.details.strategy : '—';
            return (
              <li key={ev.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary/30 text-[11px] tabular-nums">
                {icon}
                <span className="text-text-tertiary shrink-0">{fmtDateTime(ev.ts)}</span>
                <span className="font-black text-text-primary truncate">{strategy}</span>
                <span className="text-text-tertiary text-[10px] ml-auto">{ev.mode}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// PART 6 — Recent failures timeline
// ============================================================

interface FailuresSectionProps {
  language: AppLanguage;
  events: StorageEvent[];
}

function FailuresSection({ language, events }: FailuresSectionProps): React.ReactElement {
  return (
    <section
      role="region"
      aria-label={L4(language, {
        ko: '저장 실패 이력',
        en: 'Recent save failures',
        ja: '保存失敗履歴',
        zh: '保存失败历史',
      })}
      data-testid="observatory-section-failures"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4 space-y-2"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-accent-red" aria-hidden />
        {L4(language, {
          ko: '저장 실패 이력 (최근)',
          en: 'Recent Save Failures',
          ja: '保存失敗履歴 (直近)',
          zh: '保存失败历史 (最近)',
        })}
      </h3>
      {events.length === 0 ? (
        <p className="text-[12px] text-accent-green px-2 py-3 rounded-lg bg-accent-green/10">
          {L4(language, {
            ko: '저장 실패 없음 — 모든 쓰기 정상',
            en: 'No save failures — all writes healthy',
            ja: '保存失敗なし — すべての書き込みが正常',
            zh: '无保存失败 — 所有写入正常',
          })}
        </p>
      ) : (
        <ul className="space-y-1 max-h-52 overflow-y-auto">
          {events.map((ev) => {
            const reason = typeof ev.details?.failureReason === 'string'
              ? ev.details.failureReason
              : typeof ev.details?.errorName === 'string'
                ? ev.details.errorName
                : '—';
            return (
              <li
                key={ev.id}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-red/5 border border-accent-red/20 text-[11px] tabular-nums"
              >
                <XCircle className="w-3.5 h-3.5 text-accent-red shrink-0 mt-0.5" aria-label="failure" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary shrink-0">{fmtDateTime(ev.ts)}</span>
                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary">
                      {ev.mode}
                    </span>
                  </div>
                  <code className="text-[11px] text-accent-red break-all">{reason}</code>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// PART 7 — Backup tier integration section (M1.4 reuse)
// ============================================================

interface BackupSectionProps {
  language: AppLanguage;
}

function BackupSection({ language }: BackupSectionProps): React.ReactElement {
  const tiers = useBackupTiers();
  return (
    <section
      role="region"
      aria-label={L4(language, {
        ko: '백업 계층 상태',
        en: 'Backup tier status',
        ja: 'バックアップ階層状態',
        zh: '备份层级状态',
      })}
      data-testid="observatory-section-backup"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 mb-3">
        <Shield className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
        {L4(language, {
          ko: '백업 계층 상태 (M1.4)',
          en: 'Backup Tier Status (M1.4)',
          ja: 'バックアップ階層状態 (M1.4)',
          zh: '备份层级状态 (M1.4)',
        })}
      </h3>
      <BackupTiersView
        language={language}
        onToggleTier={(tier, enabled) => tiers.setTierEnabled(tier, enabled)}
        onRetryTier={(tier) => tiers.retryTier(tier)}
      />
    </section>
  );
}

// ============================================================
// PART 8 — Main dashboard shell
// ============================================================

const StorageObservatoryDashboard: React.FC<StorageObservatoryDashboardProps> = ({ language }) => {
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>('legacy');
  const [recoveryEvents, setRecoveryEvents] = useState<StorageEvent[]>([]);
  const [failureEvents, setFailureEvents] = useState<StorageEvent[]>([]);
  const [activeSection, setActiveSection] = useState<SectionId>('mode');

  const refreshEvents = useCallback(async () => {
    try {
      const [rec, fail] = await Promise.all([
        getEventLog({ category: 'recovery', limit: 20 }),
        getEventLog({ outcome: 'failure', limit: 20 }),
      ]);
      setRecoveryEvents(rec);
      setFailureEvents(fail);
    } catch (err) {
      logger.warn('StorageObservatoryDashboard', 'refreshEvents failed (isolated)', err);
    }
  }, []);

  // 10초 폴링 + 이벤트 구독.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 초기 refresh 는 microtask 로 defer — cascading render 경고 회피.
    queueMicrotask(() => {
      void refreshEvents();
    });
    const id = window.setInterval(() => {
      void refreshEvents();
    }, 10_000);
    const handler = () => { void refreshEvents(); };
    window.addEventListener('noa:primary-write-logged', handler);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('noa:primary-write-logged', handler);
    };
  }, [refreshEvents]);

  // 탭 라벨 — 4언어.
  const tabs: Array<{ id: SectionId; icon: React.ReactNode; label: string }> = [
    {
      id: 'mode',
      icon: <Database className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: '모드', en: 'Mode', ja: 'モード', zh: '模式' }),
    },
    {
      id: 'shadow',
      icon: <Activity className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: 'Shadow Diff', en: 'Shadow Diff', ja: 'Shadow Diff', zh: 'Shadow Diff' }),
    },
    {
      id: 'primary',
      icon: <BarChart3 className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: 'Primary 경로', en: 'Primary Paths', ja: 'Primary 経路', zh: 'Primary 路径' }),
    },
    {
      id: 'backup',
      icon: <Shield className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: '백업 계층', en: 'Backup Tiers', ja: 'バックアップ階層', zh: '备份层级' }),
    },
    {
      id: 'recovery',
      icon: <History className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: '복구 이력', en: 'Recovery', ja: '復旧', zh: '恢复' }),
    },
    {
      id: 'failures',
      icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: '실패 이력', en: 'Failures', ja: '失敗履歴', zh: '失败历史' }),
    },
    {
      id: 'audit',
      icon: <TrendingUp className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: '감사 Export', en: 'Audit Export', ja: '監査 Export', zh: '审计导出' }),
    },
  ];

  const heading = L4(language, {
    ko: 'Storage Observatory (M1.7)',
    en: 'Storage Observatory (M1.7)',
    ja: 'Storage Observatory (M1.7)',
    zh: 'Storage Observatory (M1.7)',
  });
  const description = L4(language, {
    ko: '저장 경로 실시간 모니터링 · 감사 로그 · 경로 분포 — 읽기 전용. 저장에 영향 없음.',
    en: 'Live storage path monitoring, audit logs, path distribution — read-only. Zero save impact.',
    ja: '保存経路リアルタイム監視・監査ログ・経路分布 — 読み取り専用。保存に影響なし。',
    zh: '保存路径实时监控 · 审计日志 · 路径分布 — 只读。对保存无影响。',
  });

  return (
    <div
      className="ds-card-lg rounded-2xl bg-bg-secondary/20 border border-border p-4 md:p-6 space-y-4"
      role="region"
      aria-label={heading}
      data-testid="storage-observatory"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[11px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-blue" aria-hidden />
          {heading}
        </h2>
        <button
          type="button"
          onClick={() => void refreshEvents()}
          aria-label={L4(language, { ko: '새로고침', en: 'Refresh', ja: '更新', zh: '刷新' })}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/60 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
      <p className="text-[12px] text-text-tertiary leading-relaxed">{description}</p>

      {/* Tab nav */}
      <nav
        role="tablist"
        aria-label={heading}
        className="flex items-center gap-1 border-b border-border overflow-x-auto"
      >
        {tabs.map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`observatory-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`observatory-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded-t-lg shrink-0 ${
                active
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/40'
              }`}
              data-testid={`observatory-tab-${tab.id}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Panels */}
      <div
        role="tabpanel"
        id={`observatory-panel-${activeSection}`}
        aria-labelledby={`observatory-tab-${activeSection}`}
        className="space-y-4"
      >
        {activeSection === 'mode' && (
          <ModeSummarySection language={language} primaryMode={primaryMode} />
        )}
        {activeSection === 'shadow' && (
          <ShadowDiffDashboard language={language} />
        )}
        {activeSection === 'primary' && (
          <PrimaryDistributionSection
            language={language}
            onModeChange={setPrimaryMode}
          />
        )}
        {activeSection === 'backup' && (
          <BackupSection language={language} />
        )}
        {activeSection === 'recovery' && (
          <RecoverySection language={language} events={recoveryEvents} />
        )}
        {activeSection === 'failures' && (
          <FailuresSection language={language} events={failureEvents} />
        )}
        {activeSection === 'audit' && (
          <AuditExportButton language={language} />
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-text-tertiary pt-2 border-t border-border">
        <Clock className="w-3 h-3" aria-hidden />
        <span>{L4(language, {
          ko: '대시보드는 읽기 전용입니다 — 저장 경로에 간섭하지 않습니다.',
          en: 'Dashboard is read-only — no interference with the save path.',
          ja: 'ダッシュボードは読み取り専用 — 保存経路に干渉しません。',
          zh: '仪表板只读 — 不干扰保存路径。',
        })}</span>
      </div>
    </div>
  );
};

export default StorageObservatoryDashboard;
