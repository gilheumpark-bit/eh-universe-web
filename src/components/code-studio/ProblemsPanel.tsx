"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useMemo } from "react";
import {
  XCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";

interface ProblemFinding {
  severity: "critical" | "major" | "minor" | "info";
  message: string;
  line?: number;
  team?: string;
}

interface ProblemsPanelProps {
  findings: ProblemFinding[];
}

export type { ProblemsPanelProps, ProblemFinding };

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ProblemFinding,ProblemsPanelProps

// ============================================================
// PART 2 — Severity Helpers
// ============================================================

function severityIcon(severity: ProblemFinding["severity"]) {
  switch (severity) {
    case "critical":
      return <XCircle size={10} className="text-accent-red flex-shrink-0" />;
    case "major":
      return <AlertTriangle size={10} className="text-accent-amber flex-shrink-0" />;
    case "minor":
      return <Info size={10} className="text-accent-blue flex-shrink-0" />;
    case "info":
      return <CheckCircle2 size={10} className="text-green-400 flex-shrink-0" />;
  }
}

const SEVERITY_ORDER: Record<ProblemFinding["severity"], number> = {
  critical: 0,
  major: 1,
  minor: 2,
  info: 3,
};

// IDENTITY_SEAL: PART-2 | role=SeverityHelpers | inputs=severity | outputs=icon,order

// ============================================================
// PART 3 — ProblemsPanel Component
// ============================================================

export function ProblemsPanel({ findings }: ProblemsPanelProps) {
  const sorted = useMemo(
    () =>
      [...findings].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      ),
    [findings],
  );

  const counts = useMemo(() => {
    const c = { critical: 0, major: 0, minor: 0, info: 0 };
    for (const f of findings) {
      c[f.severity]++;
    }
    return c;
  }, [findings]);

  return (
    <div className="h-40 border-t border-white/[0.08] bg-[#0d1220] flex flex-col overflow-hidden">
      {/* Header with count summary */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-white/[0.08] text-[10px]">
        <span className="font-semibold text-xs text-text-primary">Problems</span>
        {counts.critical > 0 && (
          <span className="flex items-center gap-0.5 text-accent-red">
            <XCircle size={10} /> {counts.critical}
          </span>
        )}
        {counts.major > 0 && (
          <span className="flex items-center gap-0.5 text-accent-amber">
            <AlertTriangle size={10} /> {counts.major}
          </span>
        )}
        {counts.minor > 0 && (
          <span className="flex items-center gap-0.5 text-accent-blue">
            <Info size={10} /> {counts.minor}
          </span>
        )}
        {counts.info > 0 && (
          <span className="flex items-center gap-0.5 text-green-400">
            <CheckCircle2 size={10} /> {counts.info}
          </span>
        )}
      </div>

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto text-xs">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1.5">
            <CheckCircle2 size={18} className="text-green-400" />
            <span className="text-green-400 text-xs font-medium">
              문제 없음 — 모든 검사 통과
            </span>
          </div>
        ) : (
          <div role="list">
            {sorted.map((f, i) => (
              <div
                key={i}
                role="listitem"
                className="flex items-center gap-2 px-3 py-1 hover:bg-white/5 transition-colors"
              >
                {severityIcon(f.severity)}
                <span className="flex-1 truncate text-text-primary">
                  {f.message}
                </span>
                {f.line != null && (
                  <span className="text-text-secondary flex-shrink-0">
                    L{f.line}
                  </span>
                )}
                {f.team && (
                  <span className="text-[9px] text-text-secondary flex-shrink-0">
                    {f.team}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=ProblemsPanel | inputs=ProblemsPanelProps | outputs=JSX
