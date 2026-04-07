// ============================================================
// Code Studio — Virtual Chaos Simulation (가상 장애 시뮬레이션)
// ============================================================

import { streamChat } from '../_stubs/ai-providers';

// ============================================================
// PART 1 — Types
// ============================================================

export type FailureScenario =
  | 'db-down'
  | 'api-timeout'
  | 'memory-leak'
  | 'disk-full'
  | 'network-partition'
  | 'high-load'
  | 'null-data'
  | 'auth-expired'
  | 'race-condition'
  | 'cascade-failure'
  | 'config-corruption'
  | 'data-corruption';

export interface FailureSimulation {
  scenario: FailureScenario;
  label: string;
  description: string;
  injectionPoint: string;
  line?: number;
}

export interface SimulationResult {
  scenario: FailureScenario;
  label: string;
  impact: {
    severity: 'catastrophic' | 'major' | 'minor' | 'none';
    description: string;
    affectedComponents: string[];
    dataLoss: boolean;
    recoveryTime: string;
  };
  currentHandling: {
    hasHandler: boolean;
    handlerQuality: 'good' | 'partial' | 'poor' | 'none';
  };
  recommendation: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    pattern: string;
  };
}

export interface ChaosReport {
  overallScore: number;
  simulations: SimulationResult[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SimulationResult,ChaosReport

// ============================================================
// PART 2 — Scenario Registry
// ============================================================

const SCENARIOS: FailureSimulation[] = [
  { scenario: 'db-down', label: 'Database Down', description: 'Database connection lost', injectionPoint: 'db/api calls' },
  { scenario: 'api-timeout', label: 'API Timeout', description: 'External API takes 30+ seconds', injectionPoint: 'fetch/axios calls' },
  { scenario: 'memory-leak', label: 'Memory Leak', description: 'Unbounded data accumulation', injectionPoint: 'event listeners, caches' },
  { scenario: 'null-data', label: 'Null Data', description: 'API returns null/undefined', injectionPoint: 'response handlers' },
  { scenario: 'auth-expired', label: 'Auth Expired', description: 'Token/session expired mid-use', injectionPoint: 'auth middleware' },
  { scenario: 'network-partition', label: 'Network Split', description: 'Intermittent connectivity', injectionPoint: 'all network calls' },
  { scenario: 'high-load', label: 'High Load', description: '100x normal traffic', injectionPoint: 'request handlers' },
  { scenario: 'race-condition', label: 'Race Condition', description: 'Concurrent state mutations', injectionPoint: 'shared state' },
  { scenario: 'cascade-failure', label: 'Cascade Failure', description: 'One service failure triggers others', injectionPoint: 'service dependencies' },
  { scenario: 'config-corruption', label: 'Config Corrupt', description: 'Env vars missing or invalid', injectionPoint: 'config loading' },
  { scenario: 'data-corruption', label: 'Data Corrupt', description: 'Malformed data in storage', injectionPoint: 'data parsing' },
  { scenario: 'disk-full', label: 'Disk Full', description: 'Storage write failures', injectionPoint: 'file/log writes' },
];

export function getScenarios(): FailureSimulation[] {
  return [...SCENARIOS];
}

// IDENTITY_SEAL: PART-2 | role=registry | inputs=none | outputs=FailureSimulation[]

// ============================================================
// PART 3 — Static Resilience Metrics (실측 복원력 지표)
// ============================================================

interface ResilienceMetrics {
  tryCatchBlocks: number;
  catchWithoutHandler: number;  // catch {} 빈 블록
  fetchWithoutTimeout: number;  // AbortController 없는 fetch
  nullChecks: number;           // ?. ?? 사용 수
  errorBoundaryCount: number;   // ErrorBoundary 패턴
  retryPatterns: number;        // retry/backoff 패턴
  fallbackPatterns: number;     // fallback/default 패턴
  resourceCleanup: number;      // finally/cleanup/dispose 패턴
}

function computeResilienceMetrics(code: string): ResilienceMetrics {
  const tryCatchBlocks = (code.match(/\btry\s*\{/g) ?? []).length;
  const catchWithoutHandler = (code.match(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g) ?? []).length;

  const fetchCount = (code.match(/\bfetch\s*\(/g) ?? []).length;
  const abortCount = (code.match(/AbortController|AbortSignal|signal\s*:/g) ?? []).length;
  const fetchWithoutTimeout = Math.max(0, fetchCount - abortCount);

  const nullChecks = (code.match(/\?\.|\.?\?\?/g) ?? []).length;
  const errorBoundaryCount = (code.match(/ErrorBoundary|componentDidCatch|onError/g) ?? []).length;
  const retryPatterns = (code.match(/retry|backoff|maxRetries|maxAttempts/gi) ?? []).length;
  const fallbackPatterns = (code.match(/fallback|default[A-Z]|placeholder|skeleton/gi) ?? []).length;
  const resourceCleanup = (code.match(/\bfinally\b|cleanup|dispose|removeEventListener|clearTimeout|clearInterval/g) ?? []).length;

  return { tryCatchBlocks, catchWithoutHandler, fetchWithoutTimeout, nullChecks, errorBoundaryCount, retryPatterns, fallbackPatterns, resourceCleanup };
}

function buildResilienceBlock(m: ResilienceMetrics): string {
  const warnings: string[] = [];
  if (m.catchWithoutHandler > 0) warnings.push(`⚠ 빈 catch 블록 ${m.catchWithoutHandler}건 — 에러 삼킴`);
  if (m.fetchWithoutTimeout > 0) warnings.push(`⚠ timeout 없는 fetch ${m.fetchWithoutTimeout}건 — 무한 대기 위험`);
  if (m.retryPatterns === 0 && m.tryCatchBlocks > 0) warnings.push(`⚠ retry/backoff 패턴 0건 — 1회 실패 시 포기`);
  if (m.resourceCleanup === 0) warnings.push(`⚠ 리소스 정리(finally/cleanup) 0건`);

  return [
    `[RESILIENCE METRICS — computed, not guessed]`,
    `try/catch: ${m.tryCatchBlocks} | empty catch: ${m.catchWithoutHandler}`,
    `fetch w/o timeout: ${m.fetchWithoutTimeout} | null guards: ${m.nullChecks}`,
    `ErrorBoundary: ${m.errorBoundaryCount} | retry patterns: ${m.retryPatterns}`,
    `Fallback UI: ${m.fallbackPatterns} | Resource cleanup: ${m.resourceCleanup}`,
    warnings.length > 0 ? `\n[WARNINGS]\n${warnings.join('\n')}` : '',
  ].join('\n');
}

// IDENTITY_SEAL: PART-3 | role=resilience-metrics | inputs=code | outputs=ResilienceMetrics

// ============================================================
// PART 4 — AI Virtual Chaos Simulation (가상 장애 시뮬레이션)
// ============================================================

const CHAOS_SYSTEM =
  'You are a chaos engineering expert. Run a VIRTUAL SIMULATION using the pre-computed resilience metrics AND your own code analysis.\n\n' +
  'IMPORTANT: Resilience metrics below are REAL measurements from the code, not guesses. Use them as ground truth.\n\n' +
  'Your job: combine these hard metrics with structural analysis to simulate failure impact.\n' +
  'Focus on: whether empty catches hide failures, whether unguarded fetches cause cascading timeouts, whether missing cleanup causes resource exhaustion.\n\n' +
  'Respond with JSON: {"severity":"major","description":"...","affectedComponents":["..."],"dataLoss":false,"recoveryTime":"...","hasHandler":false,"handlerQuality":"none","priority":"high","recommendation":"...","pattern":"circuit-breaker"}';

export async function simulateFailure(
  code: string,
  fileName: string,
  scenario: FailureScenario,
  signal?: AbortSignal,
): Promise<SimulationResult> {
  const sim = SCENARIOS.find((s) => s.scenario === scenario) ?? SCENARIOS[0];
  const metrics = computeResilienceMetrics(code);
  const metricsBlock = buildResilienceBlock(metrics);
  let raw = '';

  await streamChat({
    systemInstruction: CHAOS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `File: ${fileName}\nFailure: ${sim.label} — ${sim.description}\nInjection point: ${sim.injectionPoint}\n\n${metricsBlock}\n\nCode:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\``,
      },
    ],
    onChunk: (t) => { raw += t; },
    signal,
  });

  try {
    const p = JSON.parse(raw.trim());
    return {
      scenario,
      label: sim.label,
      impact: {
        severity: p.severity ?? 'minor',
        description: p.description ?? '',
        affectedComponents: p.affectedComponents ?? [],
        dataLoss: p.dataLoss ?? false,
        recoveryTime: p.recoveryTime ?? 'unknown',
      },
      currentHandling: {
        hasHandler: p.hasHandler ?? false,
        handlerQuality: p.handlerQuality ?? 'none',
      },
      recommendation: {
        priority: p.priority ?? 'medium',
        description: p.recommendation ?? '',
        pattern: p.pattern ?? '',
      },
    };
  } catch {
    return {
      scenario,
      label: sim.label,
      impact: { severity: 'minor', description: 'Analysis inconclusive', affectedComponents: [], dataLoss: false, recoveryTime: 'unknown' },
      currentHandling: { hasHandler: false, handlerQuality: 'none' },
      recommendation: { priority: 'medium', description: 'Manual review recommended', pattern: '' },
    };
  }
}

export async function runChaosReport(
  code: string,
  fileName: string,
  scenarios?: FailureScenario[],
  signal?: AbortSignal,
): Promise<ChaosReport> {
  const selected = scenarios ?? SCENARIOS.map((s) => s.scenario);
  const results: SimulationResult[] = [];

  for (const sc of selected) {
    if (signal?.aborted) break;
    results.push(await simulateFailure(code, fileName, sc, signal));
  }

  const handled = results.filter((r) => r.currentHandling.hasHandler).length;
  const score = Math.round((handled / Math.max(results.length, 1)) * 100);
  const grade: ChaosReport['grade'] =
    score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';

  return {
    overallScore: score,
    simulations: results,
    grade,
    summary: `Resilience score: ${score}/100 (${grade}). ${handled}/${results.length} scenarios handled.`,
  };
}

// IDENTITY_SEAL: PART-3 | role=analysis | inputs=code,scenario | outputs=SimulationResult,ChaosReport
