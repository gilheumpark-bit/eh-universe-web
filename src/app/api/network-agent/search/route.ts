// ============================================================
// Network Agent Search API — 비활성 (Google Discovery Engine 제거)
// ============================================================
// [2026-06-06] 구글 AI 삭제: Vertex Discovery Engine 멀티테넌트 검색 경로 제거.
// 하위호환을 위해 라우트는 유지하되 항상 503 반환.
// 소비처(useNetworkAgent.searchAgent / network-agent-client.searchTranslationNetwork)는
// 비-ok 응답을 graceful(null/{ok:false})하게 처리하므로 UI 크래시 없음.
// (env 미설정 시 기존에도 503을 반환하던 경로 — 신규 회귀 없음.)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getNetworkAgentCorsHeaders } from '@/lib/network-agent-cors';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getNetworkAgentCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = getNetworkAgentCorsHeaders(req);
  const ip = getClientIp(req.headers);

  const rl = checkRateLimit(ip, 'network-search', RATE_LIMITS.chat);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: cors });
  }

  return NextResponse.json(
    {
      error: 'network_agent_disabled',
      message: 'Network Agent search (Google Discovery Engine) was removed.',
    },
    { status: 503, headers: cors },
  );
}
