// ============================================================
// PART 0: TYPES
// ============================================================

import { truncateMessages, getMaxOutputTokens } from './token-utils';

export type ProviderId = "gemini" | "openai" | "claude" | "groq" | "mistral" | "ollama" | "lmstudio";

export interface ProviderCapabilities {
  streaming: boolean;
  structuredOutput: boolean;
  systemInstruction: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  isLocal: boolean;
  costTier: 'free' | 'cheap' | 'moderate' | 'expensive';
}

export interface ProviderDef {
  id: ProviderId;
  name: string;
  color: string;
  placeholder: string;
  defaultModel: string;
  models: string[];
  testPrompt: string;
  storageKey: string;
  capabilities: ProviderCapabilities;
  /** 로컬 provider는 API key 대신 base URL을 저장 */
  isUrlBased?: boolean;
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
  prismMode?: string;
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
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-3.1-pro-preview", "gemini-3-flash-preview"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_api_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 1_000_000, maxOutputTokens: 8192, isLocal: false, costTier: 'cheap' },
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    color: "#10a37f",
    placeholder: "sk-...",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_openai_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 128_000, maxOutputTokens: 16384, isLocal: false, costTier: 'expensive' },
  },
  claude: {
    id: "claude",
    name: "Anthropic Claude",
    color: "#d97706",
    placeholder: "sk-ant-...",
    defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_claude_key",
    capabilities: { streaming: true, structuredOutput: false, systemInstruction: true, maxContextTokens: 200_000, maxOutputTokens: 8192, isLocal: false, costTier: 'expensive' },
  },
  groq: {
    id: "groq",
    name: "Groq",
    color: "#f55036",
    placeholder: "gsk_...",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen-qwq-32b"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_groq_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 128_000, maxOutputTokens: 8192, isLocal: false, costTier: 'free' },
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    color: "#ff7000",
    placeholder: "...",
    defaultModel: "mistral-medium-3-latest",
    models: ["mistral-medium-3-latest", "mistral-small-latest", "mistral-large-latest"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_mistral_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 128_000, maxOutputTokens: 8192, isLocal: false, costTier: 'moderate' },
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    color: "#6c4c3e",
    placeholder: "http://localhost:11434",
    defaultModel: "llama3.1",
    models: ["llama3.1", "llama3.2", "mistral", "gemma2", "qwen2.5", "deepseek-r1"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_ollama_url",
    isUrlBased: true,
    capabilities: { streaming: true, structuredOutput: false, systemInstruction: true, maxContextTokens: 32_000, maxOutputTokens: 4096, isLocal: true, costTier: 'free' },
  },
  lmstudio: {
    id: "lmstudio",
    name: "LM Studio (Local)",
    color: "#2d5d8d",
    placeholder: "http://localhost:1234",
    defaultModel: "local-model",
    models: ["local-model"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_lmstudio_url",
    isUrlBased: true,
    capabilities: { streaming: true, structuredOutput: false, systemInstruction: true, maxContextTokens: 32_000, maxOutputTokens: 4096, isLocal: true, costTier: 'free' },
  },
};

// Capability helpers
export function getCapabilities(providerId: ProviderId): ProviderCapabilities {
  return PROVIDERS[providerId]?.capabilities ?? PROVIDERS.gemini.capabilities;
}
export function supportsStructuredOutput(providerId: ProviderId): boolean {
  return PROVIDERS[providerId]?.capabilities.structuredOutput ?? false;
}

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

// 2-layer key protection:
// Layer 1: XOR + Base64 (synchronous, for UI thread)
// Layer 2: Web Crypto AES-GCM (async, for background operations)
// XSS에서 메모리 접근은 방어 불가하나, localStorage 직접 읽기는 난독화로 지연.
const _OBFUSCATION_PREFIX = 'noa:2:';
const _LEGACY_PREFIX = 'noa:1:';

// Derive a stable XOR mask from domain + user-agent (not cryptographic, but unique per browser)
function _xorMask(): number[] {
  const seed = typeof window !== 'undefined'
    ? `${window.location.origin}:${navigator.userAgent.slice(0, 32)}`
    : 'noa-server-fallback';
  const mask: number[] = [];
  for (let i = 0; i < seed.length; i++) mask.push(seed.charCodeAt(i) & 0xff);
  return mask;
}

function obfuscateKey(plain: string): string {
  if (!plain) return '';
  try {
    const mask = _xorMask();
    const bytes = new TextEncoder().encode(plain);
    const xored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) xored[i] = bytes[i] ^ mask[i % mask.length];
    return _OBFUSCATION_PREFIX + btoa(String.fromCharCode(...xored));
  } catch {
    return plain;
  }
}

function deobfuscateKey(stored: string): string {
  if (!stored) return '';
  // v2: XOR + Base64
  if (stored.startsWith(_OBFUSCATION_PREFIX)) {
    try {
      const mask = _xorMask();
      const raw = atob(stored.slice(_OBFUSCATION_PREFIX.length));
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) ^ mask[i % mask.length];
      return new TextDecoder().decode(bytes);
    } catch {
      return '';
    }
  }
  // v1 backward compat: Base64 only
  if (stored.startsWith(_LEGACY_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(stored.slice(_LEGACY_PREFIX.length))));
    } catch {
      return '';
    }
  }
  // Plaintext backward compat
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
  // 커스텀 모델 허용: provider.models에 없어도 사용자가 입력한 모델 유지
  const model = stored && (provider.models.includes(stored) || stored.length > 0) ? stored : provider.defaultModel;

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

// 로컬 LLM(ollama/lmstudio): Vercel 서버는 로컬 IP 접근 불가 → 브라우저 직접 스트림
// localhost 개발 환경: Chrome PNA 우회를 위해 /api/local-proxy 경유
async function streamLocalDirect(
  baseUrl: string, model: string, opts: StreamOptions
): Promise<string> {
  const msgs = [
    ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
    ...opts.messages,
  ];
  const payload = {
    model,
    messages: msgs,
    temperature: opts.temperature ?? 0.9,
    max_tokens: opts.maxTokens,
    stream: true,
  };

  // 항상 /api/local-proxy 경유 — Chrome PNA + Mixed Content 동시 해결
  // Vercel 배포 시: 서버가 사설 IP 접근 불가 → 502 반환 → 에러 메시지로 안내
  const res = await fetch('/api/local-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl, ...payload }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Local LLM ${res.status}: ${err.slice(0, 200)}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content;
          if (text) { full += text; opts.onChunk(text); }
        } catch { /* skip non-JSON */ }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return full;
}

async function streamViaProxy(
  provider: ProviderId, model: string, apiKey: string, opts: StreamOptions
): Promise<string> {
  // 로컬 프로바이더는 브라우저 직접 호출 (서버 프록시 우회)
  if (PROVIDERS[provider]?.capabilities.isLocal && apiKey.trim()) {
    return streamLocalDirect(apiKey, model, opts);
  }

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
      apiKey: apiKey || undefined,
      prismMode: opts.prismMode, // 서버 측 PRISM 강제 적용
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

    // 로컬 프로바이더: /v1/models 엔드포인트로 연결 확인
    // localhost/Vercel 모두 프록시 경유 시도 → Vercel은 사설 IP 접근 불가로 실패
    if (def.capabilities.isLocal) {
      const baseUrl = key.replace(/\/$/, '');
      const testUrl = `/api/local-proxy?baseUrl=${encodeURIComponent(baseUrl)}`;

      const res = await fetch(testUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    }

    // 클라우드 프로바이더: 서버 프록시 경유 (키 노출 방지)
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerId,
        model: def.defaultModel,
        messages: [{ role: "user", content: def.testPrompt }],
        maxTokens: 16,
        apiKey: key,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
