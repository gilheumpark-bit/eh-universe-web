// ============================================================
// error-reporter — Lightweight client-side error tracking
// Sends unhandled errors to /api/error-report (Vercel logs capture)
// No external service required.
// ============================================================

const MAX_REPORTS_PER_SESSION = 20;
let reportCount = 0;

interface ErrorReport {
  message: string;
  stack?: string;
  source?: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

function sendReport(report: ErrorReport) {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  reportCount++;

  // navigator.sendBeacon ensures delivery even on page unload
  const payload = JSON.stringify(report);
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/error-report', payload);
  } else {
    fetch('/api/error-report', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => { /* delivery best-effort */ });
  }
}

let _initialized = false;

/** Returns a cleanup function to remove listeners. Guards against duplicate init. */
export function initErrorReporter(): (() => void) | undefined {
  if (typeof window === 'undefined' || _initialized) return;
  _initialized = true;

  // Global unhandled errors
  const onError = (event: ErrorEvent) => {
    sendReport({
      message: event.message || 'Unknown error',
      stack: event.error?.stack?.slice(0, 500),
      source: `${event.filename}:${event.lineno}:${event.colno}`,
      url: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 100),
      timestamp: new Date().toISOString(),
    });
  };

  // Unhandled promise rejections
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    sendReport({
      message: reason?.message || String(reason).slice(0, 200),
      stack: reason?.stack?.slice(0, 500),
      source: 'unhandledrejection',
      url: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 100),
      timestamp: new Date().toISOString(),
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    _initialized = false;
  };
}

// IDENTITY_SEAL: PART-1 | role=client-error-reporter | inputs=window errors | outputs=POST /api/error-report
