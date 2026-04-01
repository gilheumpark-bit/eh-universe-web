/**
 * NOA Security — Audit Report + Threat Dashboard
 *
 * Records every NOA security evaluation and generates reports
 * with block-rate summaries, per-layer breakdowns, top threats,
 * and hourly timelines.  Output is in Korean markdown.
 */

const STORAGE_KEY = "csl_noa_audit_log";
const MAX_ENTRIES = 5000;

/* ── Types ── */

export interface AuditEntry {
  timestamp: number;
  input: string;
  result: "allowed" | "blocked";
  layer: string; // which NOA layer triggered
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AuditReport {
  period: { from: number; to: number };
  totalRequests: number;
  blocked: number;
  blockRate: number;
  byLayer: Record<string, number>; // blocks per layer
  bySeverity: Record<string, number>; // blocks per severity
  topThreats: Array<{ pattern: string; count: number; severity: string }>;
  timeline: Array<{ hour: number; allowed: number; blocked: number }>;
  markdown: string;
}

/* ── Storage helpers ── */

function loadEntries(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: AuditEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/* ── Public API ── */

/**
 * Persist a single audit entry.  Older entries beyond MAX_ENTRIES
 * are pruned automatically.
 */
export function recordAuditEntry(entry: AuditEntry): void {
  const entries = loadEntries();
  entries.push(entry);

  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  saveEntries(entries);
}

/**
 * Generate a full audit report covering the last `periodHours` hours
 * (default 24).
 */
export function generateAuditReport(periodHours = 24): AuditReport {
  const now = Date.now();
  const from = now - periodHours * 60 * 60 * 1000;
  const entries = loadEntries().filter((e) => e.timestamp >= from);

  const blocked = entries.filter((e) => e.result === "blocked");
  const blockRate = entries.length === 0 ? 0 : blocked.length / entries.length;

  // Per-layer breakdown
  const byLayer: Record<string, number> = {};
  for (const e of blocked) {
    byLayer[e.layer] = (byLayer[e.layer] ?? 0) + 1;
  }

  // Per-severity breakdown
  const bySeverity: Record<string, number> = {};
  for (const e of blocked) {
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
  }

  // Top threat patterns
  const patternMap = new Map<string, { count: number; severity: string }>();
  for (const e of blocked) {
    const key = e.reason;
    const existing = patternMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      patternMap.set(key, { count: 1, severity: e.severity });
    }
  }
  const topThreats = Array.from(patternMap.entries())
    .map(([pattern, { count, severity }]) => ({ pattern, count, severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Hourly timeline
  const timeline: Array<{ hour: number; allowed: number; blocked: number }> = [];
  for (let h = 0; h < 24; h++) {
    const hourStart = from + h * 60 * 60 * 1000;
    const hourEnd = hourStart + 60 * 60 * 1000;
    const hourEntries = entries.filter(
      (e) => e.timestamp >= hourStart && e.timestamp < hourEnd,
    );
    timeline.push({
      hour: h,
      allowed: hourEntries.filter((e) => e.result === "allowed").length,
      blocked: hourEntries.filter((e) => e.result === "blocked").length,
    });
  }

  const report: AuditReport = {
    period: { from, to: now },
    totalRequests: entries.length,
    blocked: blocked.length,
    blockRate,
    byLayer,
    bySeverity,
    topThreats,
    timeline,
    markdown: "", // placeholder — filled below
  };

  report.markdown = formatAuditMarkdown(report);
  return report;
}

/**
 * Return the most recent blocked entries.
 */
export function getRecentThreats(limit = 20): AuditEntry[] {
  return loadEntries()
    .filter((e) => e.result === "blocked")
    .slice(-limit)
    .reverse();
}

/**
 * Format an audit report as Korean markdown.
 */
export function formatAuditMarkdown(report: AuditReport): string {
  const fromDate = new Date(report.period.from).toLocaleString("ko-KR");
  const toDate = new Date(report.period.to).toLocaleString("ko-KR");
  const pct = (report.blockRate * 100).toFixed(1);

  const lines: string[] = [
    "# NOA 보안 감사 보고서",
    "",
    `**기간:** ${fromDate} ~ ${toDate}`,
    "",
    "## 요약",
    "",
    `| 항목 | 값 |`,
    `|------|------|`,
    `| 총 요청 수 | ${report.totalRequests} |`,
    `| 차단 수 | ${report.blocked} |`,
    `| 차단율 | ${pct}% |`,
    "",
  ];

  // Per-layer breakdown
  if (Object.keys(report.byLayer).length > 0) {
    lines.push("## 레이어별 차단 현황", "");
    lines.push("| 레이어 | 차단 수 |");
    lines.push("|--------|---------|");
    for (const [layer, count] of Object.entries(report.byLayer).sort(
      (a, b) => b[1] - a[1],
    )) {
      lines.push(`| ${layer} | ${count} |`);
    }
    lines.push("");
  }

  // Per-severity breakdown
  if (Object.keys(report.bySeverity).length > 0) {
    lines.push("## 심각도별 분류", "");
    lines.push("| 심각도 | 건수 |");
    lines.push("|--------|------|");
    const order = ["critical", "high", "medium", "low"];
    for (const sev of order) {
      if (report.bySeverity[sev]) {
        lines.push(`| ${sev} | ${report.bySeverity[sev]} |`);
      }
    }
    lines.push("");
  }

  // Top threats
  if (report.topThreats.length > 0) {
    lines.push("## 주요 위협 패턴", "");
    lines.push("| 패턴 | 발생 횟수 | 심각도 |");
    lines.push("|------|-----------|--------|");
    for (const t of report.topThreats) {
      lines.push(`| ${t.pattern} | ${t.count} | ${t.severity} |`);
    }
    lines.push("");
  }

  // Hourly timeline
  lines.push("## 시간대별 현황", "");
  lines.push("| 시간 | 허용 | 차단 |");
  lines.push("|------|------|------|");
  for (const t of report.timeline) {
    if (t.allowed + t.blocked > 0) {
      lines.push(`| ${String(t.hour).padStart(2, "0")}:00 | ${t.allowed} | ${t.blocked} |`);
    }
  }

  return lines.join("\n");
}

/**
 * Clear all stored audit entries.
 */
export function clearAuditLog(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
