// ============================================================
// api-logger — Structured JSON logging for API routes
// Vercel captures stdout as structured logs automatically.
// ============================================================

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  route: string;
  ip?: string;
  provider?: string;
  model?: string;
  requestId?: string;
  durationMs?: number;
  status?: number;
  error?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export function apiLog(entry: Omit<LogEntry, 'timestamp'>): void {
  const log: LogEntry = { ...entry, timestamp: new Date().toISOString() };
  if (entry.level === 'error') {
    console.error(JSON.stringify(log));
  } else {
    console.log(JSON.stringify(log));
  }
}

export function createRequestTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}

// IDENTITY_SEAL: PART-1 | role=structured-logging | inputs=log entries | outputs=JSON to stdout
