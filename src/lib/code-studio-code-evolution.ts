// ============================================================
// Code Studio — Code Evolution Tracker
// ============================================================

const STORAGE_KEY = 'eh_code_evolution';
const MAX_RECORDS = 5000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================
// PART 1 — Types
// ============================================================

export interface CodeChangeRecord {
  fileId: string;
  fileName: string;
  timestamp: number;
  changeType: 'create' | 'modify' | 'fix' | 'refactor' | 'revert';
  linesChanged: number;
  functionName?: string;
  reviewScore?: number;
  reviewPassed?: boolean;
}

export interface CodeHealthMetric {
  fileId: string;
  fileName: string;
  totalChanges: number;
  recentChanges: number;
  avgReviewScore: number;
  failRate: number;
  churnRate: number;
  hotspotFunctions: Array<{ name: string; changes: number; avgScore: number }>;
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation?: string;
}

export interface EvolutionInsight {
  type: 'hotspot' | 'regression' | 'improvement' | 'churn' | 'stale';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  fileName: string;
  functionName?: string;
  suggestion: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CodeChangeRecord,CodeHealthMetric,EvolutionInsight

// ============================================================
// PART 2 — Storage
// ============================================================

function loadRecords(): CodeChangeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CodeChangeRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: CodeChangeRecord[]): void {
  if (typeof window === 'undefined') return;
  const trimmed = records.slice(-MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function recordChange(record: CodeChangeRecord): void {
  const records = loadRecords();
  records.push(record);
  saveRecords(records);
}

export function getRecords(fileId?: string): CodeChangeRecord[] {
  const all = loadRecords();
  return fileId ? all.filter((r) => r.fileId === fileId) : all;
}

export function clearRecords(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

// IDENTITY_SEAL: PART-2 | role=storage | inputs=CodeChangeRecord | outputs=CodeChangeRecord[]

// ============================================================
// PART 3 — Health Analysis
// ============================================================

export function computeHealth(fileId: string, fileName: string): CodeHealthMetric {
  const records = loadRecords().filter((r) => r.fileId === fileId);
  const now = Date.now();
  const recent = records.filter((r) => now - r.timestamp < SEVEN_DAYS_MS);

  const scores = records.filter((r) => r.reviewScore != null).map((r) => r.reviewScore!);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const fails = records.filter((r) => r.reviewPassed === false).length;
  const failRate = records.length > 0 ? fails / records.length : 0;
  const churnRate = records.length > 0 ? recent.length / records.length : 0;

  // Function-level hotspots
  const fnMap = new Map<string, { changes: number; scores: number[] }>();
  for (const r of records) {
    if (!r.functionName) continue;
    const entry = fnMap.get(r.functionName) ?? { changes: 0, scores: [] };
    entry.changes++;
    if (r.reviewScore != null) entry.scores.push(r.reviewScore);
    fnMap.set(r.functionName, entry);
  }
  const hotspots = [...fnMap.entries()]
    .sort((a, b) => b[1].changes - a[1].changes)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      changes: data.changes,
      avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
    }));

  const grade: CodeHealthMetric['healthGrade'] =
    avgScore >= 80 && failRate < 0.1 ? 'A' :
    avgScore >= 60 && failRate < 0.2 ? 'B' :
    avgScore >= 40 ? 'C' :
    avgScore >= 20 ? 'D' : 'F';

  return {
    fileId, fileName, totalChanges: records.length, recentChanges: recent.length,
    avgReviewScore: Math.round(avgScore), failRate: Math.round(failRate * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100, hotspotFunctions: hotspots,
    healthGrade: grade,
  };
}

// IDENTITY_SEAL: PART-3 | role=health | inputs=fileId | outputs=CodeHealthMetric

// ============================================================
// PART 4 — Insights
// ============================================================

export function generateInsights(): EvolutionInsight[] {
  const records = loadRecords();
  const now = Date.now();
  const insights: EvolutionInsight[] = [];

  // Group by file
  const byFile = new Map<string, CodeChangeRecord[]>();
  for (const r of records) {
    const arr = byFile.get(r.fileId) ?? [];
    arr.push(r);
    byFile.set(r.fileId, arr);
  }

  for (const [, fileRecords] of byFile) {
    const name = fileRecords[0].fileName;
    const recent = fileRecords.filter((r) => now - r.timestamp < SEVEN_DAYS_MS);

    if (recent.length >= 10) {
      insights.push({
        type: 'hotspot', severity: 'warning', message: `${name}: ${recent.length} changes in 7 days`,
        fileName: name, suggestion: 'Consider refactoring this high-churn file',
      });
    }

    const recentFails = recent.filter((r) => r.reviewPassed === false);
    if (recentFails.length >= 3) {
      insights.push({
        type: 'regression', severity: 'critical', message: `${name}: ${recentFails.length} review failures recently`,
        fileName: name, suggestion: 'Investigate recurring quality issues',
      });
    }

    const lastChange = Math.max(...fileRecords.map((r) => r.timestamp));
    if (now - lastChange > 30 * 24 * 60 * 60 * 1000 && fileRecords.length > 5) {
      insights.push({
        type: 'stale', severity: 'info', message: `${name}: no changes in 30+ days`,
        fileName: name, suggestion: 'Review if this code is still maintained',
      });
    }
  }

  return insights;
}

// IDENTITY_SEAL: PART-4 | role=insights | inputs=records | outputs=EvolutionInsight[]
