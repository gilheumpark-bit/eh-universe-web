// ============================================================
// Code Studio — Chaos Engineering / Failure Simulation
// ============================================================

import { streamChat } from '@/lib/ai-providers';

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
// PART 3 — AI Chaos Analysis
// ============================================================

// NOTE: This is an AI-PREDICTED failure analysis, not actual fault injection.
// Browser IDE cannot inject real faults (kill DB, partition network).
// AI analyzes code structure to predict resilience gaps.
const CHAOS_SYSTEM =
  'You are a chaos engineering expert. Analyze code STRUCTURE for resilience gaps.\n\n' +
  'Check these specific patterns:\n' +
  '1. try/catch coverage: are all external calls (fetch, DB, file I/O) wrapped?\n' +
  '2. Timeout handling: do fetch/API calls have explicit timeouts?\n' +
  '3. Retry logic: is there exponential backoff? Or naive infinite retry?\n' +
  '4. Circuit breaker: does repeated failure trigger a cooldown?\n' +
  '5. Graceful degradation: does the UI show fallback when backend fails?\n' +
  '6. Data validation: are null/undefined/malformed inputs guarded?\n' +
  '7. State cleanup: do error paths clean up resources (connections, listeners)?\n\n' +
  'Base answers on ACTUAL code patterns found, not assumptions.\n\n' +
  'Respond with JSON: {"severity":"major","description":"...","affectedComponents":["..."],"dataLoss":false,"recoveryTime":"...","hasHandler":false,"handlerQuality":"none","priority":"high","recommendation":"...","pattern":"circuit-breaker"}';

export async function simulateFailure(
  code: string,
  fileName: string,
  scenario: FailureScenario,
  signal?: AbortSignal,
): Promise<SimulationResult> {
  const sim = SCENARIOS.find((s) => s.scenario === scenario) ?? SCENARIOS[0];
  let raw = '';

  await streamChat({
    systemInstruction: CHAOS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `File: ${fileName} (${code.split('\n').length} lines)\nFailure: ${sim.label} — ${sim.description}\nInjection point: ${sim.injectionPoint}\n\nAnalyze resilience:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\``,
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
