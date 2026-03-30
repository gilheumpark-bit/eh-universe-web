// ============================================================
// Code Studio — Model Router
// ============================================================
// 작업 유형별 적절한 모델 라우팅 (저가→빠른 모델, 복잡→고품질 모델).

import { type ProviderId, PROVIDERS, getApiKey, getActiveProvider } from '@/lib/ai-providers';

// ============================================================
// PART 1 — Types & Task Classification
// ============================================================

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';

export type TaskType =
  | 'autocomplete'      // inline code completion
  | 'chat'              // general conversation
  | 'code-generation'   // generating new code
  | 'code-review'       // reviewing existing code
  | 'debugging'         // fixing bugs
  | 'refactoring'       // restructuring code
  | 'explanation'       // explaining code
  | 'documentation'     // writing docs
  | 'testing'           // generating tests
  | 'architecture'      // system design
  | 'translation';      // natural language translation

interface RoutingRule {
  taskType: TaskType;
  complexity: TaskComplexity;
  preferredCostTier: 'free' | 'cheap' | 'moderate' | 'expensive';
  minContextTokens: number;
  preferStreaming: boolean;
}

const ROUTING_TABLE: RoutingRule[] = [
  { taskType: 'autocomplete',    complexity: 'trivial',  preferredCostTier: 'free',      minContextTokens: 4_000,    preferStreaming: true },
  { taskType: 'chat',            complexity: 'simple',   preferredCostTier: 'cheap',     minContextTokens: 32_000,   preferStreaming: true },
  { taskType: 'code-generation', complexity: 'moderate', preferredCostTier: 'moderate',  minContextTokens: 64_000,   preferStreaming: true },
  { taskType: 'code-review',     complexity: 'moderate', preferredCostTier: 'moderate',  minContextTokens: 64_000,   preferStreaming: false },
  { taskType: 'debugging',       complexity: 'complex',  preferredCostTier: 'expensive', minContextTokens: 128_000,  preferStreaming: true },
  { taskType: 'refactoring',     complexity: 'complex',  preferredCostTier: 'expensive', minContextTokens: 128_000,  preferStreaming: true },
  { taskType: 'explanation',     complexity: 'simple',   preferredCostTier: 'cheap',     minContextTokens: 32_000,   preferStreaming: true },
  { taskType: 'documentation',   complexity: 'simple',   preferredCostTier: 'cheap',     minContextTokens: 32_000,   preferStreaming: true },
  { taskType: 'testing',         complexity: 'moderate', preferredCostTier: 'moderate',  minContextTokens: 64_000,   preferStreaming: true },
  { taskType: 'architecture',    complexity: 'expert',   preferredCostTier: 'expensive', minContextTokens: 128_000,  preferStreaming: false },
  { taskType: 'translation',     complexity: 'trivial',  preferredCostTier: 'free',      minContextTokens: 8_000,    preferStreaming: true },
];

// IDENTITY_SEAL: PART-1 | role=TypesClassification | inputs=none | outputs=TaskType,TaskComplexity,RoutingRule

// ============================================================
// PART 2 — Router Logic
// ============================================================

export interface RouteResult {
  providerId: ProviderId;
  model: string;
  reason: string;
  estimatedCost: 'free' | 'cheap' | 'moderate' | 'expensive';
}

/** Find the best available provider for a task */
export function routeTask(taskType: TaskType): RouteResult {
  const rule = ROUTING_TABLE.find(r => r.taskType === taskType) ?? ROUTING_TABLE[1]; // fallback to chat

  // Get providers with available API keys, sorted by cost tier preference
  const available = getAvailableProviders();

  // Try to match preferred cost tier
  const preferred = available.find(p =>
    PROVIDERS[p].capabilities.costTier === rule.preferredCostTier &&
    PROVIDERS[p].capabilities.maxContextTokens >= rule.minContextTokens
  );

  if (preferred) {
    const def = PROVIDERS[preferred];
    return {
      providerId: preferred,
      model: def.defaultModel,
      reason: `Best match for ${taskType} (${rule.preferredCostTier} tier)`,
      estimatedCost: def.capabilities.costTier,
    };
  }

  // Fallback: find any provider meeting context requirements
  const fallback = available.find(p =>
    PROVIDERS[p].capabilities.maxContextTokens >= rule.minContextTokens
  );

  if (fallback) {
    const def = PROVIDERS[fallback];
    return {
      providerId: fallback,
      model: def.defaultModel,
      reason: `Fallback for ${taskType} (meets context requirement)`,
      estimatedCost: def.capabilities.costTier,
    };
  }

  // Last resort: active provider
  const active = getActiveProvider();
  const activeDef = PROVIDERS[active];
  return {
    providerId: active,
    model: activeDef.defaultModel,
    reason: `Active provider fallback for ${taskType}`,
    estimatedCost: activeDef.capabilities.costTier,
  };
}

/** Get list of providers that have API keys configured */
function getAvailableProviders(): ProviderId[] {
  const ids = Object.keys(PROVIDERS) as ProviderId[];
  return ids.filter(id => {
    const key = getApiKey(id);
    return key.trim().length > 0;
  });
}

/** Classify task complexity from user message */
export function classifyTaskType(message: string): TaskType {
  const lower = message.toLowerCase();

  if (/\b(complete|autocomplete|suggest|inline)\b/.test(lower)) return 'autocomplete';
  if (/\b(review|check|audit|inspect)\b/.test(lower)) return 'code-review';
  if (/\b(debug|fix|bug|error|issue|broken)\b/.test(lower)) return 'debugging';
  if (/\b(refactor|restructure|cleanup|reorganize)\b/.test(lower)) return 'refactoring';
  if (/\b(test|spec|coverage|unit test)\b/.test(lower)) return 'testing';
  if (/\b(explain|what does|how does|why)\b/.test(lower)) return 'explanation';
  if (/\b(doc|document|readme|jsdoc|comment)\b/.test(lower)) return 'documentation';
  if (/\b(architect|design|system|structure|plan)\b/.test(lower)) return 'architecture';
  if (/\b(translate|번역|翻译)\b/.test(lower)) return 'translation';
  if (/\b(create|generate|write|build|implement|add|make)\b/.test(lower)) return 'code-generation';

  return 'chat';
}

// IDENTITY_SEAL: PART-2 | role=RouterLogic | inputs=TaskType,message | outputs=RouteResult,TaskType
