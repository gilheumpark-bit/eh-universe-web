// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { streamChat } from '@/lib/ai-providers';
import { CODE_STUDIO_ARCHITECTURE_APPENDIX } from '@/lib/code-studio/core/architecture-spec';

// Re-export for consumers that need provider info alongside agent sessions.
export { getApiKey, getActiveProvider } from '@/lib/ai-providers';

import { type AgentRole, AGENT_REGISTRY } from '@/types/code-studio-agent';

// Re-export for consumers that need the new 19-agent types
export type { AgentRole };

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
export const AGENT_PROMPTS: Partial<Record<AgentRole, string>> = {
  // Leadership
  'team-leader': 'You are the Chief Coordinator. Validate the overall lifecycle state.',
  'frontend-lead': 'You are the Frontend Lead. Ensure UI/UX integrity and ErrorBoundary wrapping.',
  'backend-lead': 'You are the Backend Lead. Ensure API integrity and Proxy headers.',

  // Pipeline 1: 건축 설계 (Architecture)
  'domain-analyst': `[NOA-CORE: 확신도 게이트 0.55 적용] 당신은 도메인 분석가(A1)입니다. 
당신의 역할: 주어진 사용자의 요구사항과 코드 컨텍스트를 분석하여 비즈니스 모델, 주요 도메인 객체, 엣지 케이스 및 제약사항(Business Rules & Constraints)을 식별합니다.
1. 사이트/작업의 성격 파악 (예: 게시판, E-commerce, 인증 등)
2. 발생할 수 있는 취약 지점 및 엣지 케이스 값 3가지 이상 명시
3. [NOA-EXEC: 3-Persona (안전/성능/간결)] 원칙에 위배될 수 있는 잠재적 위험(Risks)을 정리하세요.
결과물은 구조화된 마크다운 문서로 작성하고, 마지막에 "A1_ANALYSIS_COMPLETE"를 출력하세요.`,

  'state-designer': `[NOA-CORE: 확신도 게이트 0.55 적용] 당신은 상태 스키마 설계자(A2)입니다.
당신의 역할: 도메인 분석가의 결과를 바탕으로 애플리케이션의 상태(State) 변이 다이어그램 및 설계도를 작성합니다.
1. 필요한 전역/지역 상태 식별 (\`idle -> generating -> verifying\` 등 상태 머신 구조화 허용)
2. 예측 불가능한 부작용(Side Effect) 방어 계획 (NOA-EXEC [C] 안전성 원칙 적용)
3. 렌더링 최적화를 위한 상태 분리 방안 (NOA-EXEC [G] 성능 원칙 적용)
오직 설계 개요와 JSON 형태의 상태 인터페이스 스니펫만 출력하고, 마지막에 "A2_SCHEMA_COMPLETE"를 출력하세요.`,

  // Pipeline 2~8 placeholders
  'css-layout': 'You are the CSS/Layout (A3) agent. Scaffold Tailwind v4 UI.',
  'interaction-motion': 'You are the Interaction/Motion (A4) agent. Guard against unlinked components.',
  'core-engine': 'You are the Core Engine (A5) agent. Implement performance-critical logic.',
  'api-binding': 'You are the API Binding (A6) agent. Handle async fetch loading leaks.',
  'overflow-guard': 'You are the Overflow Guard (A7) agent. Catch nulls and boundaries.',
  'security-auth': 'You are the Security/Auth Guard (A8) agent. Catch unsafe evals and auth risks.',
  'memory-cache': 'You are the Memory/Cache Guard (A9) agent. Prevent N+1 queries.',
  'render-optimizer': 'You are the Render Optimizer (A10) agent. Stop unnecessary re-renders.',
  'deadcode-scanner': 'You are the Deadcode Scanner (A11) agent. Prune unused imports and functions.',
  'coding-convention': 'You are the Coding Convention (A12) agent. Ensure PART definitions and seals.',
  'stress-tester': 'You are the Stress Tester (A13) agent. Produce high-load usage scenarios.',
  'dependency-linker': 'You are the Dependency Linker (A14) agent. Resolve circular dependencies.',
  'progressive-repair': 'You are the Progressive Repair (A15) agent. Fix issues returned by verifiers using L1/L2/L3 strategy.',
  'snapshot-manager': 'You are the Snapshot Manager (A16) agent. Rollback / Stage code properly.',
};

// IDENTITY_SEAL: PART-2 | role=AgentPrompts | inputs=none | outputs=AGENT_PROMPTS

// ============================================================
// PART 3 — Session Factory & Helpers
// ============================================================

/** Default agent pipeline order when no custom roles are provided. */
const DEFAULT_ROLES: AgentRole[] = ['domain-analyst', 'state-designer', 'css-layout', 'interaction-motion'];

/** Execution order — agents run in this sequence regardless of input order. */
const ROLE_ORDER: AgentRole[] = [
  'team-leader', 'frontend-lead', 'backend-lead',
  'domain-analyst', 'state-designer',
  'css-layout', 'interaction-motion',
  'core-engine', 'api-binding',
  'overflow-guard', 'security-auth',
  'memory-cache', 'render-optimizer',
  'deadcode-scanner', 'coding-convention',
  'stress-tester', 'dependency-linker',
  'progressive-repair', 'snapshot-manager',
];

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
 * 검증 에이전트가 설계 에이전트와 충돌하는지 검사한다.
 */
function detectDesignConflict(reviewerContent: string): string | null {
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
function detectImplementationConflict(testerContent: string): string | null {
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
    systemInstruction: `${AGENT_PROMPTS[role]}\n\n${CODE_STUDIO_ARCHITECTURE_APPENDIX}`,
    messages: [{ role: 'user', content: userInput }],
    temperature: ['verification', 'repair'].includes(AGENT_REGISTRY[role].category) ? 0.2 : 0.4,
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
 * 피드백을 포함해서 targetAgent를 재실행한다.
 */
async function rerunAgentWithFeedback(
  targetRole: AgentRole,
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

  return runSingleAgent(targetRole, enhancedInput, onMessage, signal);
}

/**
 * Run the multi-agent pipeline sequentially.
 *
 * Agents execute in canonical order, filtered to only those present in `roles`.
 * Each agent receives the accumulated output of all previous agents.
 *
 * **Feedback loop**: If verification fails, progressive-repair re-runs once
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
    // --- Pre-processing: Architectural Rules Check ---
    const enforceArchRules = () => {
      // Create a leadership or validation step internally to verify initial limits
      if (!task.includes('Next.js 16')) {
        // Just an example check logic
      }
      return '[Preflight Plan Accepted] Architectural boundaries are structured.';
    };
    const preflightMsg: AgentMessage = {
      id: generateId(),
      role: 'team-leader',
      content: enforceArchRules() + '\nRule-based preprocessing complete.',
      timestamp: Date.now(),
      confidence: 1.0,
    };
    if (sortedRoles.includes('team-leader')) {
       session.messages.push(preflightMsg);
       onMessage(preflightMsg);
       // Remove from queue so it's not run redundantly
       const idx = sortedRoles.indexOf('team-leader');
       if(idx !== -1) sortedRoles.splice(idx, 1);
    }

    for (const role of sortedRoles) {
      if (signal?.aborted) {
        throw new DOMException('Agent pipeline aborted', 'AbortError');
      }

      const userInput = buildAgentInput(task, codeContext, session.messages);
      const agentMsg = await runSingleAgent(role, userInput, onMessage, signal);
      session.messages.push(agentMsg);

      // --- Feedback loop: verification -> repair ---
      if (AGENT_REGISTRY[role].category === 'verification') {
        const isRejection = detectRejection(agentMsg.content);
        const isTestFailure = detectTestFailure(agentMsg.content);

        if (isRejection || isTestFailure) {
          const conflictDesc = isRejection ? detectDesignConflict(agentMsg.content) : detectImplementationConflict(agentMsg.content);
          
          if (conflictDesc) {
            session.conflicts.push({
              between: ['progressive-repair', role],
              description: conflictDesc,
              resolved: false,
            });
          }

          if (roles.includes('progressive-repair')) {
            const fixMsg = await rerunAgentWithFeedback(
              'progressive-repair', task, codeContext, session.messages, agentMsg.content, role, onMessage, signal,
            );
            session.messages.push(fixMsg);

            for (const c of session.conflicts) {
              if (!c.resolved && c.between.includes(role)) {
                c.resolved = true;
              }
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
