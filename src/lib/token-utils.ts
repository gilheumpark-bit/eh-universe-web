// ============================================================
// Token estimation & context window management
// ============================================================

import type { ChatMsg } from './ai-providers';

// Approximate token counts per character by language
// Korean/CJK: ~1.5 tokens per char, English: ~0.25 tokens per word (~4 chars/token)
/** Estimate token count using CJK density heuristic (~1.5 tok/char CJK, ~0.25 tok/char Latin) */
function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkChars = (text.match(/[\u3000-\u9fff\uac00-\ud7af]/g) || []).length;
  const otherChars = text.length - cjkChars;
  return Math.ceil(cjkChars * 1.5 + otherChars / 4);
}

// Context window limits per provider/model family
const CONTEXT_LIMITS: Record<string, number> = {
  'gemini-2.5-pro': 1048576,
  'gemini-2.5-flash': 1048576,
  'gemini-3.1-pro-preview': 1048576,
  'gemini-3-flash-preview': 1048576,
  'gpt-5.4': 128000,
  'gpt-5.4-mini': 128000,
  'gpt-5.4-nano': 128000,
  'gpt-4.1': 128000,
  'gpt-4o': 128000,
  'claude-sonnet-4-20250514': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'llama-3.3-70b-versatile': 131072,
  'llama-3.1-8b-instant': 131072,
  'qwen-qwq-32b': 32768,
  'mistral-medium-3-latest': 131072,
  'mistral-small-latest': 131072,
  'mistral-large-latest': 131072,
};

const DEFAULT_LIMIT = 128000;

/** @returns Context window token limit for the given model, or 128k default */
export function getContextLimit(model: string): number {
  return CONTEXT_LIMITS[model] ?? DEFAULT_LIMIT;
}

// Reserve tokens for response output
const OUTPUT_RESERVE_RATIO = 0.15; // 15% of context for output
const MIN_OUTPUT_RESERVE = 4096;
const MAX_OUTPUT_RESERVE = 16384;

/**
 * Calculate max output tokens based on remaining context budget.
 * @returns Clamped output token count between MIN_OUTPUT_RESERVE and MAX_OUTPUT_RESERVE
 */
export function getMaxOutputTokens(model: string, systemTokens: number, messageTokens: number): number {
  const limit = getContextLimit(model);
  const used = systemTokens + messageTokens;
  const available = limit - used;

  // Dynamic: use up to 15% of context or remaining space, whichever is smaller
  const reserved = Math.min(
    Math.max(Math.floor(limit * OUTPUT_RESERVE_RATIO), MIN_OUTPUT_RESERVE),
    MAX_OUTPUT_RESERVE
  );

  // Clamp to available space
  return Math.max(MIN_OUTPUT_RESERVE, Math.min(reserved, available));
}

/**
 * Truncate message history to fit within context window.
 * Keeps the most recent messages, drops oldest first.
 * Always preserves the last user message.
 */
export function truncateMessages(
  systemInstruction: string,
  messages: ChatMsg[],
  model: string
): { messages: ChatMsg[]; truncated: boolean; systemTokens: number; messageTokens: number } {
  const limit = getContextLimit(model);
  const systemTokens = estimateTokens(systemInstruction);

  // Budget = context limit - system prompt - output reserve
  const outputReserve = Math.max(Math.floor(limit * OUTPUT_RESERVE_RATIO), MIN_OUTPUT_RESERVE);
  const messageBudget = limit - systemTokens - outputReserve;

  if (messageBudget <= 0) {
    // System prompt alone exceeds budget — keep only last message
    const last = messages.slice(-1);
    return {
      messages: last,
      truncated: messages.length > 1,
      systemTokens,
      messageTokens: estimateTokens(last[0]?.content ?? ''),
    };
  }

  // Count from newest to oldest
  let totalTokens = 0;
  let cutIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (totalTokens + msgTokens > messageBudget) {
      cutIndex = i + 1;
      break;
    }
    totalTokens += msgTokens;
    if (i === 0) cutIndex = 0;
  }

  const trimmed = messages.slice(cutIndex);
  return {
    messages: trimmed.length > 0 ? trimmed : messages.slice(-1),
    truncated: cutIndex > 0,
    systemTokens,
    messageTokens: totalTokens,
  };
}

// Unified history limits
export const HISTORY_LIMITS = {
  /** Max messages stored in localStorage */
  STORAGE: 50,
  /** Max messages sent to API for chat assistants */
  CHAT_API: 15,
  /** Max messages sent to API for story generation */
  STORY_API: 20,
} as const;

export { estimateTokens };
