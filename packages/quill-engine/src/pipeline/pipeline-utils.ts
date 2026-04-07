// ============================================================
// PART 1 — Types & Pipeline Configuration
// ============================================================
// Combines: auto-fix, report-generator, cache, review-checklist,
// compare, beacon, pipeline-config into a single utility module.

import type { Finding, Severity, TeamResult } from '@eh/quill-engine/pipeline/pipeline-teams';

// ── Pipeline Config ──

export interface PipelineCustomConfig {
  enabledTeams: string[];
  teamWeights: Record<string, number>;
  passThreshold: number;
  warnThreshold: number;
  blockingTeams: string[];
}

const PIPELINE_CONFIG_KEY = 'eh-pipeline-config';

const DEFAULT_TEAMS = [
  'simulation', 'generation', 'validation', 'size-density',
  'asset-trace', 'stability', 'release-ip', 'governance',
];

export function getDefaultPipelineConfig(): PipelineCustomConfig {
  return {
    enabledTeams: [...DEFAULT_TEAMS],
    teamWeights: {
      simulation: 1.0, generation: 1.0, validation: 1.5, 'size-density': 0.8,
      'asset-trace': 1.0, stability: 1.2, 'release-ip': 1.3, governance: 1.0,
    },
    passThreshold: 60,
    warnThreshold: 80,
    blockingTeams: ['validation', 'release-ip'],
  };
}

export function loadPipelineConfig(): PipelineCustomConfig {
  try {
    const raw = localStorage.getItem(PIPELINE_CONFIG_KEY);
    if (!raw) return getDefaultPipelineConfig();
    const parsed = JSON.parse(raw) as Partial<PipelineCustomConfig>;
    const defaults = getDefaultPipelineConfig();
    return {
      enabledTeams: Array.isArray(parsed.enabledTeams) ? parsed.enabledTeams : defaults.enabledTeams,
      teamWeights: parsed.teamWeights && typeof parsed.teamWeights === 'object'
        ? { ...defaults.teamWeights, ...parsed.teamWeights } : defaults.teamWeights,
      passThreshold: typeof parsed.passThreshold === 'number' ? parsed.passThreshold : defaults.passThreshold,
      warnThreshold: typeof parsed.warnThreshold === 'number' ? parsed.warnThreshold : defaults.warnThreshold,
      blockingTeams: Array.isArray(parsed.blockingTeams) ? parsed.blockingTeams : defaults.blockingTeams,
    };
  } catch { return getDefaultPipelineConfig(); }
}

export function savePipelineConfig(config: PipelineCustomConfig): void {
  try { localStorage.setItem(PIPELINE_CONFIG_KEY, JSON.stringify(config)); }
  catch { /* localStorage unavailable */ }
}

export function calculateWeightedScore(
  stages: Array<{ team: string; score: number }>,
  config: PipelineCustomConfig,
): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const s of stages) {
    if (!config.enabledTeams.includes(s.team)) continue;
    const w = config.teamWeights[s.team] ?? 1.0;
    weightedSum += s.score * w;
    totalWeight += w;
  }
  return totalWeight === 0 ? 0 : Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function getStatusFromScore(score: number, config: PipelineCustomConfig): 'pass' | 'warn' | 'fail' {
  if (score >= config.warnThreshold) return 'pass';
  if (score >= config.passThreshold) return 'warn';
  return 'fail';
}

export function hasBlockingFailure(
  stages: Array<{ team: string; status: string }>,
  config: PipelineCustomConfig,
): boolean {
  return stages.some((s) => config.blockingTeams.includes(s.team) && s.status === 'fail');
}

// IDENTITY_SEAL: PART-1 | role=Config | inputs=localStorage | outputs=PipelineCustomConfig

// ============================================================
// PART 2 — Auto-Fix Suggestions
// ============================================================

export interface FixSuggestion {
  id: string;
  finding: Finding;
  description: string;
  file: string;
  line: number;
  originalCode: string;
  fixedCode: string;
  confidence: number;
  safeToAutoApply: boolean;
}

let fixIdCounter = 0;

export function generateFix(finding: Finding & { file?: string }, fileContent?: string): FixSuggestion | null {
  const file = finding.file ?? 'unknown';
  const line = finding.line ?? 1;
  const lines = fileContent?.split('\n') ?? [];
  const lineContent = lines[line - 1] ?? '';

  const msg = finding.message.toLowerCase();

  // console.log removal
  if ((msg.includes('console') || finding.rule === 'no-console') &&
    /console\.(log|debug|info|trace)\s*\(/.test(lineContent)) {
    return {
      id: `fix-${Date.now()}-${++fixIdCounter}`, finding, description: 'Remove console statement',
      file, line, originalCode: lineContent, fixedCode: '', confidence: 80, safeToAutoApply: true,
    };
  }

  // unused import
  if (msg.includes('unused import') || (msg.includes('import') && msg.includes('unused'))) {
    if (/^\s*import\s/.test(lineContent)) {
      return {
        id: `fix-${Date.now()}-${++fixIdCounter}`, finding, description: 'Remove unused import',
        file, line, originalCode: lineContent, fixedCode: '', confidence: 85, safeToAutoApply: true,
      };
    }
  }

  // missing semicolon
  if (msg.includes('semicolon')) {
    const trimmed = lineContent.trimEnd();
    if (trimmed && ![';', '{', '}', ',', '(', ':'].includes(trimmed[trimmed.length - 1])) {
      return {
        id: `fix-${Date.now()}-${++fixIdCounter}`, finding, description: 'Add semicolon',
        file, line, originalCode: lineContent, fixedCode: trimmed + ';', confidence: 90, safeToAutoApply: true,
      };
    }
  }

  return null;
}

export function generateFixes(findings: Array<Finding & { file?: string }>, fileContents: Map<string, string>): FixSuggestion[] {
  const fixes: FixSuggestion[] = [];
  for (const f of findings) {
    const content = f.file ? fileContents.get(f.file) : undefined;
    const fix = generateFix(f, content);
    if (fix) fixes.push(fix);
  }
  return fixes.sort((a, b) => b.confidence !== a.confidence ? b.confidence - a.confidence : a.line - b.line);
}

// IDENTITY_SEAL: PART-2 | role=AutoFix | inputs=findings | outputs=FixSuggestion[]

// ============================================================
// PART 3 — Report Generator
// ============================================================

export interface PipelineReport {
  id: string;
  timestamp: number;
  stages: TeamResult[];
  overallScore: number;
  overallStatus: string;
  markdown: string;
  summary: string;
}

const REPORT_STORAGE_KEY = 'eh-pipeline-reports';
const MAX_REPORTS = 30;

const STATUS_EMOJI: Record<string, string> = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
const SEVERITY_LABELS: Record<string, string> = { critical: 'CRITICAL', major: 'MAJOR', minor: 'MINOR', info: 'INFO' };

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function generateReport(stages: TeamResult[], timestamp: number): PipelineReport {
  const config = loadPipelineConfig();
  const overallScore = Math.round(calculateWeightedScore(
    stages.map((s) => ({ team: s.stage, score: s.score })), config,
  ));
  const blocked = hasBlockingFailure(stages.map((s) => ({ team: s.stage, status: s.status })), config);
  const overallStatus = blocked ? 'fail' : getStatusFromScore(overallScore, config);

  const pass = stages.filter((s) => s.status === 'pass').length;
  const warn = stages.filter((s) => s.status === 'warn').length;
  const fail = stages.filter((s) => s.status === 'fail').length;
  const totalFindings = stages.reduce((sum, s) => sum + s.findings.length, 0);
  const summary = `${stages.length} teams: pass ${pass}, warn ${warn}, fail ${fail}. Score ${overallScore}, findings ${totalFindings}.`;

  const lines: string[] = [];
  lines.push('# Pipeline Report');
  lines.push(`Date: ${formatDate(timestamp)} | Status: ${STATUS_EMOJI[overallStatus]} | Score: ${overallScore}`);
  lines.push('');
  lines.push('| Team | Status | Score | Findings |');
  lines.push('|------|--------|-------|----------|');
  for (const s of stages) {
    lines.push(`| ${s.stage} | ${STATUS_EMOJI[s.status] ?? s.status} | ${s.score} | ${s.findings.length} |`);
  }
  lines.push('');

  const allFindings = stages.flatMap((s) => s.findings.map((f) => ({ ...f, team: s.stage })));
  if (allFindings.length > 0) {
    lines.push('## Findings');
    for (const f of allFindings) {
      const lineRef = f.line != null ? ` (L${f.line})` : '';
      lines.push(`- [${SEVERITY_LABELS[f.severity] ?? f.severity}] ${f.team}: ${f.message}${lineRef}`);
    }
  }

  return {
    id: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp, stages, overallScore, overallStatus,
    markdown: lines.join('\n'), summary,
  };
}

export function getReportHistory(): PipelineReport[] {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PipelineReport[]) : [];
  } catch { return []; }
}

export function saveReport(report: PipelineReport): void {
  try {
    const history = getReportHistory();
    history.unshift(report);
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_REPORTS)));
  } catch { /* localStorage unavailable */ }
}

// IDENTITY_SEAL: PART-3 | role=ReportGen | inputs=TeamResult[] | outputs=PipelineReport

// ============================================================
// PART 4 — Result Cache (localStorage TTL)
// ============================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = 'eh-pipe-cache:';

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch { return null; }
}

export function setCached<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch { /* storage full */ }
}

export function clearPipelineCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

// IDENTITY_SEAL: PART-4 | role=Cache | inputs=key,data | outputs=T|null

// ============================================================
// PART 5 — Review Checklist Generator
// ============================================================

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  weight: number;
}

export interface ReviewChecklist {
  role: string;
  items: ChecklistItem[];
  passThreshold: number;
}

const BASE_CHECKLIST: ChecklistItem[] = [
  { id: 'rev-01', category: 'Readability', description: 'Can someone new understand the code without extra context?', weight: 1.0 },
  { id: 'rev-02', category: 'Pattern', description: 'Does the code follow project conventions?', weight: 0.8 },
  { id: 'rev-03', category: 'ErrorHandling', description: 'Are errors handled properly?', weight: 0.9 },
  { id: 'rev-04', category: 'Safety', description: 'No potential null-reference or runtime errors?', weight: 1.0 },
  { id: 'rev-05', category: 'Design', description: 'Follows single-responsibility principle?', weight: 0.7 },
  { id: 'rev-06', category: 'Maintenance', description: 'Easy to modify and extend?', weight: 0.7 },
];

export function getReviewChecklist(role = 'reviewer'): ReviewChecklist {
  return { role, items: [...BASE_CHECKLIST], passThreshold: 77 };
}

// IDENTITY_SEAL: PART-5 | role=Checklist | inputs=role | outputs=ReviewChecklist

// ============================================================
// PART 6 — Pipeline Run Comparison
// ============================================================

export interface RunComparison {
  overallDelta: number;
  stageDiffs: Array<{ stage: string; scoreBefore: number; scoreAfter: number; delta: number }>;
  newFindings: number;
  resolvedFindings: number;
  summary: string;
}

export function compareRuns(
  runA: { overallScore: number; stages: TeamResult[] },
  runB: { overallScore: number; stages: TeamResult[] },
): RunComparison {
  const stagesA = new Map(runA.stages.map((s) => [s.stage, s]));
  const stagesB = new Map(runB.stages.map((s) => [s.stage, s]));
  const allStages = new Set([...stagesA.keys(), ...stagesB.keys()]);

  const stageDiffs: RunComparison['stageDiffs'] = [];
  let newFindings = 0;
  let resolvedFindings = 0;

  for (const stage of allStages) {
    const a = stagesA.get(stage);
    const b = stagesB.get(stage);
    const before = a?.score ?? 0;
    const after = b?.score ?? 0;
    stageDiffs.push({ stage, scoreBefore: before, scoreAfter: after, delta: after - before });
    const aCount = a?.findings.length ?? 0;
    const bCount = b?.findings.length ?? 0;
    if (bCount > aCount) newFindings += bCount - aCount;
    if (aCount > bCount) resolvedFindings += aCount - bCount;
  }

  const overallDelta = runB.overallScore - runA.overallScore;
  const summary = `Score ${runA.overallScore} -> ${runB.overallScore} (${overallDelta > 0 ? '+' : ''}${overallDelta}). New: ${newFindings}, Resolved: ${resolvedFindings}.`;

  return { overallDelta, stageDiffs, newFindings, resolvedFindings, summary };
}

// IDENTITY_SEAL: PART-6 | role=Compare | inputs=runA,runB | outputs=RunComparison

// ============================================================
// PART 7 — Beacon (Telemetry) & Entropy
// ============================================================

export interface BeaconEvent {
  type: 'pipeline_run' | 'fix_applied' | 'review_complete';
  timestamp: number;
  data: Record<string, unknown>;
}

const BEACON_KEY = 'eh-pipeline-beacon';

export function recordBeacon(event: BeaconEvent): void {
  try {
    const raw = localStorage.getItem(BEACON_KEY);
    const events: BeaconEvent[] = raw ? JSON.parse(raw) : [];
    events.push(event);
    localStorage.setItem(BEACON_KEY, JSON.stringify(events.slice(-100)));
  } catch { /* noop */ }
}

export function getBeaconHistory(): BeaconEvent[] {
  try {
    const raw = localStorage.getItem(BEACON_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function computeEntropy(code: string): number {
  const lines = code.split('\n');
  if (lines.length === 0) return 0;
  let info = 0, comment = 0, empty = 0;
  for (const l of lines) {
    const t = l.trim();
    if (!t) { empty++; continue; }
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) { comment++; }
    else { info++; }
  }
  const total = lines.length;
  const density = info / total;
  const commentRatio = comment / (total || 1);
  const paddingRatio = empty / (total || 1);
  return Math.max(0, Math.min(100, Math.round(
    density * 70 + Math.min(commentRatio, 0.2) * 100 + (1 - paddingRatio) * 30 - Math.max(0, commentRatio - 0.3) * 50,
  )));
}

// IDENTITY_SEAL: PART-7 | role=Telemetry | inputs=events | outputs=BeaconEvent[]
