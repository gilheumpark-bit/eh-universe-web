// ============================================================
// PART 0: TYPES
// ============================================================

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
    defaultModel: "gpt-5.4",
    models: [
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-4.1",
      "gpt-4o",
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
// PART 2: KEY MANAGEMENT
// ============================================================

export function getActiveProvider(): ProviderId {
  if (typeof window === "undefined") return "gemini";
  return (localStorage.getItem("noa_active_provider") as ProviderId) || "gemini";
}

export function setActiveProvider(id: ProviderId): void {
  localStorage.setItem("noa_active_provider", id);
}

export function getApiKey(providerId: ProviderId): string {
  if (typeof window === "undefined") return "";
  const def = PROVIDERS[providerId];
  return localStorage.getItem(def.storageKey) || "";
}

export function setApiKey(providerId: ProviderId, key: string): void {
  const def = PROVIDERS[providerId];
  localStorage.setItem(def.storageKey, key);
}

export function getActiveModel(): string {
  if (typeof window === "undefined") return PROVIDERS.gemini.defaultModel;
  return localStorage.getItem("noa_active_model") || PROVIDERS[getActiveProvider()].defaultModel;
}

export function setActiveModel(model: string): void {
  localStorage.setItem("noa_active_model", model);
}

// ============================================================
// PART 3: UNIFIED STREAM API
// ============================================================

export async function streamChat(opts: StreamOptions): Promise<string> {
  const provider = getActiveProvider();
  const apiKey = getApiKey(provider);
  const model = getActiveModel();

  if (!apiKey) throw new Error("API_KEY_MISSING");

  switch (provider) {
    case "gemini":
      return streamGemini(apiKey, model, opts);
    case "openai":
    case "groq":
    case "mistral":
      return streamOpenAICompat(provider, apiKey, model, opts);
    case "claude":
      return streamClaude(apiKey, model, opts);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ============================================================
// PART 4: GEMINI ADAPTER
// ============================================================

async function streamGemini(apiKey: string, model: string, opts: StreamOptions): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const history = opts.messages.filter(m => m.role !== "system");
  const contents = history.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const responseStream = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature ?? 0.9,
      topP: 0.95,
    },
  });

  let full = "";
  for await (const chunk of responseStream) {
    if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (chunk.text) {
      full += chunk.text;
      opts.onChunk(chunk.text);
    }
  }
  return full;
}

// ============================================================
// PART 5: OPENAI-COMPATIBLE ADAPTER (OpenAI / Groq / Mistral)
// ============================================================

const OPENAI_COMPAT_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
};

async function streamOpenAICompat(
  provider: ProviderId, apiKey: string, model: string, opts: StreamOptions
): Promise<string> {
  const url = OPENAI_COMPAT_URLS[provider];
  if (!url) throw new Error(`No URL for provider: ${provider}`);

  const messages = [
    { role: "system", content: opts.systemInstruction },
    ...opts.messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.9,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${provider} API error ${res.status}: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          opts.onChunk(delta);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
  return full;
}

// ============================================================
// PART 6: CLAUDE ADAPTER
// ============================================================

async function streamClaude(apiKey: string, model: string, opts: StreamOptions): Promise<string> {
  const messages = opts.messages.map(m => ({ role: m.role, content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: opts.systemInstruction,
      messages,
      temperature: opts.temperature ?? 0.9,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      try {
        const json = JSON.parse(data);
        if (json.type === "content_block_delta" && json.delta?.text) {
          full += json.delta.text;
          opts.onChunk(json.delta.text);
        }
      } catch {
        // skip
      }
    }
  }
  return full;
}

// ============================================================
// PART 7: TEST KEY
// ============================================================

export async function testApiKey(providerId: ProviderId, key: string): Promise<boolean> {
  try {
    const def = PROVIDERS[providerId];
    if (providerId === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: def.defaultModel,
        contents: def.testPrompt,
      });
      return true;
    }

    if (providerId === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: def.defaultModel,
          max_tokens: 16,
          messages: [{ role: "user", content: def.testPrompt }],
        }),
      });
      return res.ok;
    }

    // OpenAI-compatible
    const url = OPENAI_COMPAT_URLS[providerId];
    if (!url) return false;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: def.defaultModel,
        messages: [{ role: "user", content: def.testPrompt }],
        max_tokens: 16,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
