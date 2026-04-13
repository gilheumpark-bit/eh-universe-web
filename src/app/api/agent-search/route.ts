// ============================================================
// Agent Builder Search API — 142만 원 크레딧 전용
// ============================================================
// POST /api/agent-search
// Body: { studio: 'universe'|'novel'|'code', query: string, pageSize?: number, conversationId?: string }
//
// 이 라우트는 일반 Gemini API(11만 원 범용)를 전혀 사용하지 않습니다.
// 오직 Agent Builder(Discovery Engine) 전용 크레딧에서만 비용이 발생합니다.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  searchAgentBuilder,
  converseAgentBuilder,
  isAgentBuilderConfigured,
  type AgentStudioType,
} from '@/lib/vertex-app-builder';
import { getClientIp, checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { apiLog, createRequestTimer } from '@/lib/api-logger';

const VALID_STUDIOS: AgentStudioType[] = ['universe', 'novel', 'code'];

function isValidStudio(v: unknown): v is AgentStudioType {
  return typeof v === 'string' && VALID_STUDIOS.includes(v as AgentStudioType);
}

export async function POST(req: NextRequest) {
  const timer = createRequestTimer();
  const ip = getClientIp(req.headers);
  const requestId = crypto.randomUUID();

  try {
    // ── Rate limit ──
    const rl = checkRateLimit(ip, 'agent-search', RATE_LIMITS.chat);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // ── Body 파싱 ──
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { studio, query, pageSize, conversationId, mode } = body as {
      studio?: string;
      query?: string;
      pageSize?: number;
      conversationId?: string;
      mode?: 'search' | 'converse';
    };

    // ── 검증 ──
    if (!isValidStudio(studio)) {
      return NextResponse.json(
        { error: `Invalid studio. Must be one of: ${VALID_STUDIOS.join(', ')}` },
        { status: 400 },
      );
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    if (query.length > 2000) {
      return NextResponse.json({ error: 'Query too long (max 2000 chars)' }, { status: 400 });
    }

    if (!isAgentBuilderConfigured(studio)) {
      return NextResponse.json(
        { error: `Agent Builder for "${studio}" is not configured. Please set up the engine in Google Cloud Console.` },
        { status: 503 },
      );
    }

    // ── 실행 ──
    if (mode === 'converse') {
      // 대화형 모드: 에이전트와 멀티턴 대화
      const result = await converseAgentBuilder(studio, query.trim(), conversationId);

      apiLog({
        level: 'info',
        event: 'agent_converse',
        route: '/api/agent-search',
        ip,
        meta: { studio },
        requestId,
        durationMs: timer.elapsed(),
      });

      return NextResponse.json({
        ok: true,
        reply: result.reply,
        conversationId: result.conversationId,
        references: result.references,
        requestId,
      });
    }

    // 기본 검색 모드
    const result = await searchAgentBuilder(studio, query.trim(), {
      pageSize: typeof pageSize === 'number' ? Math.min(pageSize, 20) : 10,
      withSummary: true,
    });

    apiLog({
      level: 'info',
      event: 'agent_search',
      route: '/api/agent-search',
      ip,
      meta: { studio, totalResults: result.totalSize },
      requestId,
      durationMs: timer.elapsed(),
    });

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      results: result.results,
      totalSize: result.totalSize,
      requestId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    apiLog({
      level: 'error',
      event: 'agent_search_error',
      route: '/api/agent-search',
      ip,
      error: message.slice(0, 200),
      requestId,
      durationMs: timer.elapsed(),
    });

    return NextResponse.json(
      { error: message.slice(0, 200), requestId },
      { status: 500 },
    );
  }
}
