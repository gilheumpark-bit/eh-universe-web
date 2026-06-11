// ============================================================
// BYOK Gemini 서버 헬퍼 — 사용자 API 키(우선) 또는 호스팅 GEMINI_API_KEY.
// [2026-06-06] Vertex AI / Discovery Engine 경로 제거 (구글 AI 삭제, BYOK 유지).
//   - 제거: isVertexAiEnabled / hasVertexAiServerCredentials / vertexai 클라이언트 분기
//   - 유지: 사용자 키(BYOK) · GEMINI_API_KEY 호스팅 · DGX Spark 폴백
// ============================================================

import { GoogleGenAI } from '@google/genai';

const GEMINI_ALLOCATION_ERROR_PATTERN = /(?:429|resource[_\s-]?exhausted|quota|rate.?limit|too many requests|usage limit)/i;

/** 호스팅 Gemini 자격 보유 여부 — GEMINI_API_KEY 단독 (Vertex 제거). */
export function hasGeminiServerCredentials(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
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
 * BYOK 우선 정책: 유저 키가 있으면 유저 키 먼저.
 * 유저 키 없을 때만 호스팅 키(GEMINI_API_KEY) 또는 DGX Spark 폴백.
 */
export async function executeGeminiHostedFirst<T>(
  clientApiKey: unknown,
  operation: (apiKey: string, mode: GeminiExecutionMode) => Promise<T>,
): Promise<{ result: T; mode: GeminiExecutionMode }> {
  const userApiKey = normalizeUserApiKey(clientApiKey);
  const hostedEnabled = hasGeminiServerCredentials();

  if (!hostedEnabled && !userApiKey) {
    // DGX Spark 폴백: SPARK_SERVER_URL 있으면 빈 키로 진행 (dispatchTask에서 DGX 경유)
    const hasDgx = !!process.env.SPARK_SERVER_URL || !!process.env.NEXT_PUBLIC_SPARK_SERVER_URL;
    if (hasDgx) {
      return { result: await operation('', 'hosted'), mode: 'hosted' };
    }
    throw new Error('Gemini server credentials are not configured');
  }

  // BYOK 우선: 유저 키가 있으면 유저 키 사용
  if (userApiKey) {
    return { result: await operation(userApiKey, 'byok'), mode: 'byok' };
  }

  // 유저 키 없을 때만 호스팅 키
  if (hostedEnabled) {
    return { result: await operation('', 'hosted'), mode: 'hosted' };
  }

  throw new Error('No API key available');
}

/**
 * Gemini 클라이언트 생성 — 명시 키(BYOK) 우선, 없으면 GEMINI_API_KEY 호스팅.
 * Vertex AI(서비스 계정) 경로는 제거됨.
 */
export function createServerGeminiClient(apiKey?: string): GoogleGenAI {
  const explicitApiKey = apiKey?.trim();
  if (explicitApiKey) {
    return new GoogleGenAI({ apiKey: explicitApiKey });
  }

  const envApiKey = process.env.GEMINI_API_KEY?.trim();
  if (envApiKey) {
    return new GoogleGenAI({ apiKey: envApiKey });
  }

  throw new Error('Gemini server credentials are not configured');
}
