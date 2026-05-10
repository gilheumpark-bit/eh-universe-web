// ============================================================
// orchestrator.ts — Completion Gap 종합 보고서 빌더.
// ============================================================

import type { Message } from '@/lib/studio-types';
import type { CompletionGapReport, GapSeverity } from './types';
import { extractCompletionClaims } from './claim-extractor';
import { verifyClaim } from './grep-verifier';

export interface OrchestratorOptions {
  /** 직전 N assistant turn 만 검사 (default 10) */
  recentN?: number;
}

export function buildCompletionGapReport(
  messages: Message[] | null | undefined,
  options: OrchestratorOptions = {},
): CompletionGapReport {
  const start = Date.now();
  const recentN = options.recentN ?? 10;

  if (!messages || messages.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      totalClaims: 0,
      passedClaims: 0,
      failedClaims: 0,
      warnedClaims: 0,
      verifications: [],
      durationMs: Date.now() - start,
    };
  }

  const claims = extractCompletionClaims(messages, recentN);
  const fullText = messages
    .filter((m) => m.role === 'assistant')
    .slice(-recentN)
    .map((m) => m.content ?? '')
    .join('\n\n');

  const verifications = claims.map((c) => verifyClaim(c, fullText));

  const counts: Record<GapSeverity, number> = { pass: 0, warn: 0, fail: 0 };
  for (const v of verifications) {
    counts[v.overallSeverity]++;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalClaims: verifications.length,
    passedClaims: counts.pass,
    failedClaims: counts.fail,
    warnedClaims: counts.warn,
    verifications,
    durationMs: Date.now() - start,
  };
}
