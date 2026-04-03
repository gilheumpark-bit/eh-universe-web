// ============================================================
// Code Studio — Virtual Stress Simulation (가상 스트레스 시뮬레이션)
// ============================================================

import { streamChat } from '@/lib/ai-providers';

// ============================================================
// PART 1 — Types
// ============================================================

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  type: 'load' | 'spike' | 'soak' | 'breakpoint';
  virtualUsers: number;
  durationSec: number;
  rampUpSec: number;
}

export interface StressResult {
  scenario: StressScenario;
  metrics: {
    avgResponseMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    maxResponseMs: number;
    errorRate: number;
    throughputRps: number;
    totalRequests: number;
    failedRequests: number;
  };
  breakingPoint?: {
    virtualUsers: number;
    errorRate: number;
    avgResponseMs: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface StressReport {
  scenarios: StressResult[];
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=StressScenario,StressResult,StressReport

// ============================================================
// PART 2 — Scenario Templates
// ============================================================

const DEFAULT_SCENARIOS: StressScenario[] = [
  { id: 'load-normal', name: 'Normal Load', description: 'Steady 100 users', type: 'load', virtualUsers: 100, durationSec: 60, rampUpSec: 10 },
  { id: 'load-heavy', name: 'Heavy Load', description: '500 concurrent users', type: 'load', virtualUsers: 500, durationSec: 120, rampUpSec: 30 },
  { id: 'spike-burst', name: 'Spike Test', description: '0 to 1000 users instantly', type: 'spike', virtualUsers: 1000, durationSec: 30, rampUpSec: 0 },
  { id: 'soak-24h', name: 'Soak Test', description: '200 users for extended period', type: 'soak', virtualUsers: 200, durationSec: 3600, rampUpSec: 60 },
  { id: 'breakpoint', name: 'Breakpoint', description: 'Increase until failure', type: 'breakpoint', virtualUsers: 2000, durationSec: 180, rampUpSec: 180 },
];

export function getScenarios(): StressScenario[] {
  return [...DEFAULT_SCENARIOS];
}

// IDENTITY_SEAL: PART-2 | role=scenarios | inputs=none | outputs=StressScenario[]

// ============================================================
// PART 3 — AI Stress Analysis
// ============================================================

// 가상 시뮬레이션: AI가 코드 구조를 분석하여 부하 시나리오를 시뮬레이션합니다.
// 실제 HTTP 요청을 발생시키지 않습니다. 브라우저 IDE 환경의 구조적 한계.
const STRESS_SYSTEM =
  'You are a senior performance engineer. Run a VIRTUAL SIMULATION: analyze the code structure and simulate how it would behave under load.\n\n' +
  'Analyze these specific patterns:\n' +
  '1. O(n²)+ algorithms, nested loops, recursive calls without memoization\n' +
  '2. Unbatched DB/API calls (N+1 queries), missing connection pooling\n' +
  '3. Memory: unbounded caches, event listener leaks, large object retention\n' +
  '4. Concurrency: missing rate limiting, no backpressure, race conditions\n' +
  '5. I/O: synchronous file ops, missing stream processing, large payloads\n' +
  '6. Error handling: missing timeouts, no circuit breakers, cascade failure paths\n\n' +
  'Base your simulation on these structural patterns, NOT on guessing. If the code has no server logic, say so.\n\n' +
  'Respond with JSON: {"avgResponseMs":50,"p50Ms":40,"p95Ms":200,"p99Ms":500,"maxResponseMs":1500,"errorRate":0.02,"throughputRps":500,"totalRequests":30000,"failedRequests":600,"breakingPoint":{"virtualUsers":800,"errorRate":0.15,"avgResponseMs":2000},"recommendations":["..."]}';

export async function analyzeStress(
  code: string,
  fileName: string,
  scenario: StressScenario,
  signal?: AbortSignal,
): Promise<StressResult> {
  let raw = '';
  await streamChat({
    systemInstruction: STRESS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `File: ${fileName} (${code.split('\n').length} lines)\nScenario: ${scenario.name} — ${scenario.description}\nVirtual Users: ${scenario.virtualUsers}, Duration: ${scenario.durationSec}s, Ramp-up: ${scenario.rampUpSec}s\n\nAnalyze for performance bottlenecks:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\``,
      },
    ],
    onChunk: (t) => { raw += t; },
    signal,
  });

  try {
    const p = JSON.parse(raw.trim());
    const errorRate = p.errorRate ?? 0;
    const avgMs = p.avgResponseMs ?? 100;
    const grade: StressResult['grade'] =
      errorRate < 0.01 && avgMs < 100 ? 'A' :
      errorRate < 0.05 && avgMs < 300 ? 'B' :
      errorRate < 0.1 && avgMs < 1000 ? 'C' :
      errorRate < 0.2 ? 'D' : 'F';

    return {
      scenario,
      metrics: {
        avgResponseMs: avgMs,
        p50Ms: p.p50Ms ?? avgMs * 0.8,
        p95Ms: p.p95Ms ?? avgMs * 3,
        p99Ms: p.p99Ms ?? avgMs * 5,
        maxResponseMs: p.maxResponseMs ?? avgMs * 10,
        errorRate,
        throughputRps: p.throughputRps ?? 100,
        totalRequests: p.totalRequests ?? scenario.virtualUsers * scenario.durationSec,
        failedRequests: p.failedRequests ?? 0,
      },
      breakingPoint: p.breakingPoint,
      grade,
      recommendations: p.recommendations ?? [],
    };
  } catch {
    return {
      scenario,
      metrics: { avgResponseMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxResponseMs: 0, errorRate: 0, throughputRps: 0, totalRequests: 0, failedRequests: 0 },
      grade: 'F',
      recommendations: ['Analysis failed — manual testing recommended'],
    };
  }
}

export async function runStressReport(
  code: string,
  fileName: string,
  scenarios?: StressScenario[],
  signal?: AbortSignal,
): Promise<StressReport> {
  const selected = scenarios ?? DEFAULT_SCENARIOS;
  const results: StressResult[] = [];

  for (const sc of selected) {
    if (signal?.aborted) break;
    results.push(await analyzeStress(code, fileName, sc, signal));
  }

  const scores = results.map((r) => r.grade === 'A' ? 100 : r.grade === 'B' ? 80 : r.grade === 'C' ? 60 : r.grade === 'D' ? 40 : 20);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1));
  const grade: StressReport['grade'] =
    overallScore >= 80 ? 'A' : overallScore >= 60 ? 'B' : overallScore >= 40 ? 'C' : overallScore >= 20 ? 'D' : 'F';

  return {
    scenarios: results,
    overallScore,
    grade,
    summary: `Stress report: ${overallScore}/100 (${grade}). ${results.length} scenarios analyzed.`,
  };
}

// IDENTITY_SEAL: PART-3 | role=analysis | inputs=code,scenario | outputs=StressResult,StressReport
