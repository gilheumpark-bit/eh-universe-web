// ============================================================
// server-provider-shared — env-free provider identifiers.
// ============================================================

export const SERVER_PROVIDER_IDS = [
  'upstage',
  'gemini',
  'openai',
  'claude',
  'deepseek',
  'qwen',
  'minimax',
  'kimi',
  'groq',
  'mistral',
  'ollama',
  'lmstudio',
] as const;

export type ServerProviderId = (typeof SERVER_PROVIDER_IDS)[number];

export function isServerProviderId(value: unknown): value is ServerProviderId {
  return typeof value === 'string' && SERVER_PROVIDER_IDS.includes(value as ServerProviderId);
}
