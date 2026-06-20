// ============================================================
// Gemini 서버 헬퍼 — 사용자 연결 키 우선.
// [2026-06-06] Vertex AI / Discovery Engine 경로 제거 (구글 AI 삭제, 사용자 연결 유지).
//   - 제거: isVertexAiEnabled / hasVertexAiServerCredentials / vertexai 클라이언트 분기
//   - 유지: 사용자 연결 키 · 명시 플래그 기반 DGX 개발 API 폴백
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { isDgxDeveloperApiEnabled } from '@/lib/server-dgx-dev';

const GEMINI_ALLOCATION_ERROR_PATTERN = /(?:429|resource[_\s-]?exhausted|quota|rate.?limit|too many requests|usage limit)/i;

/** Gemini 서버 환경 키는 제공하지 않는다. 사용자 연결 키 또는 명시 플래그 기반 DGX 개발 API만 사용한다. */
export function hasGeminiServerCredentials(): boolean {
  return false;
}

export function normalizeUserApiKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isGeminiAllocationExhaustedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return GEMINI_ALLOCATION_ERROR_PATTERN.test(message);
}

export type GeminiExecutionMode = 'hosted' | 'byok';

/**
 * 유저 키가 있으면 유저 키 먼저.
 * 유저 키가 없을 때는 명시 플래그가 켜진 DGX 개발 API만 허용한다.
 */
export async function executeGeminiHostedFirst<T>(
  clientApiKey: unknown,
  operation: (apiKey: string, mode: GeminiExecutionMode) => Promise<T>,
): Promise<{ result: T; mode: GeminiExecutionMode }> {
  const userApiKey = normalizeUserApiKey(clientApiKey);
  if (!userApiKey) {
    // DGX 개발 API 폴백: 명시 플래그가 켜진 경우에만 빈 키로 진행한다.
    if (isDgxDeveloperApiEnabled()) {
      return { result: await operation('', 'hosted'), mode: 'hosted' };
    }
    throw new Error('Gemini connection key is not configured');
  }

  return { result: await operation(userApiKey, 'byok'), mode: 'byok' };
}

/**
 * Gemini 클라이언트 생성 — 명시 사용자 연결 키만 허용.
 * Vertex AI(서비스 계정) 경로는 제거됨.
 */
export function createServerGeminiClient(apiKey?: string): GoogleGenAI {
  const explicitApiKey = apiKey?.trim();
  if (explicitApiKey) {
    return new GoogleGenAI({ apiKey: explicitApiKey });
  }

  throw new Error('Gemini connection key is not configured');
}
