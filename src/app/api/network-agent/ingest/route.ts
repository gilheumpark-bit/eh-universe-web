// ============================================================
// Network Agent Ingest API — 비활성 (Google Discovery Engine 제거)
// ============================================================
// [2026-06-06] 구글 AI 삭제: Vertex Discovery Engine 멀티테넌트 인덱싱 경로 제거.
// 하위호환을 위해 라우트는 유지하되 항상 503 반환.
// 소비처(useNetworkAgent.ingestAgent / network-agent-client.ingestTranslationDocument)는
// best-effort fire-and-forget(false 반환)이라 콘텐츠 생성 흐름을 막지 않음.
// (env 미설정 시 기존에도 503을 반환하던 경로 — 신규 회귀 없음.)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getNetworkAgentCorsHeaders } from '@/lib/network-agent-cors';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getNetworkAgentCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = getNetworkAgentCorsHeaders(req);
  const ip = getClientIp(req.headers);

  const rl = checkRateLimit(ip, 'network-agent-ingest', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { ...cors, 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  return NextResponse.json(
    {
      error: 'network_agent_disabled',
      message: 'Network Agent ingest (Google Discovery Engine) was removed.',
    },
    { status: 503, headers: cors },
  );
}
