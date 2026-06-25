"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import {
  getJournalEngineMode,
  type JournalEngineMode,
} from "@/lib/feature-flags";
import type { PromotionStatus } from "@/lib/save-engine/promotion-controller";

export function ModeBadge({ language }: { language: AppLanguage }): React.ReactElement {
  const [mode, setMode] = useState<JournalEngineMode>(() => {
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
        setMode(getJournalEngineMode());
      } catch {
        // Feature flags may be unavailable during boot.
      }
    };
    window.addEventListener("storage", handler);
    window.addEventListener("noa:feature-flag-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("noa:feature-flag-changed", handler);
    };
  }, []);

  const label = L4(language, {
    ko: mode === "on" ? "활성 (primary)" : mode === "shadow" ? "Shadow (관찰)" : "비활성",
    en: mode === "on" ? "Active (primary)" : mode === "shadow" ? "Shadow (observe)" : "Off",
    ja: mode === "on" ? "有効 (primary)" : mode === "shadow" ? "Shadow (観察)" : "無効",
    zh: mode === "on" ? "活动 (primary)" : mode === "shadow" ? "Shadow (观察)" : "已关闭",
  });
  const cls =
    mode === "on"
      ? "bg-accent-green/20 text-accent-green"
      : mode === "shadow"
        ? "bg-accent-amber/20 text-accent-amber"
        : "bg-bg-tertiary text-text-tertiary";

  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${cls}`}>
      {label}
    </span>
  );
}

type PromotionCriteriaChecklistProps = {
  language: AppLanguage;
  status: PromotionStatus | null;
  currentMode: JournalEngineMode;
  onPromote: () => Promise<void> | void;
  onDowngrade: () => Promise<void> | void;
  busy: boolean;
  notice: string | null;
};

export function PromotionCriteriaChecklist({
  language,
  status,
  currentMode,
  onPromote,
  onDowngrade,
  busy,
  notice,
}: PromotionCriteriaChecklistProps): React.ReactElement {
  const labels = {
    title: L4(language, {
      ko: "승격 4-조건 체크리스트",
      en: "Promotion 4-Criteria Checklist",
      ja: "昇格 4 条件チェックリスト",
      zh: "晋升 4 项条件清单",
    }),
    sampleSize: L4(language, {
      ko: "최소 표본",
      en: "Min sample size",
      ja: "最小サンプル",
      zh: "最小样本",
    }),
    observation: L4(language, {
      ko: "최소 관찰 시간",
      en: "Min observation time",
      ja: "最小観察時間",
      zh: "最小观察时长",
    }),
    matchRate: L4(language, {
      ko: "전체 일치율",
      en: "Overall match rate",
      ja: "全体一致率",
      zh: "总体一致率",
    }),
    regression: L4(language, {
      ko: "최근 1h 회귀 없음",
      en: "No recent 1h regression",
      ja: "最近1h の回帰なし",
      zh: "近 1h 无回归",
    }),
    p95: L4(language, {
      ko: "저널 쓰기 P95",
      en: "Journal write P95",
      ja: "ジャーナル書き込み P95",
      zh: "日志写入 P95",
    }),
    promoteBtn: L4(language, {
      ko: "지금 승격",
      en: "Promote Now",
      ja: "今すぐ昇格",
      zh: "立即晋升",
    }),
    downgradeBtn: L4(language, {
      ko: "Shadow 로 내리기",
      en: "Downgrade to Shadow",
      ja: "Shadow に戻す",
      zh: "回退到 Shadow",
    }),
    loading: L4(language, {
      ko: "처리 중…",
      en: "Processing…",
      ja: "処理中…",
      zh: "处理中…",
    }),
    empty: L4(language, {
      ko: "평가 대기 중…",
      en: "Waiting for evaluation…",
      ja: "評価待ち…",
      zh: "等待评估…",
    }),
    blocked: L4(language, {
      ko: "차단 사유",
      en: "Block reason",
      ja: "ブロック理由",
      zh: "阻止原因",
    }),
  };

  if (!status) {
    return (
      <div className="rounded-2xl border border-border bg-bg-secondary/20 p-4">
        <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2 flex items-center gap-2">
          <Activity className="w-3 h-3" />
          {labels.title}
        </h4>
        <p className="text-[12px] text-text-tertiary">{labels.empty}</p>
      </div>
    );
  }

  const { criteriaChecks: checks, metrics, criteria, ready, blockedReason } = status;
  const rows: Array<{ key: keyof typeof checks; label: string; value: string; threshold: string }> = [
    {
      key: "sampleSize",
      label: labels.sampleSize,
      value: String(metrics.sampleSize),
      threshold: `≥ ${criteria.minSampleSize}`,
    },
    {
      key: "observationTime",
      label: labels.observation,
      value: `${metrics.observationHours.toFixed(1)}h`,
      threshold: `≥ ${criteria.minObservationHours}h`,
    },
    {
      key: "matchRate",
      label: labels.matchRate,
      value: `${metrics.matchRate.toFixed(2)}%`,
      threshold: `≥ ${criteria.minMatchRate}%`,
    },
    {
      key: "recentRegression",
      label: labels.regression,
      value: `${metrics.recentRegressionPct.toFixed(2)}%p`,
      threshold: `≤ ${criteria.maxRecentRegressionPct}%p`,
    },
    {
      key: "p95Performance",
      label: labels.p95,
      value: `${metrics.p95JournalMs.toFixed(1)}ms`,
      threshold: `≤ ${criteria.maxP95JournalDurationMs}ms`,
    },
  ];

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${ready ? "bg-accent-green/5 border-accent-green/30" : "bg-bg-secondary/20 border-border"}`}
      role="region"
      aria-label={labels.title}
    >
      <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <ArrowUpCircle className="w-3.5 h-3.5 text-accent-blue" />
        {labels.title}
      </h4>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bg-secondary/30 text-[11px]"
          >
            <div className="flex items-center gap-2 min-w-0">
              {checks[row.key] ? (
                <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0" aria-label="pass" />
              ) : (
                <XCircle className="w-4 h-4 text-accent-red shrink-0" aria-label="fail" />
              )}
              <span className="font-bold text-text-primary truncate">{row.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 tabular-nums">
              <span className={`font-black ${checks[row.key] ? "text-accent-green" : "text-accent-red"}`}>
                {row.value}
              </span>
              <span className="text-text-tertiary">{row.threshold}</span>
            </div>
          </li>
        ))}
      </ul>

      {!ready && blockedReason && (
        <div className="text-[11px] text-text-tertiary px-2">
          <span className="font-bold text-accent-amber">{labels.blocked}: </span>
          <code className="break-all text-accent-amber">{blockedReason}</code>
        </div>
      )}

      {notice && (
        <div className="text-[11px] px-3 py-2 rounded-lg bg-accent-blue/10 text-accent-blue" role="status" aria-live="polite">
          {notice}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {currentMode === "on" && (
          <button
            type="button"
            onClick={() => void onDowngrade()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-tertiary hover:bg-accent-amber/20 hover:text-accent-amber transition-colors focus-visible:ring-2 focus-visible:ring-accent-amber/50 disabled:opacity-50"
            aria-label={labels.downgradeBtn}
          >
            <ArrowDownCircle className="w-3 h-3" />
            {labels.downgradeBtn}
          </button>
        )}
        <button
          type="button"
          onClick={() => void onPromote()}
          disabled={busy || !ready || currentMode === "on"}
          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent-green/50 ${
            ready && currentMode !== "on"
              ? "bg-accent-green/20 text-accent-green hover:bg-accent-green/30"
              : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
          } disabled:opacity-50`}
          aria-label={labels.promoteBtn}
        >
          <ArrowUpCircle className="w-3 h-3" />
          {busy ? labels.loading : labels.promoteBtn}
        </button>
      </div>
    </div>
  );
}
