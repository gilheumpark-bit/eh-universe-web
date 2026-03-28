// ============================================================
// Multi-Agent Feedback Loop Orchestrator
// 에이전트 간 협업 피드백 루프 — 코더 작성 → 리뷰어 검토 → 재작성
// ============================================================

import { type AIRole, executeWithRole } from './role-router';

// ── Types ──

export interface AgentMessage {
  from: AIRole;
  to: AIRole;
  type: 'code' | 'review' | 'feedback' | 'approval' | 'rejection';
  content: string;
  timestamp: number;
}

export interface LineByLineFeedback {
  line: number;
  comment: string;
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  addressed: boolean;
}

export interface IterationQuality {
  iteration: number;
  score: number;
  improved: boolean;
  delta: number;
}

export interface OrchestrationResult {
  finalCode: string;
  iterations: number;
  conversation: AgentMessage[];
  approved: boolean;
  approvedBy: AIRole[];
  rejectedFindings: string[];
  totalTimeMs: number;
  iterationScores: IterationQuality[];
  lineByLineFeedback: LineByLineFeedback[];
  reviewerConfidence: number;
}

export interface OrchestrationConfig {
  maxIterations: number;
  requiredApprovals: number;
  autoFixOnReject: boolean;
  roles: AIRole[];
  /** Minimum reviewer confidence (0-100) to accept code. Default: 80 */
  confidenceThreshold: number;
  /** Enable parallel review execution for multiple reviewers. Default: true */
  parallelReview: boolean;
}

// ── Defaults ──

const DEFAULT_CONFIG: OrchestrationConfig = {
  maxIterations: 3,
  requiredApprovals: 1,
  autoFixOnReject: true,
  roles: ['coder', 'reviewer'],
  confidenceThreshold: 80,
  parallelReview: true,
};

// ── Confidence Threshold ──

const CONFIDENCE_THRESHOLD_DEFAULT = 80;

/**
 * Extract a confidence score from a review response.
 * Looks for explicit confidence or estimates from findings quality.
 */
function extractConfidence(review: ReviewParsed): number {
  // If the reviewer explicitly provides a confidence, use it
  if ('confidence' in review && typeof (review as Record<string, unknown>).confidence === 'number') {
    return (review as Record<string, unknown>).confidence as number;
  }
  // Heuristic: approved reviews with few findings = high confidence
  if (review.approved && review.findings.length === 0) return 90;
  if (review.approved) return 80;
  // Rejected with detailed findings = moderate confidence in rejection
  if (review.findings.length >= 3) return 75;
  return 60;
}

// ── Iteration Quality Tracking ──

function trackIterationQuality(
  scores: IterationQuality[],
  iteration: number,
  currentScore: number,
): IterationQuality {
  const prevScore = scores.length > 0 ? scores[scores.length - 1].score : 0;
  const delta = currentScore - prevScore;
  const entry: IterationQuality = {
    iteration,
    score: currentScore,
    improved: delta > 0 || scores.length === 0,
    delta,
  };
  scores.push(entry);
  return entry;
}

// ── Feedback Summarization ──

/**
 * Combine feedback from all reviewers into a structured, deduplicated summary.
 * Groups by severity and removes near-duplicate findings.
 */
function summarizeFeedback(
  reviewResults: Array<{ role: AIRole; review: ReviewParsed }>,
): { summary: string; lineByLine: LineByLineFeedback[] } {
  const grouped: Record<string, string[]> = {
    critical: [],
    major: [],
    minor: [],
    suggestion: [],
  };
  const lineByLine: LineByLineFeedback[] = [];

  for (const { role, review } of reviewResults) {
    for (const finding of review.findings) {
      const prefix = `[${role}] `;
      // Try to extract severity from finding text
      let severity: LineByLineFeedback['severity'] = 'minor';
      const lowerFinding = finding.toLowerCase();
      if (lowerFinding.includes('critical') || lowerFinding.includes('심각')) severity = 'critical';
      else if (lowerFinding.includes('major') || lowerFinding.includes('주요')) severity = 'major';
      else if (lowerFinding.includes('suggest') || lowerFinding.includes('제안')) severity = 'suggestion';

      grouped[severity].push(prefix + finding);

      // Extract line references if present (e.g., "line 42", "라인 42", "L42")
      const lineMatch = finding.match(/(?:line|라인|L)\s*(\d+)/i);
      if (lineMatch) {
        lineByLine.push({
          line: parseInt(lineMatch[1], 10),
          comment: `[${role}] ${finding}`,
          severity,
          addressed: false,
        });
      }
    }
  }

  // Build structured summary text
  const parts: string[] = [];
  if (grouped.critical.length > 0) {
    parts.push(`🔴 심각 (${grouped.critical.length}건):\n${grouped.critical.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}`);
  }
  if (grouped.major.length > 0) {
    parts.push(`🟠 주요 (${grouped.major.length}건):\n${grouped.major.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}`);
  }
  if (grouped.minor.length > 0) {
    parts.push(`🟡 경미 (${grouped.minor.length}건):\n${grouped.minor.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}`);
  }
  if (grouped.suggestion.length > 0) {
    parts.push(`💡 제안 (${grouped.suggestion.length}건):\n${grouped.suggestion.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}`);
  }

  return {
    summary: parts.join('\n\n'),
    lineByLine,
  };
}

// ── Helpers ──

function now(): number {
  return Date.now();
}

function createMessage(
  from: AIRole,
  to: AIRole,
  type: AgentMessage['type'],
  content: string,
): AgentMessage {
  return { from, to, type, content, timestamp: now() };
}

/**
 * Extract a code block from an AI response.
 * Looks for fenced code blocks (```...```) and returns the content.
 * Falls back to the full response if no code block is found.
 */
function extractCodeBlock(response: string): string {
  const match = response.match(/```(?:\w*)\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : response.trim();
}

/**
 * Parse a reviewer's response into a structured result.
 * The reviewer is prompted to respond in JSON but we handle free-text too.
 */
interface ReviewParsed {
  approved: boolean;
  findings: string[];
  summary: string;
}

function parseReviewResponse(raw: string): ReviewParsed {
  // Try JSON parse first
  try {
    let jsonStr = raw.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const braceStart = jsonStr.indexOf('{');
    const braceEnd = jsonStr.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
      jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
    }
    const parsed = JSON.parse(jsonStr);
    return {
      approved: parsed.approved === true || parsed.status === 'pass' || parsed.status === 'approved',
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.map((f: unknown) =>
            typeof f === 'string' ? f : typeof f === 'object' && f !== null && 'message' in f
              ? String((f as Record<string, unknown>).message)
              : String(f),
          )
        : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : raw.slice(0, 300),
    };
  } catch {
    // Heuristic: look for approval/rejection keywords
    const lower = raw.toLowerCase();
    const approved =
      (lower.includes('승인') || lower.includes('approved') || lower.includes('pass')) &&
      !lower.includes('reject') && !lower.includes('거부') && !lower.includes('fail');
    return {
      approved,
      findings: [raw.slice(0, 1000)],
      summary: raw.slice(0, 300),
    };
  }
}

// ── Prompts ──

function buildCoderPrompt(prompt: string): string {
  const backticks = '```';
  return (
    '다음 요구사항에 맞는 코드를 작성하세요.\n\n' +
    '요구사항:\n' + prompt + '\n\n' +
    '규칙:\n' +
    '- 깨끗하고 효율적인 코드를 작성하세요\n' +
    '- 코드 블록(' + backticks + ')으로 감싸서 응답하세요\n' +
    '- 한국어 주석을 포함하세요'
  );
}

function buildRewritePrompt(originalCode: string, findings: string[]): string {
  const backticks = '```';
  const feedbackList = findings.map((f, i) => (i + 1) + '. ' + f).join('\n');
  return (
    '다음 코드가 리뷰에서 거절되었습니다. 피드백을 반영하여 수정하세요.\n\n' +
    '원본 코드:\n' + backticks + '\n' + originalCode + '\n' + backticks + '\n\n' +
    '리뷰 피드백:\n' + feedbackList + '\n\n' +
    '규칙:\n' +
    '- 모든 피드백 사항을 반영하세요\n' +
    '- 코드 블록(' + backticks + ')으로 감싸서 응답하세요\n' +
    '- 기존 기능을 유지하면서 개선하세요'
  );
}

function buildReviewPrompt(code: string): string {
  const backticks = '```';
  return (
    '다음 코드를 리뷰하세요.\n\n' +
    backticks + '\n' + code + '\n' + backticks + '\n\n' +
    '반드시 아래 JSON 형식으로만 응답하세요:\n' +
    '{\n' +
    '  "approved": true | false,\n' +
    '  "findings": ["발견 사항 1", "발견 사항 2", ...],\n' +
    '  "summary": "전체 요약 (한국어)"\n' +
    '}\n\n' +
    '평가 기준:\n' +
    '- 코드 품질, 가독성, 효율성\n' +
    '- 버그 또는 잠재적 문제\n' +
    '- 보안 취약점\n' +
    '- 모범 사례 준수 여부\n' +
    '- 문제가 없으면 "approved": true로 응답\n' +
    '- 각 발견 사항에 해당 줄 번호를 포함하세요 (예: "line 42: 문제 설명")\n' +
    '- confidence 필드에 리뷰 확신도 (0-100)를 포함하세요'
  );
}

function buildTesterPrompt(code: string): string {
  const backticks = '```';
  return (
    '다음 코드에 대한 테스트 코드를 생성하세요.\n\n' +
    backticks + '\n' + code + '\n' + backticks + '\n\n' +
    '규칙:\n' +
    '- 단위 테스트, 엣지 케이스, 경계값 분석을 포함하세요\n' +
    '- 코드 블록(' + backticks + ')으로 감싸서 응답하세요\n' +
    '- 테스트 설명은 한국어로 작성하세요'
  );
}

function buildSecurityPrompt(code: string): string {
  const backticks = '```';
  return (
    '다음 코드의 보안 취약점을 분석하세요.\n\n' +
    backticks + '\n' + code + '\n' + backticks + '\n\n' +
    '반드시 아래 JSON 형식으로만 응답하세요:\n' +
    '{\n' +
    '  "approved": true | false,\n' +
    '  "findings": ["취약점 1", "취약점 2", ...],\n' +
    '  "summary": "보안 분석 요약 (한국어)"\n' +
    '}\n\n' +
    '평가 기준:\n' +
    '- OWASP Top 10\n' +
    '- 인젝션, XSS, CSRF\n' +
    '- 인증/인가 문제\n' +
    '- 민감 데이터 노출\n' +
    '- 보안 문제가 없으면 "approved": true'
  );
}

// ── Core Orchestration ──

export async function orchestrateTask(
  prompt: string,
  config?: Partial<OrchestrationConfig>,
  signal?: AbortSignal,
  onMessage?: (msg: AgentMessage) => void,
): Promise<OrchestrationResult> {
  const cfg: OrchestrationConfig = { ...DEFAULT_CONFIG, ...config };
  const conversation: AgentMessage[] = [];
  const approvedBy: AIRole[] = [];
  const allRejectedFindings: string[] = [];
  const iterationScores: IterationQuality[] = [];
  const allLineByLineFeedback: LineByLineFeedback[] = [];
  let lastReviewerConfidence = 0;
  const startTime = performance.now();

  function log(msg: AgentMessage): void {
    conversation.push(msg);
    onMessage?.(msg);
  }

  // ── Step 1: Coder generates initial code ──
  let currentCode: string;
  try {
    const coderResponse = await executeWithRole('coder', {
      systemInstruction: '',
      messages: [{ role: 'user', content: buildCoderPrompt(prompt) }],
      temperature: 0.5,
      signal,
      onChunk: () => {},
    });

    currentCode = extractCodeBlock(coderResponse);
    log(createMessage('coder', 'reviewer', 'code', currentCode));
  } catch (err) {
    // If coder fails, return empty result
    return {
      finalCode: '',
      iterations: 0,
      conversation,
      approved: false,
      approvedBy: [],
      rejectedFindings: [`코더 실행 실패: ${(err as Error).message}`],
      totalTimeMs: Math.round(performance.now() - startTime),
      iterationScores: [],
      lineByLineFeedback: [],
      reviewerConfidence: 0,
    };
  }

  // ── Step 2-4: Review loop ──
  let iteration = 0;
  let approved = false;

  while (iteration < cfg.maxIterations && !approved) {
    if (signal?.aborted) break;
    iteration++;

    // Collect reviews from all reviewer-type roles
    const reviewerRoles = cfg.roles.filter((r) => r !== 'coder');
    const reviewResults: Array<{ role: AIRole; review: ReviewParsed }> = [];

    // Build review tasks
    const reviewTasks = reviewerRoles.map((reviewerRole) => {
      let reviewPromptContent: string;
      if (reviewerRole === 'security') {
        reviewPromptContent = buildSecurityPrompt(currentCode);
      } else if (reviewerRole === 'tester') {
        reviewPromptContent = buildTesterPrompt(currentCode);
      } else {
        reviewPromptContent = buildReviewPrompt(currentCode);
      }
      return { reviewerRole, reviewPromptContent };
    });

    // Execute reviews: parallel if enabled and multiple reviewers, otherwise sequential
    if (cfg.parallelReview && reviewTasks.length > 1) {
      // ── Parallel Review Execution ──
      const reviewPromises = reviewTasks.map(async ({ reviewerRole, reviewPromptContent }) => {
        try {
          const reviewResponse = await executeWithRole(reviewerRole, {
            systemInstruction: '',
            messages: [{ role: 'user', content: reviewPromptContent }],
            temperature: 0.3,
            signal,
            onChunk: () => {},
          });
          return { role: reviewerRole, review: parseReviewResponse(reviewResponse), error: null };
        } catch (err) {
          return { role: reviewerRole, review: null, error: err as Error };
        }
      });

      const parallelResults = await Promise.allSettled(reviewPromises);
      for (const outcome of parallelResults) {
        if (outcome.status === 'fulfilled') {
          const { role: reviewerRole, review, error } = outcome.value;
          if (review) {
            reviewResults.push({ role: reviewerRole, review });
          } else if (error) {
            log(createMessage(reviewerRole, 'coder', 'feedback', `리뷰 실행 실패: ${error.message}`));
          }
        }
      }
    } else {
      // ── Sequential Review Execution ──
      for (const { reviewerRole, reviewPromptContent } of reviewTasks) {
        if (signal?.aborted) break;
        try {
          const reviewResponse = await executeWithRole(reviewerRole, {
            systemInstruction: '',
            messages: [{ role: 'user', content: reviewPromptContent }],
            temperature: 0.3,
            signal,
            onChunk: () => {},
          });
          reviewResults.push({ role: reviewerRole, review: parseReviewResponse(reviewResponse) });
        } catch (err) {
          log(createMessage(reviewerRole, 'coder', 'feedback', `리뷰 실행 실패: ${(err as Error).message}`));
        }
      }
    }

    // Process review results and log messages
    for (const { role: reviewerRole, review: parsed } of reviewResults) {
      const confidence = extractConfidence(parsed);
      lastReviewerConfidence = Math.max(lastReviewerConfidence, confidence);

      if (parsed.approved) {
        log(createMessage(reviewerRole, 'coder', 'approval', parsed.summary));
        // Confidence threshold: only count approval if confidence is high enough
        if (confidence >= (cfg.confidenceThreshold ?? CONFIDENCE_THRESHOLD_DEFAULT)) {
          approvedBy.push(reviewerRole);
        } else {
          log(createMessage(reviewerRole, 'coder', 'feedback',
            `승인되었으나 확신도가 낮음 (${confidence}% < ${cfg.confidenceThreshold}%). 재검토 필요.`));
        }
      } else {
        log(createMessage(reviewerRole, 'coder', 'rejection', parsed.summary));
        allRejectedFindings.push(...parsed.findings);

        // Log individual findings as feedback
        for (const finding of parsed.findings) {
          log(createMessage(reviewerRole, 'coder', 'feedback', finding));
        }
      }
    }

    // Track iteration quality
    const iterationScore = reviewResults.length > 0
      ? Math.round(reviewResults.reduce((sum, r) => sum + (r.review.approved ? 85 : 45), 0) / reviewResults.length)
      : 0;
    const qualityEntry = trackIterationQuality(iterationScores, iteration, iterationScore);

    // Check if we have enough approvals
    if (approvedBy.length >= cfg.requiredApprovals) {
      approved = true;
      break;
    }

    // ── Step 3: Rewrite if rejected and autoFix is enabled ──
    if (cfg.autoFixOnReject && iteration < cfg.maxIterations) {
      const pendingReviews = reviewResults.filter((r) => !r.review.approved);

      if (pendingReviews.length > 0) {
        // ── Feedback Summarization: combine all reviewer feedback into structured list ──
        const { summary: feedbackSummary, lineByLine } = summarizeFeedback(pendingReviews);
        allLineByLineFeedback.push(...lineByLine);

        // Warn if quality is degrading (score not improving)
        const degradationWarning = !qualityEntry.improved && iteration > 1
          ? '\n\n⚠️ 이전 수정에서 품질이 개선되지 않았습니다. 다른 접근 방식을 시도하세요.'
          : '';

        const structuredFindings = [
          `=== 통합 리뷰 피드백 (반복 ${iteration}) ===`,
          feedbackSummary,
          degradationWarning,
        ].filter(Boolean);

        try {
          const rewriteResponse = await executeWithRole('coder', {
            systemInstruction: '',
            messages: [
              { role: 'user', content: buildRewritePrompt(currentCode, structuredFindings) },
            ],
            temperature: 0.4,
            signal,
            onChunk: () => {},
          });

          currentCode = extractCodeBlock(rewriteResponse);
          log(createMessage('coder', 'reviewer', 'code', currentCode));

          // Mark addressed line-by-line feedback
          for (const fb of allLineByLineFeedback) {
            if (!fb.addressed) fb.addressed = true; // optimistic; next review will verify
          }

          // Reset approvals for next iteration — code changed
          approvedBy.length = 0;
        } catch (err) {
          log(
            createMessage(
              'coder',
              'reviewer',
              'feedback',
              `코드 수정 실패: ${(err as Error).message}`,
            ),
          );
          break;
        }
      }
    }
  }

  // ── Step 5: Optional tester/security passes (if in roles but not yet run) ──
  const optionalRoles: AIRole[] = ['tester', 'security'];
  for (const optRole of optionalRoles) {
    if (signal?.aborted) break;
    if (!cfg.roles.includes(optRole)) continue;
    // Already ran as reviewer above; skip if already in conversation
    if (conversation.some((m) => m.from === optRole)) continue;

    try {
      const promptContent =
        optRole === 'tester'
          ? buildTesterPrompt(currentCode)
          : buildSecurityPrompt(currentCode);

      const response = await executeWithRole(optRole, {
        systemInstruction: '',
        messages: [{ role: 'user', content: promptContent }],
        temperature: 0.3,
        signal,
        onChunk: () => {},
      });

      const parsed = parseReviewResponse(response);
      if (parsed.approved) {
        log(createMessage(optRole, 'coder', 'approval', parsed.summary));
        approvedBy.push(optRole);
      } else {
        log(createMessage(optRole, 'coder', 'rejection', parsed.summary));
        allRejectedFindings.push(...parsed.findings);
      }
    } catch {
      // Optional steps — failure is acceptable
    }
  }

  return {
    finalCode: currentCode,
    iterations: iteration,
    conversation,
    approved,
    approvedBy,
    rejectedFindings: allRejectedFindings,
    totalTimeMs: Math.round(performance.now() - startTime),
    iterationScores,
    lineByLineFeedback: allLineByLineFeedback,
    reviewerConfidence: lastReviewerConfidence,
  };
}
