/**
 * NOA Code Studio: 4-Tier Orchestration Registry
 * 
 * 1. Ultra     (수석 감사관)
 * 2. Pro Plus  (페어 파트너)
 * 3. Pro       (외과 드론)
 * 4. Basic     (반사 신경)
 */

export type AITier = 't1-auditor' | 't2-composer' | 't3-patcher' | 't4-predictor';

export interface TierConfig {
  role: string;
  temperature: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'json' | 'markdown' | 'raw-code' | 'fim-snippet';
  bypassParsing?: boolean; // Skip markdown parser; mutate buffer directly
  stressTuned?: boolean;   // Enable contextual mood/temperature adjustment based on input stream delta
}

export const TIER_REGISTRY: Record<AITier, TierConfig> = {
  't1-auditor': {
    role: 'SYSTEM_AUDITOR',
    temperature: 0.1, 
    systemPrompt: `[ROLE: SYSTEM_AUDITOR] Analyze the provided AST and dependency graph. Identify O(n) complexity bottlenecks, potential memory leaks, and unchecked boundaries. Return output strictly adhering to 'Auditor_Schema.json' without markdown wrapping or conversational fillers.`,
    responseFormat: 'json',
    bypassParsing: true, 
    stressTuned: false
  },
  't2-composer': {
    role: 'AI_COMPOSER',
    temperature: 0.6,
    systemPrompt: `[ROLE: AI_COMPOSER] Interpret architectural requirements. Output structured markdown containing implementation steps and code blocks. Generate RPC action definitions where manual execution by the user is required.`,
    responseFormat: 'markdown',
    bypassParsing: false,
    stressTuned: true 
  },
  't3-patcher': {
    role: 'INLINE_PATCHER',
    temperature: 0.2,
    systemPrompt: `[ROLE: INLINE_PATCHER] Output pure patch implementation for the given [TARGET_BLOCK]. Do not use markdown backticks, explanations, or greeting strings. Maintain exact indentation relative to the block's parent scope.`,
    responseFormat: 'raw-code',
    bypassParsing: true,
    stressTuned: false
  },
  't4-predictor': {
    role: 'FIM_PREDICTOR',
    temperature: 0,
    maxTokens: 100, 
    // Fill-in-the-middle contextual completion
    responseFormat: 'fim-snippet',
    bypassParsing: true,
    stressTuned: false
  }
};

/**
 * Active Model Overrides
 */
export const ACTIVE_MODEL_OVERRIDES: Partial<Record<AITier, string>> = {};

/**
 * Resolve configuration mapping per requested tier.
 */
/**
 * Auto-select the most appropriate tier for a given task context.
 * Returns the tier ID string that can be passed to resolveTierConfig().
 */
export function selectTierForTask(context: {
  codeLength: number;
  taskType: 'edit' | 'generate' | 'analyze' | 'complete';
  hasErrors?: boolean;
}): AITier {
  // t1-auditor: analysis tasks or error investigation
  if (context.taskType === 'analyze' || context.hasErrors) return 't1-auditor';
  // t2-composer: large code generation or architecture
  if (context.codeLength > 200 || context.taskType === 'generate') return 't2-composer';
  // t3-patcher: medium edits
  if (context.codeLength > 50 && context.taskType === 'edit') return 't3-patcher';
  // t4-predictor: small completions
  return 't4-predictor';
}

export function resolveTierConfig(tier: AITier, currentStressLevel = 0): TierConfig {
  const config = { ...TIER_REGISTRY[tier] };
  
  // Dynamic tuning based on heuristic thresholds (e.g. backspace velocity, test failures)
  if (config.stressTuned && currentStressLevel > 0.7) {
    config.temperature = Math.max(0.2, config.temperature - 0.3);
    config.systemPrompt += `\n[OVERRIDE: HIGH_STRESS_DETECTED] Decrease verbosity. Provide only immediate functional fixes.`;
  }
  
  return config;
}
