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
// PART 3 — Static Pre-Computation (실측 메트릭)
// ============================================================
// AI에게 넘기기 전에 코드에서 직접 계산 가능한 지표를 먼저 뽑는다.
// 이 숫자들은 추측이 아니라 실제 코드 기반 정적 계산값이다.

interface StaticMetrics {
  totalLines: number;
  functionCount: number;
  nestedLoopDepth: number;        // 최대 루프 중첩 깊이
  asyncWithoutTryCatch: number;   // try 없는 await 수
  fetchCallCount: number;         // fetch/axios 호출 수
  setTimeoutCount: number;        // setTimeout/setInterval 수
  eventListenerCount: number;     // addEventListener 수 (메모리 릭 위험)
  consoleLogCount: number;        // console.log 수 (성능 영향)
  recursiveFunctionCount: number; // 자기 호출 함수 수
  largeObjectLiteral: number;     // 100자+ 객체 리터럴 수
  cyclomaticEstimate: number;     // if/else/switch/ternary 분기 수 (복잡도 근사)
}

function computeStaticMetrics(code: string): StaticMetrics {
  const lines = code.split('\n');
  const totalLines = lines.length;

  // 함수 수
  const functionCount = (code.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>|(?:async\s+)?(?:get|set|static\s+)?\w+\s*\([^)]*\)\s*\{)/g) ?? []).length;

  // 중첩 루프 깊이
  let maxLoopDepth = 0;
  let currentLoopDepth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\s*(?:for\s*\(|while\s*\(|do\s*\{|\.forEach\(|\.map\(|\.reduce\()/.test(trimmed)) {
      currentLoopDepth++;
      if (currentLoopDepth > maxLoopDepth) maxLoopDepth = currentLoopDepth;
    }
    if (trimmed.includes('}') && currentLoopDepth > 0) currentLoopDepth--;
  }

  // async/await without try-catch (간이 탐지)
  let asyncWithoutTryCatch = 0;
  let inTry = 0;
  for (const line of lines) {
    if (line.includes('try')) inTry++;
    if (line.includes('}') && inTry > 0) inTry--;
    if (/\bawait\b/.test(line) && inTry === 0) asyncWithoutTryCatch++;
  }

  const fetchCallCount = (code.match(/\bfetch\s*\(|axios\.|\.get\s*\(|\.post\s*\(/g) ?? []).length;
  const setTimeoutCount = (code.match(/\bsetTimeout\b|\bsetInterval\b/g) ?? []).length;
  const eventListenerCount = (code.match(/addEventListener|\.on\s*\(/g) ?? []).length;
  const consoleLogCount = (code.match(/console\.\w+\s*\(/g) ?? []).length;

  // 재귀 함수 (간이 탐지: 함수 이름이 본문에서 자기 자신 호출)
  const fnNames = (code.match(/function\s+(\w+)/g) ?? []).map(m => m.replace('function ', ''));
  let recursiveFunctionCount = 0;
  for (const name of fnNames) {
    const bodyMatch = new RegExp(`function\\s+${name}[^}]*\\{([\\s\\S]*?)\\n\\}`, 'm').exec(code);
    if (bodyMatch && bodyMatch[1].includes(name + '(')) recursiveFunctionCount++;
  }

  const largeObjectLiteral = (code.match(/\{[^}]{100,}\}/g) ?? []).length;
  const cyclomaticEstimate = (code.match(/\bif\b|\belse\b|\bswitch\b|\bcase\b|\b\?\s*[^:]/g) ?? []).length;

  return {
    totalLines, functionCount, nestedLoopDepth: maxLoopDepth,
    asyncWithoutTryCatch, fetchCallCount, setTimeoutCount,
    eventListenerCount, consoleLogCount, recursiveFunctionCount,
    largeObjectLiteral, cyclomaticEstimate,
  };
}

// IDENTITY_SEAL: PART-3 | role=static-metrics | inputs=code | outputs=StaticMetrics

// ============================================================
// PART 4 — AI Virtual Simulation (가상 시뮬레이션)
// ============================================================
// 정적 메트릭(실측) + AI 구조 분석(추론) = 하이브리드 시뮬레이션

const STRESS_SYSTEM =
  'You are a senior performance engineer. Run a VIRTUAL SIMULATION using the pre-computed static metrics AND your own code analysis.\n\n' +
  'IMPORTANT: Static metrics below are REAL measurements from the code, not guesses. Use them as ground truth.\n\n' +
  'Your job: combine these hard metrics with structural analysis to simulate load behavior.\n' +
  'Focus on: how nested loops scale with users, whether unguarded awaits cause cascading timeouts, whether event listeners leak under sustained load.\n\n' +
  'Respond with JSON: {"avgResponseMs":50,"p50Ms":40,"p95Ms":200,"p99Ms":500,"maxResponseMs":1500,"errorRate":0.02,"throughputRps":500,"totalRequests":30000,"failedRequests":600,"breakingPoint":{"virtualUsers":800,"errorRate":0.15,"avgResponseMs":2000},"recommendations":["..."]}';

function buildMetricsBlock(m: StaticMetrics): string {
  const warnings: string[] = [];
  if (m.nestedLoopDepth >= 2) warnings.push(`⚠ O(n^${m.nestedLoopDepth}) 중첩 루프 탐지`);
  if (m.asyncWithoutTryCatch > 0) warnings.push(`⚠ try-catch 없는 await ${m.asyncWithoutTryCatch}건`);
  if (m.eventListenerCount > 3) warnings.push(`⚠ addEventListener ${m.eventListenerCount}건 — 메모리 릭 위험`);
  if (m.recursiveFunctionCount > 0) warnings.push(`⚠ 재귀 함수 ${m.recursiveFunctionCount}건 — 스택 오버플로우 위험`);
  if (m.cyclomaticEstimate > 20) warnings.push(`⚠ 분기 복잡도 ${m.cyclomaticEstimate} — 고복잡도`);

  return [
    `[STATIC METRICS — computed, not guessed]`,
    `Lines: ${m.totalLines} | Functions: ${m.functionCount}`,
    `Loop depth: ${m.nestedLoopDepth} | Cyclomatic: ${m.cyclomaticEstimate}`,
    `Fetch calls: ${m.fetchCallCount} | Async unguarded: ${m.asyncWithoutTryCatch}`,
    `Event listeners: ${m.eventListenerCount} | Timers: ${m.setTimeoutCount}`,
    `Recursive: ${m.recursiveFunctionCount} | Console: ${m.consoleLogCount}`,
    `Large objects: ${m.largeObjectLiteral}`,
    warnings.length > 0 ? `\n[WARNINGS]\n${warnings.join('\n')}` : '',
  ].join('\n');
}

export async function analyzeStress(
  code: string,
  fileName: string,
  scenario: StressScenario,
  signal?: AbortSignal,
): Promise<StressResult> {
  const metrics = computeStaticMetrics(code);
  const metricsBlock = buildMetricsBlock(metrics);

  let raw = '';
  await streamChat({
    systemInstruction: STRESS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `File: ${fileName}\nScenario: ${scenario.name} — ${scenario.description}\nVirtual Users: ${scenario.virtualUsers}, Duration: ${scenario.durationSec}s, Ramp-up: ${scenario.rampUpSec}s\n\n${metricsBlock}\n\nCode:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\``,
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
