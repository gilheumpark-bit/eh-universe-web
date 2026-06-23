"use client";

// ============================================================
// StorageObservatoryDashboard — M1.7 read-only storage monitor
// ============================================================

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  History,
  RefreshCcw,
  Shield,
  TrendingUp,
} from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import type { PrimaryMode } from "@/hooks/usePrimaryWriter";
import { getEventLog, type StorageEvent } from "@/lib/save-engine/local-event-log";
import ShadowDiffDashboard from "./ShadowDiffDashboard";
import AuditExportButton from "./AuditExportButton";
import {
  BackupSection,
  FailuresSection,
  ModeSummarySection,
  PrimaryDistributionSection,
  RecoverySection,
} from "./StorageObservatoryDashboard.sections";

export interface StorageObservatoryDashboardProps {
  language: AppLanguage;
}

type SectionId =
  | "mode"
  | "shadow"
  | "primary"
  | "backup"
  | "recovery"
  | "failures"
  | "audit";

type ObservatoryTab = {
  id: SectionId;
  icon: ReactNode;
  label: string;
};

function buildTabs(language: AppLanguage): ObservatoryTab[] {
  return [
    {
      id: "mode",
      icon: <Database className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: "모드", en: "Mode", ja: "モード", zh: "模式" }),
    },
    {
      id: "shadow",
      icon: <Activity className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: "Shadow Diff", en: "Shadow Diff", ja: "Shadow Diff", zh: "Shadow Diff" }),
    },
    {
      id: "primary",
      icon: <BarChart3 className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: "Primary 경로", en: "Primary Paths", ja: "Primary 経路", zh: "Primary 路径" }),
    },
    {
      id: "backup",
      icon: <Shield className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: "백업 계층", en: "Backup Tiers", ja: "バックアップ階層", zh: "备份层级" }),
    },
    {
      id: "recovery",
      icon: <History className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: "복구 이력", en: "Recovery", ja: "復旧", zh: "恢复" }),
    },
    {
      id: "failures",
      icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: "실패 이력", en: "Failures", ja: "失敗履歴", zh: "失败历史" }),
    },
    {
      id: "audit",
      icon: <TrendingUp className="w-3.5 h-3.5" aria-hidden />,
      label: L4(language, { ko: "감사 Export", en: "Audit Export", ja: "監査 Export", zh: "审计导出" }),
    },
  ];
}

const StorageObservatoryDashboard: React.FC<StorageObservatoryDashboardProps> = ({ language }) => {
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>("legacy");
  const [recoveryEvents, setRecoveryEvents] = useState<StorageEvent[]>([]);
  const [failureEvents, setFailureEvents] = useState<StorageEvent[]>([]);
  const [activeSection, setActiveSection] = useState<SectionId>("mode");

  const refreshEvents = useCallback(async () => {
    try {
      const [recovery, failures] = await Promise.all([
        getEventLog({ category: "recovery", limit: 20 }),
        getEventLog({ outcome: "failure", limit: 20 }),
      ]);
      setRecoveryEvents(recovery);
      setFailureEvents(failures);
    } catch (err) {
      logger.warn("StorageObservatoryDashboard", "refreshEvents failed (isolated)", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      void refreshEvents();
    });
    const id = window.setInterval(() => {
      void refreshEvents();
    }, 10_000);
    const handler = () => {
      void refreshEvents();
    };
    window.addEventListener("noa:primary-write-logged", handler);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("noa:primary-write-logged", handler);
    };
  }, [refreshEvents]);

  const tabs = buildTabs(language);
  const heading = L4(language, {
    ko: "Storage Observatory (M1.7)",
    en: "Storage Observatory (M1.7)",
    ja: "Storage Observatory (M1.7)",
    zh: "Storage Observatory (M1.7)",
  });
  const description = L4(language, {
    ko: "저장 경로 실시간 모니터링 · 감사 로그 · 경로 분포 - 읽기 전용. 저장에 영향 없음.",
    en: "Live storage path monitoring, audit logs, path distribution - read-only. Zero save impact.",
    ja: "保存経路リアルタイム監視・監査ログ・経路分布 - 読み取り専用。保存に影響なし。",
    zh: "保存路径实时监控 · 审计日志 · 路径分布 - 只读。对保存无影响。",
  });

  return (
    <div
      className="ds-card-lg rounded-2xl bg-bg-secondary/20 border border-border p-4 md:p-6 space-y-4"
      role="region"
      aria-label={heading}
      data-testid="storage-observatory"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[11px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-blue" aria-hidden />
          {heading}
        </h2>
        <button
          type="button"
          onClick={() => void refreshEvents()}
          aria-label={L4(language, { ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/60 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
      <p className="text-[12px] text-text-tertiary leading-relaxed">{description}</p>

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
                  ? "border-accent-blue text-accent-blue"
                  : "border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/40"
              }`}
              data-testid={`observatory-tab-${tab.id}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div
        role="tabpanel"
        id={`observatory-panel-${activeSection}`}
        aria-labelledby={`observatory-tab-${activeSection}`}
        className="space-y-4"
      >
        {activeSection === "mode" && (
          <ModeSummarySection language={language} primaryMode={primaryMode} />
        )}
        {activeSection === "shadow" && (
          <ShadowDiffDashboard language={language} />
        )}
        {activeSection === "primary" && (
          <PrimaryDistributionSection
            language={language}
            onModeChange={setPrimaryMode}
          />
        )}
        {activeSection === "backup" && (
          <BackupSection language={language} />
        )}
        {activeSection === "recovery" && (
          <RecoverySection language={language} events={recoveryEvents} />
        )}
        {activeSection === "failures" && (
          <FailuresSection language={language} events={failureEvents} />
        )}
        {activeSection === "audit" && (
          <AuditExportButton language={language} />
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-text-tertiary pt-2 border-t border-border">
        <Clock className="w-3 h-3" aria-hidden />
        <span>{L4(language, {
          ko: "대시보드는 읽기 전용입니다 - 저장 경로에 간섭하지 않습니다.",
          en: "Dashboard is read-only - no interference with the save path.",
          ja: "ダッシュボードは読み取り専用 - 保存経路に干渉しません。",
          zh: "仪表板只读 - 不干扰保存路径。",
        })}</span>
      </div>
    </div>
  );
};

export default StorageObservatoryDashboard;
