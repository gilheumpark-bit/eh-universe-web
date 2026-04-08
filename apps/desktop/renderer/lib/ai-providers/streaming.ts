// @ts-nocheck
// ============================================================
// AI Providers — Streaming Engine
// ============================================================
// Unified streaming API with retry, ARI fallback, and quota handling.
// Supports: Electron IPC, local LLM proxy, and server proxy modes.

import { truncateMessages, getMaxOutputTokens } from '@/lib/token-utils';
import { ariManager } from '@/lib/code-studio/ai/ari-engine';
import { logger } from '@/lib/logger';
import { lazyFirebaseAuth } from '@/lib/firebase';
import {
  PROVIDERS, PROVIDER_LIST,
  type ProviderId, type StreamOptions,
} from './types';
import {
  getActiveProvider, getApiKey, getApiKeyAsync,
  getActiveModel,
} from './key-management';

// ============================================================
// PART 1 — Local LLM Direct Stream
// ============================================================

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
  const MAX_BUFFER_BYTES = 65_536;
  let full = '';
  let buffer = '';
  let bufferSize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      bufferSize += chunk.length;
      if (bufferSize > MAX_BUFFER_BYTES) {
        reader.cancel().catch(() => {});
        throw new Error('Response too large — possible runaway generation');
      }
      buffer += chunk;
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

// IDENTITY_SEAL: PART-1 | role=local-llm-stream | inputs=baseUrl,model,StreamOptions | outputs=string

// ============================================================
// PART 2 — Server Proxy Stream (Electron IPC + HTTP)
// ============================================================

async function streamViaProxy(
  provider: ProviderId, model: string, apiKey: string, opts: StreamOptions
): Promise<string> {
  // 0. Electron IPC mode (Preferred for Desktop App)
  type ElectronAiBridge = {
    aiChat?: {
      onChunk: (requestId: string, cb: (chunk: string) => void) => () => void;
      onError: (requestId: string, cb: (err: unknown) => void) => () => void;
      onEnd: (requestId: string, cb: () => void) => () => void;
      request: (payload: Record<string, unknown>) => Promise<unknown>;
    };
  };
  const electron =
    typeof window !== 'undefined' ? (window as { electron?: ElectronAiBridge }).electron : undefined;
  if (electron?.aiChat) {
    const requestId = Math.random().toString(36).substring(7);

    return new Promise((resolve, reject) => {
      let fullText = '';
      
      const removeChunkListener = electron.aiChat.onChunk(requestId, (chunk: string) => {
        fullText += chunk;
        opts.onChunk(chunk);
      });

      const removeErrorListener = electron.aiChat.onError(requestId, (err: unknown) => {
        cleanup();
        const msg = typeof err === 'string' ? err : ((err as { error?: string })?.error || 'Unknown IPC error');
        reject(new Error(msg));
      });

      const removeEndListener = electron.aiChat.onEnd(requestId, () => {
        cleanup();
        resolve(fullText);
      });

      const cleanup = () => {
        removeChunkListener();
        removeErrorListener();
        removeEndListener();
      };

      electron.aiChat.request({
        requestId,
        provider,
        model,
        systemInstruction: opts.systemInstruction,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.9,
        maxTokens: opts.maxTokens,
        apiKey: apiKey || undefined,
        prismMode: opts.prismMode,
        isChatMode: opts.isChatMode,
      }).catch((e: unknown) => {
        cleanup();
        reject(e);
      });

      if (opts.signal) {
        opts.signal.addEventListener('abort', () => {
          cleanup();
          reject(new Error('Aborted'));
        });
      }
    });
  }

  // 1. Local LLM (Ollama/LM Studio) - Direct browser call via local-proxy
  if (PROVIDERS[provider]?.capabilities.isLocal) {
    if (!apiKey.trim()) throw new Error('Local LLM URL is not configured. Set the server URL in BYOK settings.');
    return streamLocalDirect(apiKey, model, opts);
  }

  // 2. Legacy API Route mode (Web Compatibility)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const auth = await lazyFirebaseAuth();
      const u = auth?.currentUser;
      if (u) {
        const idToken = await u.getIdToken();
        headers.Authorization = `Bearer ${idToken}`;
      }
    } catch {
      /* ignore */
    }
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider,
      model,
      systemInstruction: opts.systemInstruction,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.9,
      maxTokens: opts.maxTokens,
      apiKey: apiKey || undefined,
      prismMode: opts.prismMode,
      isChatMode: opts.isChatMode,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    let errMsg = `Proxy error ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.noa?.reason) {
        const reason = errData.noa.reason;
        if (reason === 'FAST_TRACK_BLOCK') {
          errMsg = '🛑 입력에 제한된 표현이 포함되어 있습니다. 내용을 수정 후 다시 시도해주세요.';
        } else {
          errMsg = `🛑 NOA 보안 필터: ${reason === 'TRINITY_BLOCK' ? '안전 검사에서 차단되었습니다' : reason === 'BUDGET_EXCEEDED' ? '일일 사용 한도에 도달했습니다' : reason}`;
        }
      } else if (res.status === 429) {
        errMsg = '⏳ 요청 한도 초과 — 잠시 후 다시 시도해주세요 (Rate Limited)';
      } else if (errData.error) {
        errMsg = errData.error;
      }
    } catch {}
    throw new Error(errMsg);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  const MAX_BUFFER_BYTES = 65_536;
  let full = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      if (buffer.length > MAX_BUFFER_BYTES) {
        buffer = buffer.slice(-MAX_BUFFER_BYTES);
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content 
            || json.candidates?.[0]?.content?.parts?.[0]?.text 
            || (json.type === 'content_block_delta' ? json.delta?.text : null);
          if (text) {
            full += text;
            opts.onChunk(text);
          }
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return full;
}

// IDENTITY_SEAL: PART-2 | role=proxy-stream | inputs=ProviderId,model,apiKey,StreamOptions | outputs=string

// ============================================================
// PART 3 — Unified Stream API (retry + ARI fallback)
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

/**
 * Unified streaming chat API. Routes through server proxy with retry + quota fallback.
 */
export async function streamChat(opts: StreamOptions): Promise<string> {
  const provider = getActiveProvider();

  // ARI gate: if current provider's circuit is open, try ARI-routed fallback
  if (!ariManager.isAvailable(provider)) {
    const fallbacks = getFallbackProviders(provider);
    const candidateIds = fallbacks.map((f) => f.id);
    if (candidateIds.length > 0) {
      const bestId = ariManager.getBestProvider(candidateIds);
      const best = fallbacks.find((f) => f.id === bestId);
      if (best) {
        logger.warn('ari-route', `Provider ${provider} circuit open (ARI=${ariManager.getScore(provider).toFixed(1)}). Routing to ${bestId}`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:provider-fallback', {
            detail: { from: provider, to: bestId, reason: 'ari-circuit-open' },
          }));
        }
        const { messages: trimmed, systemTokens: st, messageTokens: mt } =
          truncateMessages(opts.systemInstruction, opts.messages, best.model);
        const maxTok = getMaxOutputTokens(best.model, st, mt);
        const t0 = Date.now();
        try {
          const result = await streamViaProxy(best.id, best.model, best.key, { ...opts, messages: trimmed, maxTokens: maxTok });
          ariManager.updateAfterCall(bestId, true, Date.now() - t0);
          return result;
        } catch (err) {
          ariManager.updateAfterCall(bestId, false, Date.now() - t0);
          if (err instanceof DOMException && err.name === 'AbortError') throw err;
        }
      }
    }
  }

  const apiKey = getApiKey(provider) || await getApiKeyAsync(provider);
  const model = getActiveModel();

  const { messages: trimmedMessages, truncated, systemTokens, messageTokens } =
    truncateMessages(opts.systemInstruction, opts.messages, model);

  if (truncated) {
    // token-guard 로그는 프로덕션에서 노출하지 않음
  }

  const maxTokens = getMaxOutputTokens(model, systemTokens, messageTokens);
  const safeOpts = { ...opts, messages: trimmedMessages, maxTokens };

  const MAX_RETRIES = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      await new Promise(r => setTimeout(r, backoff));
    }

    const t0 = Date.now();
    try {
      const result = await streamViaProxy(provider, model, apiKey, safeOpts);
      ariManager.updateAfterCall(provider, true, Date.now() - t0);
      return result;
    } catch (proxyErr) {
      if (proxyErr instanceof DOMException && proxyErr.name === 'AbortError') throw proxyErr;

      const errMsg = proxyErr instanceof Error ? proxyErr.message : '';
      ariManager.updateAfterCall(provider, false, Date.now() - t0);

      const isRetryable = /429|500|502|503|504|fetch|network/i.test(errMsg);

      if (isRetryable && attempt < MAX_RETRIES) {
        lastError = proxyErr instanceof Error ? proxyErr : new Error(errMsg);
        logger.warn('retry', `Attempt ${attempt + 1} failed: ${errMsg}. Retrying...`);
        continue;
      }

      lastError = proxyErr instanceof Error ? proxyErr : new Error(errMsg);
      break;
    }
  }

  // Primary provider exhausted — attempt ARI-ranked fallback
  if (lastError && isQuotaError(lastError.message)) {
    const fallbacks = getFallbackProviders(provider);
    const ranked = [...fallbacks].sort(
      (a, b) => ariManager.getScore(b.id) - ariManager.getScore(a.id),
    );
    for (const fallback of ranked) {
      if (!ariManager.isAvailable(fallback.id)) continue;
      const t0 = Date.now();
      try {
        logger.warn('fallback', `${provider} quota/rate-limit hit. ARI-routing to ${fallback.id} (ARI=${ariManager.getScore(fallback.id).toFixed(1)})...`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:provider-fallback', {
            detail: { from: provider, to: fallback.id, reason: 'quota-ari-fallback' },
          }));
        }
        const fallbackMaxTokens = getMaxOutputTokens(fallback.model, systemTokens, messageTokens);
        const result = await streamViaProxy(
          fallback.id,
          fallback.model,
          fallback.key,
          { ...safeOpts, maxTokens: fallbackMaxTokens },
        );
        ariManager.updateAfterCall(fallback.id, true, Date.now() - t0);
        return result;
      } catch (fallbackErr) {
        ariManager.updateAfterCall(fallback.id, false, Date.now() - t0);
        if (fallbackErr instanceof DOMException && fallbackErr.name === 'AbortError') throw fallbackErr;
        logger.warn('fallback', `${fallback.id} also failed:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      }
    }
  }

  throw lastError ?? new Error('Stream failed after retries');
}

// IDENTITY_SEAL: PART-3 | role=unified-stream | inputs=StreamOptions | outputs=string

// ============================================================
// PART 4 — Test Key Validation
// ============================================================

/**
 * Validate an API key by making a minimal test request through the server proxy.
 */
export async function testApiKey(providerId: ProviderId, key: string): Promise<boolean> {
  if (!key.trim()) return false;
  try {
    const def = PROVIDERS[providerId];
    if (!def) return false;

    if (def.capabilities.isLocal) {
      const baseUrl = key.replace(/\/$/, '');
      const testUrl = `/api/local-proxy?baseUrl=${encodeURIComponent(baseUrl)}`;
      const res = await fetch(testUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerId,
        model: def.defaultModel,
        messages: [{ role: "user", content: def.testPrompt }],
        maxTokens: 16,
        temperature: 0.2,
        apiKey: key,
        keyVerification: true,
        isChatMode: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// IDENTITY_SEAL: PART-4 | role=key-test | inputs=ProviderId,key | outputs=boolean
