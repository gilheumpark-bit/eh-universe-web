/**
 * Runtime Metrics — lightweight RED counters for alpha/beta operations.
 *
 * 단일 Node 프로세스 메모리 집계다. 멀티 인스턴스 합산은 Prometheus/OTel 단계에서
 * 처리하고, 이 모듈은 로컬·알파 운영에서 "지금 무슨 API가 느린지"를 보이게 한다.
 */

export interface ApiMetricInput {
  readonly route: string;
  readonly event?: string;
  readonly status?: number;
  readonly durationMs?: number;
}

export interface WebVitalMetricInput {
  readonly name: unknown;
  readonly value: unknown;
  readonly rating?: unknown;
}

export interface ApiMetricSnapshotRow {
  readonly route: string;
  readonly event: string;
  readonly status: string;
  readonly count: number;
  readonly durationCount: number;
  readonly durationSumMs: number;
  readonly durationP95Ms: number;
}

export interface WebVitalMetricSnapshotRow {
  readonly name: string;
  readonly rating: string;
  readonly count: number;
  readonly valueCount: number;
  readonly valueSum: number;
  readonly valueP75: number;
}

export interface RuntimeMetricsSnapshot {
  readonly api: readonly ApiMetricSnapshotRow[];
  readonly webVitals: readonly WebVitalMetricSnapshotRow[];
}

interface MutableMetricRow {
  route: string;
  event: string;
  status: string;
  count: number;
  durationCount: number;
  durationSumMs: number;
  durations: number[];
}

interface MutableWebVitalRow {
  name: string;
  rating: string;
  count: number;
  valueCount: number;
  valueSum: number;
  values: number[];
}

const MAX_LABEL_LENGTH = 96;
const MAX_DURATION_SAMPLES = 240;
const apiMetrics = new Map<string, MutableMetricRow>();
const webVitalMetrics = new Map<string, MutableWebVitalRow>();

function sanitizeLabel(value: unknown, fallback: string): string {
  const source = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return source
    .replace(/["\\\n\r]/g, '_')
    .replace(/[^\p{L}\p{N}./:_-]+/gu, '_')
    .slice(0, MAX_LABEL_LENGTH) || fallback;
}

function statusLabel(status: unknown): string {
  return typeof status === 'number' && Number.isFinite(status) ? String(status) : 'unknown';
}

function metricKey(route: string, event: string, status: string): string {
  return `${route}\u001f${event}\u001f${status}`;
}

function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const bounded = Math.min(1, Math.max(0, quantile));
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * bounded) - 1);
  return Math.round(sorted[index]);
}

export function recordApiMetric(input: ApiMetricInput): void {
  const route = sanitizeLabel(input.route, 'unknown');
  const event = sanitizeLabel(input.event, 'api_request');
  const status = statusLabel(input.status);
  const key = metricKey(route, event, status);
  const row = apiMetrics.get(key) ?? {
    route,
    event,
    status,
    count: 0,
    durationCount: 0,
    durationSumMs: 0,
    durations: [],
  };
  row.count += 1;
  if (typeof input.durationMs === 'number' && Number.isFinite(input.durationMs) && input.durationMs >= 0) {
    const duration = Math.round(input.durationMs);
    row.durationCount += 1;
    row.durationSumMs += duration;
    row.durations.push(duration);
    if (row.durations.length > MAX_DURATION_SAMPLES) {
      row.durations.splice(0, row.durations.length - MAX_DURATION_SAMPLES);
    }
  }
  apiMetrics.set(key, row);
}

export function recordWebVitalMetric(input: WebVitalMetricInput): void {
  const name = sanitizeLabel(input.name, 'unknown');
  const rating = sanitizeLabel(input.rating, 'unknown');
  const key = `${name}\u001f${rating}`;
  const row = webVitalMetrics.get(key) ?? {
    name,
    rating,
    count: 0,
    valueCount: 0,
    valueSum: 0,
    values: [],
  };
  row.count += 1;
  if (typeof input.value === 'number' && Number.isFinite(input.value) && input.value >= 0) {
    const value = Math.round(input.value);
    row.valueCount += 1;
    row.valueSum += value;
    row.values.push(value);
    if (row.values.length > MAX_DURATION_SAMPLES) {
      row.values.splice(0, row.values.length - MAX_DURATION_SAMPLES);
    }
  }
  webVitalMetrics.set(key, row);
}

export function snapshotRuntimeMetrics(): RuntimeMetricsSnapshot {
  return {
    api: [...apiMetrics.values()]
      .map((row) => ({
        route: row.route,
        event: row.event,
        status: row.status,
        count: row.count,
        durationCount: row.durationCount,
        durationSumMs: row.durationSumMs,
        durationP95Ms: percentile(row.durations, 0.95),
      }))
      .sort((left, right) => left.route.localeCompare(right.route) || left.status.localeCompare(right.status)),
    webVitals: [...webVitalMetrics.values()]
      .map((row) => ({
        name: row.name,
        rating: row.rating,
        count: row.count,
        valueCount: row.valueCount,
        valueSum: row.valueSum,
        valueP75: percentile(row.values, 0.75),
      }))
      .sort((left, right) => left.name.localeCompare(right.name) || left.rating.localeCompare(right.rating)),
  };
}

export function resetRuntimeMetricsForTest(): void {
  apiMetrics.clear();
  webVitalMetrics.clear();
}

