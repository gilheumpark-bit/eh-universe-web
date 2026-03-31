// ============================================================
// PART 1 — Types & Configuration
// ============================================================
// Multi-provider AI code review with consensus scoring.
// Sends code to 2+ AI models, collects reviews, merges findings,
// and computes a confidence-weighted consensus score.

import { streamChat } from '@/lib/ai-providers';
import type { Finding, Severity } from '@/lib/code-studio/pipeline/pipeline-teams';

export interface AIReviewerConfig {
  providerId: string;
  perspective: string;
  label: string;
  role?: string;
}

export interface AIReviewResult {
  reviewer: string;
  perspective: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  findings: Finding[];
  summary: string;
  responseTimeMs: number;
}

export interface ConsensusResult {
  reviews: AIReviewResult[];
  consensusStatus: 'pass' | 'warn' | 'fail';
  consensusScore: number;
  agreement: number;
  mergedFindings: Array<Finding & { agreedBy: string[]; confidence: number }>;
  summary: string;
  totalTimeMs: number;
  passThreshold: number;
  convergenceDetected?: boolean;
}

const PASS_THRESHOLD = 77;
const CONVERGENCE_BAND = 8;
const DIVERGENCE_BOOST = 1.3;
const OUTLIER_WEIGHT = 1.5;

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ConsensusResult,AIReviewResult

// ============================================================
// PART 2 — Scoring & Anti-Convergence
// ============================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateReviewConfidence(review: AIReviewResult): number {
  if (review.findings.length === 0) return 0.3;
  let score = 0;
  for (const f of review.findings) {
    if (f.line != null) score += 0.2;
    if (f.message.length > 100) score += 0.15;
    else if (f.message.length > 50) score += 0.1;
    if (f.severity === 'critical' || f.severity === 'major') score += 0.15;
    else score += 0.05;
  }
  return Math.min(1.0, score / review.findings.length);
}

function detectConvergence(scores: number[]): boolean {
  if (scores.length < 2) return false;
  return Math.max(...scores) - Math.min(...scores) <= CONVERGENCE_BAND;
}

function calculateSpread(scores: number[]): number {
  if (scores.length < 2) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

export function applyAntiConvergence(rawScores: number[]): {
  adjustedScores: number[];
  finalScore: number;
  convergenceDetected: boolean;
  passed: boolean;
} {
  if (rawScores.length === 0) {
    return { adjustedScores: [], finalScore: 0, convergenceDetected: false, passed: false };
  }
  if (rawScores.length === 1) {
    return {
      adjustedScores: rawScores,
      finalScore: rawScores[0],
      convergenceDetected: false,
      passed: rawScores[0] >= PASS_THRESHOLD,
    };
  }

  const avg = rawScores.reduce((a, b) => a + b, 0) / rawScores.length;
  const convergenceDetected = detectConvergence(rawScores);
  const spread = calculateSpread(rawScores);

  let adjustedScores: number[];
  if (convergenceDetected) {
    adjustedScores = rawScores.map((score) => {
      const dist = score - avg;
      if (Math.abs(dist) < CONVERGENCE_BAND / 2) {
        return clamp(avg + dist * DIVERGENCE_BOOST, 0, 100);
      }
      return clamp(score + dist * (OUTLIER_WEIGHT - 1), 0, 100);
    });
  } else {
    const spikeThreshold = spread * 2;
    adjustedScores = rawScores.map((score) => {
      const dist = Math.abs(score - avg);
      if (dist > spikeThreshold) {
        const dir = score > avg ? 1 : -1;
        return avg + dir * (spikeThreshold + (dist - spikeThreshold) * 0.6);
      }
      return score;
    });
  }

  const weights = adjustedScores.map((s) => 1.0 + (Math.abs(s - avg) / 50) * (OUTLIER_WEIGHT - 1));
  const totalW = weights.reduce((a, b) => a + b, 0);
  const finalScore = Math.round(
    adjustedScores.reduce((sum, s, i) => sum + s * weights[i], 0) / totalW,
  );

  return {
    adjustedScores: adjustedScores.map(Math.round),
    finalScore: clamp(finalScore, 0, 100),
    convergenceDetected,
    passed: finalScore >= PASS_THRESHOLD,
  };
}

// IDENTITY_SEAL: PART-2 | role=Scoring | inputs=rawScores | outputs=adjustedScores,finalScore

// ============================================================
// PART 3 — Levenshtein & Finding Merger
// ============================================================

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function mergeFindings(
  reviews: AIReviewResult[],
): ConsensusResult['mergedFindings'] {
  const merged: ConsensusResult['mergedFindings'] = [];
  const allFindings = reviews.flatMap((r) =>
    r.findings.map((f) => ({ ...f, reviewer: r.reviewer })),
  );

  for (const finding of allFindings) {
    const existing = merged.find((mf) => {
      if (finding.line != null && mf.line != null && finding.line === mf.line) return true;
      const a = mf.message.toLowerCase().slice(0, 120);
      const b = finding.message.toLowerCase().slice(0, 120);
      const maxLen = Math.max(a.length, b.length, 1);
      return 1 - levenshteinDistance(a, b) / maxLen > 0.45;
    });

    if (existing) {
      if (!existing.agreedBy.includes((finding as Finding & { reviewer: string }).reviewer)) {
        existing.agreedBy.push((finding as Finding & { reviewer: string }).reviewer);
        existing.confidence = existing.agreedBy.length / reviews.length;
      }
      const severityOrder: Severity[] = ['info', 'minor', 'major', 'critical'];
      if (severityOrder.indexOf(finding.severity) > severityOrder.indexOf(existing.severity)) {
        existing.severity = finding.severity;
      }
    } else {
      merged.push({
        severity: finding.severity,
        message: finding.message,
        line: finding.line,
        agreedBy: [(finding as Finding & { reviewer: string }).reviewer],
        confidence: 1 / reviews.length,
      });
    }
  }

  const severityWeight: Record<string, number> = { critical: 4, major: 3, minor: 2, info: 1 };
  merged.sort((a, b) => {
    const d = b.confidence - a.confidence;
    if (Math.abs(d) > 0.01) return d;
    return (severityWeight[b.severity] ?? 0) - (severityWeight[a.severity] ?? 0);
  });

  return merged;
}

// IDENTITY_SEAL: PART-3 | role=FindingMerger | inputs=reviews | outputs=mergedFindings

// ============================================================
// PART 4 — Consensus & Review Execution
// ============================================================

export function calculateConsensus(reviews: AIReviewResult[]): ConsensusResult {
  if (reviews.length === 0) {
    return {
      reviews: [],
      consensusStatus: 'warn',
      consensusScore: 0,
      agreement: 0,
      mergedFindings: [],
      summary: 'No review results.',
      totalTimeMs: 0,
      passThreshold: PASS_THRESHOLD,
    };
  }

  const confidences = reviews.map((r) => calculateReviewConfidence(r));
  const rawScores = reviews.map((r) => r.score);
  const totalConf = confidences.reduce((s, c) => s + Math.max(c, 0.1), 0);
  const confWeightedAvg = Math.round(
    reviews.reduce((sum, r, i) => {
      const w = Math.max(confidences[i], 0.1) / totalConf;
      return sum + r.score * w * reviews.length;
    }, 0),
  );

  const scoring = applyAntiConvergence(rawScores);
  const avgScore = Math.round(scoring.finalScore * 0.6 + confWeightedAvg * 0.4);

  const statusCounts = { pass: 0, warn: 0, fail: 0 };
  for (const r of reviews) statusCounts[r.status]++;

  let consensusStatus: 'pass' | 'warn' | 'fail';
  if (statusCounts.fail >= 2 || (statusCounts.fail >= 1 && reviews.length <= 2)) {
    consensusStatus = 'fail';
  } else if (statusCounts.fail >= 1 || statusCounts.warn >= Math.ceil(reviews.length / 2)) {
    consensusStatus = 'warn';
  } else {
    consensusStatus = 'pass';
  }

  const variance = reviews.reduce((s, r) => s + (r.score - avgScore) ** 2, 0) / reviews.length;
  const agreement = Math.max(0, Math.min(1, 1 - variance / 2500));
  const mergedFindings = mergeFindings(reviews);

  if (avgScore < PASS_THRESHOLD) consensusStatus = 'fail';

  const names = reviews.map((r) => r.reviewer).join(', ');
  const critical = mergedFindings.filter((f) => f.severity === 'critical').length;
  const major = mergedFindings.filter((f) => f.severity === 'major').length;
  let summary = `${reviews.length} AI reviewers (${names}). Consensus: ${avgScore}, Agreement: ${Math.round(agreement * 100)}%.`;
  if (critical > 0) summary += ` Critical: ${critical}.`;
  if (major > 0) summary += ` Major: ${major}.`;
  if (scoring.convergenceDetected) summary += ` Anti-convergence applied.`;

  return {
    reviews,
    consensusStatus,
    consensusScore: avgScore,
    agreement: Math.round(agreement * 100) / 100,
    mergedFindings,
    summary,
    totalTimeMs: Math.max(...reviews.map((r) => r.responseTimeMs), 0),
    passThreshold: PASS_THRESHOLD,
    convergenceDetected: scoring.convergenceDetected,
  };
}

function parseReviewResponse(raw: string, reviewer: string, perspective: string, durationMs: number): AIReviewResult {
  let jsonStr = raw.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
  const braceStart = jsonStr.indexOf('{');
  const braceEnd = jsonStr.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) jsonStr = jsonStr.slice(braceStart, braceEnd + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    const status = (['pass', 'warn', 'fail'] as const).includes(parsed.status) ? parsed.status : 'warn';
    const score = typeof parsed.score === 'number' ? clamp(parsed.score, 0, 100) : 50;
    const findings: Finding[] = Array.isArray(parsed.findings)
      ? parsed.findings.map((f: Record<string, unknown>) => ({
          severity: (['critical', 'major', 'minor', 'info'] as const).includes(f.severity as Severity)
            ? (f.severity as Severity) : 'minor',
          message: typeof f.message === 'string' ? f.message : String(f.message ?? ''),
          line: typeof f.line === 'number' ? f.line : undefined,
        }))
      : [];
    return { reviewer, perspective, status, score, findings, summary: parsed.summary ?? '', responseTimeMs: durationMs };
  } catch {
    return {
      reviewer, perspective, status: 'warn', score: 50,
      findings: [{ severity: 'minor', message: 'Failed to parse review response.' }],
      summary: raw.slice(0, 300), responseTimeMs: durationMs,
    };
  }
}

export async function runMultiAIReview(
  code: string,
  fileName: string,
  language: string,
  signal?: AbortSignal,
  onReviewerComplete?: (reviewer: string, result: AIReviewResult) => void,
): Promise<ConsensusResult> {
  const perspectives = [
    { label: 'Architect', perspective: 'Structure, safety, module boundaries' },
    { label: 'Reviewer', perspective: 'Code quality, best practices, readability' },
  ];

  const startTime = performance.now();
  const promises = perspectives.map(async (cfg) => {
    const reviewStart = performance.now();
    const systemPrompt =
      `You are a code reviewer. Analyze from the perspective: "${cfg.perspective}".\n` +
      `File: ${fileName} (${language}). Pass threshold: 77.\n` +
      `Reply as JSON: { "status": "pass"|"warn"|"fail", "score": 0-100, "findings": [{"severity":"critical"|"major"|"minor"|"info","message":"...","line":null}], "summary":"..." }`;

    let accumulated = '';
    try {
      await streamChat({
        systemInstruction: systemPrompt,
        messages: [{ role: 'user', content: `Review this code:\n\`\`\`${language}\n${code.slice(0, 6000)}\n\`\`\`` }],
        temperature: 0.3,
        signal,
        onChunk: (t: string) => { accumulated += t; },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      const dur = Math.round(performance.now() - reviewStart);
      const errResult: AIReviewResult = {
        reviewer: cfg.label, perspective: cfg.perspective, status: 'warn',
        score: 0, findings: [], summary: `Review failed: ${(err as Error).message}`, responseTimeMs: dur,
      };
      onReviewerComplete?.(cfg.label, errResult);
      return errResult;
    }
    const dur = Math.round(performance.now() - reviewStart);
    const result = parseReviewResponse(accumulated, cfg.label, cfg.perspective, dur);
    onReviewerComplete?.(cfg.label, result);
    return result;
  });

  const settled = await Promise.allSettled(promises);
  const completed = settled.filter((o): o is PromiseFulfilledResult<AIReviewResult> => o.status === 'fulfilled').map((o) => o.value);
  const consensus = calculateConsensus(completed);
  consensus.totalTimeMs = Math.round(performance.now() - startTime);
  return consensus;
}

// IDENTITY_SEAL: PART-4 | role=Execution | inputs=code,fileName | outputs=ConsensusResult
