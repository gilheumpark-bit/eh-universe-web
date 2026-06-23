"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  History,
  RefreshCcw,
  Shield,
  XCircle,
} from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { getJournalEngineMode, type JournalEngineMode } from "@/lib/feature-flags";
import { useBackupTiers } from "@/hooks/useBackupTiers";
import { usePrimaryWriterStats } from "@/hooks/usePrimaryWriterStats";
import type { PrimaryMode } from "@/hooks/usePrimaryWriter";
import type { StorageEvent } from "@/lib/save-engine/local-event-log";
import BackupTiersView from "./BackupTiersView";
import { ProgressFill } from "../ProgressFill";

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "-";
  }
}

function fmtDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "-";
  }
}

interface ModeSummarySectionProps {
  language: AppLanguage;
  primaryMode: PrimaryMode;
}

export function ModeSummarySection({ language, primaryMode }: ModeSummarySectionProps) {
  const [flag, setFlag] = useState<JournalEngineMode>(() => {
    try {
      return getJournalEngineMode();
    } catch {
      return "off";
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try {
        setFlag(getJournalEngineMode());
      } catch {
        // Feature flag read failure should not hide the dashboard.
      }
    };
    window.addEventListener("storage", handler);
    window.addEventListener("noa:feature-flag-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("noa:feature-flag-changed", handler);
    };
  }, []);

  const flagLabel = L4(language, {
    ko: flag === "on" ? "활성" : flag === "shadow" ? "관찰 모드" : "비활성",
    en: flag === "on" ? "Active" : flag === "shadow" ? "Observe mode" : "Off",
    ja: flag === "on" ? "有効" : flag === "shadow" ? "観察モード" : "無効",
    zh: flag === "on" ? "活动" : flag === "shadow" ? "观察模式" : "已关闭",
  });
  const modeLabel = L4(language, {
    ko: primaryMode === "journal" ? "과정기록 경로"
      : primaryMode === "degraded" ? "복구 경로"
      : "기존 저장 경로",
    en: primaryMode === "journal" ? "Process-record path"
      : primaryMode === "degraded" ? "Recovery path"
      : "Classic save path",
    ja: primaryMode === "journal" ? "過程記録ルート"
      : primaryMode === "degraded" ? "復旧ルート"
      : "従来保存ルート",
    zh: primaryMode === "journal" ? "过程记录路径"
      : primaryMode === "degraded" ? "恢复路径"
      : "旧版保存路径",
  });

  return (
    <section
      role="region"
      aria-label={L4(language, {
        ko: "현재 저장 모드",
        en: "Current storage mode",
        ja: "現在の保存モード",
        zh: "当前存储模式",
      })}
      data-testid="observatory-section-mode"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 mb-3">
        <Database className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
        {L4(language, { ko: "현재 모드", en: "Current Mode", ja: "現在のモード", zh: "当前模式" })}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="px-3 py-2.5 rounded-lg bg-bg-secondary/40">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">
            {L4(language, { ko: "엔진 플래그", en: "Engine Flag", ja: "エンジンフラグ", zh: "引擎标志" })}
          </div>
          <div className="text-sm font-black text-text-primary">{flagLabel}</div>
        </div>
        <div className="px-3 py-2.5 rounded-lg bg-bg-secondary/40">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">
            {L4(language, { ko: "Primary Writer", en: "Primary Writer", ja: "Primary Writer", zh: "Primary Writer" })}
          </div>
          <div className="text-sm font-black text-text-primary">{modeLabel}</div>
        </div>
      </div>
    </section>
  );
}

interface PrimaryDistributionSectionProps {
  language: AppLanguage;
  onModeChange: (mode: PrimaryMode) => void;
}

export function PrimaryDistributionSection({
  language,
  onModeChange,
}: PrimaryDistributionSectionProps) {
  const stats = usePrimaryWriterStats();

  useEffect(() => {
    const latest = stats.recentWrites[0];
    if (latest) onModeChange(latest.mode);
  }, [stats.recentWrites, onModeChange]);

  const rows: Array<{ key: PrimaryMode; label: string; count: number; pct: number; color: string }> = useMemo(() => [
    {
      key: "journal",
      label: L4(language, { ko: "과정기록 경로", en: "Process-record path", ja: "過程記録ルート", zh: "过程记录路径" }),
      count: stats.journalPrimary,
      pct: stats.last24hBreakdown.journalPct,
      color: "text-accent-green",
    },
    {
      key: "legacy",
      label: L4(language, { ko: "기존 저장 경로", en: "Classic save path", ja: "従来保存ルート", zh: "旧版保存路径" }),
      count: stats.legacyDirect,
      pct: stats.last24hBreakdown.legacyPct,
      color: "text-text-primary",
    },
    {
      key: "degraded",
      label: L4(language, { ko: "복구 경로", en: "Recovery path", ja: "復旧ルート", zh: "恢复路径" }),
      count: stats.degradedFallback,
      pct: stats.last24hBreakdown.degradedPct,
      color: "text-accent-red",
    },
  ], [stats, language]);

  const empty = stats.totalWrites === 0;

  return (
    <section
      role="region"
      aria-label={L4(language, {
        ko: "Primary 경로 분포",
        en: "Primary path distribution",
        ja: "Primary 経路分布",
        zh: "Primary 路径分布",
      })}
      data-testid="observatory-section-primary"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
          {L4(language, {
            ko: "Primary 경로 분포 (최근 1,000)",
            en: "Primary Path Distribution (last 1,000)",
            ja: "Primary 経路分布 (直近 1,000)",
            zh: "Primary 路径分布 (最近 1,000)",
          })}
        </h3>
        <button
          type="button"
          onClick={() => void stats.refresh()}
          aria-label={L4(language, { ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/60 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>

      {empty ? (
        <p className="text-[12px] text-text-tertiary px-2 py-3 rounded-lg bg-bg-secondary/30">
          {L4(language, {
            ko: "아직 기록 없음 - 저장이 발생하면 여기에 나타납니다",
            en: "No data yet - writes will appear here",
            ja: "まだ記録なし - 保存が発生するとここに表示されます",
            zh: "暂无数据 - 保存后会显示在这里",
          })}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1 rounded-lg overflow-hidden h-3 bg-bg-secondary/60" role="img" aria-label="distribution bar">
            <ProgressFill value={stats.last24hBreakdown.journalPct} className="bg-accent-green h-full" />
            <ProgressFill value={stats.last24hBreakdown.legacyPct} className="bg-bg-tertiary h-full" />
            <ProgressFill value={stats.last24hBreakdown.degradedPct} className="bg-accent-red h-full" />
          </div>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-secondary/30 text-[11px] tabular-nums">
                <span className={`font-bold ${row.color}`}>{row.label}</span>
                <span className="flex items-center gap-3">
                  <span className={`font-black ${row.color}`}>{row.count}</span>
                  <span className="text-text-tertiary">
                    {L4(language, { ko: "24h", en: "24h", ja: "24h", zh: "24h" })} {row.pct.toFixed(2)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-text-tertiary tabular-nums">
            {L4(language, {
              ko: `마지막 갱신: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : "-"} · 전체 ${stats.totalWrites}건`,
              en: `Last refreshed: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : "-"} · Total ${stats.totalWrites}`,
              ja: `最終更新: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : "-"} · 合計 ${stats.totalWrites}`,
              zh: `最后更新: ${stats.lastRefreshedAt ? fmtTime(stats.lastRefreshedAt) : "-"} · 合计 ${stats.totalWrites}`,
            })}
          </p>
        </>
      )}
    </section>
  );
}

interface StorageEventsSectionProps {
  language: AppLanguage;
  events: StorageEvent[];
}

export function RecoverySection({ language, events }: StorageEventsSectionProps) {
  return (
    <section
      role="region"
      aria-label={L4(language, { ko: "복구 이력", en: "Recovery history", ja: "復旧履歴", zh: "恢复历史" })}
      data-testid="observatory-section-recovery"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4 space-y-2"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
        {L4(language, { ko: "복구 이력 (최근 20)", en: "Recovery History (last 20)", ja: "復旧履歴 (直近 20)", zh: "恢复历史 (最近 20)" })}
      </h3>
      {events.length === 0 ? (
        <p className="text-[12px] text-text-tertiary px-2 py-3 rounded-lg bg-bg-secondary/30">
          {L4(language, { ko: "복구 기록 없음", en: "No recovery events", ja: "復旧記録なし", zh: "无恢复记录" })}
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {events.map((event) => {
            const icon = event.outcome === "success"
              ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" aria-label="success" />
              : event.outcome === "degraded"
                ? <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" aria-label="degraded" />
                : <XCircle className="w-3.5 h-3.5 text-accent-red" aria-label="failure" />;
            const strategy = typeof event.details?.strategy === "string" ? event.details.strategy : "-";
            return (
              <li key={event.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary/30 text-[11px] tabular-nums">
                {icon}
                <span className="text-text-tertiary shrink-0">{fmtDateTime(event.ts)}</span>
                <span className="font-black text-text-primary truncate">{strategy}</span>
                <span className="text-text-tertiary text-[10px] ml-auto">{event.mode}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function FailuresSection({ language, events }: StorageEventsSectionProps) {
  return (
    <section
      role="region"
      aria-label={L4(language, { ko: "저장 실패 이력", en: "Recent save failures", ja: "保存失敗履歴", zh: "保存失败历史" })}
      data-testid="observatory-section-failures"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4 space-y-2"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-accent-red" aria-hidden />
        {L4(language, { ko: "저장 실패 이력 (최근)", en: "Recent Save Failures", ja: "保存失敗履歴 (直近)", zh: "保存失败历史 (最近)" })}
      </h3>
      {events.length === 0 ? (
        <p className="text-[12px] text-accent-green px-2 py-3 rounded-lg bg-accent-green/10">
          {L4(language, {
            ko: "저장 실패 없음 - 모든 쓰기 정상",
            en: "No save failures - all writes healthy",
            ja: "保存失敗なし - すべての書き込みが正常",
            zh: "无保存失败 - 所有写入正常",
          })}
        </p>
      ) : (
        <ul className="space-y-1 max-h-52 overflow-y-auto">
          {events.map((event) => {
            const reason = typeof event.details?.failureReason === "string"
              ? event.details.failureReason
              : typeof event.details?.errorName === "string"
                ? event.details.errorName
                : "-";
            return (
              <li
                key={event.id}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-red/5 border border-accent-red/20 text-[11px] tabular-nums"
              >
                <XCircle className="w-3.5 h-3.5 text-accent-red shrink-0 mt-0.5" aria-label="failure" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary shrink-0">{fmtDateTime(event.ts)}</span>
                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary">
                      {event.mode}
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

export function BackupSection({ language }: { language: AppLanguage }) {
  const tiers = useBackupTiers();
  return (
    <section
      role="region"
      aria-label={L4(language, { ko: "백업 계층 상태", en: "Backup tier status", ja: "バックアップ階層状態", zh: "备份层级状态" })}
      data-testid="observatory-section-backup"
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4"
    >
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 mb-3">
        <Shield className="w-3.5 h-3.5 text-accent-blue" aria-hidden />
        {L4(language, { ko: "백업 계층 상태 (M1.4)", en: "Backup Tier Status (M1.4)", ja: "バックアップ階層状態 (M1.4)", zh: "备份层级状态 (M1.4)" })}
      </h3>
      <BackupTiersView
        language={language}
        onToggleTier={(tier, enabled) => tiers.setTierEnabled(tier, enabled)}
        onRetryTier={(tier) => tiers.retryTier(tier)}
      />
    </section>
  );
}
