// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';

export interface AutopilotStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'error';
  output?: string;
}

export interface AutopilotPlan {
  task: string;
  steps: AutopilotStep[];
  status: 'planning' | 'executing' | 'done' | 'error';
}

const PLAN_SYSTEM_PROMPT = `You are an autonomous code generation planner.
Given a task description and project context, break the task into 3-5 atomic steps.
Each step must produce exactly one complete function, component, or module.
Respond ONLY with a JSON array of step descriptions. No markdown, no explanation.
Example: ["Create the UserCard component with props interface","Create the fetchUser async function","Create the UserList component that uses UserCard and fetchUser"]`;

const STEP_SYSTEM_PROMPT = `You are an autonomous code generator.
You receive a single atomic step description and project context.
Output ONLY the code that implements the step. No explanations, no markdown fences, no comments about what you're doing.
Produce a complete, self-contained function or component.
Use TypeScript. Include necessary imports.`;

// ============================================================
// PART 2 — Plan Creation
// ============================================================

function generateStepId(): string {
  return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseStepsFromResponse(raw: string): string[] {
  const trimmed = raw.trim();

  // JSON 배열 직접 파싱 시도
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(s => typeof s === 'string')) {
      return parsed.slice(0, 5);
    }
  } catch { /* fallback below */ }

  // JSON 블록이 마크다운 코드 펜스 안에 있을 경우
  const jsonMatch = trimmed.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((s): s is string => typeof s === 'string').slice(0, 5);
      }
    } catch { /* fallback below */ }
  }

  // 줄 단위 fallback — 숫자/불릿 접두어 제거
  const lines = trimmed
    .split('\n')
    .map(l => l.replace(/^[\s\-*\d.)\]]+/, '').trim())
    .filter(l => l.length > 5);

  if (lines.length >= 2) return lines.slice(0, 5);

  // 최소 1단계 보장
  return ['Implement the requested task'];
}

export async function createAutopilotPlan(
  task: string,
  context: string,
  signal?: AbortSignal,
): Promise<AutopilotPlan> {
  const plan: AutopilotPlan = {
    task,
    steps: [],
    status: 'planning',
  };

  let response = '';

  try {
    response = await streamChat({
      systemInstruction: PLAN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Task: ${task}\n\nProject context:\n${context}`,
        },
      ],
      temperature: 0.3,
      signal,
      onChunk: () => { /* planning 단계는 스트림 노출 불필요 */ },
    });
  } catch (err) {
    plan.status = 'error';
    plan.steps = [{
      id: generateStepId(),
      description: 'Planning failed',
      status: 'error',
      output: err instanceof Error ? err.message : String(err),
    }];
    return plan;
  }

  const descriptions = parseStepsFromResponse(response);
  plan.steps = descriptions.map(desc => ({
    id: generateStepId(),
    description: desc,
    status: 'pending' as const,
  }));
  plan.status = 'executing';

  return plan;
}

// ============================================================
// PART 3 — Step Execution
// ============================================================

export async function executeAutopilotStep(
  step: AutopilotStep,
  context: string,
  signal?: AbortSignal,
  onChunk?: (text: string) => void,
): Promise<string> {
  let result = '';

  try {
    result = await streamChat({
      systemInstruction: STEP_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Step: ${step.description}\n\nProject context:\n${context}`,
        },
      ],
      temperature: 0.4,
      signal,
      onChunk: (text) => {
        if (onChunk) onChunk(text);
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error(
      `Step "${step.description}" failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return stripCodeFences(result);
}

// ============================================================
// PART 4 — Full Autopilot Runner
// ============================================================

export async function runAutopilot(
  task: string,
  context: string,
  onProgress: (plan: AutopilotPlan) => void,
  signal?: AbortSignal,
): Promise<AutopilotPlan> {
  // Phase 1: Plan
  const plan = await createAutopilotPlan(task, context, signal);
  onProgress({ ...plan });

  if (plan.status === 'error') return plan;

  // Phase 2: Execute each step sequentially
  for (const step of plan.steps) {
    if (signal?.aborted) {
      step.status = 'error';
      step.output = 'Aborted';
      plan.status = 'error';
      onProgress({ ...plan, steps: [...plan.steps] });
      return plan;
    }

    step.status = 'running';
    onProgress({ ...plan, steps: [...plan.steps] });

    try {
      const output = await executeAutopilotStep(step, context, signal);
      step.status = 'done';
      step.output = output;
    } catch (err) {
      step.status = 'error';
      step.output = err instanceof Error ? err.message : String(err);
      plan.status = 'error';
      onProgress({ ...plan, steps: [...plan.steps] });
      return plan;
    }

    onProgress({ ...plan, steps: [...plan.steps] });
  }

  plan.status = 'done';
  onProgress({ ...plan, steps: [...plan.steps] });
  return plan;
}

// ============================================================
// PART 5 — Utilities
// ============================================================

/** 마크다운 코드 펜스(```...```)가 감싸져 있으면 제거 */
function stripCodeFences(code: string): string {
  const trimmed = code.trim();
  const fenceMatch = trimmed.match(/^```[\w]*\n([\s\S]*?)\n```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

// IDENTITY_SEAL: code-studio-autopilot | role=autonomous multi-step code generation engine | inputs=task,context,signal,onProgress | outputs=AutopilotPlan
