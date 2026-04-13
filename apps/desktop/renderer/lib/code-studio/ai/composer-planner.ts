/**
 * composer-planner.ts — AI-driven multi-file composition planner
 *
 * Uses the team-leader agent role to analyze scope, plan steps,
 * and determine file modification order.
 */

import { streamChat } from '@/lib/ai-providers';
import type { ChangeScope } from '@/lib/code-studio/core/dependency-analyzer';

// ============================================================
// PART 1 — Types
// ============================================================

export interface PlanStep {
  fileId: string;
  fileName: string;
  action: 'modify' | 'create' | 'delete';
  description: string;
  dependencies: string[];
}

export interface CompositionPlan {
  id: string;
  instruction: string;
  scope: ChangeScope;
  steps: PlanStep[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  summary: string;
}

// ============================================================
// PART 2 — Plan generation
// ============================================================

const PLANNER_SYSTEM = `You are a senior software architect planning a multi-file code modification.
Given a user instruction, a list of files, and their dependency graph, produce a structured JSON plan.

Output ONLY valid JSON in this format:
{
  "summary": "one-line description of the overall change",
  "complexity": "low" | "medium" | "high",
  "steps": [
    {
      "fileId": "<id>",
      "fileName": "<name>",
      "action": "modify" | "create" | "delete",
      "description": "what to change in this file and why",
      "dependencies": ["<fileId that must be changed first>"]
    }
  ]
}

Rules:
- Order steps so dependencies are processed first
- Each step description should be specific and actionable
- Mark complexity based on number of files and cross-file impact
- If a file doesn't need changes, omit it from steps`;

export async function generatePlan(
  instruction: string,
  scope: ChangeScope,
  fileContents: Map<string, { id: string; name: string; content: string }>,
  signal?: AbortSignal,
): Promise<CompositionPlan> {
  const fileDescriptions = scope.executionOrder
    .map((id) => {
      const file = fileContents.get(id);
      if (!file) return null;
      const preview = file.content.slice(0, 500);
      return `File: ${file.name} (id: ${id})\nPreview:\n${preview}\n---`;
    })
    .filter(Boolean)
    .join('\n\n');

  const depGraph = scope.executionOrder
    .map((id) => {
      const file = fileContents.get(id);
      const isPrimary = scope.primaryFiles.includes(id);
      return `${file?.name ?? id}: ${isPrimary ? '[PRIMARY]' : '[DEPENDENT]'}`;
    })
    .join('\n');

  let result = '';
  await streamChat({
    systemInstruction: PLANNER_SYSTEM,
    messages: [{
      role: 'user',
      content: `Instruction: ${instruction}\n\nFiles in scope:\n${depGraph}\n\nFile contents:\n${fileDescriptions}`,
    }],
    temperature: 0.3,
    maxTokens: 2000,
    signal,
    onChunk: (chunk) => { result += chunk; },
  });

  // Parse JSON from response
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback: simple plan from scope
    return buildFallbackPlan(instruction, scope, fileContents);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      complexity?: string;
      steps?: PlanStep[];
    };

    return {
      id: `plan-${Date.now()}`,
      instruction,
      scope,
      steps: parsed.steps ?? buildFallbackSteps(scope, fileContents),
      estimatedComplexity: (parsed.complexity as CompositionPlan['estimatedComplexity']) ?? 'medium',
      summary: parsed.summary ?? instruction,
    };
  } catch {
    return buildFallbackPlan(instruction, scope, fileContents);
  }
}

// ============================================================
// PART 3 — Fallback plan (no AI)
// ============================================================

function buildFallbackPlan(
  instruction: string,
  scope: ChangeScope,
  fileContents: Map<string, { id: string; name: string; content: string }>,
): CompositionPlan {
  return {
    id: `plan-${Date.now()}`,
    instruction,
    scope,
    steps: buildFallbackSteps(scope, fileContents),
    estimatedComplexity: scope.executionOrder.length > 5 ? 'high' : scope.executionOrder.length > 2 ? 'medium' : 'low',
    summary: instruction,
  };
}

function buildFallbackSteps(
  scope: ChangeScope,
  fileContents: Map<string, { id: string; name: string; content: string }>,
): PlanStep[] {
  return scope.executionOrder.map((id) => {
    const file = fileContents.get(id);
    return {
      fileId: id,
      fileName: file?.name ?? id,
      action: 'modify' as const,
      description: `Apply changes as described in the instruction`,
      dependencies: [],
    };
  });
}
