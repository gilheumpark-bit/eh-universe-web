// ============================================================
// twentyone-modules/severity-router.ts
// — Compliance 16-axis hook result router.
//
// Routes 16-hook outputs into 4 severity tiers:
//   blocker  — red modal, immediate (e.g. M2 hard-locked ending violated)
//   warning  — yellow toast, once per session (e.g. M8 honorific inconsistency)
//   info     — gray dashboard counter, batched (max once / hour)
//   trace    — Authorship Journal metadata only, no UI surface
//
// Goal: prevent alert fatigue. The 7→16 axis expansion otherwise doubles
// noise. Severity grouping keeps actively-shown alerts constant.
//
// Dispatches `noa:compliance-result` CustomEvent for UI listeners.
//
// [C] No side effects on input objects.
// [G] In-memory batch buffer for info-level (flushed per hour).
// [K] Pure functions where possible — only batchInfo() holds state.
// ============================================================

export type Severity = 'blocker' | 'warning' | 'info' | 'trace';

export interface ComplianceFinding {
  /** Hook ID — e.g. 'ending-match-check', 'honorific-consistency'. */
  hook_id: string;
  /** Module that generated this finding. */
  module_id: string;
  severity: Severity;
  message: string;
  /** Optional structured evidence — preserved in Authorship Journal. */
  evidence?: Record<string, unknown>;
  /** Suggested fix for the user. */
  suggested_fix?: string;
  /** Episode reference, if applicable. */
  episode?: number;
}

export interface SeverityGroupResult {
  /** Blocker — must be resolved before continuing (modal-blocking). */
  blocker: ComplianceFinding[];
  /** Warning — shown as a toast, once per session per hook_id. */
  warning: ComplianceFinding[];
  /** Info — batched, shown as dashboard count only. */
  info: ComplianceFinding[];
  /** Trace — kept for Authorship Journal metadata, no UI. */
  trace: ComplianceFinding[];
}

// ============================================================
// PART 1 — Grouping (pure)
// ============================================================

/** Group findings by severity. Order preserved within each tier. */
export function groupBySeverity(findings: readonly ComplianceFinding[]): SeverityGroupResult {
  const result: SeverityGroupResult = { blocker: [], warning: [], info: [], trace: [] };
  for (const f of findings) {
    result[f.severity].push(f);
  }
  return result;
}

// ============================================================
// PART 2 — Session deduplication (warning level)
// ============================================================

const warnedHooks = new Set<string>();

/** Has this hook already shown a warning this session? */
export function hasWarnedThisSession(hookId: string): boolean {
  return warnedHooks.has(hookId);
}

/** Mark a hook as warned-this-session. */
export function markWarned(hookId: string): void {
  warnedHooks.add(hookId);
}

/** Clear session dedup — used when project switches or user explicitly resets. */
export function clearWarningDedup(): void {
  warnedHooks.clear();
}

// ============================================================
// PART 3 — Info-level batching (1 / hour throttle)
// ============================================================

let infoBuffer: ComplianceFinding[] = [];
let lastInfoFlush = 0;
const INFO_FLUSH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Add an info-level finding to the batch buffer.
 * Returns the batch to flush if the throttle window has elapsed; else null.
 */
export function batchInfo(finding: ComplianceFinding): ComplianceFinding[] | null {
  infoBuffer.push(finding);
  const now = Date.now();
  if (now - lastInfoFlush < INFO_FLUSH_INTERVAL_MS) {
    return null;
  }
  const out = infoBuffer;
  infoBuffer = [];
  lastInfoFlush = now;
  return out;
}

/** Current buffered info count (for dashboard display). */
export function infoBufferSize(): number {
  return infoBuffer.length;
}

/** Reset info batch (used for test cleanup or session reset). */
export function resetInfoBatch(): void {
  infoBuffer = [];
  lastInfoFlush = 0;
}

// ============================================================
// PART 4 — Event dispatch (UI integration)
// ============================================================

const EVENT_NAME = 'noa:compliance-result';

/**
 * Dispatch findings via CustomEvent. UI components (Toast, dashboard) subscribe.
 * Applies dedup (warning) and batching (info) automatically.
 */
export function dispatchFindings(findings: readonly ComplianceFinding[]): void {
  if (typeof window === 'undefined') return;
  const groups = groupBySeverity(findings);

  // Blocker — dispatch all immediately
  if (groups.blocker.length > 0) {
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: { severity: 'blocker' as Severity, findings: groups.blocker },
        }),
      );
    } catch {
      /* silent */
    }
  }

  // Warning — dispatch each only if not seen this session
  for (const f of groups.warning) {
    if (hasWarnedThisSession(f.hook_id)) continue;
    markWarned(f.hook_id);
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: { severity: 'warning' as Severity, findings: [f] },
        }),
      );
    } catch {
      /* silent */
    }
  }

  // Info — batched, only flush if window elapsed
  for (const f of groups.info) {
    const batch = batchInfo(f);
    if (batch && batch.length > 0) {
      try {
        window.dispatchEvent(
          new CustomEvent(EVENT_NAME, {
            detail: { severity: 'info' as Severity, findings: batch },
          }),
        );
      } catch {
        /* silent */
      }
    }
  }

  // Trace — no UI dispatch; stays in Authorship Journal metadata
}
