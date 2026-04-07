/**
 * apps/desktop/main/ipc/ai.ts
 *
 * AI chat IPC. Renderer never sees API keys — main process pulls
 * them from the keystore at request time.
 *
 * PART 1 — Provider registry + endpoint mapping
 * PART 2 — ARI circuit breaker (in-memory state)
 * PART 3 — Stream chunk forwarding to webContents
 * PART 4 — Public registrar
 */

import { ipcMain, type WebContents } from 'electron';
import { randomUUID } from 'node:crypto';

import type { AIProvider, AIChatRequest, ARIState } from '@eh/shared-types';
import { getKey } from './keystore';

// ============================================================
// PART 1 — Provider registry
// ============================================================

interface ProviderConfig {
  endpoint: string;
  authHeader: (key: string) => Record<string, string>;
  buildBody: (req: AIChatRequest) => Record<string, unknown>;
}

const providers: Record<AIProvider, ProviderConfig> = {
  claude: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    authHeader: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (req) => ({
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.7,
      messages: req.messages.filter((m) => m.role !== 'system'),
      system: req.messages.find((m) => m.role === 'system')?.content,
      stream: req.stream ?? true,
    }),
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
      stream: req.stream ?? true,
    }),
  },
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    authHeader: () => ({}), // gemini uses ?key= query param
    buildBody: (req) => ({
      contents: req.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      systemInstruction: req.messages.find((m) => m.role === 'system')
        ? { parts: [{ text: req.messages.find((m) => m.role === 'system')!.content }] }
        : undefined,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 4096,
      },
    }),
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
      stream: req.stream ?? true,
    }),
  },
};

// ============================================================
// PART 2 — ARI Circuit Breaker (in-memory)
// ============================================================

const EMA_ALPHA = 0.3;
const FAILURE_THRESHOLD = 0.4;       // close-to-open if EMA drops below
const RECOVERY_THRESHOLD = 0.7;      // half-open to closed if EMA rises above
const OPEN_COOLDOWN_MS = 30_000;
const HALF_OPEN_PROBE_INTERVAL = 5;

const ari = new Map<AIProvider, ARIState>();

function getState(provider: AIProvider): ARIState {
  let s = ari.get(provider);
  if (!s) {
    s = {
      provider,
      ema: 1.0,
      consecutiveFailures: 0,
      lastFailureAt: 0,
      state: 'closed',
    };
    ari.set(provider, s);
  }
  return s;
}

function recordSuccess(provider: AIProvider): void {
  const s = getState(provider);
  s.ema = EMA_ALPHA * 1.0 + (1 - EMA_ALPHA) * s.ema;
  s.consecutiveFailures = 0;
  if (s.state === 'half-open' && s.ema >= RECOVERY_THRESHOLD) {
    s.state = 'closed';
  }
}

function recordFailure(provider: AIProvider): void {
  const s = getState(provider);
  s.ema = EMA_ALPHA * 0.0 + (1 - EMA_ALPHA) * s.ema;
  s.consecutiveFailures += 1;
  s.lastFailureAt = Date.now();
  if (s.state === 'closed' && s.ema < FAILURE_THRESHOLD) {
    s.state = 'open';
  }
}

function canCall(provider: AIProvider): boolean {
  const s = getState(provider);
  if (s.state === 'closed') return true;
  if (s.state === 'half-open') return true;
  // open
  if (Date.now() - s.lastFailureAt > OPEN_COOLDOWN_MS) {
    s.state = 'half-open';
    return true;
  }
  return false;
}

// ============================================================
// PART 3 — Streaming chat
// ============================================================

interface StreamChannels {
  chunk: string;
  error: string;
  end: string;
}

function makeChannels(requestId: string): StreamChannels {
  return {
    chunk: `ai:chat-chunk:${requestId}`,
    error: `ai:chat-error:${requestId}`,
    end: `ai:chat-end:${requestId}`,
  };
}

async function callProvider(
  sender: WebContents,
  requestId: string,
  req: AIChatRequest,
): Promise<{ ok: boolean; error?: string }> {
  const channels = makeChannels(requestId);

  if (!canCall(req.provider)) {
    sender.send(channels.error, {
      reason: 'circuit-open',
      provider: req.provider,
      message: 'ARI circuit is open. Try again in a moment.',
    });
    sender.send(channels.end);
    return { ok: false, error: 'circuit-open' };
  }

  const config = providers[req.provider];
  if (!config) {
    sender.send(channels.error, { reason: 'unknown-provider', provider: req.provider });
    sender.send(channels.end);
    return { ok: false, error: 'unknown-provider' };
  }

  const key = await getKey(req.provider);
  if (!key) {
    sender.send(channels.error, {
      reason: 'no-key',
      provider: req.provider,
      message: `No API key registered for ${req.provider}. Add one in Settings.`,
    });
    sender.send(channels.end);
    return { ok: false, error: 'no-key' };
  }

  try {
    const url =
      req.provider === 'gemini'
        ? `${config.endpoint}/${req.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`
        : config.endpoint;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.authHeader(key),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(config.buildBody(req)),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      recordFailure(req.provider);
      sender.send(channels.error, {
        reason: 'http-error',
        status: res.status,
        message: text.slice(0, 500),
      });
      sender.send(channels.end);
      return { ok: false, error: `http ${res.status}` };
    }

    if (!res.body) {
      recordFailure(req.provider);
      sender.send(channels.error, { reason: 'empty-body' });
      sender.send(channels.end);
      return { ok: false, error: 'empty-body' };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      if (sender.isDestroyed()) {
        try {
          await reader.cancel();
        } catch {
          /* noop */
        }
        return { ok: false, error: 'sender-destroyed' };
      }
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      sender.send(channels.chunk, chunk);
    }

    recordSuccess(req.provider);
    sender.send(channels.end);
    return { ok: true };
  } catch (err) {
    recordFailure(req.provider);
    sender.send(channels.error, {
      reason: 'exception',
      message: (err as Error).message,
    });
    sender.send(channels.end);
    return { ok: false, error: (err as Error).message };
  }
}

// ============================================================
// PART 4 — Public registrar
// ============================================================

let registered = false;

export function registerAiIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.handle('ai:chat-stream', async (event, req: AIChatRequest) => {
    const requestId = randomUUID();
    // Fire and forget — chunks are sent via webContents.send
    void callProvider(event.sender, requestId, req);
    return { requestId };
  });

  ipcMain.handle('ai:ari-state', () => {
    return Array.from(ari.values()).map((s) => ({ ...s }));
  });

  ipcMain.handle('ai:ari-reset', (_event, provider?: AIProvider) => {
    if (provider) {
      ari.delete(provider);
    } else {
      ari.clear();
    }
    return { ok: true };
  });
}
