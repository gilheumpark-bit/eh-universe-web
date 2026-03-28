// ============================================================
// Code Studio — Developer Scorecard / Metrics
// ============================================================

const STORAGE_KEY = 'eh_dev_scorecard';

// ============================================================
// PART 1 — Types
// ============================================================

export interface DevActivity {
  type: 'commit' | 'review' | 'fix' | 'refactor' | 'test' | 'feature';
  timestamp: number;
  filesChanged: number;
  linesChanged: number;
  score?: number;
}

export interface DevScorecard {
  totalCommits: number;
  totalReviews: number;
  totalFixes: number;
  codeQualityAvg: number;
  commitFrequency: number; // per day, last 7 days
  reviewParticipation: number; // 0-100
  testCoverage: number; // estimated 0-100
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  trends: TrendData;
  badges: string[];
}

export interface TrendData {
  qualityDirection: 'improving' | 'stable' | 'declining';
  velocityDirection: 'increasing' | 'stable' | 'decreasing';
  weeklyCommits: number[];
  weeklyScores: number[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DevActivity,DevScorecard,TrendData

// ============================================================
// PART 2 — Storage
// ============================================================

function loadActivities(): DevActivity[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DevActivity[]) : [];
  } catch {
    return [];
  }
}

function saveActivities(acts: DevActivity[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acts.slice(-2000)));
}

export function recordActivity(activity: DevActivity): void {
  const acts = loadActivities();
  acts.push(activity);
  saveActivities(acts);
}

export function getActivities(): DevActivity[] {
  return loadActivities();
}

// IDENTITY_SEAL: PART-2 | role=storage | inputs=DevActivity | outputs=DevActivity[]

// ============================================================
// PART 3 — Scorecard Computation
// ============================================================

export function computeScorecard(): DevScorecard {
  const acts = loadActivities();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const recent = acts.filter((a) => now - a.timestamp < sevenDays);

  const commits = acts.filter((a) => a.type === 'commit').length;
  const reviews = acts.filter((a) => a.type === 'review').length;
  const fixes = acts.filter((a) => a.type === 'fix').length;
  const tests = acts.filter((a) => a.type === 'test').length;

  const scores = acts.filter((a) => a.score != null).map((a) => a.score!);
  const avgQuality = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;

  const commitFreq = recent.filter((a) => a.type === 'commit').length / 7;
  const reviewPart = acts.length > 0 ? Math.round((reviews / acts.length) * 100) : 0;
  const testCov = Math.min(100, tests * 10);

  // Weekly breakdown (last 4 weeks)
  const weeklyCommits: number[] = [];
  const weeklyScores: number[] = [];
  for (let w = 3; w >= 0; w--) {
    const start = now - (w + 1) * sevenDays;
    const end = now - w * sevenDays;
    const weekActs = acts.filter((a) => a.timestamp >= start && a.timestamp < end);
    weeklyCommits.push(weekActs.filter((a) => a.type === 'commit').length);
    const ws = weekActs.filter((a) => a.score != null).map((a) => a.score!);
    weeklyScores.push(ws.length > 0 ? Math.round(ws.reduce((a, b) => a + b, 0) / ws.length) : 0);
  }

  const qualityDirection: TrendData['qualityDirection'] =
    weeklyScores.length >= 2 && weeklyScores[weeklyScores.length - 1] > weeklyScores[weeklyScores.length - 2] ? 'improving' :
    weeklyScores.length >= 2 && weeklyScores[weeklyScores.length - 1] < weeklyScores[weeklyScores.length - 2] ? 'declining' : 'stable';

  const velocityDirection: TrendData['velocityDirection'] =
    weeklyCommits.length >= 2 && weeklyCommits[weeklyCommits.length - 1] > weeklyCommits[weeklyCommits.length - 2] ? 'increasing' :
    weeklyCommits.length >= 2 && weeklyCommits[weeklyCommits.length - 1] < weeklyCommits[weeklyCommits.length - 2] ? 'decreasing' : 'stable';

  const overall = Math.round(avgQuality * 0.4 + commitFreq * 10 + reviewPart * 0.2 + testCov * 0.2);
  const grade: DevScorecard['grade'] =
    overall >= 90 ? 'S' : overall >= 75 ? 'A' : overall >= 60 ? 'B' :
    overall >= 45 ? 'C' : overall >= 30 ? 'D' : 'F';

  const badges: string[] = [];
  if (commits >= 100) badges.push('Century Committer');
  if (reviews >= 50) badges.push('Review Champion');
  if (avgQuality >= 80) badges.push('Quality Master');
  if (commitFreq >= 3) badges.push('Daily Driver');

  return {
    totalCommits: commits, totalReviews: reviews, totalFixes: fixes,
    codeQualityAvg: Math.round(avgQuality), commitFrequency: Math.round(commitFreq * 10) / 10,
    reviewParticipation: reviewPart, testCoverage: testCov, overallScore: Math.min(100, overall),
    grade, trends: { qualityDirection, velocityDirection, weeklyCommits, weeklyScores }, badges,
  };
}

// IDENTITY_SEAL: PART-3 | role=computation | inputs=DevActivity[] | outputs=DevScorecard
