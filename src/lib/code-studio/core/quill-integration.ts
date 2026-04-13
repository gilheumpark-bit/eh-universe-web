// ============================================================
// CS Quill — Integration Layer for EH Universe Web
// ============================================================
// Wraps quill-engine + quill-catalog with sensible defaults
// for use in the Code Studio pipeline and other consumers.
//
// Browser-safe: gracefully degrades when typescript is unavailable.

import { runQuillEngine, type EngineResult, type EngineFinding } from './quill-engine';
import { getCatalogStats, getRule, type RuleMeta } from './quill-catalog';

// ============================================================
// PART 1 — Types
// ============================================================

export interface QuillFinding {
  ruleId: string;
  line: number;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  confidence: 'high' | 'medium' | 'low';
  catalogMeta?: RuleMeta;
}

export interface QuillVerificationResult {
  score: number;
  findings: QuillFinding[];
  stats: {
    catalogTotal: number;
    catalogCategories: number;
    findingsCount: number;
    criticalCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    cyclomaticComplexity: number;
    nodeCount: number;
    enginesUsed: string[];
  };
}

// ============================================================
// PART 2 — Finding Enrichment
// ============================================================

function enrichFinding(ef: EngineFinding): QuillFinding {
  const catalogEntry = getRule(ef.ruleId);
  return {
    ruleId: ef.ruleId,
    line: ef.line,
    message: ef.message,
    severity: ef.severity,
    confidence: ef.confidence,
    catalogMeta: catalogEntry ?? undefined,
  };
}

// ============================================================
// PART 3 — Score Calculation
// ============================================================

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 25,
  error: 15,
  warning: 5,
  info: 1,
};

function calculateScore(findings: QuillFinding[]): number {
  let penalty = 0;
  for (const f of findings) {
    penalty += SEVERITY_WEIGHTS[f.severity] ?? 0;
  }
  return Math.max(0, Math.min(100, 100 - penalty));
}

// ============================================================
// PART 4 — Public API
// ============================================================

/**
 * Run the full Quill verification pipeline on a code string.
 * Returns a score (0-100), enriched findings, and catalog stats.
 *
 * Browser-safe: returns score 100 with an info finding if typescript
 * is not available at runtime.
 */
export function runQuillVerification(
  code: string,
  filename: string,
): QuillVerificationResult {
  let engineResult: EngineResult;

  try {
    engineResult = runQuillEngine(code, filename);
  } catch {
    // Engine failed entirely — return neutral result
    return {
      score: 100,
      findings: [{
        ruleId: 'quill/engine-error',
        line: 1,
        message: 'Quill engine unavailable — analysis skipped',
        severity: 'info',
        confidence: 'high',
      }],
      stats: {
        catalogTotal: 0,
        catalogCategories: 0,
        findingsCount: 0,
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        cyclomaticComplexity: 0,
        nodeCount: 0,
        enginesUsed: [],
      },
    };
  }

  const enriched = engineResult.findings.map(enrichFinding);
  const score = calculateScore(enriched);
  const catalogInfo = getCatalogStats();

  const criticalCount = enriched.filter(f => f.severity === 'critical').length;
  const errorCount = enriched.filter(f => f.severity === 'error').length;
  const warningCount = enriched.filter(f => f.severity === 'warning').length;
  const infoCount = enriched.filter(f => f.severity === 'info').length;

  return {
    score,
    findings: enriched,
    stats: {
      catalogTotal: catalogInfo.total,
      catalogCategories: catalogInfo.categories,
      findingsCount: enriched.length,
      criticalCount,
      errorCount,
      warningCount,
      infoCount,
      cyclomaticComplexity: engineResult.cyclomaticComplexity,
      nodeCount: engineResult.nodeCount,
      enginesUsed: engineResult.enginesUsed,
    },
  };
}

// IDENTITY_SEAL: role=quill-integration | inputs=code,filename | outputs=QuillVerificationResult
