// ============================================================
// 로컬 AI 클라이언트 — 활성 슬롯(3개 중 첫 유효)으로 OpenAI 호환 chat completion
// vLLM·Ollama·llama.cpp·LM Studio 공통(/chat/completions). 미설정/오류 시 null → 호출처 폴백.
// 격리: local-ai-config 만 의존. studio-types import 0.
// ============================================================

import { resolveActiveLocalAI } from './local-ai-config';
import { withCorrelationHeaders } from '@/lib/observability/correlation';

export interface LocalAIChatOptions {
  /** JSON 출력 강제(response_format) — 양식 채움용 */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** 활성 로컬 AI 슬롯 존재 여부 */
export function isLocalAIConfigured(): boolean {
  return resolveActiveLocalAI() !== null;
}

/**
 * 활성 로컬 AI 로 단발 chat completion. 응답 텍스트 반환.
 * 미설정·네트워크 오류·non-2xx·파싱 실패 = null (호출처가 결정론 폴백).
 */
export async function localAIChat(prompt: string, opts: LocalAIChatOptions = {}): Promise<string | null> {
  const active = resolveActiveLocalAI();
  if (!active) return null;

  const url = `${active.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body: Record<string, unknown> = {
    model: active.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: opts.temperature ?? 0.3,
    stream: false,
  };
  if (typeof opts.maxTokens === 'number') body.max_tokens = opts.maxTokens;
  if (opts.json) body.response_format = { type: 'json_object' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: withCorrelationHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  }
}
