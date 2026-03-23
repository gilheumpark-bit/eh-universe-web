// ============================================================
// PART 1 — Server-side provider key helpers
// ============================================================

export type ServerProviderId = 'gemini' | 'openai' | 'claude' | 'groq' | 'mistral';

export const SERVER_ENV_KEYS: Record<ServerProviderId, string | undefined> = {
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  groq: process.env.GROQ_API_KEY,
  mistral: process.env.MISTRAL_API_KEY,
};

const SERVER_PROVIDERS = Object.keys(SERVER_ENV_KEYS) as ServerProviderId[];

export function isServerProviderId(value: unknown): value is ServerProviderId {
  return typeof value === 'string' && SERVER_PROVIDERS.includes(value as ServerProviderId);
}

export function resolveServerProviderKey(
  provider: ServerProviderId,
  clientKey?: unknown,
): string | undefined {
  if (typeof clientKey === 'string' && clientKey.trim()) {
    return clientKey.trim();
  }
  return SERVER_ENV_KEYS[provider];
}

export function getHostedProviderAvailability(): Record<ServerProviderId, boolean> {
  return {
    gemini: Boolean(SERVER_ENV_KEYS.gemini),
    openai: Boolean(SERVER_ENV_KEYS.openai),
    claude: Boolean(SERVER_ENV_KEYS.claude),
    groq: Boolean(SERVER_ENV_KEYS.groq),
    mistral: Boolean(SERVER_ENV_KEYS.mistral),
  };
}

export function getFirstHostedProvider(): ServerProviderId | null {
  for (const provider of SERVER_PROVIDERS) {
    if (SERVER_ENV_KEYS[provider]) {
      return provider;
    }
  }
  return null;
}
