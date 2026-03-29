// ============================================================
// Code Studio — App Runtime Monitoring
// ============================================================

/* ── Types ── */

export interface ErrorEvent {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  severity: 'fatal' | 'error' | 'warning';
}

export interface PerfMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  ttfb: number | null;
  memoryUsed: number | null;
}

export interface MonitoringConfig {
  errorTracking: boolean;
  performance: boolean;
  analytics: boolean;
}

/* ── Helpers ── */

let _counter = 0;
function uid(): string {
  return `err_${Date.now()}_${++_counter}`;
}

/* ── Snippet Generation ── */

export function generateMonitoringSnippet(config: MonitoringConfig): string {
  const parts: string[] = [];
  parts.push(`<script>\n(function(){\n  'use strict';\n  var __m={errors:[],events:[],perf:{}};`);

  if (config.errorTracking) {
    parts.push(`\n  window.addEventListener('error',function(e){__m.errors.push({ts:Date.now(),msg:e.message,file:e.filename,line:e.lineno,col:e.colno});});`);
    parts.push(`\n  window.addEventListener('unhandledrejection',function(e){__m.errors.push({ts:Date.now(),msg:String(e.reason),type:'promise'});});`);
  }

  if (config.performance) {
    parts.push(`\n  if(window.PerformanceObserver){`);
    parts.push(`\n    new PerformanceObserver(function(l){l.getEntries().forEach(function(e){__m.perf[e.entryType]=e;});}).observe({type:'largest-contentful-paint',buffered:true});`);
    parts.push(`\n  }`);
  }

  if (config.analytics) {
    parts.push(`\n  window.__track=function(n,p){__m.events.push({name:n,props:p||{},ts:Date.now()});};`);
  }

  parts.push(`\n  window.__monitor=__m;\n})();\n</script>`);
  return parts.join('');
}

/* ── In-IDE Error Collector ── */

const errorLog: ErrorEvent[] = [];
const MAX_LOG = 200;

export function captureError(
  message: string,
  severity: ErrorEvent['severity'] = 'error',
  extra?: Partial<ErrorEvent>,
): ErrorEvent {
  const evt: ErrorEvent = {
    id: uid(),
    timestamp: Date.now(),
    message,
    severity,
    ...extra,
  };
  errorLog.push(evt);
  if (errorLog.length > MAX_LOG) errorLog.shift();
  return evt;
}

export function getErrors(): ErrorEvent[] {
  return [...errorLog];
}

export function clearErrors(): void {
  errorLog.length = 0;
}

/* ── Performance snapshot ── */

export function collectPerfMetrics(): PerfMetrics {
  if (typeof window === 'undefined' || !window.performance) {
    return { fcp: null, lcp: null, cls: null, ttfb: null, memoryUsed: null };
  }

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const paint = performance.getEntriesByType('paint');
  const fcp = paint.find((e) => e.name === 'first-contentful-paint')?.startTime ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (performance as any).memory;

  return {
    fcp,
    lcp: null, // requires PerformanceObserver
    cls: null,
    ttfb: nav ? nav.responseStart - nav.requestStart : null,
    memoryUsed: mem ? mem.usedJSHeapSize : null,
  };
}

// IDENTITY_SEAL: role=AppMonitoring | inputs=MonitoringConfig | outputs=ErrorEvent[],PerfMetrics,snippet
