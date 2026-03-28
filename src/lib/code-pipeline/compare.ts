// ============================================================
// Pipeline Run Comparison — Compare pipeline runs to show
// before/after improvements and trend data
// ============================================================
// Stores pipeline runs in IndexedDB, computes deltas between
// runs, generates trend chart data, and exports markdown
// reports of improvements or regressions.
// ============================================================

import type { PipelineResult, PipelineStage, TeamResult, Finding } from "./types";

// ── Types ──

export interface RunComparison {
  runA: StoredPipelineRun;
  runB: StoredPipelineRun;
  overallDelta: number;
  overallStatusChange: string;
  stageDiffs: StageDiff[];
  newFindings: FindingDiff[];
  resolvedFindings: FindingDiff[];
  significantChanges: SignificantChange[];
  summary: string;
}

export interface StageDiff {
  stage: PipelineStage;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  statusBefore: string;
  statusAfter: string;
  newFindingCount: number;
  resolvedFindingCount: number;
}

export interface FindingDiff {
  stage: PipelineStage;
  finding: Finding;
  /** "new" = appeared in run B, "resolved" = gone in run B */
  type: "new" | "resolved";
}

export interface SignificantChange {
  stage: PipelineStage;
  delta: number;
  direction: "improved" | "regressed";
  description: string;
}

export interface TrendDataPoint {
  runId: string;
  timestamp: number;
  overallScore: number;
  stageScores: Record<string, number>;
}

export interface StoredPipelineRun {
  id: string;
  timestamp: number;
  overallStatus: "pass" | "warn" | "fail";
  overallScore: number;
  stages: TeamResult[];
}

// ── IndexedDB Persistence ──

const IDB_NAME = "csl-pipeline-history";
const IDB_VERSION = 1;
const IDB_STORE = "runs";
const MAX_STORED_RUNS = 20;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── In-Memory Fallback ──

let inMemoryRuns: StoredPipelineRun[] = [];

// ── Storage API ──

/**
 * Save a pipeline run result for later comparison.
 * Keeps at most MAX_STORED_RUNS entries, evicting the oldest.
 */
export async function savePipelineRun(result: PipelineResult): Promise<void> {
  const run: StoredPipelineRun = {
    id: result.id,
    timestamp: result.timestamp,
    overallStatus: result.overallStatus,
    overallScore: result.overallScore,
    stages: result.stages.map((s) => ({ ...s, findings: [...s.findings] })),
  };

  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);

    // Add the new run
    store.put(run);

    // Check count and evict oldest if needed
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > MAX_STORED_RUNS) {
        const idx = store.index("timestamp");
        const cursorReq = idx.openCursor();
        let toDelete = countReq.result - MAX_STORED_RUNS;
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && toDelete > 0) {
            cursor.delete();
            toDelete--;
            cursor.continue();
          }
        };
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // Fallback to in-memory storage
    inMemoryRuns.push(run);
    if (inMemoryRuns.length > MAX_STORED_RUNS) {
      inMemoryRuns.sort((a, b) => a.timestamp - b.timestamp);
      inMemoryRuns = inMemoryRuns.slice(-MAX_STORED_RUNS);
    }
  }
}

/**
 * Retrieve all stored pipeline runs, sorted by timestamp descending (newest first).
 */
export async function getPipelineHistory(): Promise<StoredPipelineRun[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        const runs = (request.result as StoredPipelineRun[]) ?? [];
        runs.sort((a, b) => b.timestamp - a.timestamp);
        resolve(runs);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    // Fallback to in-memory
    return [...inMemoryRuns].sort((a, b) => b.timestamp - a.timestamp);
  }
}

/**
 * Get a single run by ID.
 */
export async function getPipelineRun(id: string): Promise<StoredPipelineRun | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => { db.close(); resolve(request.result ?? null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch {
    return inMemoryRuns.find((r) => r.id === id) ?? null;
  }
}

// ── Comparison Logic ──

/**
 * Create a fingerprint string for a finding to detect new/resolved findings.
 */
function findingFingerprint(stage: PipelineStage, finding: Finding): string {
  return `${stage}:${finding.severity}:${finding.message.substring(0, 100)}:${finding.line ?? ""}`;
}

/**
 * Compare two pipeline runs and compute the delta.
 *
 * @param runA - The "before" run (usually older)
 * @param runB - The "after" run (usually newer)
 */
export function compareRuns(
  runA: StoredPipelineRun,
  runB: StoredPipelineRun,
): RunComparison {
  const stageDiffs: StageDiff[] = [];
  const newFindings: FindingDiff[] = [];
  const resolvedFindings: FindingDiff[] = [];
  const significantChanges: SignificantChange[] = [];

  // Build stage maps for quick lookup
  const stagesA = new Map<PipelineStage, TeamResult>();
  const stagesB = new Map<PipelineStage, TeamResult>();
  for (const s of runA.stages) stagesA.set(s.team, s);
  for (const s of runB.stages) stagesB.set(s.team, s);

  // Collect all stages from both runs
  const allStages = new Set<PipelineStage>([
    ...runA.stages.map((s) => s.team),
    ...runB.stages.map((s) => s.team),
  ]);

  for (const stage of allStages) {
    const a = stagesA.get(stage);
    const b = stagesB.get(stage);

    const scoreBefore = a?.score ?? 0;
    const scoreAfter = b?.score ?? 0;
    const delta = scoreAfter - scoreBefore;

    // Compute finding diffs
    const findingsA = new Set<string>();
    const findingsB = new Set<string>();
    const findingsAMap = new Map<string, Finding>();
    const findingsBMap = new Map<string, Finding>();

    if (a) {
      for (const f of a.findings) {
        const fp = findingFingerprint(stage, f);
        findingsA.add(fp);
        findingsAMap.set(fp, f);
      }
    }
    if (b) {
      for (const f of b.findings) {
        const fp = findingFingerprint(stage, f);
        findingsB.add(fp);
        findingsBMap.set(fp, f);
      }
    }

    let newCount = 0;
    let resolvedCount = 0;

    // New findings: in B but not in A
    for (const fp of findingsB) {
      if (!findingsA.has(fp)) {
        const finding = findingsBMap.get(fp)!;
        newFindings.push({ stage, finding, type: "new" });
        newCount++;
      }
    }

    // Resolved findings: in A but not in B
    for (const fp of findingsA) {
      if (!findingsB.has(fp)) {
        const finding = findingsAMap.get(fp)!;
        resolvedFindings.push({ stage, finding, type: "resolved" });
        resolvedCount++;
      }
    }

    stageDiffs.push({
      stage,
      scoreBefore,
      scoreAfter,
      delta,
      statusBefore: a?.status ?? "skip",
      statusAfter: b?.status ?? "skip",
      newFindingCount: newCount,
      resolvedFindingCount: resolvedCount,
    });

    // Track significant changes (>10 point score change)
    if (Math.abs(delta) > 10) {
      significantChanges.push({
        stage,
        delta,
        direction: delta > 0 ? "improved" : "regressed",
        description: `${stage}: ${scoreBefore} -> ${scoreAfter} (${delta > 0 ? "+" : ""}${delta})`,
      });
    }
  }

  const overallDelta = runB.overallScore - runA.overallScore;
  const overallStatusChange = runA.overallStatus === runB.overallStatus
    ? "unchanged"
    : `${runA.overallStatus} -> ${runB.overallStatus}`;

  // Build summary
  const summaryParts: string[] = [];
  summaryParts.push(
    `Overall: ${runA.overallScore} -> ${runB.overallScore} (${overallDelta > 0 ? "+" : ""}${overallDelta})`,
  );
  if (significantChanges.length > 0) {
    const improved = significantChanges.filter((c) => c.direction === "improved");
    const regressed = significantChanges.filter((c) => c.direction === "regressed");
    if (improved.length > 0) {
      summaryParts.push(`Improved: ${improved.map((c) => c.stage).join(", ")}`);
    }
    if (regressed.length > 0) {
      summaryParts.push(`Regressed: ${regressed.map((c) => c.stage).join(", ")}`);
    }
  }
  summaryParts.push(`New findings: ${newFindings.length}, Resolved: ${resolvedFindings.length}`);

  return {
    runA,
    runB,
    overallDelta,
    overallStatusChange,
    stageDiffs,
    newFindings,
    resolvedFindings,
    significantChanges,
    summary: summaryParts.join(" | "),
  };
}

// ── Trend Data ──

/**
 * Get trend data for charting scores over time.
 */
export async function getTrendData(): Promise<TrendDataPoint[]> {
  const history = await getPipelineHistory();

  // Oldest first for time series
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

  return sorted.map((run) => {
    const stageScores: Record<string, number> = {};
    for (const stage of run.stages) {
      stageScores[stage.team] = stage.score;
    }
    return {
      runId: run.id,
      timestamp: run.timestamp,
      overallScore: run.overallScore,
      stageScores,
    };
  });
}

// ── Markdown Report Export ──

/**
 * Export a run comparison as a markdown report.
 */
export function exportComparisonAsMarkdown(comparison: RunComparison): string {
  const lines: string[] = [];
  const dateA = new Date(comparison.runA.timestamp).toLocaleString();
  const dateB = new Date(comparison.runB.timestamp).toLocaleString();

  lines.push("# Pipeline Run Comparison Report");
  lines.push("");
  lines.push(`| Property | Run A | Run B |`);
  lines.push(`| --- | --- | --- |`);
  lines.push(`| Date | ${dateA} | ${dateB} |`);
  lines.push(`| Overall Score | ${comparison.runA.overallScore} | ${comparison.runB.overallScore} |`);
  lines.push(`| Overall Status | ${comparison.runA.overallStatus} | ${comparison.runB.overallStatus} |`);
  lines.push(`| Delta | | **${comparison.overallDelta > 0 ? "+" : ""}${comparison.overallDelta}** |`);
  lines.push("");

  // Stage-by-stage comparison
  lines.push("## Stage Comparison");
  lines.push("");
  lines.push("| Stage | Before | After | Delta | New | Resolved |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (const diff of comparison.stageDiffs) {
    const deltaStr = diff.delta > 0 ? `+${diff.delta}` : `${diff.delta}`;
    const deltaEmoji = diff.delta > 0 ? "" : diff.delta < 0 ? "" : "";
    lines.push(
      `| ${diff.stage} | ${diff.scoreBefore} (${diff.statusBefore}) | ${diff.scoreAfter} (${diff.statusAfter}) | ${deltaEmoji} ${deltaStr} | ${diff.newFindingCount} | ${diff.resolvedFindingCount} |`,
    );
  }
  lines.push("");

  // Significant changes
  if (comparison.significantChanges.length > 0) {
    lines.push("## Significant Changes (>10 point delta)");
    lines.push("");
    for (const change of comparison.significantChanges) {
      const icon = change.direction === "improved" ? "[IMPROVED]" : "[REGRESSED]";
      lines.push(`- ${icon} ${change.description}`);
    }
    lines.push("");
  }

  // New findings
  if (comparison.newFindings.length > 0) {
    lines.push("## New Findings");
    lines.push("");
    for (const diff of comparison.newFindings) {
      const lineInfo = diff.finding.line ? ` (line ${diff.finding.line})` : "";
      lines.push(
        `- **[${diff.finding.severity}]** ${diff.stage}${lineInfo}: ${diff.finding.message}`,
      );
    }
    lines.push("");
  }

  // Resolved findings
  if (comparison.resolvedFindings.length > 0) {
    lines.push("## Resolved Findings");
    lines.push("");
    for (const diff of comparison.resolvedFindings) {
      const lineInfo = diff.finding.line ? ` (line ${diff.finding.line})` : "";
      lines.push(
        `- ~~[${diff.finding.severity}]~~ ${diff.stage}${lineInfo}: ${diff.finding.message}`,
      );
    }
    lines.push("");
  }

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(comparison.summary);
  lines.push("");

  const improvementPct = comparison.runA.overallScore > 0
    ? Math.round((comparison.overallDelta / comparison.runA.overallScore) * 100)
    : 0;
  if (comparison.overallDelta > 0) {
    lines.push(`Overall improvement: **${improvementPct}%**`);
  } else if (comparison.overallDelta < 0) {
    lines.push(`Overall regression: **${improvementPct}%**`);
  } else {
    lines.push("No overall change in score.");
  }

  return lines.join("\n");
}
