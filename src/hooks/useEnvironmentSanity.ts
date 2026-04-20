// ============================================================
// useEnvironmentSanity — M7 boot-time env probe subscription
// ============================================================
// Runs checkEnvironmentAtBoot() once on mount and exposes the report so
// UI can surface a degraded-mode banner (optional). All probe work is
// awaited inside the effect — returning {status: 'unknown'} until ready.

import { useEffect, useState } from 'react';
import {
  checkEnvironmentAtBoot,
  type EnvironmentReport,
  type EnvironmentStatus,
} from '@/lib/env-sanity';

export interface UseEnvironmentSanityResult {
  status: EnvironmentStatus;
  missing: string[];
  warnings: string[];
  /** Full report (null until check completes) */
  report: EnvironmentReport | null;
}

/**
 * Runs environment-sanity checks once on mount. Returns a live snapshot.
 *
 * The boot check also emits `noa:environment-degraded` — consumers who only
 * need to react to degraded state can skip this hook and listen for the
 * event directly.
 */
export function useEnvironmentSanity(): UseEnvironmentSanityResult {
  const [report, setReport] = useState<EnvironmentReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkEnvironmentAtBoot()
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch(() => {
        if (!cancelled) {
          setReport({ status: 'unknown', missing: [], warnings: ['check threw'], checkedAt: Date.now() });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    status: report?.status ?? 'unknown',
    missing: report?.missing ?? [],
    warnings: report?.warnings ?? [],
    report,
  };
}

// IDENTITY_SEAL: hook | role=env-sanity-subscription | inputs=boot | outputs={status,missing,warnings,report}
