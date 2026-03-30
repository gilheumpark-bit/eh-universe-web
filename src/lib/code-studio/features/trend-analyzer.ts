// ============================================================
// Code Studio — Trend Analyzer (code quality metrics over time)
// ============================================================

const STORAGE_KEY = 'eh_trend_snapshots';
const MAX_SNAPSHOTS = 200;

/* ── Types ── */

export interface QualitySnapshot {
  timestamp: number;
  fileCount: number;
  totalLines: number;
  avgFileSize: number;
  errorCount: number;
  warningCount: number;
  testCount: number;
  score: number;
}

export interface TrendAnalysis {
  snapshots: QualitySnapshot[];
  direction: 'improving' | 'stable' | 'declining';
  currentScore: number;
  previousScore: number;
  delta: number;
  alerts: TrendAlert[];
}

export interface TrendAlert {
  type: 'degradation' | 'improvement' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
}

/* ── Storage ── */

function loadSnapshots(): QualitySnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QualitySnapshot[]) : [];
  } catch {
    return [];
  }
}

function saveSnapshots(snaps: QualitySnapshot[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps.slice(-MAX_SNAPSHOTS)));
}

export function recordSnapshot(snapshot: QualitySnapshot): void {
  const snaps = loadSnapshots();
  snaps.push(snapshot);
  saveSnapshots(snaps);
}

export function getSnapshots(): QualitySnapshot[] {
  return loadSnapshots();
}

export function clearSnapshots(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

/* ── Analysis ── */

export function analyzeTrends(): TrendAnalysis {
  const snapshots = loadSnapshots();
  const alerts: TrendAlert[] = [];

  if (snapshots.length < 2) {
    return {
      snapshots,
      direction: 'stable',
      currentScore: snapshots[0]?.score ?? 0,
      previousScore: 0,
      delta: 0,
      alerts: [],
    };
  }

  const recent = snapshots.slice(-5);
  const current = recent[recent.length - 1];
  const previous = recent[recent.length - 2];
  const delta = current.score - previous.score;

  // Determine direction
  const recentScores = recent.map((s) => s.score);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const direction: TrendAnalysis['direction'] =
    delta > 5 ? 'improving' : delta < -5 ? 'declining' : 'stable';

  // Detect alerts
  if (delta < -10) {
    alerts.push({ type: 'degradation', severity: 'warning', message: `Quality dropped by ${Math.abs(delta)} points`, metric: 'score' });
  }
  if (delta < -20) {
    alerts.push({ type: 'degradation', severity: 'critical', message: `Significant quality drop: ${Math.abs(delta)} points`, metric: 'score' });
  }
  if (delta > 10) {
    alerts.push({ type: 'improvement', severity: 'info', message: `Quality improved by ${delta} points`, metric: 'score' });
  }
  if (current.errorCount > previous.errorCount * 2 && previous.errorCount > 0) {
    alerts.push({ type: 'anomaly', severity: 'warning', message: `Error count doubled: ${previous.errorCount} -> ${current.errorCount}`, metric: 'errorCount' });
  }
  if (current.totalLines > previous.totalLines * 1.5 && previous.totalLines > 100) {
    alerts.push({ type: 'anomaly', severity: 'info', message: `Rapid code growth: ${previous.totalLines} -> ${current.totalLines} lines`, metric: 'totalLines' });
  }

  return {
    snapshots,
    direction,
    currentScore: current.score,
    previousScore: previous.score,
    delta,
    alerts,
  };
}

// IDENTITY_SEAL: role=TrendAnalyzer | inputs=QualitySnapshot[] | outputs=TrendAnalysis
