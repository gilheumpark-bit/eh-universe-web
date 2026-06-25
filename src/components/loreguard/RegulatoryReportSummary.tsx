"use client";

// ============================================================
// RegulatoryReportSummary — 규제 준수 현황 표시
// ============================================================
// IpPackExportModal 내부에서 사용.
// buildSubmissionPackage → ip-pack-manifest → regulatorySummary를 소비한다.

import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

interface RegulatoryReport {
  id: string;
  label: string;
  status: "ready" | "needs-review" | "not-ready";
  score: number;
  missingRequired: string[];
}

interface RegulatoryReportSummaryProps {
  reports: RegulatoryReport[];
  language: AppLanguage;
}

const STATUS_CFG = {
  ready: { ko: "준비됨", en: "Ready", bg: "bg-accent-green/10", text: "text-accent-green", border: "border-accent-green/30" },
  "needs-review": { ko: "검토 필요", en: "Needs Review", bg: "bg-accent-amber/10", text: "text-accent-amber", border: "border-accent-amber/30" },
  "not-ready": { ko: "미준비", en: "Not Ready", bg: "bg-accent-red/10", text: "text-accent-red", border: "border-accent-red/30" },
} as const;

export function RegulatoryReportSummary({ reports, language }: RegulatoryReportSummaryProps) {
  const isKO = language === "KO";

  if (reports.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {L4(language, { ko: "규제 준수 현황", en: "Regulatory Compliance" })}
      </h3>
      {reports.map((r) => {
        const cfg = STATUS_CFG[r.status] ?? STATUS_CFG["not-ready"];
        return (
          <div
            key={r.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${cfg.border} ${cfg.bg}`}
          >
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}>
              {isKO ? cfg.ko : cfg.en}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-primary truncate">{r.label}</div>
              {r.missingRequired.length > 0 && (
                <div className="text-[10px] text-text-tertiary truncate mt-0.5">
                  {isKO ? "미충족: " : "Missing: "}
                  {r.missingRequired.slice(0, 2).join(", ")}
                  {r.missingRequired.length > 2 && ` +${r.missingRequired.length - 2}`}
                </div>
              )}
            </div>
            <span className={`shrink-0 text-xs font-mono font-bold ${cfg.text}`}>
              {r.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// IDENTITY_SEAL: RegulatoryReportSummary | role=규제 준수 현황 표시 | inputs=reports,language | outputs=UI
