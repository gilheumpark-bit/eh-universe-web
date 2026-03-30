// ============================================================
// Code Studio — Context Pruning
// ============================================================
// 대화 히스토리를 토큰 제한에 맞춰 트리밍, 최근 + 관련성 높은 메시지 우선.

export interface PruningMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  priority?: number; // higher = keep longer
}

export interface PruningOptions {
  maxTokens: number;         // target token budget
  reserveForSystem: number;  // tokens reserved for system prompt
  reserveForResponse: number; // tokens reserved for response
  keepRecentCount: number;   // always keep N most recent messages
  keepSystemMessages: boolean;
}

const DEFAULT_OPTIONS: PruningOptions = {
  maxTokens: 100_000,
  reserveForSystem: 2_000,
  reserveForResponse: 4_000,
  keepRecentCount: 6,
  keepSystemMessages: true,
};

/** Rough token estimate: ~4 chars per token for English, ~2 for CJK */
function estimateTokens(text: string): number {
  const cjkCount = (text.match(/[\u3000-\u9fff\uac00-\ud7af]/g) ?? []).length;
  const otherCount = text.length - cjkCount;
  return Math.ceil(otherCount / 4 + cjkCount / 2);
}

/** Prune messages to fit within token budget */
export function pruneMessages(
  messages: PruningMessage[],
  systemPrompt: string,
  options: Partial<PruningOptions> = {},
): { messages: PruningMessage[]; pruned: number; totalTokens: number } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const budget = opts.maxTokens - opts.reserveForSystem - opts.reserveForResponse;
  const systemTokens = estimateTokens(systemPrompt);
  const available = budget - systemTokens;

  if (available <= 0) {
    return { messages: messages.slice(-2), pruned: messages.length - 2, totalTokens: systemTokens };
  }

  // Categorize messages
  const systemMsgs = opts.keepSystemMessages ? messages.filter(m => m.role === 'system') : [];
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  // Always keep recent messages
  const recentCount = Math.min(opts.keepRecentCount, nonSystemMsgs.length);
  const recent = nonSystemMsgs.slice(-recentCount);
  const older = nonSystemMsgs.slice(0, -recentCount);

  // Start with system + recent
  let result = [...systemMsgs, ...recent];
  let usedTokens = result.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  // Add older messages from newest to oldest until budget exhausted
  const olderSorted = [...older].reverse();
  const included: PruningMessage[] = [];

  for (const msg of olderSorted) {
    const msgTokens = estimateTokens(msg.content);
    if (usedTokens + msgTokens <= available) {
      included.unshift(msg);
      usedTokens += msgTokens;
    }
  }

  result = [...systemMsgs, ...included, ...recent];
  const pruned = messages.length - result.length;

  return {
    messages: result,
    pruned,
    totalTokens: usedTokens + systemTokens,
  };
}

/** Summarize pruned messages for context retention */
export function summarizeForContext(messages: PruningMessage[]): string {
  if (messages.length === 0) return '';

  const topics = new Set<string>();
  for (const msg of messages) {
    // Extract first sentence or up to 80 chars
    const firstSentence = msg.content.split(/[.!?\n]/)[0]?.trim().slice(0, 80);
    if (firstSentence) topics.add(firstSentence);
  }

  const topicList = [...topics].slice(0, 5).join('; ');
  return `[Earlier conversation covered: ${topicList}]`;
}

// IDENTITY_SEAL: role=ContextPruning | inputs=messages,systemPrompt | outputs=pruned messages
