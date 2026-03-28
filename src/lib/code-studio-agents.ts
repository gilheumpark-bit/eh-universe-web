// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { streamChat } from '@/lib/ai-providers';

// Re-export for consumers that need provider info alongside agent sessions.
export { getApiKey, getActiveProvider } from '@/lib/ai-providers';

/** Agent role identifiers for the multi-agent pipeline. */
export type AgentRole = 'architect' | 'developer' | 'reviewer' | 'tester' | 'documenter';

/** A single message produced by an agent during a session. */
export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: number;
  confidence: number; // 0-1, computed from response characteristics
}

/** Tracks a disagreement or issue found between agents. */
export interface ConflictEntry {
  between: [AgentRole, AgentRole];
  description: string;
  resolved: boolean;
}

/** Summary produced after pipeline completion. */
export interface SessionSummary {
  totalAgentsRun: number;
  totalTokensEstimate: number;
  conflictsFound: number;
  finalConfidence: number;
  durationMs: number;
}

/** Tracks the full lifecycle of a multi-agent code generation run. */
export interface AgentSession {
  id: string;
  task: string;
  agents: AgentRole[];
  messages: AgentMessage[];
  status: 'idle' | 'running' | 'done' | 'error';
  finalOutput?: string;
  conflicts: ConflictEntry[];
  summary?: SessionSummary;
}

// IDENTITY_SEAL: PART-1 | role=TypeDefinitions | inputs=none | outputs=AgentRole,AgentMessage,ConflictEntry,SessionSummary,AgentSession

// ============================================================
// PART 2 — Agent System Prompts
// ============================================================

/**
 * System prompt for each agent role.
 * Each prompt constrains the agent to its specific responsibility
 * so that the sequential pipeline produces coherent, layered output.
 */
export const AGENT_PROMPTS: Record<AgentRole, string> = {
  architect: [
    'You are a software architect agent.',
    'Your responsibility: design the overall structure of the solution.',
    'Define modules, interfaces, data flow, and key architectural decisions.',
    'Output a clear design document that a developer can implement from.',
    'Do NOT write implementation code — only interfaces, type signatures, and structural diagrams (pseudo or textual).',
    'Be explicit about trade-offs and assumptions.',
  ].join('\n'),

  developer: [
    'You are a developer agent.',
    'You receive an architectural design and implement it as production-quality code.',
    'Follow the interfaces and structure defined by the architect exactly.',
    'Write clean, typed, well-structured code.',
    'Include inline comments only where logic is non-obvious.',
    'Do NOT add tests or documentation — other agents handle those.',
  ].join('\n'),

  reviewer: [
    'You are a code reviewer agent.',
    'Inspect the code for bugs, security vulnerabilities, performance issues, and best-practice violations.',
    'Return a structured review with:',
    '  - severity (critical / warning / info)',
    '  - location (file or function name)',
    '  - description of the issue',
    '  - suggested fix',
    'If the code is clean, state that explicitly with brief reasoning.',
  ].join('\n'),

  tester: [
    'You are a test engineer agent.',
    'Write comprehensive test cases for the provided code.',
    'Cover: happy path, edge cases, error handling, and boundary conditions.',
    'Use the testing conventions already present in the codebase (Jest / Vitest style preferred).',
    'Each test should have a clear description of what it verifies.',
  ].join('\n'),

  documenter: [
    'You are a documentation agent.',
    'Write JSDoc comments for all exported functions, types, and classes in the provided code.',
    'Also produce a concise README section covering:',
    '  - Purpose',
    '  - Usage example',
    '  - API reference (brief)',
    'Keep documentation accurate and tightly coupled to the actual implementation.',
  ].join('\n'),
};

// IDENTITY_SEAL: PART-2 | role=AgentPrompts | inputs=none | outputs=AGENT_PROMPTS

// ============================================================
// PART 3 — Session Factory & Helpers
// ============================================================

/** Default agent pipeline order when no custom roles are provided. */
const DEFAULT_ROLES: AgentRole[] = ['architect', 'developer', 'reviewer'];

/** Execution order — agents run in this sequence regardless of input order. */
const ROLE_ORDER: AgentRole[] = ['architect', 'developer', 'reviewer', 'tester', 'documenter'];

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new agent session in idle state.
 */
export function createAgentSession(
  task: string,
  roles: AgentRole[] = DEFAULT_ROLES,
): AgentSession {
  return {
    id: generateId(),
    task,
    agents: [...roles],
    messages: [],
    status: 'idle',
    conflicts: [],
  };
}

// IDENTITY_SEAL: PART-3 | role=SessionFactory | inputs=task,roles | outputs=AgentSession

// ============================================================
// PART 4 — Confidence Scoring
// ============================================================

/** 헷징 표현 패턴 — 이 표현이 많을수록 확신도가 낮다 */
const HEDGING_PATTERNS = [
  /\bmaybe\b/gi,
  /\bmight\b/gi,
  /\bnot sure\b/gi,
  /\bpossibly\b/gi,
  /\bperhaps\b/gi,
  /\bcould be\b/gi,
  /\bI think\b/gi,
  /\bprobably\b/gi,
  /\buncertain\b/gi,
];

/**
 * 에이전트 응답의 확신도를 0-1 범위로 계산한다.
 *
 * 요소:
 * - 응답 길이: 너무 짧으면 낮음
 * - 헷징 언어: 많을수록 감점
 * - 코드 비율: 코드가 많으면 가점 (developer/tester 등)
 */
function computeConfidence(content: string): number {
  if (!content || content.length < 20) return 0.1;

  let score = 0.7; // 기본값

  // 길이 보정: 100자 미만이면 감점, 500자 이상이면 가점
  if (content.length < 100) {
    score -= 0.15;
  } else if (content.length > 500) {
    score += 0.1;
  }

  // 헷징 패턴 감점
  let hedgeCount = 0;
  for (const pat of HEDGING_PATTERNS) {
    pat.lastIndex = 0;
    const matches = content.match(pat);
    if (matches) hedgeCount += matches.length;
  }
  score -= Math.min(0.3, hedgeCount * 0.05);

  // 코드 존재 가점: 중괄호/세미콜론이 많으면 구체적 코드 출력일 가능성
  const codeChars = (content.match(/[{};()=>]/g) ?? []).length;
  const codeRatio = codeChars / content.length;
  if (codeRatio > 0.02) {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, parseFloat(score.toFixed(2))));
}

// IDENTITY_SEAL: PART-4 | role=ConfidenceScoring | inputs=content | outputs=confidenceNumber

// ============================================================
// PART 5 — Feedback Loop Detection
// ============================================================

/** 리뷰어 거부 패턴 */
const REJECTION_PATTERNS = [
  /should be changed/i,
  /incorrect/i,
  /\bbug\b/i,
  /\berror\b/i,
  /security vulnerabilit/i,
  /critical/i,
  /must fix/i,
  /needs to be fixed/i,
];

/** 테스트 실패 패턴 */
const TEST_FAILURE_PATTERNS = [
  /test fail/i,
  /assertion fail/i,
  /expect.*to(Be|Equal|Match|Have|Throw)/i,
  /FAIL/,
  /✗|✘|×/,
  /Error:/,
];

function detectRejection(content: string): boolean {
  return REJECTION_PATTERNS.some(p => p.test(content));
}

function detectTestFailure(content: string): boolean {
  return TEST_FAILURE_PATTERNS.some(p => p.test(content));
}

// IDENTITY_SEAL: PART-5 | role=FeedbackLoopDetection | inputs=agentOutput | outputs=boolean

// ============================================================
// PART 6 — Conflict Tracking
// ============================================================

/**
 * 리뷰어가 아키텍트 설계와 충돌하는지 검사한다.
 * 리뷰어 출력에서 아키텍처 관련 이슈가 언급되면 충돌로 기록한다.
 */
function detectArchitectReviewerConflict(reviewerContent: string): string | null {
  const patterns = [
    /architect.*wrong/i,
    /design.*flaw/i,
    /interface.*incorrect/i,
    /structure.*should/i,
    /redesign/i,
  ];
  for (const p of patterns) {
    if (p.test(reviewerContent)) {
      return 'Reviewer identified architectural design issues';
    }
  }
  return null;
}

/**
 * 테스터가 개발자가 놓친 버그를 발견했는지 검사한다.
 */
function detectTesterDeveloperConflict(testerContent: string): string | null {
  if (detectTestFailure(testerContent)) {
    return 'Tester found failures in developer implementation';
  }
  return null;
}

// IDENTITY_SEAL: PART-6 | role=ConflictTracking | inputs=agentContent | outputs=conflictDescription|null

// ============================================================
// PART 7 — Pipeline Execution
// ============================================================

/**
 * Build the user-message payload for an agent, including all prior agent outputs as context.
 */
function buildAgentInput(
  task: string,
  codeContext: string,
  priorMessages: AgentMessage[],
): string {
  const sections: string[] = [];

  sections.push(`## Task\n${task}`);

  if (codeContext.trim()) {
    sections.push(`## Existing Code Context\n\`\`\`\n${codeContext}\n\`\`\``);
  }

  for (const msg of priorMessages) {
    sections.push(`## Output from ${msg.role}\n${msg.content}`);
  }

  return sections.join('\n\n');
}

/**
 * 단일 에이전트를 실행하고 AgentMessage를 반환한다.
 */
async function runSingleAgent(
  role: AgentRole,
  userInput: string,
  onMessage: (msg: AgentMessage) => void,
  signal?: AbortSignal,
): Promise<AgentMessage> {
  let accumulated = '';
  const agentMsg: AgentMessage = {
    id: generateId(),
    role,
    content: '',
    timestamp: Date.now(),
    confidence: 0,
  };

  await streamChat({
    systemInstruction: AGENT_PROMPTS[role],
    messages: [{ role: 'user', content: userInput }],
    temperature: role === 'reviewer' ? 0.2 : 0.4,
    signal,
    onChunk(text: string) {
      accumulated += text;
      agentMsg.content = accumulated;
      onMessage({ ...agentMsg });
    },
  });

  agentMsg.content = accumulated;
  agentMsg.timestamp = Date.now();
  agentMsg.confidence = computeConfidence(accumulated);
  return agentMsg;
}

/**
 * 피드백을 포함해서 developer를 재실행한다.
 */
async function rerunDeveloperWithFeedback(
  task: string,
  codeContext: string,
  priorMessages: AgentMessage[],
  feedback: string,
  feedbackSource: AgentRole,
  onMessage: (msg: AgentMessage) => void,
  signal?: AbortSignal,
): Promise<AgentMessage> {
  const base = buildAgentInput(task, codeContext, priorMessages);
  const enhancedInput = [
    base,
    '',
    `## Feedback from ${feedbackSource} (address these issues)`,
    feedback,
  ].join('\n');

  return runSingleAgent('developer', enhancedInput, onMessage, signal);
}

/**
 * Run the multi-agent pipeline sequentially.
 *
 * Agents execute in canonical order (architect -> developer -> reviewer -> tester -> documenter),
 * filtered to only those present in `roles`.
 * Each agent receives the accumulated output of all previous agents.
 *
 * **Feedback loop**: After reviewer/tester, if issues detected, developer re-runs once
 * with the feedback incorporated.
 */
export async function runAgentPipeline(
  task: string,
  codeContext: string,
  roles: AgentRole[],
  onMessage: (msg: AgentMessage) => void,
  signal?: AbortSignal,
): Promise<AgentSession> {
  const session = createAgentSession(task, roles);
  session.status = 'running';
  const startTime = Date.now();

  const sortedRoles = ROLE_ORDER.filter((r) => roles.includes(r));

  try {
    for (const role of sortedRoles) {
      if (signal?.aborted) {
        throw new DOMException('Agent pipeline aborted', 'AbortError');
      }

      const userInput = buildAgentInput(task, codeContext, session.messages);
      const agentMsg = await runSingleAgent(role, userInput, onMessage, signal);
      session.messages.push(agentMsg);

      // --- Feedback loop: reviewer -> developer ---
      if (role === 'reviewer' && detectRejection(agentMsg.content)) {
        // 충돌 기록
        const archConflict = detectArchitectReviewerConflict(agentMsg.content);
        if (archConflict) {
          session.conflicts.push({
            between: ['architect', 'reviewer'],
            description: archConflict,
            resolved: false,
          });
        }

        // developer 재실행 (1회)
        if (roles.includes('developer')) {
          const fixMsg = await rerunDeveloperWithFeedback(
            task, codeContext, session.messages, agentMsg.content, 'reviewer', onMessage, signal,
          );
          session.messages.push(fixMsg);

          // 충돌을 resolved로 마킹 (developer가 수정 시도했으므로)
          for (const c of session.conflicts) {
            if (!c.resolved && c.between.includes('reviewer')) {
              c.resolved = true;
            }
          }
        }
      }

      // --- Feedback loop: tester -> developer ---
      if (role === 'tester' && detectTestFailure(agentMsg.content)) {
        const testerConflict = detectTesterDeveloperConflict(agentMsg.content);
        if (testerConflict) {
          session.conflicts.push({
            between: ['developer', 'tester'],
            description: testerConflict,
            resolved: false,
          });
        }

        if (roles.includes('developer')) {
          const fixMsg = await rerunDeveloperWithFeedback(
            task, codeContext, session.messages, agentMsg.content, 'tester', onMessage, signal,
          );
          session.messages.push(fixMsg);

          for (const c of session.conflicts) {
            if (!c.resolved && c.between.includes('tester')) {
              c.resolved = true;
            }
          }
        }
      }
    }

    session.status = 'done';
    session.finalOutput = session.messages.at(-1)?.content ?? '';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      session.status = 'error';
      session.finalOutput = '[Pipeline aborted by user]';
    } else {
      session.status = 'error';
      session.finalOutput = err instanceof Error ? err.message : String(err);
    }
  }

  // Session summary
  const totalTokens = session.messages.reduce(
    (sum, m) => sum + Math.ceil(m.content.length / 4), 0,
  );
  const avgConfidence = session.messages.length > 0
    ? session.messages.reduce((sum, m) => sum + m.confidence, 0) / session.messages.length
    : 0;

  session.summary = {
    totalAgentsRun: session.messages.length,
    totalTokensEstimate: totalTokens,
    conflictsFound: session.conflicts.length,
    finalConfidence: parseFloat(avgConfidence.toFixed(2)),
    durationMs: Date.now() - startTime,
  };

  return session;
}

// IDENTITY_SEAL: PART-7 | role=PipelineExecution | inputs=task,codeContext,roles,onMessage,signal | outputs=AgentSession
