// ============================================================
// Token estimation & context window management
// ============================================================

import type { ChatMsg } from './ai-providers';

// Approximate token counts per character by language
// Korean: ~2.0 tok/char (jamo decomposition), Japanese: ~1.3 tok/char (kanji+kana mix),
// Chinese/Other CJK: ~1.5 tok/char, English: ~0.25 tok/word (~4 chars/token)
/** Estimate token count using language-specific CJK density heuristic */
function estimateTokens(text: string): number {
  if (!text) return 0;
  // Korean syllables (Hangul): higher ratio due to jamo decomposition
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  // Japanese kana (Hiragana + Katakana): lower ratio due to kanji+kana mix
  const japaneseKana = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  // Other CJK (Chinese hanzi, kanji, etc.)
  const otherCjk = (text.match(/[\u3000-\u303F\u3400-\u9FFF]/g) || []).length;
  const cjkTotal = koreanChars + japaneseKana + otherCjk;
  const otherChars = text.length - cjkTotal;
  return Math.ceil(koreanChars * 2.0 + japaneseKana * 1.3 + otherCjk * 1.5 + otherChars / 4);
}

// Context window limits per provider/model family
const CONTEXT_LIMITS: Record<string, number> = {
  'gemini-2.5-pro': 1048576,
  'gemini-2.5-flash': 1048576,
  'gemini-3.1-pro-preview': 2097152,
  'gemini-3-flash-preview': 1048576,
  'gemini-3.1-flash-lite-preview': 1048576,
  'gpt-5.4': 128000,
  'gpt-5.4-mini': 128000,
  'gpt-5.4-nano': 128000,
  'gpt-4.1': 128000,
  'gpt-4o': 128000,
  'claude-opus-4-6': 1000000,
  'claude-sonnet-4-6': 1000000,
  'claude-haiku-4-5': 200000,
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
