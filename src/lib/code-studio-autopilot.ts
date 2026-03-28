// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';

export interface StepValidation {
  passed: boolean;
  reason?: string;
}

export interface AutopilotStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'error';
  output?: string;
  validation?: StepValidation;
  retried?: boolean;
}

export interface AutopilotMetrics {
  totalDurationMs: number;
  totalTokensEstimate: number;
  completedSteps: number;
  failedSteps: number;
}

export interface AutopilotPlan {
  task: string;
  steps: AutopilotStep[];
  status: 'planning' | 'executing' | 'done' | 'error';
  metrics?: AutopilotMetrics;
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

// IDENTITY_SEAL: PART-1 | role=TypeDefinitions | inputs=none | outputs=AutopilotStep,AutopilotPlan,AutopilotMetrics,StepValidation

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

// IDENTITY_SEAL: PART-2 | role=PlanCreation | inputs=task,context,signal | outputs=AutopilotPlan

// ============================================================
// PART 3 — Step Validation
// ============================================================

/**
 * 코드 출력인지 감지: 중괄호/괄호/세미콜론 등 코드 패턴 존재 여부
 */
function looksLikeCode(output: string): boolean {
  const codeIndicators = /[{};()=>]/;
  return codeIndicators.test(output);
}

/**
 * 기본 구문 검사: 중괄호, 괄호, 대괄호의 균형을 확인한다.
 * 문자열 리터럴 내부는 무시하지 않으므로 완벽하지 않다.
 */
function checkBalancedBrackets(code: string): StepValidation {
  const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const closers = new Set(Object.values(pairs));
  const stack: string[] = [];

  for (const ch of code) {
    if (ch in pairs) {
      stack.push(pairs[ch]);
    } else if (closers.has(ch)) {
      if (stack.length === 0 || stack[stack.length - 1] !== ch) {
        return { passed: false, reason: `Unmatched '${ch}' detected` };
      }
      stack.pop();
    }
  }

  if (stack.length > 0) {
    return { passed: false, reason: `Unclosed bracket — expected '${stack[stack.length - 1]}'` };
  }
  return { passed: true };
}

/**
 * 스텝 출력을 검증한다.
 * - 빈/짧은 출력: 실패
 * - 코드 출력: 괄호 균형 검사
 * - 그 외: 통과
 */
function validateStepOutput(output: string | undefined): StepValidation {
  if (output == null || output.trim().length < 10) {
    return { passed: false, reason: 'Output too short or empty (< 10 chars)' };
  }

  if (looksLikeCode(output)) {
    return checkBalancedBrackets(output);
  }

  return { passed: true };
}

// IDENTITY_SEAL: PART-3 | role=StepValidation | inputs=stepOutput | outputs=StepValidation

// ============================================================
// PART 4 — Context Accumulation
// ============================================================

/**
 * 완료된 이전 스텝들의 출력을 하나의 컨텍스트 문자열로 합친다.
 */
function buildPriorContext(steps: AutopilotStep[], currentIndex: number): string {
  const completed = steps.slice(0, currentIndex).filter(s => s.status === 'done' && s.output);
  if (completed.length === 0) return '';

  const sections = completed.map((s, i) =>
    `--- Step ${i + 1}: ${s.description} ---\n${s.output}`
  );

  return `\n\n## Prior Step Outputs\n${sections.join('\n\n')}`;
}

// IDENTITY_SEAL: PART-4 | role=ContextAccumulation | inputs=steps,currentIndex | outputs=priorContextString

// ============================================================
// PART 5 — Step Execution (with retry)
// ============================================================

export async function executeAutopilotStep(
  step: AutopilotStep,
  context: string,
  signal?: AbortSignal,
  onChunk?: (text: string) => void,
  priorContext?: string,
): Promise<string> {
  const fullContext = priorContext
    ? `${context}${priorContext}`
    : context;

  let result = '';

  try {
    result = await streamChat({
      systemInstruction: STEP_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Step: ${step.description}\n\nProject context:\n${fullContext}`,
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

/**
 * 실패한 스텝을 에러 컨텍스트와 함께 1회 재시도한다.
 */
async function retryStep(
  step: AutopilotStep,
  context: string,
  errorReason: string,
  signal?: AbortSignal,
  onChunk?: (text: string) => void,
  priorContext?: string,
): Promise<string> {
  const retryContext = priorContext
    ? `${context}${priorContext}`
    : context;

  const retryPrompt = [
    `Step: ${step.description}`,
    '',
    `Previous attempt failed: ${errorReason}`,
    'Please fix the issue and produce correct, complete output.',
    '',
    `Project context:\n${retryContext}`,
  ].join('\n');

  let result = '';

  try {
    result = await streamChat({
      systemInstruction: STEP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: retryPrompt }],
      temperature: 0.3,
      signal,
      onChunk: (text) => {
        if (onChunk) onChunk(text);
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error(
      `Retry for "${step.description}" failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return stripCodeFences(result);
}

// IDENTITY_SEAL: PART-5 | role=StepExecution | inputs=step,context,signal,onChunk,priorContext | outputs=codeString

// ============================================================
// PART 6 — Full Autopilot Runner
// ============================================================

/**
 * 메트릭 초기값을 생성한다.
 */
function createEmptyMetrics(): AutopilotMetrics {
  return {
    totalDurationMs: 0,
    totalTokensEstimate: 0,
    completedSteps: 0,
    failedSteps: 0,
  };
}

/**
 * 단일 스텝 실행 + 검증 + 재시도 루프.
 * 성공 시 true, 최종 실패 시 false.
 */
async function executeAndValidateStep(
  step: AutopilotStep,
  stepIndex: number,
  plan: AutopilotPlan,
  context: string,
  onProgress: (plan: AutopilotPlan) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const prior = buildPriorContext(plan.steps, stepIndex);

  // 1차 시도
  const output = await executeAutopilotStep(step, context, signal, undefined, prior);
  step.output = output;

  const validation = validateStepOutput(output);
  step.validation = validation;

  // 검증 통과
  if (validation.passed) {
    step.status = 'done';
    return true;
  }

  // 검증 실패 — 1회 재시도
  step.retried = true;
  onProgress({ ...plan, steps: [...plan.steps] });

  try {
    const retryOutput = await retryStep(
      step, context, validation.reason ?? 'Validation failed', signal, undefined, prior,
    );
    step.output = retryOutput;

    const retryValidation = validateStepOutput(retryOutput);
    step.validation = retryValidation;

    if (retryValidation.passed) {
      step.status = 'done';
      return true;
    }

    // 재시도도 실패
    step.status = 'error';
    step.output = `Retry also failed: ${retryValidation.reason ?? 'Unknown'}`;
    return false;
  } catch (err) {
    step.status = 'error';
    step.output = err instanceof Error ? err.message : String(err);
    return false;
  }
}

export async function runAutopilot(
  task: string,
  context: string,
  onProgress: (plan: AutopilotPlan) => void,
  signal?: AbortSignal,
): Promise<AutopilotPlan> {
  const startTime = Date.now();

  // Phase 1: Plan
  const plan = await createAutopilotPlan(task, context, signal);
  plan.metrics = createEmptyMetrics();
  onProgress({ ...plan });

  if (plan.status === 'error') return plan;

  // Phase 2: Execute each step sequentially
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    if (signal?.aborted) {
      step.status = 'error';
      step.output = 'Aborted';
      plan.status = 'error';
      onProgress({ ...plan, steps: [...plan.steps] });
      break;
    }

    step.status = 'running';
    onProgress({ ...plan, steps: [...plan.steps] });

    try {
      const success = await executeAndValidateStep(
        step, i, plan, context, onProgress, signal,
      );

      if (success) {
        plan.metrics!.completedSteps++;
        plan.metrics!.totalTokensEstimate += Math.ceil((step.output?.length ?? 0) / 4);
      } else {
        plan.metrics!.failedSteps++;
        plan.status = 'error';
        onProgress({ ...plan, steps: [...plan.steps] });
        break;
      }
    } catch (err) {
      step.status = 'error';
      step.output = err instanceof Error ? err.message : String(err);
      plan.metrics!.failedSteps++;
      plan.status = 'error';
      onProgress({ ...plan, steps: [...plan.steps] });
      break;
    }

    onProgress({ ...plan, steps: [...plan.steps] });
  }

  // Finalize
  if (plan.status === 'executing') {
    plan.status = 'done';
  }
  plan.metrics!.totalDurationMs = Date.now() - startTime;
  onProgress({ ...plan, steps: [...plan.steps] });
  return plan;
}

// IDENTITY_SEAL: PART-6 | role=FullAutopilotRunner | inputs=task,context,onProgress,signal | outputs=AutopilotPlan

// ============================================================
// PART 7 — Resume from Step
// ============================================================

/**
 * 특정 스텝 인덱스부터 재개한다.
 * 이전 스텝은 이미 완료된 것으로 간주하고 컨텍스트로 활용한다.
 *
 * @param plan         기존 Plan (steps에 이전 결과가 남아있어야 함)
 * @param fromIndex    재시작할 스텝 인덱스 (0-based)
 * @param context      프로젝트 컨텍스트
 * @param onProgress   진행 콜백
 * @param signal       AbortSignal
 */
export async function runAutopilotFromStep(
  plan: AutopilotPlan,
  fromIndex: number,
  context: string,
  onProgress: (plan: AutopilotPlan) => void,
  signal?: AbortSignal,
): Promise<AutopilotPlan> {
  const startTime = Date.now();
  const safeFrom = Math.max(0, Math.min(fromIndex, plan.steps.length));

  if (!plan.metrics) {
    plan.metrics = createEmptyMetrics();
  }

  plan.status = 'executing';

  // fromIndex 이전 스텝의 메트릭 재집계
  plan.metrics.completedSteps = 0;
  plan.metrics.failedSteps = 0;
  plan.metrics.totalTokensEstimate = 0;
  for (let i = 0; i < safeFrom; i++) {
    const s = plan.steps[i];
    if (s.status === 'done') {
      plan.metrics.completedSteps++;
      plan.metrics.totalTokensEstimate += Math.ceil((s.output?.length ?? 0) / 4);
    }
  }

  // 재개 대상 스텝을 pending으로 초기화
  for (let i = safeFrom; i < plan.steps.length; i++) {
    plan.steps[i].status = 'pending';
    plan.steps[i].output = undefined;
    plan.steps[i].validation = undefined;
    plan.steps[i].retried = undefined;
  }

  onProgress({ ...plan, steps: [...plan.steps] });

  for (let i = safeFrom; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    if (signal?.aborted) {
      step.status = 'error';
      step.output = 'Aborted';
      plan.status = 'error';
      onProgress({ ...plan, steps: [...plan.steps] });
      break;
    }

    step.status = 'running';
    onProgress({ ...plan, steps: [...plan.steps] });

    try {
      const success = await executeAndValidateStep(
        step, i, plan, context, onProgress, signal,
      );

      if (success) {
        plan.metrics!.completedSteps++;
        plan.metrics!.totalTokensEstimate += Math.ceil((step.output?.length ?? 0) / 4);
      } else {
        plan.metrics!.failedSteps++;
        plan.status = 'error';
        onProgress({ ...plan, steps: [...plan.steps] });
        break;
      }
    } catch (err) {
      step.status = 'error';
      step.output = err instanceof Error ? err.message : String(err);
      plan.metrics!.failedSteps++;
      plan.status = 'error';
      onProgress({ ...plan, steps: [...plan.steps] });
      break;
    }

    onProgress({ ...plan, steps: [...plan.steps] });
  }

  if (plan.status === 'executing') {
    plan.status = 'done';
  }
  plan.metrics!.totalDurationMs += Date.now() - startTime;
  onProgress({ ...plan, steps: [...plan.steps] });
  return plan;
}

// IDENTITY_SEAL: PART-7 | role=ResumeFromStep | inputs=plan,fromIndex,context,onProgress,signal | outputs=AutopilotPlan

// ============================================================
// PART 8 — Utilities
// ============================================================

/** 마크다운 코드 펜스(```...```)가 감싸져 있으면 제거 */
function stripCodeFences(code: string): string {
  const trimmed = code.trim();
  const fenceMatch = trimmed.match(/^```[\w]*\n([\s\S]*?)\n```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

// IDENTITY_SEAL: PART-8 | role=Utilities | inputs=code | outputs=strippedCode
