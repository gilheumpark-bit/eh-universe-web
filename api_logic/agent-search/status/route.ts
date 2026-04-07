export const dynamic = "force-dynamic";
// ============================================================
// Agent Builder — 상태 확인 API
// ============================================================
// GET /api/agent-search/status
// 각 스튜디오별 Agent Builder 연동 상태를 반환합니다.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAgentBuilderStatus } from '@/lib/vertex-app-builder';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, 'agent-search-status', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }
  const status = getAgentBuilderStatus();

  return NextResponse.json({
    ok: true,
    agentBuilder: {
      universe: {
        configured: status.universe,
        description: '세계관 백과사전 (109개 설정 문서 기반 RAG 검색)',
      },
      novel: {
        configured: status.novel,
        description: '소설 서사 감시 (1~2부 텍스트 기반 설정 확인)',
      },
      code: {
        configured: status.code,
        description: '프로젝트 소스코드 분석 가이드',
      },
    },
    creditSource: 'GenAI App Builder (142만 원 전용 크레딧)',
    note: '이 API는 일반 Gemini API(11만 원 범용)와 완전히 독립된 경로입니다.',
  });
}

