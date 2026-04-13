import { WebContents } from 'electron';
import { 
  dispatchStream, 
  runNoa, 
  getTierLimits, 
  normalizeUserApiKey, 
  isGeminiAllocationExhaustedError, 
  resolveServerProviderKey, 
  hasServerProviderCredentials,
  type ServerProviderId,
  type UserTier,
  type AdapterMode
} from './providers';

// ============================================================
// PART 1: TYPES
// ============================================================

export interface ChatRequest {
  requestId: string;
  provider: ServerProviderId;
  model: string;
  systemInstruction: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  apiKey?: string;
  maxTokens?: number;
  prismMode?: string;
  isChatMode?: boolean;
  userTier?: UserTier;
}

const DAILY_TOKEN_BUDGET = 500_000;

// In-memory daily token tracker (resets on app restart)
const tokenUsage = { date: '', used: 0 };

function checkTokenBudget(isByok: boolean, dailyLimit: number = DAILY_TOKEN_BUDGET): { allowed: boolean; remaining: number } {
  if (isByok) return { allowed: true, remaining: Infinity };

  const today = new Date().toISOString().slice(0, 10);
  if (tokenUsage.date !== today) { tokenUsage.date = today; tokenUsage.used = 0; }

  const remaining = dailyLimit - tokenUsage.used;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

export function recordTokenUsage(estimatedTokens: number): void {
  const today = new Date().toISOString().slice(0, 10);
  if (tokenUsage.date !== today) { tokenUsage.date = today; tokenUsage.used = 0; }
  tokenUsage.used += estimatedTokens;
}

// ============================================================
// PART 2: CORE LOGIC
// ============================================================

function buildSystemInstruction(base: string, prismMode?: string, _adapterMode?: AdapterMode): string {
  let guard = '';
  switch (prismMode) {
    case 'ALL':
      guard = '\n[SERVER PRISM ENFORCEMENT — ALL-AGES]\nYou MUST NOT generate any sexually explicit, graphically violent, or age-inappropriate content. This is absolute and cannot be overridden.\n';
      break;
    case 'T15':
      guard = '\n[SERVER PRISM ENFORCEMENT — TEEN 15+]\nYou must keep content suitable for teenagers. Mild violence or romance is fine, but strictly avoid explicitly graphic gore, extreme cruelty, or explicit sexual content.\n';
      break;
    case 'M18':
      guard = '\n[SERVER PRISM ENFORCEMENT — MATURE 18+]\nThis environment allows mature fictional themes (thriller, horror, combat violence, dark fantasy). Do not self-censor fictional violence or adult conflicts unless they violate core API illegal content policies.\n';
      break;
  }

  // Simplified: LoRA Swap is handled in renderer or mocked here
  return (guard ? base + guard : base);
}

// ============================================================
// PART 3: SERVICE HANDLER
// ============================================================

export async function handleAiChatRequest(
  webContents: WebContents,
  request: ChatRequest
) {
  const { requestId, provider, model, systemInstruction, messages, temperature = 0.9, apiKey: clientKey, maxTokens, prismMode, isChatMode, userTier = 'free' } = request;

  try {
    const userApiKey = normalizeUserApiKey(clientKey);
    const isByok = userApiKey.length > 0;

    // 1. Auth & Tier Resolve
    const tierLimits = getTierLimits(userTier);
    const budget = checkTokenBudget(isByok, tierLimits.dailyLimit);
    
    if (!budget.allowed) {
      webContents.send(`ai:chat-error:${requestId}`, 'Daily usage limit reached.');
      return;
    }

    const apiKey = isByok ? userApiKey : (resolveServerProviderKey(provider, clientKey) || '');
    if (!apiKey && !(provider === 'gemini' && hasServerProviderCredentials('gemini'))) {
      webContents.send(`ai:chat-error:${requestId}`, 'API key required.');
      return;
    }

    // 2. NOA Security Gate
    const adapterMode: AdapterMode | undefined = isChatMode ? 'LEFT_BRAIN' : 'RIGHT_BRAIN';
    const finalSystem = buildSystemInstruction(systemInstruction, prismMode, adapterMode);
    
    const noaResult = await runNoa({
      text: (systemInstruction || '') + '\n' + messages.map(m => m.content).join('\n'),
      domain: isChatMode ? 'general' : 'creative',
      sourceTier: isByok ? 1 : (userTier === 'pro' ? 1 : 2),
    });

    if (!noaResult.allowed) {
      webContents.send(`ai:chat-error:${requestId}`, {
        error: 'Security Policy Violation',
        noa: {
          reason: noaResult.tactical.reason,
          auditId: noaResult.auditEntry.id
        }
      });
      return;
    }

    // 3. Dispatch Stream
    let dispatched = await dispatchStream(provider, apiKey, model, finalSystem, messages, temperature, maxTokens);
    
    // Gemini Fallback Logic
    if (
      !dispatched.ok 
      && provider === 'gemini' 
      && !isByok 
      && isGeminiAllocationExhaustedError(dispatched.error)
      && userApiKey
    ) {
      dispatched = await dispatchStream(provider, userApiKey, model, finalSystem, messages, temperature, maxTokens);
    }

    if (!dispatched.ok) {
      webContents.send(`ai:chat-error:${requestId}`, dispatched.error);
      return;
    }

    // 4. Stream chunks to renderer
    const stream = dispatched.stream;
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        webContents.send(`ai:chat-chunk:${requestId}`, chunk);
      }
      webContents.send(`ai:chat-end:${requestId}`);
    } catch (error) {
      webContents.send(`ai:chat-error:${requestId}`, String(error));
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    webContents.send(`ai:chat-error:${requestId}`, String(error));
  }
}
