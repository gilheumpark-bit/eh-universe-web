import type { ReasoningStage } from './ai-reasoning';

export type ProviderRequestSensitivity = 'low' | 'standard' | 'manuscript' | 'full-text';

export interface ResolveProviderRequestSensitivityInput {
  explicit?: ProviderRequestSensitivity;
  reasoningStage?: ReasoningStage;
  isChatMode?: boolean;
  approxChars?: number;
}

export interface ProviderAutoFallbackInput {
  sensitivity: ProviderRequestSensitivity;
  userPreference: boolean;
}

const MANUSCRIPT_CHAR_THRESHOLD = 1200;
const FULL_TEXT_CHAR_THRESHOLD = 8000;

const MANUSCRIPT_STAGES = new Set<ReasoningStage>([
  'draft',
  'detail',
  'translation',
  'translation-review',
]);

const STANDARD_STAGES = new Set<ReasoningStage>([
  'world',
  'character',
  'scene',
  'direction',
  'summary',
]);

export function estimateProviderRequestChars(
  systemInstruction: string,
  messages: Array<{ content: string }>,
): number {
  return systemInstruction.length + messages.reduce((sum, message) => sum + message.content.length, 0);
}

export function resolveProviderRequestSensitivity(
  input: ResolveProviderRequestSensitivityInput,
): ProviderRequestSensitivity {
  if (input.explicit) return input.explicit;

  const approxChars = input.approxChars ?? 0;
  if (approxChars >= FULL_TEXT_CHAR_THRESHOLD) return 'full-text';

  const stage = input.reasoningStage;
  if (stage && MANUSCRIPT_STAGES.has(stage)) {
    return approxChars >= FULL_TEXT_CHAR_THRESHOLD ? 'full-text' : 'manuscript';
  }

  if (approxChars >= MANUSCRIPT_CHAR_THRESHOLD) return 'manuscript';
  if (stage && STANDARD_STAGES.has(stage)) return 'standard';
  if (input.isChatMode) return 'standard';
  return 'low';
}

export function allowsProviderAutoFallback(input: ProviderAutoFallbackInput): boolean {
  if (!input.userPreference) return false;
  return input.sensitivity === 'low' || input.sensitivity === 'standard';
}

