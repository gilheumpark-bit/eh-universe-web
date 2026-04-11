import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — API 에러 클래스
// ============================================================

export class ApiError extends Error {
  statusCode: number;
  userMessage: string;
  retryable: boolean;

  constructor(statusCode: number, message: string, opts?: { userMessage?: string; retryable?: boolean; cause?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.userMessage = opts?.userMessage ?? message;
    this.retryable = opts?.retryable ?? false;
    if (opts?.cause) this.cause = opts.cause;
  }
}

// ============================================================
// PART 2 — 공통 에러 응답 생성
// ============================================================

export function handleApiError(error: unknown, context?: string): NextResponse {
  // 이미 분류된 ApiError
  if (error instanceof ApiError) {
    logger.warn('api', `[${context ?? 'unknown'}] ${error.statusCode}: ${error.message}`);
    return NextResponse.json(
      { error: error.userMessage, retryable: error.retryable },
      { status: error.statusCode },
    );
  }

  // 표준 Error
  if (error instanceof Error) {
    const status = inferStatusCode(error.message);
    logger.error('api', `[${context ?? 'unknown'}] ${status}: ${error.message}`);
    return NextResponse.json(
      { error: sanitizeMessage(error.message) },
      { status },
    );
  }

  // unknown
  logger.error('api', `[${context ?? 'unknown'}] 500: ${String(error)}`);
  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 },
  );
}

// ============================================================
// PART 3 — 유틸리티
// ============================================================

function inferStatusCode(message: string): number {
  const lower = message.toLowerCase();
  if (/429|rate.?limit|quota/i.test(lower)) return 429;
  if (/401|unauthorized|auth/i.test(lower)) return 401;
  if (/403|forbidden/i.test(lower)) return 403;
  if (/404|not.?found/i.test(lower)) return 404;
  if (/400|invalid|validation/i.test(lower)) return 400;
  if (/timeout/i.test(lower)) return 504;
  return 500;
}

function sanitizeMessage(message: string): string {
  // API 키, URL, 내부 경로 노출 방지
  return message
    .replace(/https?:\/\/[^\s]+/g, '[URL]')
    .replace(/[A-Za-z0-9]{32,}/g, '[KEY]')
    .slice(0, 200);
}
