// ============================================================
// Code Studio — Usage Tracking
// ============================================================
// 프로바이더별 API 호출 횟수, 토큰 사용량, 일/월 요약, 비용 추정, localStorage 영속.

import type { ProviderId } from './ai-providers';

// ============================================================
// PART 1 — Types
// ============================================================

export interface UsageRecord {
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
  durationMs: number;
}

export interface UsageSummary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUSD: number;
  byProvider: Record<string, { calls: number; inputTokens: number; outputTokens: number; costUSD: number }>;
}

const STORAGE_KEY = 'eh-cs-usage';
const MAX_RECORDS = 5000;

// Rough cost estimates per 1M tokens (input/output)
const COST_TABLE: Record<string, { input: number; output: number }> = {
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 1, output: 5 },
  'llama-3.3-70b-versatile': { input: 0, output: 0 },
  'mistral-medium-3-latest': { input: 1, output: 3 },
  'mistral-small-latest': { input: 0.2, output: 0.6 },
};

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=UsageRecord,UsageSummary

// ============================================================
// PART 2 — Storage Operations
// ============================================================

function loadRecords(): UsageRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: UsageRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = records.length > MAX_RECORDS ? records.slice(-MAX_RECORDS) : records;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota */ }
}

/** Track a single API call */
export function trackUsage(record: UsageRecord): void {
  const records = loadRecords();
  records.push(record);
  saveRecords(records);
}

/** Convenience: track with auto-timestamp */
export function trackCall(
  provider: ProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
): void {
  trackUsage({ provider, model, inputTokens, outputTokens, timestamp: Date.now(), durationMs });
}

// IDENTITY_SEAL: PART-2 | role=Storage | inputs=UsageRecord | outputs=void

// ============================================================
// PART 3 — Summaries & Cost Estimation
// ============================================================

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_TABLE[model] ?? { input: 1, output: 3 };
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

/** Get usage summary for a time range */
export function getUsageSummary(since?: number, until?: number): UsageSummary {
  const records = loadRecords();
  const start = since ?? 0;
  const end = until ?? Date.now();
  const filtered = records.filter(r => r.timestamp >= start && r.timestamp <= end);

  const summary: UsageSummary = {
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUSD: 0,
    byProvider: {},
  };

  for (const r of filtered) {
    summary.totalCalls++;
    summary.totalInputTokens += r.inputTokens;
    summary.totalOutputTokens += r.outputTokens;
    const cost = estimateCost(r.model, r.inputTokens, r.outputTokens);
    summary.estimatedCostUSD += cost;

    if (!summary.byProvider[r.provider]) {
      summary.byProvider[r.provider] = { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
    }
    const p = summary.byProvider[r.provider];
    p.calls++;
    p.inputTokens += r.inputTokens;
    p.outputTokens += r.outputTokens;
    p.costUSD += cost;
  }

  // Round cost
  summary.estimatedCostUSD = Math.round(summary.estimatedCostUSD * 10000) / 10000;
  for (const p of Object.values(summary.byProvider)) {
    p.costUSD = Math.round(p.costUSD * 10000) / 10000;
  }

  return summary;
}

/** Get today's usage */
export function getTodayUsage(): UsageSummary {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return getUsageSummary(startOfDay.getTime());
}

/** Get this month's usage */
export function getMonthUsage(): UsageSummary {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return getUsageSummary(startOfMonth.getTime());
}

/** Clear all usage data */
export function clearUsageData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// IDENTITY_SEAL: PART-3 | role=SummariesCost | inputs=since,until | outputs=UsageSummary
