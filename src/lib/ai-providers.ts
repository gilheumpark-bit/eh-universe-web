// ============================================================
// PART 0: TYPES
// ============================================================

import { truncateMessages, getMaxOutputTokens } from './token-utils';

export type ProviderId = "gemini" | "openai" | "claude" | "groq" | "mistral";

export interface ProviderDef {
  id: ProviderId;
  name: string;
  color: string;
  placeholder: string;
  defaultModel: string;
  models: string[];
  testPrompt: string;
  storageKey: string;
}

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamOptions {
  systemInstruction: string;
  messages: ChatMsg[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
}

// ============================================================
// PART 1: PROVIDER DEFINITIONS
// ============================================================

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    color: "#4285f4",
    placeholder: "AIza...",
    defaultModel: "gemini-2.5-pro",
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
    ],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_api_key",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    color: "#10a37f",
    placeholder: "sk-...",
    defaultModel: "gpt-4o",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
    ],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_openai_key",
  },
  claude: {
    id: "claude",
    name: "Anthropic Claude",
    color: "#d97706",
    placeholder: "sk-ant-...",
    defaultModel: "claude-sonnet-4-20250514",
    models: [
      "claude-sonnet-4-20250514",
      "claude-3-5-haiku-20241022",
    ],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_claude_key",
  },
  groq: {
    id: "groq",
    name: "Groq",
    color: "#f55036",
    placeholder: "gsk_...",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen-qwq-32b",
    ],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_groq_key",
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    color: "#ff7000",
    placeholder: "...",
    defaultModel: "mistral-medium-3-latest",
    models: [
      "mistral-medium-3-latest",
      "mistral-small-latest",
      "mistral-large-latest",
    ],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_mistral_key",
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);
const LEGACY_PROVIDER_KEY = "eh-active-provider";
const LEGACY_MODEL_KEY = "eh-active-model";

// Preview/experimental model detection
const PREVIEW_PATTERNS = ["preview", "nano", "experimental", "beta"];

export function isPreviewModel(model: string): boolean {
  const lower = model.toLowerCase();
  return PREVIEW_PATTERNS.some(p => lower.includes(p));
}

export function getModelWarning(model: string, lang: "ko" | "en" = "ko"): string | null {
  if (!isPreviewModel(model)) return null;
  return lang === "ko"
    ? `"${model}"은(는) 프리뷰/실험 모델입니다. 안정성이 보장되지 않으며 예고 없이 변경·중단될 수 있습니다. 프로덕션 용도에는 정식 모델을 권장합니다.`
    : `"${model}" is a preview/experimental model. Stability is not guaranteed and it may change or be discontinued without notice. Stable models are recommended for production use.`;
}

// ============================================================
// PART 2: KEY MANAGEMENT (with obfuscation)
// ============================================================

// Simple reversible obfuscation to prevent casual DevTools/extension snooping.
// NOT cryptographic — XSS can still extract keys from memory.
// For true security, use server-side key storage.
const _OBFUSCATION_PREFIX = 'noa:1:';

function obfuscateKey(plain: string): string {
  if (!plain) return '';
  try {
    return _OBFUSCATION_PREFIX + btoa(unescape(encodeURIComponent(plain)));
  } catch {
    return plain;
  }
}

function deobfuscateKey(stored: string): string {
  if (!stored) return '';
  if (stored.startsWith(_OBFUSCATION_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(stored.slice(_OBFUSCATION_PREFIX.length))));
    } catch {
      return '';
    }
  }
  // Backward compat: read plaintext keys from before this change
  return stored;
}

export function getActiveProvider(): ProviderId {
  if (typeof window === "undefined") return "gemini";
  const stored = localStorage.getItem("noa_active_provider") || localStorage.getItem(LEGACY_PROVIDER_KEY);
  const provider = stored && stored in PROVIDERS ? (stored as ProviderId) : "gemini";
  localStorage.setItem("noa_active_provider", provider);
  localStorage.removeItem(LEGACY_PROVIDER_KEY);
  return provider;
}

export function setActiveProvider(id: ProviderId): void {
  localStorage.setItem("noa_active_provider", id);
  localStorage.removeItem(LEGACY_PROVIDER_KEY);
}

export function getApiKey(providerId: ProviderId): string {
  if (typeof window === "undefined") return "";
  const def = PROVIDERS[providerId];
  return deobfuscateKey(localStorage.getItem(def.storageKey) || "");
}

export function setApiKey(providerId: ProviderId, key: string): void {
  const def = PROVIDERS[providerId];
  localStorage.setItem(def.storageKey, obfuscateKey(key));
}

function getStoredModelForProvider(providerId: ProviderId): string {
  if (typeof window === "undefined") return PROVIDERS[providerId].defaultModel;

  const stored = localStorage.getItem("noa_active_model") || localStorage.getItem(LEGACY_MODEL_KEY);
  const provider = PROVIDERS[providerId];
  const model = stored && provider.models.includes(stored) ? stored : provider.defaultModel;

  if (providerId === getActiveProvider()) {
    localStorage.setItem("noa_active_model", model);
  }
  localStorage.removeItem(LEGACY_MODEL_KEY);
  return model;
}

export function getActiveModel(): string {
  return getStoredModelForProvider(getActiveProvider());
}

export function getPreferredModel(providerId: ProviderId): string {
  const activeProvider = getActiveProvider();
  return activeProvider === providerId
    ? getStoredModelForProvider(providerId)
    : PROVIDERS[providerId].defaultModel;
}

export function setActiveModel(model: string): void {
  const provider = getActiveProvider();
  const safeModel = PROVIDERS[provider].models.includes(model) ? model : PROVIDERS[provider].defaultModel;
  localStorage.setItem("noa_active_model", safeModel);
  localStorage.removeItem(LEGACY_MODEL_KEY);
}

// ============================================================
// PART 3: SERVER PROXY STREAM
// ============================================================

async function streamViaProxy(
  provider: ProviderId, model: string, apiKey: string, opts: StreamOptions
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      model,
      systemInstruction: opts.systemInstruction,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.9,
      maxTokens: opts.maxTokens,
      apiKey: apiKey || undefined, // BYOK: send key to proxy, proxy uses it server-side
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    throw new Error(`Proxy error ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  const MAX_BUFFER_BYTES = 65_536; // 64KB SSE buffer cap to prevent OOM
  let full = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Guard against unbounded buffer growth
      if (buffer.length > MAX_BUFFER_BYTES) {
        buffer = buffer.slice(-MAX_BUFFER_BYTES);
      }

      // Parse SSE events from proxy
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          // Handle different provider formats
          const text = json.choices?.[0]?.delta?.content // OpenAI/Groq/Mistral
            || json.candidates?.[0]?.content?.parts?.[0]?.text // Gemini
            || (json.type === 'content_block_delta' ? json.delta?.text : null); // Claude
          if (text) {
            full += text;
            opts.onChunk(text);
          }
        } catch {
          // Non-JSON SSE data, skip
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return full;
}

// ============================================================
// PART 4: UNIFIED STREAM API
// ============================================================

function isQuotaError(msg: string): boolean {
  return /429|quota|rate.?limit|resource.?exhausted|billing|limit.?exceeded/i.test(msg);
}

function getFallbackProviders(
  activeProvider: ProviderId,
): Array<{ id: ProviderId; model: string; key: string }> {
  return PROVIDER_LIST
    .filter((p) => p.id !== activeProvider)
    .map((p) => ({ id: p.id, model: p.defaultModel, key: getApiKey(p.id) }))
    .filter((p) => p.key.trim().length > 0);
}

export async function streamChat(opts: StreamOptions): Promise<string> {
  const provider = getActiveProvider();
  const apiKey = getApiKey(provider);
  const model = getActiveModel();

  // Truncate messages to fit context window
  const { messages: trimmedMessages, truncated, systemTokens, messageTokens } =
    truncateMessages(opts.systemInstruction, opts.messages, model);

  if (truncated) {
    console.warn(`[token-guard] Messages truncated to fit ${model} context window. System: ~${systemTokens} tokens, Messages: ~${messageTokens} tokens`);
  }

  const maxTokens = getMaxOutputTokens(model, systemTokens, messageTokens);
  const safeOpts = { ...opts, messages: trimmedMessages, maxTokens };

  // Retry wrapper: up to 2 retries on transient errors (429, 500, 503, network)
  const MAX_RETRIES = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      return await streamViaProxy(provider, model, apiKey, safeOpts);
    } catch (proxyErr) {
      if (proxyErr instanceof DOMException && proxyErr.name === 'AbortError') throw proxyErr;

      const errMsg = proxyErr instanceof Error ? proxyErr.message : '';
      const isRetryable = /429|500|502|503|504|fetch|network/i.test(errMsg);

      if (isRetryable && attempt < MAX_RETRIES) {
        lastError = proxyErr instanceof Error ? proxyErr : new Error(errMsg);
        console.warn(`[retry] Attempt ${attempt + 1} failed: ${errMsg}. Retrying...`);
        continue;
      }

      lastError = proxyErr instanceof Error ? proxyErr : new Error(errMsg);
      break;
    }
  }

  // Primary provider exhausted — attempt fallback providers on quota/rate-limit errors only.
  // Falls back in PROVIDER_LIST order, skipping providers without a stored API key.
  // Does NOT persist the switch to localStorage; active provider is unchanged.
  if (lastError && isQuotaError(lastError.message)) {
    const fallbacks = getFallbackProviders(provider);
    for (const fallback of fallbacks) {
      try {
        console.warn(`[fallback] ${provider} quota/rate-limit hit. Switching to ${fallback.id}...`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:provider-fallback', {
            detail: { from: provider, to: fallback.id },
          }));
        }
        const fallbackMaxTokens = getMaxOutputTokens(fallback.model, systemTokens, messageTokens);
        return await streamViaProxy(
          fallback.id,
          fallback.model,
          fallback.key,
          { ...safeOpts, maxTokens: fallbackMaxTokens },
        );
      } catch (fallbackErr) {
        if (fallbackErr instanceof DOMException && fallbackErr.name === 'AbortError') throw fallbackErr;
        console.warn(`[fallback] ${fallback.id} also failed:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      }
    }
  }

  throw lastError ?? new Error('Stream failed after retries');
}

// ============================================================
// PART 5: TEST KEY (all requests via server proxy)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future direct API calls
const OPENAI_COMPAT_URLS: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
};

export async function testApiKey(providerId: ProviderId, key: string): Promise<boolean> {
  if (!key.trim()) return false;
  try {
    const def = PROVIDERS[providerId];

    // All providers route through server proxy to avoid key exposure in network tab
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerId,
        model: def.defaultModel,
        messages: [{ role: "user", content: def.testPrompt }],
        max_tokens: 16,
        apiKey: key,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
