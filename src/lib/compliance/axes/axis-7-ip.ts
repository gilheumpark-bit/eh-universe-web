/**
 * 축 7: IP / 브랜드 위반 (재수출 래퍼 + L3 ngram-similarity wiring).
 *
 * 실제 구현은 `src/lib/ip-guard/compliance-axis-7.ts`의 `scoreIPCompliance`.
 * 이 모듈은 축 1~6과 동일한 `AxisResult` 인터페이스로 감싸서 orchestrator가
 * 균일하게 호출할 수 있도록 한다.
 *
 * [L3 wiring — 2026-05-12] AGENTS.md "L3 사후 유사도 (ngram-similarity)"가
 * 모듈만 존재하고 production callers 0이었던 issue (Round 5 audit MISLEADING #1)
 * 를 해소. ctx.referenceCorpus 가 있으면 ngram 검사 수행, 없으면 skip.
 */

import type { AxisContext, AxisResult, AxisIssue } from '../types';
import { DEFAULT_WEIGHTS } from '../types';
import { scoreIPCompliance } from '@/lib/ip-guard/compliance-axis-7';
import { detectSuspiciousPassages } from '@/lib/ip-guard/ngram-similarity';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[7];

export function scoreAxis7IP(ctx: AxisContext): AxisResult {
  const result = scoreIPCompliance(ctx.draft);

  const issues: AxisIssue[] = [];
  for (const b of result.criticalBrands) {
    issues.push({
      severity: 'critical',
      message: `실존 IP "${b.matched}" (공식명: ${b.entry.canonical}) 본문 등장.`,
      position: b.position,
    });
  }
  for (const w of result.warnings) {
    issues.push({
      severity: 'warning',
      message: w.message,
      position: w.position,
    });
  }

  // [L3 wiring — 2026-05-12 audit fix]
  // 작가가 비교 코퍼스 등록 시 ngram 사후 유사도 검사. AGENTS.md L3 row 정합.
  let scorePenalty = 0;
  if (ctx.referenceCorpus && ctx.referenceCorpus.length > 0) {
    try {
      const suspicious = detectSuspiciousPassages(ctx.draft, ctx.referenceCorpus, {
        threshold: ctx.ngramThreshold ?? 0.3,
      });
      for (const match of suspicious) {
        const pct = (match.similarity * 100).toFixed(1);
        // critical: similarity >= 0.5 (강한 의심), warning: 0.3 <= sim < 0.5
        issues.push({
          severity: match.similarity >= 0.5 ? 'critical' : 'warning',
          message: `참조 코퍼스 "${match.referenceId}"와 ${pct}% 유사 (n-gram). 표절 의심 점검 권장.`,
        });
      }
      // 가장 높은 similarity 만큼 score penalty (max 20pt 감점)
      if (suspicious.length > 0) {
        const topSim = suspicious[0].similarity;
        scorePenalty = Math.min(20, Math.round(topSim * 40));
      }
    } catch {
      // ngram 실패 시 silent — axis 자체 score 영향 0
    }
  }

  const finalScore = Math.max(0, result.score - scorePenalty);
  const finalPassed = result.passed && scorePenalty < 10;

  return {
    axis: 7,
    name: 'IP/브랜드 위반',
    score: finalScore,
    weight: AXIS_WEIGHT,
    passed: finalPassed,
    issues,
    recommendations: finalPassed ? [] : (result.passed
      ? ['참조 코퍼스 의심 구간 점검 — 표절 또는 의도된 인용 여부 확인.']
      : [result.reason]),
  };
}
