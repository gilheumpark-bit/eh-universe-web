// ============================================================
// Multi-AI Consensus Code Review Pipeline
// 5-AI 합의 기반 코드 리뷰
// ============================================================

import {
  type ProviderId,
  PROVIDERS,
  PROVIDER_LIST,
  getApiKey,
  getPreferredModel,
  streamViaProxy,
} from '../ai-providers';
import {
  getEnabledSlots,
  SLOT_ROLE_LABELS,
} from '../api-key-slots';
import {
  getChecklistForRole,
  formatChecklistPrompt,
  applyAntiConvergence,
  type ScoringState,
} from './review-checklist';

// ── Types ──

export interface AIReviewerConfig {
  providerId: ProviderId;
  model: string;
  apiKey: string;
  perspective: string;
  label: string;
  role?: string;  // for checklist selection
}

export interface AIReviewResult {
  reviewer: string;
  perspective: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  findings: Array<{
    severity: 'critical' | 'major' | 'minor' | 'suggestion';
    message: string;
    line?: number;
  }>;
  summary: string;
  responseTimeMs: number;
}

export interface ConsensusResult {
  reviews: AIReviewResult[];
  consensusStatus: 'pass' | 'warn' | 'fail';
  consensusScore: number;
  agreement: number;
  mergedFindings: Array<{
    severity: string;
    message: string;
    line?: number;
    agreedBy: string[];
    confidence: number;
  }>;
  summary: string;
  totalTimeMs: number;
  // v2: 체크리스트 + anti-convergence
  scoring?: ScoringState;
  passThreshold: number;
  convergenceDetected?: boolean;
}

// ── Reviewer Perspectives ──

const REVIEWER_PERSPECTIVES: Record<string, { perspective: string; label: string }> = {
  claude: {
    perspective: '구조, 논리, 안전성',
    label: 'Claude (아키텍처/안전성)',
  },
  openai: {
    perspective: '코드 품질, 베스트 프랙티스',
    label: 'GPT-4o (품질/패턴)',
  },
  gemini: {
    perspective: '프로젝트 일관성, 의존성',
    label: 'Gemini (일관성/의존성)',
  },
  groq: {
    perspective: '빠른 1차 스크리닝',
    label: 'Groq (1차 스크리닝)',
  },
  mistral: {
    perspective: '규정 준수, 국제화',
    label: 'Mistral (규정/국제화)',
  },
};

// ── Review Confidence Scoring ──

/**
 * Score how confident/detailed a review is based on specificity of findings.
 * Reviews with line numbers, concrete code references, and detailed explanations score higher.
 */
function calculateReviewConfidence(review: AIReviewResult): number {
  if (review.findings.length === 0) return 0.3; // no findings = low confidence

  let score = 0;
  for (const finding of review.findings) {
    // Findings with line numbers are more specific
    if (finding.line != null) score += 0.2;
    // Longer, more detailed messages indicate higher confidence
    if (finding.message.length > 100) score += 0.15;
    else if (finding.message.length > 50) score += 0.1;
    // Critical/major findings carry more weight than vague suggestions
    if (finding.severity === 'critical' || finding.severity === 'major') score += 0.15;
    else score += 0.05;
  }

  // Normalize to 0-1 range
  return Math.min(1.0, score / review.findings.length);
}

// ── Cross-Reviewer Validation ──

/**
 * Check if one reviewer's code suggestions would address another reviewer's bugs.
 * Returns pairs of correlated findings across reviewers.
 */
function crossValidateFindings(
  reviews: AIReviewResult[],
): Array<{ bugReviewer: string; bugMessage: string; fixReviewer: string; fixMessage: string }> {
  const correlations: Array<{ bugReviewer: string; bugMessage: string; fixReviewer: string; fixMessage: string }> = [];

  for (const reviewA of reviews) {
    for (const reviewB of reviews) {
      if (reviewA.reviewer === reviewB.reviewer) continue;

      for (const bugFinding of reviewA.findings) {
        if (bugFinding.severity !== 'critical' && bugFinding.severity !== 'major') continue;

        for (const fixFinding of reviewB.findings) {
          if (fixFinding.severity !== 'suggestion' && fixFinding.severity !== 'minor') continue;

          // Check if they reference the same line
          if (bugFinding.line != null && fixFinding.line != null && bugFinding.line === fixFinding.line) {
            correlations.push({
              bugReviewer: reviewA.reviewer,
              bugMessage: bugFinding.message,
              fixReviewer: reviewB.reviewer,
              fixMessage: fixFinding.message,
            });
            continue;
          }

          // Check message similarity via Levenshtein
          const similarity = 1 - levenshteinDistance(
            bugFinding.message.toLowerCase().slice(0, 80),
            fixFinding.message.toLowerCase().slice(0, 80),
          ) / Math.max(bugFinding.message.length, fixFinding.message.length, 1);
          if (similarity > 0.35) {
            correlations.push({
              bugReviewer: reviewA.reviewer,
              bugMessage: bugFinding.message,
              fixReviewer: reviewB.reviewer,
              fixMessage: fixFinding.message,
            });
          }
        }
      }
    }
  }

  return correlations;
}

// ── Levenshtein Distance (for deduplication & similarity) ──

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two-row optimization for memory efficiency
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

// ── Review Cache ──

interface CachedReview {
  codeHash: string;
  fileName: string;
  result: ConsensusResult;
  timestamp: number;
}

const reviewCache = new Map<string, CachedReview>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Simple hash for cache keys — FNV-1a inspired */
function hashCode(code: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function getCachedReview(code: string, fileName: string): ConsensusResult | null {
  const key = `${fileName}:${hashCode(code)}`;
  const cached = reviewCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    reviewCache.delete(key);
    return null;
  }
  return cached.result;
}

function setCachedReview(code: string, fileName: string, result: ConsensusResult): void {
  const key = `${fileName}:${hashCode(code)}`;
  reviewCache.set(key, { codeHash: hashCode(code), fileName, result, timestamp: Date.now() });

  // Evict old entries if cache grows too large
  if (reviewCache.size > 100) {
    const oldest = [...reviewCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 20; i++) reviewCache.delete(oldest[i][0]);
  }
}

/** Clear the review cache (useful for testing or manual refresh) */
export function clearReviewCache(): void {
  reviewCache.clear();
}

// ── System Prompts ──

function buildReviewPrompt(perspective: string, fileName: string, language: string, role?: string): string {
  // 역할 기반 체크리스트 생성
  const checklist = getChecklistForRole(role ?? 'reviewer', perspective);
  const checklistPrompt = formatChecklistPrompt(checklist);

  return (
    `당신은 코드 리뷰 전문가입니다. "${perspective}" 관점에서 코드를 분석하세요.\n` +
    `파일: ${fileName} (${language})\n\n` +
    `${checklistPrompt}\n\n` +
    `통과 기준: **77점 이상**\n` +
    `- 77점 미만이면 반드시 "fail"\n` +
    `- 77~85점이면 "warn"\n` +
    `- 85점 이상이면 "pass"\n\n` +
    `**중요: 평균 수렴 금지!**\n` +
    `- 모든 항목에 70-80점을 주는 것은 금지합니다\n` +
    `- 잘한 항목은 90-100점, 문제 있는 항목은 30-60점으로 명확히 구분하세요\n` +
    `- 각 항목을 독립적으로 엄격하게 평가하세요`
  );
}

// ── Reviewer Discovery ──

// ── Slot-role to review perspective mapping ──

const SLOT_ROLE_PERSPECTIVES: Record<string, string> = {
  coder: '코드 품질, 구현 정확성',
  reviewer: '코드 리뷰, 베스트 프랙티스',
  tester: '테스트 커버리지, 엣지 케이스',
  security: '보안 취약점, 인증/인가',
  architect: '구조, 모듈화, 확장성',
  debugger: '잠재적 버그, 런타임 에러',
  documenter: '문서화, 가독성, 주석',
};

export function getAvailableReviewers(): AIReviewerConfig[] {
  // Prefer multi-slot system: each enabled slot becomes a reviewer with its own perspective
  const { data: slots } = getEnabledSlots();
  if (slots.length > 0) {
    return slots
      .filter((s) => !PROVIDERS[s.providerId]?.capabilities.isLocal)
      .map((s) => {
        const providerName = PROVIDERS[s.providerId]?.name ?? s.providerId;
        const roleName = SLOT_ROLE_LABELS[s.role];

        // Determine perspective: custom slots use customPerspective, others use role-based mapping
        let perspective: string;
        if (s.role === 'custom' && s.customPerspective) {
          perspective = s.customPerspective;
        } else {
          perspective = SLOT_ROLE_PERSPECTIVES[s.role] ?? REVIEWER_PERSPECTIVES[s.providerId]?.perspective ?? '코드 품질';
        }

        return {
          providerId: s.providerId,
          model: s.model || PROVIDERS[s.providerId]?.defaultModel || '',
          apiKey: s.apiKey,
          perspective,
          label: s.label || `${providerName} (${roleName})`,
          role: s.role,
        };
      });
  }

  // Fallback: legacy single-key style
  return PROVIDER_LIST
    .filter((p) => !p.capabilities.isLocal)
    .filter((p) => REVIEWER_PERSPECTIVES[p.id] != null)
    .map((p) => ({
      providerId: p.id,
      model: getPreferredModel(p.id) || p.defaultModel,
      apiKey: getApiKey(p.id),
      perspective: REVIEWER_PERSPECTIVES[p.id].perspective,
      label: REVIEWER_PERSPECTIVES[p.id].label,
    }))
    .filter((r) => r.apiKey.trim().length > 0);
}

// ── Response Parsing ──

function parseReviewResponse(raw: string, reviewer: string, perspective: string, durationMs: number): AIReviewResult {
  // Try to extract JSON from the response (may be wrapped in markdown code blocks)
  let jsonStr = raw.trim();

  // Remove markdown code block if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object in the response
  const braceStart = jsonStr.indexOf('{');
  const braceEnd = jsonStr.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);

    const status = ['pass', 'warn', 'fail'].includes(parsed.status) ? parsed.status : 'warn';
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50;

    const findings = Array.isArray(parsed.findings)
      ? parsed.findings.map((f: Record<string, unknown>) => ({
          severity: ['critical', 'major', 'minor', 'suggestion'].includes(f.severity as string)
            ? f.severity as string
            : 'minor',
          message: typeof f.message === 'string' ? f.message : String(f.message ?? ''),
          line: typeof f.line === 'number' ? f.line : undefined,
        }))
      : [];

    return {
      reviewer,
      perspective,
      status: status as 'pass' | 'warn' | 'fail',
      score,
      findings,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '요약 없음',
      responseTimeMs: durationMs,
    };
  } catch {
    // Failed to parse — return a degraded result
    return {
      reviewer,
      perspective,
      status: 'warn',
      score: 50,
      findings: [
        {
          severity: 'minor' as const,
          message: '리뷰 결과를 파싱할 수 없습니다. 원본 응답을 확인하세요.',
        },
      ],
      summary: raw.slice(0, 500),
      responseTimeMs: durationMs,
    };
  }
}

// ── Consensus Calculation ──

export function calculateConsensus(reviews: AIReviewResult[]): ConsensusResult {
  if (reviews.length === 0) {
    return {
      reviews: [],
      consensusStatus: 'warn',
      consensusScore: 0,
      agreement: 0,
      mergedFindings: [],
      summary: '리뷰 결과가 없습니다.',
      totalTimeMs: 0,
      passThreshold: 77,
    };
  }

  // Anti-convergence scoring with confidence weighting
  const confidences = reviews.map((r) => calculateReviewConfidence(r));
  const rawScores = reviews.map((r) => r.score);

  // Weight scores by review confidence: detailed reviews count more
  const totalConfidence = confidences.reduce((s, c) => s + Math.max(c, 0.1), 0);
  const confidenceWeightedScores = reviews.map((r, i) => {
    const weight = Math.max(confidences[i], 0.1) / totalConfidence;
    return r.score * weight * reviews.length; // scale back to original magnitude
  });

  const scoring = applyAntiConvergence(rawScores);

  // Blend anti-convergence score with confidence-weighted score
  const confidenceWeightedAvg = Math.round(confidenceWeightedScores.reduce((a, b) => a + b, 0));
  const avgScore = Math.round(scoring.finalScore * 0.6 + confidenceWeightedAvg * 0.4);

  // Count statuses
  const statusCounts = { pass: 0, warn: 0, fail: 0 };
  for (const r of reviews) statusCounts[r.status]++;

  // Consensus status: majority vote, but any fail from 2+ reviewers = fail
  let consensusStatus: 'pass' | 'warn' | 'fail';
  if (statusCounts.fail >= 2 || (statusCounts.fail >= 1 && reviews.length <= 2)) {
    consensusStatus = 'fail';
  } else if (statusCounts.fail >= 1 || statusCounts.warn >= Math.ceil(reviews.length / 2)) {
    consensusStatus = 'warn';
  } else {
    consensusStatus = 'pass';
  }

  // Agreement score: how similar are the scores?
  const scoreVariance =
    reviews.reduce((sum, r) => sum + Math.pow(r.score - avgScore, 2), 0) / reviews.length;
  const maxPossibleVariance = 2500; // max when scores are 0 and 100
  const agreement = Math.max(0, Math.min(1, 1 - scoreVariance / maxPossibleVariance));

  // Merge findings by similarity
  const mergedFindings: ConsensusResult['mergedFindings'] = [];
  const allFindings = reviews.flatMap((r) =>
    r.findings.map((f) => ({ ...f, reviewer: r.reviewer })),
  );

  for (const finding of allFindings) {
    // Check if a similar finding already exists (same line or Levenshtein similarity)
    const existing = mergedFindings.find((mf) => {
      if (finding.line != null && mf.line != null && finding.line === mf.line) return true;
      // Levenshtein-based similarity: compare truncated messages for efficiency
      const a = mf.message.toLowerCase().slice(0, 120);
      const b = finding.message.toLowerCase().slice(0, 120);
      const maxLen = Math.max(a.length, b.length, 1);
      const dist = levenshteinDistance(a, b);
      const similarity = 1 - dist / maxLen;
      return similarity > 0.45; // 45% similarity threshold for dedup
    });

    if (existing) {
      if (!existing.agreedBy.includes(finding.reviewer)) {
        existing.agreedBy.push(finding.reviewer);
        existing.confidence = existing.agreedBy.length / reviews.length;
      }
      // Escalate severity if needed
      const severityOrder = ['suggestion', 'minor', 'major', 'critical'];
      const existIdx = severityOrder.indexOf(existing.severity);
      const newIdx = severityOrder.indexOf(finding.severity);
      if (newIdx > existIdx) {
        existing.severity = finding.severity;
      }
    } else {
      mergedFindings.push({
        severity: finding.severity,
        message: finding.message,
        line: finding.line,
        agreedBy: [finding.reviewer],
        confidence: 1 / reviews.length,
      });
    }
  }

  // Sort by confidence (high agreement first) then severity
  const severityWeight: Record<string, number> = { critical: 4, major: 3, minor: 2, suggestion: 1 };
  mergedFindings.sort((a, b) => {
    const confDiff = b.confidence - a.confidence;
    if (Math.abs(confDiff) > 0.01) return confDiff;
    return (severityWeight[b.severity] ?? 0) - (severityWeight[a.severity] ?? 0);
  });

  // Generate summary
  const totalTimeMs = Math.max(...reviews.map((r) => r.responseTimeMs));
  const reviewerNames = reviews.map((r) => r.reviewer).join(', ');
  const criticalCount = mergedFindings.filter((f) => f.severity === 'critical').length;
  const majorCount = mergedFindings.filter((f) => f.severity === 'major').length;
  const highConfidenceCount = mergedFindings.filter((f) => f.confidence >= 0.5).length;

  let summary = `${reviews.length}개 AI(${reviewerNames})가 코드를 리뷰했습니다. `;
  summary += `합의 점수: ${avgScore}점, 합의도: ${Math.round(agreement * 100)}%. `;

  if (criticalCount > 0) {
    summary += `심각한 문제 ${criticalCount}건 발견. `;
  }
  if (majorCount > 0) {
    summary += `주요 문제 ${majorCount}건 발견. `;
  }
  if (highConfidenceCount > 0) {
    summary += `${highConfidenceCount}건의 발견 사항이 과반수 이상의 AI에서 동의되었습니다. `;
  }

  if (scoring.convergenceDetected) {
    summary += `⚠️ 점수 수렴 감지 — anti-convergence 적용됨. `;
  }

  // Cross-reviewer validation summary
  const correlations = crossValidateFindings(reviews);
  if (correlations.length > 0) {
    summary += `🔗 교차 검증: ${correlations.length}건의 버그-수정 상관관계 발견. `;
  }

  // 77점 기준 통과 판정
  const passThreshold = 77;
  if (avgScore < passThreshold) {
    consensusStatus = 'fail';
  }

  return {
    reviews,
    consensusStatus,
    consensusScore: avgScore,
    agreement: Math.round(agreement * 100) / 100,
    mergedFindings,
    summary: summary.trim(),
    totalTimeMs,
    scoring,
    passThreshold,
    convergenceDetected: scoring.convergenceDetected,
  };
}

// ── Main Review Pipeline ──

export async function runMultiAIReview(
  code: string,
  fileName: string,
  language: string,
  signal?: AbortSignal,
  onReviewerComplete?: (reviewer: string, result: AIReviewResult) => void,
): Promise<ConsensusResult> {
  // Check cache: skip re-review if code hasn't changed
  const cached = getCachedReview(code, fileName);
  if (cached) {
    return cached;
  }

  const reviewers = getAvailableReviewers();

  if (reviewers.length === 0) {
    return calculateConsensus([]);
  }

  const startTime = performance.now();

  const promises = reviewers.map(async (reviewer) => {
    const reviewStart = performance.now();
    let fullResponse = '';

    try {
      const result = await streamViaProxy(
        reviewer.providerId,
        reviewer.model,
        reviewer.apiKey,
        {
          systemInstruction: buildReviewPrompt(reviewer.perspective, fileName, language, reviewer.role),
          messages: [
            {
              role: 'user' as const,
              content: `다음 코드를 리뷰해주세요:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            },
          ],
          temperature: 0.3,
          signal,
          onChunk: (text) => {
            fullResponse += text;
          },
        },
      );

      fullResponse = result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      // Provider failed — return degraded result
      const durationMs = Math.round(performance.now() - reviewStart);
      const errorResult: AIReviewResult = {
        reviewer: PROVIDERS[reviewer.providerId]?.name ?? reviewer.providerId,
        perspective: reviewer.perspective,
        status: 'warn',
        score: 0,
        findings: [],
        summary: `리뷰 실패: ${(err as Error).message}`,
        responseTimeMs: durationMs,
      };
      onReviewerComplete?.(reviewer.label, errorResult);
      return errorResult;
    }

    const durationMs = Math.round(performance.now() - reviewStart);
    const reviewResult = parseReviewResponse(
      fullResponse,
      PROVIDERS[reviewer.providerId]?.name ?? reviewer.providerId,
      reviewer.perspective,
      durationMs,
    );

    onReviewerComplete?.(reviewer.label, reviewResult);
    return reviewResult;
  });

  const settled = await Promise.allSettled(promises);
  const completedReviews: AIReviewResult[] = [];

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      completedReviews.push(outcome.value);
    }
  }

  const consensus = calculateConsensus(completedReviews);
  consensus.totalTimeMs = Math.round(performance.now() - startTime);

  // Cache the result for this code + file combination
  setCachedReview(code, fileName, consensus);

  return consensus;
}
