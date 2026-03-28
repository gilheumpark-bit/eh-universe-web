// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { streamChat } from '@/lib/ai-providers';

// getApiKey, getActiveProvider are used internally by streamChat.
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
}

/** Tracks the full lifecycle of a multi-agent code generation run. */
export interface AgentSession {
  id: string;
  task: string;
  agents: AgentRole[];
  messages: AgentMessage[];
  status: 'idle' | 'running' | 'done' | 'error';
  finalOutput?: string;
}

// IDENTITY_SEAL: PART-1 | role=type-definitions | inputs=none | outputs=AgentRole,AgentMessage,AgentSession

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

// IDENTITY_SEAL: PART-2 | role=agent-prompts | inputs=none | outputs=AGENT_PROMPTS

// ============================================================
// PART 3 — Session Factory
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
 * @param task  Natural-language description of the coding task
 * @param roles Optional subset/order of agents (defaults to architect + developer + reviewer)
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
  };
}

// IDENTITY_SEAL: PART-3 | role=session-factory | inputs=task,roles | outputs=AgentSession

// ============================================================
// PART 4 — Pipeline Execution
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
 * Run the multi-agent pipeline sequentially.
 *
 * Agents execute in canonical order (architect -> developer -> reviewer -> tester -> documenter),
 * filtered to only those present in `roles`.
 * Each agent receives the accumulated output of all previous agents.
 *
 * @param task         Natural-language task description
 * @param codeContext  Existing code or file contents for reference
 * @param roles        Which agents to include in this run
 * @param onMessage    Callback fired each time an agent produces output
 * @param signal       Optional AbortSignal to cancel the pipeline mid-run
 * @returns            The completed session
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

  // Sort requested roles into canonical execution order
  const sortedRoles = ROLE_ORDER.filter((r) => roles.includes(r));

  try {
    for (const role of sortedRoles) {
      if (signal?.aborted) {
        throw new DOMException('Agent pipeline aborted', 'AbortError');
      }

      const userInput = buildAgentInput(task, codeContext, session.messages);

      let accumulated = '';
      const agentMsg: AgentMessage = {
        id: generateId(),
        role,
        content: '',
        timestamp: Date.now(),
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

      // Finalize message with complete content
      agentMsg.content = accumulated;
      agentMsg.timestamp = Date.now();
      session.messages.push(agentMsg);
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

  return session;
}

// IDENTITY_SEAL: PART-4 | role=pipeline-execution | inputs=task,codeContext,roles,onMessage,signal | outputs=AgentSession
