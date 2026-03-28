// ============================================================
// Code Studio — AI Director: task decomposition & orchestration
// ============================================================

import { streamChat } from '@/lib/ai-providers';
import type { FileNode } from './code-studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export type AIRole =
  | 'coder'
  | 'reviewer'
  | 'tester'
  | 'security'
  | 'architect'
  | 'debugger'
  | 'documenter';

export interface DirectorTask {
  id: string;
  description: string;
  role: AIRole;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: string;
  durationMs?: number;
}

export interface DirectorPlan {
  id: string;
  prompt: string;
  tasks: DirectorTask[];
  mode: 'planning' | 'executing' | 'verifying' | 'complete' | 'error';
  startedAt: number;
  completedAt?: number;
}

export interface DirectorResult {
  plan: DirectorPlan;
  files: Array<{ path: string; content: string; isNew: boolean }>;
  summary: string;
  verificationFailed?: boolean;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DirectorTask,DirectorPlan,DirectorResult

// ============================================================
// PART 2 — Helpers
// ============================================================

function uid(): string {
  return `dir_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function flattenFiles(
  nodes: FileNode[],
  prefix = '',
): Array<{ path: string; content: string }> {
  const result: Array<{ path: string; content: string }> = [];
  for (const node of nodes) {
    const p = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file' && node.content != null) {
      result.push({ path: p, content: node.content });
    }
    if (node.children) {
      result.push(...flattenFiles(node.children, p));
    }
  }
  return result;
}

function summarizeFiles(files: FileNode[]): string {
  const flat = flattenFiles(files);
  return flat
    .map((f) => `- ${f.path} (${f.content.split('\n').length} lines)`)
    .join('\n');
}

// IDENTITY_SEAL: PART-2 | role=helpers | inputs=FileNode[] | outputs=flat list,summary

// ============================================================
// PART 3 — Planning Phase
// ============================================================

const PLAN_SYSTEM =
  'You are an AI Director. Decompose the user request into parallel sub-tasks.\n' +
  'Assign a role to each task: coder, reviewer, tester, security, architect, debugger, documenter.\n' +
  'Respond ONLY with a JSON array: [{"description":"...","role":"coder"}, ...]';

async function planTasks(
  prompt: string,
  filesSummary: string,
  signal?: AbortSignal,
): Promise<DirectorTask[]> {
  let raw = '';
  await streamChat({
    systemInstruction: PLAN_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Project files:\n${filesSummary}\n\nRequest:\n${prompt}`,
      },
    ],
    onChunk: (t) => {
      raw += t;
    },
    signal,
  });

  try {
    const parsed = JSON.parse(raw.trim()) as Array<{
      description: string;
      role: AIRole;
    }>;
    return parsed.map((t) => ({
      id: uid(),
      description: t.description,
      role: t.role,
      status: 'pending' as const,
    }));
  } catch {
    return [
      {
        id: uid(),
        description: prompt,
        role: 'coder',
        status: 'pending',
      },
    ];
  }
}

// IDENTITY_SEAL: PART-3 | role=planning | inputs=prompt,files | outputs=DirectorTask[]

// ============================================================
// PART 4 — Execution Phase
// ============================================================

const EXEC_SYSTEM =
  'You are a precise coding assistant. Given a task description and project context, ' +
  'produce the required code or analysis. If you create/modify files, output them as:\n' +
  '```path/to/file\ncontent\n```';

async function executeTask(
  task: DirectorTask,
  context: string,
  signal?: AbortSignal,
): Promise<string> {
  let result = '';
  await streamChat({
    systemInstruction: EXEC_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Task: ${task.description}\nRole: ${task.role}\n\nContext:\n${context}`,
      },
    ],
    onChunk: (t) => {
      result += t;
    },
    signal,
  });
  return result;
}

function extractFiles(
  output: string,
): Array<{ path: string; content: string; isNew: boolean }> {
  const regex = /```([^\n]+)\n([\s\S]*?)```/g;
  const files: Array<{ path: string; content: string; isNew: boolean }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(output)) !== null) {
    const path = match[1].trim();
    const content = match[2];
    if (path.includes('/') || path.includes('.')) {
      files.push({ path, content, isNew: true });
    }
  }
  return files;
}

// IDENTITY_SEAL: PART-4 | role=execution | inputs=DirectorTask,context | outputs=string,files

// ============================================================
// PART 5 — Public API
// ============================================================

export async function runDirector(
  prompt: string,
  files: FileNode[],
  onProgress?: (plan: DirectorPlan) => void,
  signal?: AbortSignal,
): Promise<DirectorResult> {
  const plan: DirectorPlan = {
    id: uid(),
    prompt,
    tasks: [],
    mode: 'planning',
    startedAt: Date.now(),
  };
  onProgress?.(plan);

  const summary = summarizeFiles(files);
  plan.tasks = await planTasks(prompt, summary, signal);
  plan.mode = 'executing';
  onProgress?.(plan);

  const allFiles: Array<{ path: string; content: string; isNew: boolean }> = [];
  const context = flattenFiles(files)
    .slice(0, 20)
    .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 500)}`)
    .join('\n\n');

  for (const task of plan.tasks) {
    if (signal?.aborted) break;
    task.status = 'running';
    onProgress?.(plan);
    const start = Date.now();
    try {
      task.result = await executeTask(task, context, signal);
      task.status = 'done';
      task.durationMs = Date.now() - start;
      allFiles.push(...extractFiles(task.result));
    } catch (err) {
      task.status = 'error';
      task.result = err instanceof Error ? err.message : String(err);
      task.durationMs = Date.now() - start;
    }
    onProgress?.(plan);
  }

  plan.mode = plan.tasks.some((t) => t.status === 'error') ? 'error' : 'complete';
  plan.completedAt = Date.now();
  onProgress?.(plan);

  return {
    plan,
    files: allFiles,
    summary: plan.tasks
      .map((t) => `[${t.status}] ${t.role}: ${t.description}`)
      .join('\n'),
  };
}

// IDENTITY_SEAL: PART-5 | role=public API | inputs=prompt,FileNode[] | outputs=DirectorResult
